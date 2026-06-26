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
  NO_FACE: { severity: "HIGH", score: 5 },
  MULTIPLE_FACES: { severity: "HIGH", score: 5 },
  CAMERA_DISCONNECTED: { severity: "LOW", score: 1 },
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
    const { attempt_id, page, limit, test_id, client_id, event_type, severity, start_date, end_date, date, start_time, end_time, search } = req.query;
    if (!attempt_id) {
      if (!isAdmin) {
        return res.status(403).json({ error: "Permission denied" });
      }
      const pageNum = Math.max(1, parseInt(page as string, 10) || 1);
      const limitNum = Math.max(1, parseInt(limit as string, 10) || 10);
      const offset = (pageNum - 1) * limitNum;

      let sql = `
        SELECT pe.*, a.student_id, p.name as student_name, p.email as student_email, t.test_name, t.client_id, c.name as client_name
        FROM proctoring_events pe
        JOIN attempts a ON a.id = pe.attempt_id
        JOIN tests t ON t.id = a.test_id
        LEFT JOIN profiles p ON p.id = a.student_id
        LEFT JOIN clients c ON c.id = t.client_id
      `;
      
      const conditions: string[] = [];
      const args: any[] = [];

      if (!isSuper) {
        const callerClientId = await getUserClientId(user.id);
        conditions.push(`t.client_id = ?`);
        args.push(callerClientId);
      } else if (client_id) {
        conditions.push(`t.client_id = ?`);
        args.push(client_id as string);
      }

      if (test_id) {
        conditions.push(`t.id = ?`);
        args.push(test_id as string);
      }

      if (event_type) {
        conditions.push(`pe.event_type = ?`);
        args.push(event_type as string);
      }

      if (severity) {
        conditions.push(`pe.severity = ?`);
        args.push(severity as string);
      }

      if (start_date) {
        conditions.push(`pe.created_at >= ?`);
        args.push(start_date as string);
      }

      if (end_date) {
        conditions.push(`pe.created_at <= ?`);
        args.push(end_date as string);
      }

      if (search) {
        conditions.push(`(p.name LIKE ? OR p.email LIKE ?)`);
        args.push(`%${search}%`, `%${search}%`);
      }

      if (date) {
        conditions.push(`date(pe.created_at) = ?`);
        args.push(date as string);
      }

      if (start_time && end_time) {
        conditions.push(`time(pe.created_at) BETWEEN ? AND ?`);
        args.push(start_time as string, end_time as string);
      }

      if (conditions.length > 0) {
        sql += ` WHERE ` + conditions.join(" AND ");
      }

      const countSql = `SELECT COUNT(*) as total FROM (${sql})`;
      const countArgs = [...args];
      const { rows: countRows } = await db.execute({ sql: countSql, args: countArgs });
      const total = (countRows[0] as any).total;

      sql += ` ORDER BY pe.created_at DESC LIMIT ? OFFSET ?`;
      const queryArgs = [...args, limitNum, offset];

      const { rows: events } = await db.execute({ sql, args: queryArgs });

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
                  expires: Date.now() + 15 * 60 * 1000,
                });
                imageUrl = signedUrl;
              } catch (err) {
                console.error("Error generating signed URL:", err);
              }
            } else {
              if (process.env.NODE_ENV !== "production") {
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

      return res.status(200).json({
        events: enhancedEvents,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
        },
      });
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
          const headerToken = req.headers["x-attempt-token"] || req.query.attempt_token;
          if (!headerToken || attempt.attempt_token !== headerToken) {
            return res.status(403).json({ error: "Permission denied: Invalid attempt token" });
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
      return res.status(403).json({ error: "Unauthorized access to this attempt" });
    }
    const isGuest = await isGuestStudent(attempt.student_id);
    if (isGuest) {
      const headerToken = req.headers["x-attempt-token"] || req.query.attempt_token;
      if (!headerToken || attempt.attempt_token !== headerToken) {
        return res.status(403).json({ error: "Permission denied: Invalid attempt token" });
      }
    }

    // 3. Check feature gating if this is a camera event
    const { validatePackageFeatures } = await import("../services/billing.js");
    const isCameraEvent = ["NO_FACE", "MULTIPLE_FACES", "CAMERA_DISCONNECTED", "CAMERA_PERMISSION_DENIED"].includes(event_type);
    if (isCameraEvent) {
      const cameraAllowed = await validatePackageFeatures(test_id, "camera_proctoring");
      if (!cameraAllowed) {
        return res.status(403).json({ error: "Camera proctoring is not enabled on this subscription plan or package" });
      }
    }

    const isBasicProctoringEvent = ["TAB_SWITCH", "WINDOW_BLUR", "FULLSCREEN_EXIT"].includes(event_type);
    if (isBasicProctoringEvent) {
      const proctoringAllowed = await validatePackageFeatures(test_id, "advanced_proctoring")
        || await validatePackageFeatures(test_id, "basic_proctoring")
        || await validatePackageFeatures(test_id, "camera_proctoring");
      if (!proctoringAllowed) {
        return res.status(403).json({ error: "Advanced proctoring is not enabled on this subscription plan or package" });
      }
    }

    // 4. Map severity and score
    const mapped = SEVERITY_MAPPING[event_type] || { severity: "LOW", score: 0 };

    const isProd = process.env.NODE_ENV === "production";

    const nowISO = new Date().toISOString();

    // 5. Deduplication check (last 30 seconds for the same attempt and event_type)
    const { rows: recentEvents } = await db.execute({
      sql: `SELECT * FROM proctoring_events 
            WHERE attempt_id = ? AND event_type = ? 
            ORDER BY created_at DESC LIMIT 1`,
      args: [attempt_id, event_type],
    });

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

    // 6. Handle evidence snapshot upload if required and payload exists (only for new events)
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
