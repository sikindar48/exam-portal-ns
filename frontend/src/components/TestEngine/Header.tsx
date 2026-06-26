import { useState } from "react";
import { LayoutGrid, Clock, Info, X, Target, AlertTriangle, Menu } from "lucide-react";
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
  sectionName
}: HeaderProps) {
  const [showInfo, setShowInfo] = useState(false);

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
        <div className="flex items-center gap-1.5 md:gap-3">
          {sectionName && (
            <span className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-bold uppercase tracking-wider rounded">
              Section: {sectionName}
            </span>
          )}

          {sectionTimeLeft !== null && sectionTimeLeft !== undefined && (
            <div className={`flex items-center gap-1.5 px-2.5 py-1 md:px-3.5 md:py-1.5 rounded-full border shadow-sm transition-all duration-300 ${
              sectionTimeLeft < 60 
                ? "border-orange-500/40 bg-orange-500/15 text-orange-400 animate-pulse" 
                : "border-blue-500/20 bg-blue-500/5 text-blue-400"
            }`}>
              <Clock className={`h-3.5 w-3.5 md:h-4 md:w-4 ${sectionTimeLeft < 60 ? "text-orange-400 animate-pulse" : "text-blue-400"}`} />
              <span className={`font-mono text-xs md:text-sm font-bold tracking-wide tabular-nums ${sectionTimeLeft < 60 ? "text-orange-400" : "text-blue-400"}`}>
                {formatTime(sectionTimeLeft)}
              </span>
            </div>
          )}

          {/* Timer */}
          <div className={`flex items-center gap-1.5 px-3 py-1 md:px-4 md:py-1.5 rounded-full border shadow-md transition-all duration-300 ${
            timeLeft < 300 
              ? "border-red-500/40 bg-red-500/15 text-red-400 animate-pulse shadow-red-500/5" 
              : "border-slate-700 bg-slate-800/80 text-emerald-400 shadow-slate-950/20"
          }`}>
            <Clock className={`h-3.5 w-3.5 md:h-4 md:w-4 ${timeLeft < 300 ? "text-red-400" : "text-emerald-400"}`} />
            <span className={`font-mono text-xs md:text-sm font-bold tracking-wider tabular-nums ${timeLeft < 300 ? "text-red-400" : "text-emerald-400"}`}>
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
            className="absolute right-4 top-[68px] w-80 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-700 px-4 py-3">
              <p className="text-xs font-bold uppercase tracking-widest text-slate-600 dark:text-slate-300">Quick Reference</p>
              <button onClick={() => setShowInfo(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-white">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Duration</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{duration} min</p>
              </div>
              <div className="px-4 py-3">
                <p className="text-[10px] uppercase tracking-widest text-slate-400">Questions</p>
                <p className="text-sm font-bold text-slate-800 dark:text-white">{questionCount}</p>
              </div>
            </div>

            {/* Scoring */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Correct</span>
                <span className="font-semibold text-green-600">+1 mark</span>
              </div>
              {negativeMarking && (
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Wrong</span>
                  <span className="font-semibold text-red-500">−{negativeMarks} mark</span>
                </div>
              )}
              <div className="flex justify-between text-xs">
                <span className="text-slate-500">Unattempted</span>
                <span className="font-semibold text-slate-400">0 marks</span>
              </div>
            </div>

            {/* Legend */}
            <div className="px-4 py-3 grid grid-cols-2 gap-2">
              {[
                { color: "bg-green-500", label: "Answered" },
                { color: "bg-purple-500", label: "For Review" },
                { color: "bg-red-100 border border-red-300", label: "Not Answered" },
                { color: "bg-white border border-slate-300", label: "Not Visited" },
              ].map(({ color, label }) => (
                <div key={label} className="flex items-center gap-2">
                  <div className={`h-3 w-3 shrink-0 ${color}`} />
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
