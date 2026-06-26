import { useEffect, useRef, useState } from "react";
import { proctoringApi } from "@/services/api/client";

interface UseProctoringOptions {
  enabled: boolean;
  stream: MediaStream | null;
  attemptId: string;
  testId: string;
}

export function useProctoring({ enabled, stream, attemptId, testId }: UseProctoringOptions) {
  const [modelLoaded, setModelLoaded] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [activeViolation, setActiveViolation] = useState<string | null>(null);

  const videoElRef = useRef<HTMLVideoElement | null>(null);
  const detectorRef = useRef<any>(null);
  const intervalIdRef = useRef<any>(null);
  const faceAbsentStartRef = useRef<number | null>(null);
  const multipleFacesStartRef = useRef<number | null>(null);
  const isViolationLoggingRef = useRef<Record<string, boolean>>({});

  // Helper to load external scripts dynamically
  const loadScript = (src: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = src;
      script.crossOrigin = "anonymous";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script ${src}`));
      document.head.appendChild(script);
    });
  };

  // Helper to capture a JPEG snapshot from the video stream and compress it to < 50KB
  const captureSnapshot = (): string | null => {
    if (!videoElRef.current || !stream) return null;
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;

      // Draw current video frame to canvas
      ctx.drawImage(videoElRef.current, 0, 0, canvas.width, canvas.height);

      // Compress to JPEG with 0.6 quality (typically results in 15KB - 30KB)
      return canvas.toDataURL("image/jpeg", 0.6);
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
      return null;
    }
  };

  const activeViolationRef = useRef<string | null>(null);

  // Helper to POST events to backend with rate/duplicate protection
  const triggerViolation = async (eventType: string, duration = 2.5, metadata?: any, sendImage = true) => {
    // Avoid double posting in the exact same interval ticks if already uploading
    const uniqueKey = `${eventType}_${Math.floor(Date.now() / 5000)}`;
    if (isViolationLoggingRef.current[uniqueKey]) return;
    isViolationLoggingRef.current[uniqueKey] = true;

    try {
      let imagePayload = null;
      // Capture snapshots only for specific camera violations and when explicitly instructed
      if (sendImage && ["NO_FACE", "MULTIPLE_FACES"].includes(eventType)) {
        imagePayload = captureSnapshot();
      }

      await proctoringApi.logEvent({
        attempt_id: attemptId,
        test_id: testId,
        event_type: eventType,
        duration_seconds: duration,
        image_payload: imagePayload,
        metadata,
      });
    } catch (err) {
      console.error(`Failed to log proctoring event: ${eventType}`, err);
    } finally {
      // Keep safety cooldown before permitting same event code logs
      setTimeout(() => {
        delete isViolationLoggingRef.current[uniqueKey];
      }, 5000);
    }
  };

  useEffect(() => {
    if (!enabled || !stream) return;

    let active = true;

    const initDetector = async () => {
      try {
        // Load MediaPipe Face Detection library dynamically from CDN
        await loadScript("https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/face_detection.js");

        if (!active) return;

        const mpFaceDetection = (window as any).FaceDetection;
        if (!mpFaceDetection) {
          throw new Error("MediaPipe FaceDetection global not found after script load.");
        }

        // Initialize video element
        const video = document.createElement("video");
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.width = 320;
        video.height = 240;
        await video.play();

        videoElRef.current = video;

        // Create Detector instance
        const detector = new mpFaceDetection({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_detection/${file}`,
        });

        detector.setOptions({
          model: "short",
          minDetectionConfidence: 0.5,
        });

        detector.onResults((results: any) => {
          if (!active) return;

          const detections = results.detections || [];
          const faceCount = detections.length;

          if (faceCount === 0) {
            // Reset multiple faces timer
            multipleFacesStartRef.current = null;

            // Start absence timer if not already set
            if (faceAbsentStartRef.current === null) {
              faceAbsentStartRef.current = Date.now();
            } else {
              const absentDurationMs = Date.now() - faceAbsentStartRef.current;
              // If face missing for more than 1.5 continuous seconds, trigger violation
              if (absentDurationMs >= 1500) {
                const isFirst = activeViolationRef.current !== "NO_FACE";
                if (isFirst) {
                  activeViolationRef.current = "NO_FACE";
                  setActiveViolation("NO_FACE");
                }

                triggerViolation("NO_FACE", 1.0, {
                  faceCount: 0,
                  absentDurationSeconds: absentDurationMs / 1000,
                }, isFirst);
              }
            }
          } else {
            // Face detected: reset absence timer
            faceAbsentStartRef.current = null;

            if (faceCount > 1) {
              // Start multiple faces timer if not already set
              if (multipleFacesStartRef.current === null) {
                multipleFacesStartRef.current = Date.now();
              } else {
                const multipleDurationMs = Date.now() - multipleFacesStartRef.current;
                // If multiple faces detected for more than 1.5 continuous seconds, trigger violation
                if (multipleDurationMs >= 1500) {
                  const isFirst = activeViolationRef.current !== "MULTIPLE_FACES";
                  if (isFirst) {
                    activeViolationRef.current = "MULTIPLE_FACES";
                    setActiveViolation("MULTIPLE_FACES");
                  }

                  triggerViolation("MULTIPLE_FACES", 1.0, {
                    faceCount,
                    confidence: detections[0]?.score?.[0] || detections[0]?.score || 0.9,
                  }, isFirst);
                }
              }
            } else {
              // Normal state: 1 face
              multipleFacesStartRef.current = null;
              if (activeViolationRef.current !== null) {
                activeViolationRef.current = null;
                setActiveViolation(null);
              }
            }
          }
        });

        detectorRef.current = detector;
        setModelLoaded(true);

        // Periodically capture frames and pass to detector (every 1.0 second)
        intervalIdRef.current = setInterval(async () => {
          if (!active || !videoElRef.current || !detectorRef.current) return;

          // Check if camera tracks are still active
          const videoTrack = stream.getVideoTracks()[0];
          if (!videoTrack || videoTrack.readyState === "ended" || !videoTrack.enabled || videoTrack.muted) {
            if (activeViolationRef.current !== "CAMERA_DISCONNECTED") {
              activeViolationRef.current = "CAMERA_DISCONNECTED";
              setActiveViolation("CAMERA_DISCONNECTED");
            }
            triggerViolation("CAMERA_DISCONNECTED", 1.0);
            return;
          }

          try {
            await detectorRef.current.send({ image: videoElRef.current });
          } catch (err) {
            console.error("MediaPipe inference error:", err);
          }
        }, 1000);

      } catch (err: any) {
        console.error("Failed to initialize proctoring detector:", err);
        setInitError(err.message || "Initialization failed");
      }
    };

    initDetector();

    // Listen for manual track changes (disconnections)
    const handleTrackEndedOrMuted = () => {
      if (activeViolationRef.current !== "CAMERA_DISCONNECTED") {
        activeViolationRef.current = "CAMERA_DISCONNECTED";
        setActiveViolation("CAMERA_DISCONNECTED");
      }
      triggerViolation("CAMERA_DISCONNECTED", 2.5);
    };

    const handleDeviceChange = async () => {
      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const hasVideoDevice = devices.some(device => device.kind === "videoinput");
        if (!hasVideoDevice) {
          if (activeViolationRef.current !== "CAMERA_DISCONNECTED") {
            activeViolationRef.current = "CAMERA_DISCONNECTED";
            setActiveViolation("CAMERA_DISCONNECTED");
          }
          triggerViolation("CAMERA_DISCONNECTED", 1.5);
        }
      } catch (err) {
        console.error("Error checking devices list:", err);
      }
    };

    navigator.mediaDevices.addEventListener("devicechange", handleDeviceChange);

    stream.getVideoTracks().forEach((track) => {
      track.addEventListener("ended", handleTrackEndedOrMuted);
      track.addEventListener("mute", handleTrackEndedOrMuted);
    });

    return () => {
      active = false;
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
      if (videoElRef.current) {
        videoElRef.current.pause();
        videoElRef.current.srcObject = null;
      }
      navigator.mediaDevices.removeEventListener("devicechange", handleDeviceChange);
      stream.getVideoTracks().forEach((track) => {
        track.removeEventListener("ended", handleTrackEndedOrMuted);
        track.removeEventListener("mute", handleTrackEndedOrMuted);
      });
      activeViolationRef.current = null;
      setActiveViolation(null);
    };
  }, [enabled, stream, attemptId, testId]);

  return { modelLoaded, initError, activeViolation };
}
