import { Clock, Info, LayoutGrid, User, Check } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ExamEngineMockupProps {
  timerText: string;
  examOption: number | null;
  setExamOption: (idx: number) => void;
}

export function ExamEngineMockup({ timerText, examOption, setExamOption }: ExamEngineMockupProps) {
  return (
    <div className="flex flex-col h-full animate-fade-in-scale">
      {/* Original test engine Header replica */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 md:px-6 text-white gap-2">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            <LayoutGrid className="h-5 w-5 text-slate-400" />
          </div>
          <div className="min-w-0 text-left">
            <h1 className="text-xs md:text-sm font-bold uppercase tracking-wider text-white leading-tight truncate">
              MATH II - GENERAL APTITUDE
            </h1>
            <p className="text-[8px] md:text-[10px] uppercase tracking-widest text-slate-500 font-medium truncate">
              NS SOFTWARE SOLUTIONS · Secure Examination · Attempt 1
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 border border-slate-700 bg-slate-800 px-4 py-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            <span className="font-mono text-lg font-bold tabular-nums text-white">
              {timerText}
            </span>
          </div>
          <button className="flex h-9 w-9 items-center justify-center border border-slate-700 bg-slate-800 text-slate-400">
            <Info className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Main exam body replica */}
      <div className="flex flex-col md:flex-row flex-1">
        {/* Left: Question area */}
        <div className="flex-1 p-6 md:p-8 space-y-6 text-left">
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-850 pb-4">
            <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
              Question 4
            </span>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 border border-slate-200 dark:border-slate-800 px-2.5 py-1">
              1 Mark
            </span>
          </div>

          <p className="text-sm md:text-[15px] leading-6 md:leading-7 text-slate-800 dark:text-slate-100 font-medium">
            An enterprise system requires an availability metric of 99.99%. Over a calendar year of 365 days, what is the maximum allowable cumulative downtime?
          </p>

          <div className="space-y-2.5">
            {[
              { key: "A", val: "Approximately 52.56 minutes" },
              { key: "B", val: "Exactly 8.76 hours" },
              { key: "C", val: "Approximately 5.26 minutes" },
              { key: "D", val: "Exactly 24.00 minutes" }
            ].map((opt, idx) => {
              const isSelected = examOption === idx;
              return (
                <div
                  key={opt.key}
                  onClick={() => setExamOption(idx)}
                  className={`flex cursor-pointer items-start gap-4 border px-5 py-3.5 transition-all ${
                    isSelected
                      ? "border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/30 border-t-blue-200 border-r-blue-200 border-b-blue-200 dark:border-t-blue-800 dark:border-r-blue-800 dark:border-b-blue-800 shadow-sm"
                      : "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-800"
                  }`}
                >
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-colors ${
                      isSelected
                        ? "border-blue-600 bg-blue-600 text-white"
                        : "border-slate-300 dark:border-slate-700 text-slate-500 dark:text-slate-400"
                    }`}
                  >
                    {opt.key}
                  </span>
                  <span
                    className={`text-sm leading-relaxed transition-colors ${
                      isSelected
                        ? "text-blue-900 dark:text-blue-100 font-bold"
                        : "text-slate-700 dark:text-slate-300"
                    }`}
                  >
                    {opt.val}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="pt-4 flex items-center justify-between border-t border-slate-200 dark:border-slate-800">
            <Button variant="outline" className="border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-850 text-xs py-1.5 h-auto">
              Mark for Review
            </Button>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 h-auto">
              Save & Next Question
            </Button>
          </div>
        </div>

        {/* Right Sidebar Replica */}
        <aside className="w-full md:w-64 border-t md:border-t-0 md:border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/60 flex flex-col text-left">
          {/* Candidate info */}
          <div className="border-b border-slate-200 dark:border-slate-850 px-4 py-3 flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-bold text-slate-800 dark:text-slate-200">John Doe</p>
              <p className="text-[10px] text-slate-400">Candidate</p>
            </div>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-850 border-b border-slate-200 dark:border-slate-850">
            <div className="flex flex-col items-center py-2">
              <span className="text-sm font-bold text-green-600">3</span>
              <span className="text-[9px] text-slate-400 uppercase font-semibold">Answered</span>
            </div>
            <div className="flex flex-col items-center py-2">
              <span className="text-sm font-bold text-slate-500">16</span>
              <span className="text-[9px] text-slate-400 uppercase font-semibold">Pending</span>
            </div>
            <div className="flex flex-col items-center py-2">
              <span className="text-sm font-bold text-purple-600">1</span>
              <span className="text-[9px] text-slate-400 uppercase font-semibold">Marked</span>
            </div>
          </div>

          {/* Question Palette Grid */}
          <div className="p-4 space-y-3 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Question Palette</p>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { idx: 1, cls: "bg-green-500 text-white border-green-500" },
                { idx: 2, cls: "bg-green-500 text-white border-green-500" },
                { idx: 3, cls: "bg-purple-500 text-white border-purple-500" },
                { idx: 4, cls: "border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/20 text-blue-600 font-bold" },
                { idx: 5, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" },
                { idx: 6, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" },
                { idx: 7, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" },
                { idx: 8, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" },
                { idx: 9, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" },
                { idx: 10, cls: "border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-400" }
              ].map((q) => (
                <button key={q.idx} className={`h-8 w-full text-xs font-semibold flex items-center justify-center ${q.cls}`}>
                  {q.idx}
                </button>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="border-t border-slate-200 dark:border-slate-800 p-3 bg-white dark:bg-slate-900/40">
            <Button className="w-full h-9 rounded-none bg-green-600 hover:bg-green-700 text-white font-semibold text-xs">
              Submit Test
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
