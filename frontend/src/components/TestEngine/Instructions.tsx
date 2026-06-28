import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Info, HelpCircle, AlertTriangle, Wifi, ShieldCheck, Camera } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

interface Question {
  id: string;
  marks?: number;
}

interface Section {
  id: string;
  name: string;
  questions: Question[];
}

interface InstructionsProps {
  testName: string;
  duration: number;
  questionCount: number;
  negativeMarking: boolean;
  negativeMarks: number;
  sections: Section[];
  studentName?: string;
  onStart: (stream: MediaStream | null) => void;
  orgName?: string;
  orgLogoUrl?: string | null;
  cameraRequired?: boolean;
}

const RULES = [
  "Server Clock: Remaining time is shown in the top-right corner.",
  "Question Palette: Displays current status of all questions.",
  "Direct Navigation: Click question numbers to jump to them.",
  "Save & Next: Click to save your answer and move forward.",
  "Mark for Review: Saves your answer and marks it for later check.",
  "Auto-Save: Answers are only saved if you click 'Save & Next'.",
  "Clear Response: Clears the selected option for the current question.",
];

const MOBILE_RULES = [
  "Timer: Remaining time is in the top-right.",
  "Palette: Shows status of all questions.",
  "Navigation: Tap numbers to jump.",
  "Save & Next: Saves and moves forward.",
  "Mark for Review: Marks question for later check.",
  "Auto-Save: Answers are saved only on 'Save & Next'.",
];

const LEGEND = [
  { color: "bg-green-600", label: "Answered" },
  { color: "bg-purple-600", label: "Marked for Review" },
  { color: "bg-red-500", label: "Not Answered" },
  { color: "bg-slate-200", label: "Not Visited" },
];

