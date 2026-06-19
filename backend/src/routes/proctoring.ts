import type { Request, Response } from "express";
import { getDb } from "../db/db.js";
import { requireUser } from "../auth/auth.js";
import { getUserClientId, hasRole, isGuestStudent } from "../services/roles.js";
import { isFeatureEnabled } from "../services/features.js";
import { randomUUID } from "crypto";
import { getStorage } from "firebase-admin/storage";
import { getApps } from "firebase-admin/app";

// Severity and Score mappings
const SEVERITY_MAPPING: Record<string, { severity: string; score: number }> = {
  TAB_SWITCH: { severity: "LOW", score: 1 },
  WINDOW_BLUR: { severity: "LOW", score: 1 },
  FULLSCREEN_EXIT: { severity: "MEDIUM", score: 2 },
  NO_FACE: { severity: "MEDIUM", score: 3 },
  MULTIPLE_FACES: { severity: "HIGH", score: 5 },
  CAMERA_DISCONNECTED: { severity: "HIGH", score: 5 },
  CAMERA_PERMISSION_DENIED: { severity: "HIGH", score: 5 },
};

// Image storage required only for these events
const UPLOAD_EVIDENCE_EVENTS = ["NO_FACE", "MULTIPLE_FACES", "CAMERA_DISCONNECTED"];

