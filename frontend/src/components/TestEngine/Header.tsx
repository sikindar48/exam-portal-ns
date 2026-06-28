import { useState } from "react";
import { LayoutGrid, Clock, Info, X, Target, AlertTriangle, Menu, Layers } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

interface HeaderProps {
  testName: string;
  timeLeft: number;
  formatTime: (seconds: number) => string;
  duration?: number;
  questionCount?: number;
  negativeMarking?: boolean;
  negativeMarks?: number;
  attemptNumber?: number;
  attemptsAllowed?: number | null;
  orgName?: string;
  orgLogoUrl?: string | null;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
  sectionTimeLeft?: number | null;
  sectionName?: string;
  sections?: any[];
}

export function Header({ 
  testName, 
  timeLeft, 
  formatTime, 
  duration, 
  questionCount, 
  negativeMarking, 
  negativeMarks,
  attemptNumber,
  attemptsAllowed,
  orgName,
  orgLogoUrl,
  isSidebarOpen,
  setIsSidebarOpen,
  sectionTimeLeft,
  sectionName,
  sections
}: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<"info" | "instructions" | "summary">("info");

  return (
    <>
      <header className="z-30 flex h-14 md:h-16 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-3 md:px-6 text-white gap-2">
        {/* Left: branding */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="flex h-7 w-7 sm:h-9 sm:w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} className="h-full w-full object-cover" />
            ) : (
              <LayoutGrid className="h-4 w-4 sm:h-5 sm:w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs md:text-sm font-bold uppercase tracking-wider text-white leading-tight truncate max-w-[85px] xs:max-w-[140px] sm:max-w-xs md:max-w-md">{testName}</h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-500 font-medium truncate">
              {orgName ? `${orgName} · ` : ""}Secure Exam{attemptNumber ? ` · Att ${attemptNumber}` : ""}
            </p>
          </div>
        </div>

        {/* Right: timer + info */}
        <div className="flex items-center gap-3">
          {sectionName && (
            <div className="hidden md:flex items-center gap-2 border-r border-slate-700 pr-3 mr-1">
              <Layers className="h-4 w-4 text-blue-550 shrink-0" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest text-slate-300">
                {sectionName}
              </span>
            </div>
          )}

          {sectionTimeLeft !== null && sectionTimeLeft !== undefined && (
            <div className="flex items-center gap-2 border-r border-slate-700 pr-3 mr-1">
              <Clock className={`h-4 w-4 shrink-0 ${sectionTimeLeft < 60 ? "text-orange-500 animate-pulse" : "text-blue-500"}`} />
              <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-black text-slate-500">Sec Time:</span>
              <span className={`font-mono text-xs md:text-sm font-bold tracking-wider tabular-nums ${sectionTimeLeft < 60 ? "text-orange-400 animate-pulse" : "text-blue-400"}`}>
                {formatTime(sectionTimeLeft)}
              </span>
            </div>
          )}

          {/* Timer */}
          <div className="flex items-center gap-2 px-1 mr-1">
            <Clock className={`h-4 w-4 shrink-0 ${timeLeft < 300 ? "text-red-500 animate-pulse" : "text-green-500"}`} />
            <span className="hidden sm:inline text-[10px] uppercase tracking-widest font-black text-slate-500">Time Left:</span>
            <span className={`font-mono text-xs md:text-sm font-black tracking-wider tabular-nums ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-green-400"}`}>
              {formatTime(timeLeft)}
            </span>
          </div>

          {/* Info button */}
          <button
            onClick={() => setShowInfo(true)}
            title="View Instructions"
            className="flex h-8 w-8 md:h-9 md:w-9 items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white transition-colors"
          >
            <Info className="h-4 w-4" />
          </button>

          {/* Mobile Sidebar Toggle */}
          <button
            onClick={() => setIsSidebarOpen?.(!isSidebarOpen)}
            title="Toggle Question Palette"
            className="flex md:hidden h-8 w-8 md:h-9 md:w-9 items-center justify-center border border-slate-700 bg-slate-800 text-slate-400 hover:border-slate-500 hover:text-white transition-colors"
          >
            <Menu className="h-4 w-4" />
          </button>

          {/* Theme Toggle */}
          <div className="hidden xs:block border-l border-slate-700 pl-2 md:pl-3 ml-0.5 md:ml-1">
            <Toggle />
          </div>
        </div>
      </header>

      {/* Instructions overlay */}
      {showInfo && (
        <div className="fixed inset-0 z-50" onClick={() => setShowInfo(false)}>
          <div
            className="absolute right-4 top-[68px] w-96 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-xl z-[100]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3 bg-slate-50 dark:bg-slate-800/30">
              <p className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-300">Quick Reference</p>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 text-[10px] font-black uppercase tracking-widest bg-slate-50/50 dark:bg-slate-900/50">
              <button
                type="button"
                onClick={() => setActiveTab("info")}
                className={`flex-1 py-2 text-center border-b-2 transition-all ${
                  activeTab === "info"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-black"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Overview
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("instructions")}
                className={`flex-1 py-2 text-center border-b-2 transition-all ${
                  activeTab === "instructions"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-black"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Instructions
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("summary")}
                className={`flex-1 py-2 text-center border-b-2 transition-all ${
                  activeTab === "summary"
                    ? "border-blue-600 text-blue-600 dark:text-blue-400 font-black"
                    : "border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                }`}
              >
                Summary
              </button>
            </div>

            {/* Tab content area */}
            <div className="overflow-hidden">
              {activeTab === "info" && (
                <div>
                  {/* Stats row */}
                  <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Duration</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{duration} min</p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Questions</p>
                      <p className="text-sm font-bold text-slate-800 dark:text-white">{questionCount}</p>
                    </div>
                  </div>

                  {/* Scoring */}
                  <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Correct</span>
                      <span className="font-bold text-green-600">+1 mark</span>
                    </div>
                    {negativeMarking && (
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-500 font-semibold">Wrong</span>
                        <span className="font-bold text-red-500">−{negativeMarks} mark</span>
                      </div>
                    )}
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-500 font-semibold">Unattempted</span>
                      <span className="font-bold text-slate-400">0 marks</span>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="px-4 py-3 grid grid-cols-2 gap-2">
                    {[
                      { color: "bg-green-500", label: "Answered" },
                      { color: "bg-purple-500", label: "For Review" },
                      { color: "bg-red-100 border border-red-300 dark:bg-red-950/20 dark:border-red-900/40", label: "Not Answered" },
                      { color: "bg-white border border-slate-300 dark:bg-slate-900 dark:border-slate-700", label: "Not Visited" },
                    ].map(({ color, label }) => (
                      <div key={label} className="flex items-center gap-2">
                        <div className={`h-3 w-3 shrink-0 ${color}`} />
                        <span className="text-[11px] font-bold text-slate-550 dark:text-slate-400 uppercase tracking-tight">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === "instructions" && (
                <div className="p-4 max-h-[300px] overflow-y-auto space-y-3">
                  {[
                    "Server Clock: Remaining time is shown in the top-right corner.",
                    "Question Palette: Displays current status of all questions.",
                    "Direct Navigation: Click question numbers to jump to them.",
                    "Save & Next: Click to save your answer and move forward.",
                    "Mark for Review: Saves your answer and marks it for later check.",
                    "Auto-Save: Answers are only saved if you click 'Save & Next'.",
                    "Clear Response: Clears the selected option for the current question."
                  ].map((rule, idx) => (
                    <div key={idx} className="flex gap-3 items-start text-xs">
                      <span className="font-bold text-slate-400 tabular-nums">{idx + 1}.</span>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">{rule}</p>
                    </div>
                  ))}
                </div>
              )}

              {activeTab === "summary" && (
                <div className="p-4 max-h-[300px] overflow-y-auto space-y-4">
                  <div className="border border-slate-200 dark:border-slate-800 overflow-hidden rounded-sm bg-white dark:bg-slate-900">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900 text-[9px] uppercase tracking-widest text-slate-500 border-b border-slate-200 dark:border-slate-800">
                          <th className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 font-bold">Section</th>
                          <th className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center font-bold">Qns</th>
                          <th className="px-2.5 py-1.5 text-center font-bold">Marks</th>
                        </tr>
                      </thead>
                      <tbody className="text-xs">
                        {sections?.map((s) => {
                          const sMarks = s.questions?.reduce((acc: number, q: any) => acc + (q.marks || 1), 0) || 0;
                          return (
                            <tr key={s.id} className="text-slate-600 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 last:border-0">
                              <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 font-medium truncate max-w-[140px]">{s.name}</td>
                              <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{s.questions?.length || 0}</td>
                              <td className="px-2.5 py-1.5 text-center font-bold text-slate-800 dark:text-white">{sMarks}</td>
                            </tr>
                          );
                        })}
                        <tr className="font-bold bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white border-t border-slate-200 dark:border-slate-800">
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800">Total</td>
                          <td className="px-2.5 py-1.5 border-r border-slate-200 dark:border-slate-800 text-center">{questionCount}</td>
                          <td className="px-2.5 py-1.5 text-center">
                            {sections?.reduce((acc, s) => acc + (s.questions?.reduce((qAcc: number, q: any) => qAcc + (q.marks || 1), 0) || 0), 0) || 0}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
