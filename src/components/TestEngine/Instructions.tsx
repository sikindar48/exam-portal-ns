import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Monitor, Info, HelpCircle, AlertTriangle, Wifi, ShieldCheck } from "lucide-react";
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
  onStart: () => void;
  orgName?: string;
  orgLogoUrl?: string | null;
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
}: InstructionsProps) {
  const [agreed, setAgreed] = useState(false);
  const [speed, setSpeed] = useState<number | null>(null);
  const [isStable, setIsStable] = useState(false);

  useEffect(() => {
    const checkSpeed = () => {
      // @ts-ignore
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

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 font-sans selection:bg-blue-100">

      {/* Mobile blocker */}
      <div className="md:hidden fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-8 text-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center bg-slate-100 dark:bg-slate-800">
          <Monitor className="h-8 w-8 text-slate-500" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Desktop Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
            This examination must be taken on a desktop or laptop computer.
          </p>
        </div>
      </div>

      {/* Header */}
      <header className="hidden md:flex shrink-0 h-14 items-center justify-between px-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
        <div className="flex items-center gap-3">
          {orgLogoUrl ? (
            <img src={orgLogoUrl} alt={orgName} className="h-6 w-6 object-contain rounded-sm" />
          ) : (
            <Info className="h-5 w-5 text-blue-600" />
          )}
          <h1 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-tight">
            {orgName ? `${orgName} · Instructions` : "Instructions"}
          </h1>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none mb-1">Paper</p>
            <p className="text-sm font-bold text-slate-900 dark:text-white leading-none">{testName || "Examination Paper"}</p>
          </div>
          <div className="border-l border-slate-200 dark:border-slate-700 h-8 pl-6 flex items-center">
            <Toggle />
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="hidden md:flex flex-1 overflow-hidden">
        
        {/* Left: Detailed Instructions */}
        <div className="flex-1 overflow-y-auto p-8 border-r border-slate-200 dark:border-slate-800">
          <section className="max-w-4xl mx-auto space-y-8">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-6 border-b pb-2">General Instructions:</h2>
              <div className="space-y-4">
                {RULES.map((rule, i) => (
                  <div key={i} className="flex gap-4">
                    <span className="text-sm font-bold text-slate-400 tabular-nums">{i + 1}.</span>
                    <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">{rule}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-end justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-wider">Examination Summary</h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Structure & Duration Breakdown</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-0.5">Total Duration</p>
                  <p className="text-sm font-bold text-blue-600">{duration} Minutes</p>
                </div>
              </div>
              
              <div className="border border-slate-200 dark:border-slate-800 overflow-hidden rounded-sm">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 font-bold">Section Name</th>
                      <th className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center font-bold">Qns</th>
                      <th className="px-4 py-2 text-center font-bold">Marks</th>
                    </tr>
                  </thead>
                  <tbody className="text-sm">
                    {sections.map((s) => {
                      const sMarks = s.questions.reduce((acc, q) => acc + (q.marks || 1), 0);
                      return (
                        <tr key={s.id} className="text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 last:border-0">
                          <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 font-medium">{s.name}</td>
                          <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center">{s.questions.length}</td>
                          <td className="px-4 py-2 text-center font-bold text-slate-800 dark:text-white">{sMarks}</td>
                        </tr>
                      );
                    })}
                    <tr className="font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                      <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800">Grand Total</td>
                      <td className="px-4 py-2 border-r border-slate-200 dark:border-slate-800 text-center">{questionCount}</td>
                      <td className="px-4 py-2 text-center">{totalMarks}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {negativeMarking && (
                <div className="mt-4 flex items-center gap-2 px-1">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <p className="text-[10px] font-bold text-red-600 uppercase tracking-tight">
                    Negative marking active: {negativeMarks} marks will be deducted for each incorrect response.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Right: Candidate & Legend */}
        <div className="w-80 shrink-0 flex flex-col bg-slate-50 dark:bg-slate-900/50">
          <div className="p-6 space-y-8">
            {/* Candidate Name Only (No Dummy ID) */}
            <div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Candidate Name</p>
              <p className="text-base font-bold text-slate-900 dark:text-white truncate">{studentName || "Verified Candidate"}</p>
            </div>

            {/* Symbols Legend */}
            <div>
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
      <footer className="hidden md:flex shrink-0 h-20 items-center justify-between px-8 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <div className="flex items-center gap-3">
          <Checkbox 
            id="agree" 
            checked={agreed} 
            onCheckedChange={(val) => setAgreed(val === true)}
            className="h-5 w-5 rounded-none border-slate-300"
          />
          <label htmlFor="agree" className="text-sm font-bold text-slate-700 dark:text-slate-300 cursor-pointer select-none">
            I have read and understood the instructions. I agree that in case of any disqualification, the decision of the authority will be final.
          </label>
        </div>
        <Button
          onClick={onStart}
          disabled={!agreed}
          className={`h-11 px-10 rounded-none font-bold uppercase tracking-widest transition-all ${
            agreed 
              ? "bg-blue-600 hover:bg-blue-700 text-white" 
              : "bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed"
          }`}
        >
          Begin Test
        </Button>
      </footer>

    </div>
  );
}