export default async function handler(req: Request, res: Response) {
  const db = getDb();
  const user = await requireUser(req, res);
  if (!user) return;

  const isSuper = await hasRole(user.id, "superadmin");
  const isClientAdmin = await hasRole(user.id, "clientadmin");
  const isAdmin = isSuper || isClientAdmin;

  // ── GET /api/proctoring/events ─────────────────────────────────────────────
  if (req.method === "GET") {
    const { attempt_id } = req.query;
    if (!attempt_id) {
      return res.status(400).json({ error: "attempt_id is required" });
    }

    // 1. Fetch attempt and test to verify authorization
    const { rows: attemptRows } = await db.execute({
      sql: `SELECT a.*, t.client_id as test_client_id
            FROM attempts a
            JOIN tests t ON t.id = a.test_id
            WHERE a.id = ?`,
      args: [attempt_id as string],
    });

    if (!attemptRows.length) {
      return res.status(404).json({ error: "Attempt not found" });
    }
    const attempt = attemptRows[0] as any;

    // 2. Authorization check
    if (!isSuper) {
      if (isClientAdmin) {
        const callerClientId = await getUserClientId(user.id);
        if (attempt.test_client_id !== callerClientId) {
          return res.status(403).json({ error: "Permission denied" });
        }
      } else {
        // Student / Guest user can only see their own timeline
        if (attempt.student_id !== user.id) {
          const isGuest = await isGuestStudent(attempt.student_id);
          if (!isGuest) {
            return res.status(403).json({ error: "Permission denied" });
          }
        }
      }
    }

    // 3. Fetch proctoring events
    const { rows: events } = await db.execute({
      sql: "SELECT * FROM proctoring_events WHERE attempt_id = ? ORDER BY created_at ASC",
      args: [attempt_id as string],
    });

    // 4. Generate signed URLs dynamically for events with evidence
    const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || "exam-portal-ns"}.appspot.com`;
    const enhancedEvents = await Promise.all(
      events.map(async (row: any) => {
        let imageUrl = null;
        if (row.has_evidence && row.storage_path) {
          if (getApps().length > 0) {
            try {
              const bucket = getStorage().bucket(storageBucketName);
              const file = bucket.file(row.storage_path);
              const [signedUrl] = await file.getSignedUrl({
                action: "read",
                expires: Date.now() + 15 * 60 * 1000, // 15 mins
              });
              imageUrl = signedUrl;
            } catch (err) {
              console.error("Error generating signed URL:", err);
            }
          } else {
            // Local offline testing fallback (Development only)
            if (process.env.NODE_ENV === "production") {
              imageUrl = null;
            } else {
              imageUrl = `/static/mock-images/${row.storage_path}`;
            }
          }
        }
        
        let parsedMetadata = null;
        try {
          if (row.metadata) parsedMetadata = JSON.parse(row.metadata);
        } catch {
          parsedMetadata = row.metadata;
        }

        return {
          ...row,
          image_url: imageUrl,
          metadata: parsedMetadata,
        };
      })
    );

    // Calculate total risk score (sum of severity scores)
    const totalRiskScore = enhancedEvents.reduce((sum, evt) => sum + (evt.severity_score || 0), 0);

    return res.status(200).json({
      events: enhancedEvents,
      total_risk_score: totalRiskScore,
    });
  }

  // ── POST /api/proctoring/events ────────────────────────────────────────────
  if (req.method === "POST") {
    const { attempt_id, test_id, event_type, duration_seconds = 0, image_payload, metadata } = req.body;

    if (!attempt_id || !test_id || !event_type) {
      return res.status(400).json({ error: "Missing required parameters" });
    }

    // 1. Fetch active attempt and test
    const { rows: attemptRows } = await db.execute({
      sql: `SELECT a.*, t.client_id, t.camera_required
            FROM attempts a
            JOIN tests t ON t.id = a.test_id
            WHERE a.id = ? AND a.test_id = ?`,
      args: [attempt_id, test_id],
    });

    if (!attemptRows.length) {
      return res.status(404).json({ error: "Attempt or Test not found" });
    }
    const attempt = attemptRows[0] as any;

    if (attempt.status !== "in_progress") {
      return res.status(400).json({ error: "Attempt is already submitted" });
    }

    // 2. Validate ownership (must be the student who owns the attempt)
    if (attempt.student_id !== user.id) {
      const isGuest = await isGuestStudent(attempt.student_id);
      if (!isGuest) {
        return res.status(403).json({ error: "Unauthorized access to this attempt" });
      }
    }

    // 3. Check feature gating if this is a camera event
    const isCameraEvent = ["NO_FACE", "MULTIPLE_FACES", "CAMERA_DISCONNECTED", "CAMERA_PERMISSION_DENIED"].includes(event_type);
    if (isCameraEvent) {
      const cameraAllowed = await isFeatureEnabled(attempt.client_id, "camera_proctoring");
      if (!cameraAllowed) {
        return res.status(403).json({ error: "Camera proctoring is not enabled on this subscription plan" });
      }
    }

    // 4. Map severity and score
    const mapped = SEVERITY_MAPPING[event_type] || { severity: "LOW", score: 0 };

    const isProd = process.env.NODE_ENV === "production";

    // 5. Handle evidence snapshot upload if required and payload exists
    let storage_path = null;
    let has_evidence = 0;

    if (UPLOAD_EVIDENCE_EVENTS.includes(event_type) && image_payload) {
      const match = image_payload.match(/^data:image\/(\w+);base64,(.+)$/);
      if (match) {
        const ext = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        
        const timestamp = Date.now();
        const gcsPath = `proctoring/${test_id}/${attempt_id}/${timestamp}.${ext}`;
        const storageBucketName = process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID || "exam-portal-ns"}.appspot.com`;

        if (getApps().length > 0) {
          try {
            const bucket = getStorage().bucket(storageBucketName);
            const file = bucket.file(gcsPath);
            await file.save(buffer, {
              metadata: { contentType: `image/${ext}` },
              public: false,
            });
            storage_path = gcsPath;
            has_evidence = 1;
          } catch (err) {
            console.error("GCS Upload failed:", err);
            if (isProd) {
              return res.status(500).json({ error: "Evidence upload failed" });
            }
          }
        } else {
          if (isProd) {
            return res.status(500).json({ error: "Storage service not initialized in production" });
          }
          // Offline Local Fallback
          try {
            const fs = await import("fs");
            const path = await import("path");
            const localDir = path.join(process.cwd(), "public/mock-images", `proctoring/${test_id}/${attempt_id}`);
            await fs.promises.mkdir(localDir, { recursive: true });
            const localFilePath = path.join(localDir, `${timestamp}.${ext}`);
            await fs.promises.writeFile(localFilePath, buffer);
            storage_path = `proctoring/${test_id}/${attempt_id}/${timestamp}.${ext}`;
            has_evidence = 1;
          } catch (err) {
            console.error("Local mock GCS write failed:", err);
          }
        }
      }
    }

    // 6. Deduplication check (last 30 seconds for the same attempt and event_type)
    const { rows: recentEvents } = await db.execute({
      sql: `SELECT * FROM proctoring_events 
            WHERE attempt_id = ? AND event_type = ? 
            ORDER BY created_at DESC LIMIT 1`,
      args: [attempt_id, event_type],
    });

    const nowISO = new Date().toISOString();

    if (recentEvents.length > 0) {
      const recent = recentEvents[0] as any;
      const recentTime = new Date(recent.created_at).getTime();
      const nowTime = new Date(nowISO).getTime();
      const diffSecs = (nowTime - recentTime) / 1000;

      if (diffSecs <= 30) {
        // Update existing record duration
        await db.execute({
          sql: `UPDATE proctoring_events 
                SET duration_seconds = duration_seconds + ?, created_at = ?
                WHERE id = ?`,
          args: [duration_seconds, nowISO, recent.id],
        });
        return res.status(200).json({ success: true, deduplicated: true, id: recent.id });
      }
    }

    // 7. Insert new event record
    const id = randomUUID();
    const metadataStr = metadata ? (typeof metadata === "string" ? metadata : JSON.stringify(metadata)) : null;

    await db.execute({
      sql: `INSERT INTO proctoring_events 
            (id, attempt_id, test_id, event_type, severity, severity_score, storage_path, has_evidence, metadata, duration_seconds, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [
        id,
        attempt_id,
        test_id,
        event_type,
        mapped.severity,
        mapped.score,
        storage_path,
        has_evidence,
        metadataStr,
        duration_seconds,
        nowISO,
      ],
    });

    return res.status(201).json({ success: true, id });
  }

  return res.status(405).json({ error: "Method not allowed" });
}
