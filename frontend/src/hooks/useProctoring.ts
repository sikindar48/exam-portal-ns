import { useEffect, useRef, useState } from "react";
import { proctoringApi } from "@/services/api/client";

interface UseProctoringOptions {
  enabled: boolean;
  stream: MediaStream | null;
  attemptId: string;
  testId: string;
  attemptToken?: string;
}

export function useProctoring({ enabled, stream, attemptId, testId, attemptToken }: UseProctoringOptions) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeViolation, setActiveViolation] = useState<string | null>(null);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const intervalIdRef = useRef<any>(null);

  // Consecutive trigger timers
  const faceAbsentStartRef = useRef<number | null>(null);
  const multipleFacesStartRef = useRef<number | null>(null);

  const isViolationLoggingRef = useRef<Record<string, boolean>>({});
  const activeViolationRef = useRef<string | null>(null);

  // Capture a compressed JPEG snapshot from the live video feed
  const captureSnapshot = (): string | null => {
    if (!videoElRef.current) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      ctx.drawImage(videoElRef.current, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch {
      return null;
    }
  };

  // Post a violation event with 5-second per-type rate limiting
  const triggerViolation = async (eventType: string, duration = 1.0, metadata?: any) => {
    const uniqueKey = `${eventType}_${Math.floor(Date.now() / 5000)}`;
    if (isViolationLoggingRef.current[uniqueKey]) return;
    isViolationLoggingRef.current[uniqueKey] = true;

    try {
      const imagePayload = eventType !== "CAMERA_DISCONNECTED" ? captureSnapshot() : null;
      await proctoringApi.logEvent({
        attempt_id: attemptId,
        test_id: testId,
        event_type: eventType,
        duration_seconds: duration,
        image_payload: imagePayload,
        metadata,
      }, attemptToken);
    } catch (err) {
      console.error(`Failed to log proctoring event: ${eventType}`, err);
    } finally {
      setTimeout(() => {
        delete isViolationLoggingRef.current[uniqueKey];
      }, 5000);
    }
  };

  useEffect(() => {
    if (!enabled || !stream) return;

    let active = true;

    const setViolation = (v: string | null) => {
      if (!active) return;
      if (activeViolationRef.current !== v) {
        activeViolationRef.current = v;
        setActiveViolation(v);
      }
    };

    const initDetector = async () => {
      try {
        // Load only @mediapipe/face_detection — no face_mesh, no hands (avoids WASM conflict)
        await new Promise<void>((resolve, reject) => {
          const src = "https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js";
          if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
          const s = document.createElement("script");
          s.src = src;
          s.crossOrigin = "anonymous";
          s.onload = () => resolve();
          s.onerror = () => reject(new Error("Failed to load @mediapipe/face_detection"));
          document.head.appendChild(s);
        });

        if (!active) return;

        const FaceDetection = (window as any).FaceDetection;
        if (!FaceDetection) throw new Error("FaceDetection not found in window after script load.");

        // Create a hidden video element fed by the proctoring stream
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.width = 320;
        video.height = 240;
        await video.play();
        videoElRef.current = video;

        const detector = new FaceDetection({
          locateFile: (file: string) =>
            `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        });

        detector.setOptions({
          model: "short",
          minDetectionConfidence: 0.5,
        });

        detector.onResults((results: any) => {
          if (!active) return;

          const faceCount = (results.detections || []).length;

          if (faceCount === 0) {
            // Reset multiple-face timer
            multipleFacesStartRef.current = null;

            if (faceAbsentStartRef.current === null) {
              faceAbsentStartRef.current = Date.now();
            } else if (Date.now() - faceAbsentStartRef.current >= 800) {
              setViolation("NO_FACE");
              triggerViolation("NO_FACE", 1.0, { faceCount: 0 });
            }
          } else if (faceCount > 1) {
            // Reset no-face timer
            faceAbsentStartRef.current = null;

            if (multipleFacesStartRef.current === null) {
              multipleFacesStartRef.current = Date.now();
            } else if (Date.now() - multipleFacesStartRef.current >= 800) {
              setViolation("MULTIPLE_FACES");
              triggerViolation("MULTIPLE_FACES", 1.0, { faceCount });
            }
          } else {
            // Exactly one face — clear all violations
            faceAbsentStartRef.current = null;
            multipleFacesStartRef.current = null;
            setViolation(null);
          }
        });

        detectorRef.current = detector;
        setModelLoaded(true);

        // Process a frame every 1 second
        intervalIdRef.current = setInterval(async () => {
          if (!active || !videoElRef.current) return;

          // Camera health check
          const track = stream.getVideoTracks()[0];
          if (!track || track.readyState === "ended" || !track.enabled || track.muted) {
            setViolation("CAMERA_DISCONNECTED");
            triggerViolation("CAMERA_DISCONNECTED", 1.0);
            return;
          }

          try {
            await detectorRef.current.send({ image: videoElRef.current });
          } catch (err) {
            console.error("Face detection inference error:", err);
          }
        }, 1000);

      } catch (err: any) {
        console.error("Proctoring init failed:", err);
        setInitError(err.message || "Initialization failed");
      }
    };

    initDetector();

    // Handle physical camera disconnection events
    const handleTrackEnded = () => {
      setViolation("CAMERA_DISCONNECTED");
      triggerViolation("CAMERA_DISCONNECTED", 2.5);
    };

    const handleDeviceChange = async () => {
      const devices = await navigator.mediaDevices.enumerateDevices().catch(() => []);
      if (!devices.some(d => d.kind === "videoinput")) {
        setViolation("CAMERA_DISCONNECTED");
        triggerViolation("CAMERA_DISCONNECTED", 1.5);
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);
    stream.getVideoTracks().forEach(track => {
      track.addEventListener("ended", handleTrackEnded);
      track.addEventListener("mute", handleTrackEnded);
    });

    return () => {
      active = false;
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (videoElRef.current) {
        videoElRef.current.pause();
        videoElRef.current.srcObject = null;
      }
      try { detectorRef.current?.close(); } catch {}
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      stream.getVideoTracks().forEach(track => {
        track.removeEventListener("ended", handleTrackEnded);
        track.removeEventListener("mute", handleTrackEnded);
      });
      activeViolationRef.current = null;
      setActiveViolation(null);
    };
  }, [enabled, stream, attemptId, testId]);

  return { modelLoaded, initError, activeViolation };
}