export function Instructions({
  testName,
  duration,
  questionCount,
  negativeMarking,
  negativeMarks,
  sections,
  studentName,
  onStart,
  orgName,
  orgLogoUrl,
  cameraRequired,
}: InstructionsProps) {
  const [agreed, setAgreed] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);
  
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [requestingCamera, setRequestingCamera] = useState(false);
  const [showCameraPreview, setShowCameraPreview] = useState(false);
  const startedRef = useRef(false);

  // Responsive step controls for mobile screens
  const [step, setStep] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (!startedRef.current && cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  useEffect(() => {
    if (cameraRequired) {
      const requestCamera = async () => {
        setRequestingCamera(true);
        setCameraError(null);
        try {
          const s = await navigator.mediaDevices.getUserMedia({
            video: { width: 320, height: 240, facingMode: "user" }
          });
          setCameraStream(s);
        } catch (err) {
          console.error("Camera access error:", err);
          const errorName = err instanceof Error ? err.name : "";
          setCameraError(
            errorName === "NotAllowedError" || errorName === "PermissionDeniedError"
              ? "Permission Denied: Please enable camera access in your browser settings to take this exam."
              : "Camera Error: Could not start the webcam. Please ensure it is connected and not in use by another app."
          );
        } finally {
          setRequestingCamera(false);
        }
      };
      requestCamera();
    }
  }, [cameraRequired]);

  useEffect(() => {
    const checkSpeed = () => {
      // @ts-expect-error: navigator.connection is a non-standard Network Information API not in TypeScript's lib
      const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
      if (connection) {
        const downlink = connection.downlink; // Speed in Mbps
        setSpeed(downlink);
        setIsStable(downlink >= 1.5); // 1.5 Mbps threshold
      } else {
        // Fallback for browsers without Network Information API
        setSpeed(2.0); 
        setIsStable(true);
      }
    };

    checkSpeed();
    const interval = setInterval(checkSpeed, 5000);
    return () => clearInterval(interval);
  }, []);

  const totalMarks = sections.reduce((acc, s) => 
    acc + s.questions.reduce((qAcc, q) => qAcc + (q.marks || 1), 0), 0
  );

  const rulesToShow = isMobile ? MOBILE_RULES : RULES;

  return (
    <div className="flex min-h-screen md:h-screen flex-col bg-white dark:bg-slate-950 font-sans selection:bg-blue-100">

      {/* Header */}
      <header className="flex shrink-0 h-auto md:h-16 flex-col md:flex-row items-start md:items-center justify-between p-4 md:px-6 gap-3 md:gap-0 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-none bg-slate-800 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} className="h-full w-full object-cover" />
            ) : (
              <Info className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="border-r border-slate-200 dark:border-slate-700 pr-6 h-8 flex flex-col justify-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Organization</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none uppercase">{orgName || "General"}</p>
          </div>
          <div className="flex flex-col justify-center">
            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Paper</p>
            <p className="text-xs font-bold text-slate-900 dark:text-white leading-none uppercase">{testName || "Examination Paper"}</p>
          </div>
        </div>
        
        <div className="flex items-center justify-between w-full md:w-auto gap-6">
          <div className="text-right">
            <h1 className="text-sm font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
              {isMobile && step === 2 ? "Summary" : "Instructions"}
            </h1>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 h-8 pl-6 flex items-center gap-4">
            {cameraRequired && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowCameraPreview(!showCameraPreview)}
                  className={`relative p-2 rounded-full border transition-all ${
                    cameraStream 
                      ? "border-green-500 text-green-600 bg-green-50/50 dark:bg-green-950/10 hover:bg-green-100 dark:hover:bg-green-950/30" 
                      : "border-slate-200 dark:border-slate-800 text-slate-400 hover:text-slate-650"
                  }`}
                  title="Webcam Preview"
                >
                  <Camera className="h-4 w-4" />
                  {cameraStream && (
                    <span className="absolute top-0.5 right-0.5 flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                    </span>
                  )}
                </button>

                {showCameraPreview && (
                  <div className="absolute right-0 top-10 z-50 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-xl space-y-3 rounded-none">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">Webcam Feed Verification</p>
                    <div className="relative aspect-video w-full bg-slate-950 border border-slate-200 dark:border-slate-800 overflow-hidden flex items-center justify-center">
                      {cameraStream ? (
                        <video
                          ref={(el) => {
                            if (el && cameraStream) el.srcObject = cameraStream;
                          }}
                          autoPlay
                          playsInline
                          muted
                          className="h-full w-full object-cover scale-x-[-1]"
                        />
                      ) : requestingCamera ? (
                        <p className="text-[10px] text-slate-500 uppercase tracking-wider animate-pulse">Requesting webcam...</p>
                      ) : (
                        <div className="p-4 text-center">
                          <AlertTriangle className="h-5 w-5 text-red-500 mx-auto mb-1.5" />
                          <p className="text-[9px] text-red-500 font-bold uppercase tracking-tight">Webcam Required</p>
                        </div>
                      )}
                    </div>
                    {cameraError && (
                      <p className="text-[9px] text-red-650 font-bold bg-red-50 dark:bg-red-950/20 p-2 border border-red-200 dark:border-red-800/30 leading-snug">
                        {cameraError}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            <Toggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-col md:flex-row flex-1 overflow-visible md:overflow-hidden">
        
        {/* Left: Detailed Instructions */}
        <div className={`flex-1 p-4 md:p-8 md:border-r border-b md:border-b-0 border-slate-200 dark:border-slate-800 overflow-visible md:overflow-y-auto ${isMobile && step !== 1 ? "hidden" : "block"}`}>
          <section className="max-w-4xl mx-auto space-y-8">
            {cameraRequired && (
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/30 flex gap-3 items-start rounded-sm">
                <ShieldCheck className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-blue-900 dark:text-blue-300 uppercase tracking-wide">Privacy & Monitoring Notice</p>
                  <p className="text-xs text-blue-700 dark:text-blue-400 mt-1 leading-relaxed">
                    This exam uses camera-based monitoring.
                  </p>
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* General Instructions column */}
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 border-b pb-2">General Instructions:</h2>
                  <div className="space-y-4">
                    {rulesToShow.map((rule, i) => (
                      <div key={i} className="flex gap-4">
                        <span className="text-sm font-bold text-slate-400 tabular-nums">{i + 1}.</span>
                        <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{rule}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {negativeMarking && (
                  <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
                    <p className="text-xs font-bold text-red-600 dark:text-red-400 uppercase tracking-tight">
                      Negative marking active: {negativeMarks} marks deducted.
                    </p>
                  </div>
                )}
              </div>

              {/* Exam Summary column (Desktop only) */}
              {!isMobile && (
                <div className="lg:col-span-5 space-y-4">
                  <div className="flex items-end justify-between border-b pb-2 mb-6">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Exam Summary</h3>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Total Duration</p>
                      <p className="text-xs font-bold text-blue-600">{duration} Min</p>
                    </div>
                  </div>
                  
                  <div className="border border-slate-200 dark:border-slate-800 overflow-hidden rounded-sm bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-bold">Section</th>
                          <th className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-bold">Qns</th>
                          <th className="px-3 py-1.5 text-center font-bold">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {sections.map((s) => {
                          const sMarks = s.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
                          return (
                            <tr key={s.id} className="text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium">{s.name}</td>
                              <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{s.questions.length}</td>
                              <td className="px-3 py-1.5 text-center font-bold text-slate-800 dark:text-white">{sMarks}</td>
                            </tr>
                          );
                        })}
                        <tr className="font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800">Total</td>
                          <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{questionCount}</td>
                          <td className="px-3 py-1.5 text-center">{totalMarks}</td>
                        </tr>
                        {negativeMarking && (
                          <tr className="border-t border-slate-200 dark:border-slate-800">
                            <td colSpan={3} className="px-3 py-2 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10 text-center tracking-tight">
                              Negative marking active: {negativeMarks} marks deducted.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Left: Exam Summary for Mobile (renders in Step 2) */}
        {isMobile && step === 2 && (
          <div className="flex-1 p-4 overflow-y-auto">
            <section className="max-w-4xl mx-auto space-y-6">
              <div>
                <div className="flex items-end justify-between mb-4">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">Examination Summary</h3>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Duration</p>
                    <p className="text-xs font-bold text-blue-600">{duration} Min</p>
                  </div>
                </div>
                
                <div className="border border-slate-200 dark:border-slate-800 overflow-hidden rounded-sm">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                        <th className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-bold">Section</th>
                        <th className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-bold">Qns</th>
                        <th className="px-3 py-1.5 text-center font-bold">Marks</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs">
                      {sections.map((s) => {
                        const sMarks = s.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
                        return (
                          <tr key={s.id} className="text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 last:border-0">
                            <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium">{s.name}</td>
                            <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{s.questions.length}</td>
                            <td className="px-3 py-1.5 text-center font-bold text-slate-800 dark:text-white">{sMarks}</td>
                          </tr>
                        );
                      })}
                      <tr className="font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                        <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800">Total</td>
                        <td className="px-3 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{questionCount}</td>
                        <td className="px-3 py-1.5 text-center">{totalMarks}</td>
                      </tr>
                      {negativeMarking && (
                        <tr className="border-t border-slate-200 dark:border-slate-800">
                          <td colSpan={3} className="px-3 py-2 text-[9px] font-bold text-red-600 dark:text-red-400 bg-red-50/20 dark:bg-red-950/10 text-center tracking-tight">
                            Negative marking active: {negativeMarks} marks deducted.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </section>
          </div>
        )}

        {/* Right: Candidate & Legend */}
        <div className={`w-full md:w-80 shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-visible md:overflow-y-auto ${isMobile && step !== 2 ? "hidden" : "block"}`}>
          <div className="p-6 space-y-6">
            {/* Candidate Name Only (No Dummy ID) */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Candidate Name</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{studentName || "Student"}</p>
            </div>

            {/* Symbols Legend - Hidden on Mobile */}
            <div className="hidden md:block">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Question Status</p>
              <div className="grid gap-2">
                {LEGEND.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-4 p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-sm">
                    <div className={`h-6 w-6 shrink-0 ${color} flex items-center justify-center text-[10px] font-bold text-white shadow-sm`}>
                      {label === "Not Visited" ? "" : "1"}
                    </div>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{label}</span>
                  </div>
                ))}
              </div>
            </div>



            {/* System Readiness Checks */}
            <div className="pt-6 border-t border-slate-200 dark:border-slate-800">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">System Readiness</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-sm">
                  <div className="flex items-center gap-2">
                    <Wifi className={`h-3.5 w-3.5 ${isStable ? "text-green-600" : "text-amber-500"}`} />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Internet: {speed ? speed.toFixed(1) : "--"} Mbps</span>
                  </div>
                  <span className={`text-[10px] font-black uppercase ${isStable ? "text-green-600" : "text-amber-500"}`}>
                    {isStable ? "Stable" : "Weak"}
                  </span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-sm">
                  <div className="flex items-center gap-2">
                    <Monitor className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Browser Support</span>
                  </div>
                  <span className="text-[10px] font-black text-green-600 uppercase">Verified</span>
                </div>
                <div className="flex items-center justify-between p-2.5 bg-slate-100 dark:bg-slate-800/50 rounded-sm">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="h-3.5 w-3.5 text-green-600" />
                    <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-tight">Session Security</span>
                  </div>
                  <span className="text-[10px] font-black text-green-600 uppercase">Secure</span>
                </div>
              </div>
            </div>



          </div>
        </div>
      </main>

      {/* Footer / Agreement */}
      <footer className="flex shrink-0 h-auto flex-col md:flex-row items-center justify-between p-4 md:px-8 gap-4 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        {!isMobile ? (
          /* Desktop Footer Layout */
          <>
            <div className="flex items-start md:items-center gap-3">
              <Checkbox 
                id="agree" 
                checked={agreed} 
                onCheckedChange={(val) => setAgreed(val === true)}
                className="h-5 w-5 rounded-none border-slate-300 mt-1 md:mt-0"
              />
              <label htmlFor="agree" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                I have read and understood the instructions. I agree that in case of any disqualification, the decision of the authority will be final.
              </label>
            </div>
            <Button
              onClick={() => {
                if (cameraRequired && !cameraStream) return;
                startedRef.current = true;
                onStart(cameraStream);
              }}
              disabled={!agreed || (cameraRequired && !cameraStream)}
              className={`w-full md:w-auto h-11 px-10 rounded-none font-bold uppercase tracking-widest transition-all ${
                agreed && (!cameraRequired || cameraStream)
                  ? "bg-blue-600 hover:bg-blue-700 text-white" 
                  : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
              }`}
            >
              Begin Test
            </Button>
          </>
        ) : (
          /* Mobile Footer Step-by-Step Layout */
          <div className="w-full">
            {step === 1 ? (
              <Button
                onClick={() => setStep(2)}
                className="w-full h-11 rounded-none font-bold uppercase tracking-widest bg-blue-600 hover:bg-blue-700 text-white"
              >
                Next
              </Button>
            ) : (
              <div className="flex flex-col w-full gap-4">
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id="agree" 
                    checked={agreed} 
                    onCheckedChange={(val) => setAgreed(val === true)}
                    className="h-5 w-5 rounded-none border-slate-300 mt-1"
                  />
                  <label htmlFor="agree" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
                    I have read and understood the instructions. I agree that in case of any disqualification, the decision of the authority will be final.
                  </label>
                </div>
                <div className="flex gap-4 w-full">
                  <Button
                    onClick={() => setStep(1)}
                    variant="outline"
                    className="flex-1 h-11 rounded-none font-bold uppercase tracking-widest border-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900"
                  >
                    Back
                  </Button>
                  <Button
                    onClick={() => {
                      if (cameraRequired && !cameraStream) return;
                      startedRef.current = true;
                      onStart(cameraStream);
                    }}
                    disabled={!agreed || (cameraRequired && !cameraStream)}
                    className={`flex-1 h-11 rounded-none font-bold uppercase tracking-widest transition-all ${
                      agreed && (!cameraRequired || cameraStream)
                        ? "bg-blue-600 hover:bg-blue-700 text-white" 
                        : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
                    }`}
                  >
                    Begin Test
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </footer>

    </div>
  );
}
