import { ClipboardList, LogOut, History } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StudentPortalMockup() {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in-scale">
      {/* Professional Student Dashboard Header Replica */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            <ClipboardList className="h-5 w-5 text-slate-400" />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">NS DEMO PORTAL</h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Examination Management System</p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-semibold text-slate-300">
          <span className="hidden sm:inline text-slate-300">student@nssoftware.com</span>
          <Button className="h-8 rounded-none border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[9px] uppercase tracking-wider font-bold">
            <LogOut className="h-3 w-3 mr-1.5 text-slate-400" />
            Sign Out
          </Button>
        </div>
      </header>

      <div className="p-6 space-y-6 text-left flex-1">
        {/* Available Examinations Section */}
        <div>
          <div className="flex items-end justify-between mb-4 border-b-2 border-slate-900 dark:border-slate-850 pb-2">
            <div>
              <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Available Examinations</h2>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Select a paper to begin your session</p>
            </div>
            <div className="text-right">
              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Active Papers</span>
              <p className="text-base font-black text-blue-600">2</p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {[
              { name: "MATH II - GENERAL APTITUDE", timer: 60, used: 0, allowed: 1 },
              { name: "INTRODUCTION TO COMPUTER NETWORKS", timer: 45, used: 1, allowed: 1 }
            ].map((test, idx) => {
              const exhausted = test.used >= test.allowed;
              return (
                <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none hover:border-blue-500 transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex justify-between items-start mb-2">
                      <span className={`text-[8px] font-black px-1.5 py-0.5 uppercase tracking-widest ${exhausted ? "bg-slate-100 text-slate-400 dark:bg-slate-800" : "bg-blue-50 text-blue-600 dark:bg-blue-950/40"}`}>
                        {exhausted ? "Exhausted" : "Active"}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase">{test.timer} Min</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight mb-2 truncate">
                      {test.name}
                    </h3>
                    <p className="text-[9px] font-bold text-slate-400 uppercase">
                      Attempts: <span className={exhausted ? "text-red-500" : "text-slate-600"}>{test.used} / {test.allowed}</span>
                    </p>
                  </div>
                  <Button
                    disabled={exhausted}
                    className={`w-full h-9 mt-4 rounded-none font-bold uppercase tracking-widest text-[10px] ${
                      exhausted 
                        ? "bg-slate-100 dark:bg-slate-800 text-slate-400" 
                        : "bg-slate-900 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                    }`}
                  >
                    {exhausted ? "Limit Reached" : "Start Test"}
                  </Button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Recent Performance History Section */}
        <div>
          <div className="flex items-center gap-2 mb-3 border-b border-slate-200 dark:border-slate-850 pb-2">
            <History className="h-4 w-4 text-slate-400" />
            <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-wider">Recent Performance History</h2>
          </div>

          <div className="space-y-2">
            {[
              { date: "JUNE 5, 2026", exam: "MATH I - ELEMENTARY CALCULUS", score: 28.0, total: 30, passed: true },
              { date: "MAY 28, 2026", exam: "GENERAL SCIENCE TEST", score: 11.5, total: 30, passed: false }
            ].map((attempt, idx) => (
              <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-none flex items-center justify-between gap-4 text-xs">
                <div>
                  <p className="text-[8px] font-bold text-slate-400 uppercase">{attempt.date}</p>
                  <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[180px] sm:max-w-sm">
                    {attempt.exam}
                  </h4>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="text-[8px] font-bold text-slate-400 uppercase">Score</p>
                    <p className="font-black tabular-nums">{attempt.score} <span className="text-slate-450 text-[9px]">/ {attempt.total}</span></p>
                  </div>
                  <span className={`text-[8px] font-black px-2 py-0.5 uppercase tracking-widest border ${
                    attempt.passed 
                      ? "bg-green-50 text-green-600 border-green-200 dark:bg-green-950/20 dark:border-green-800" 
                      : "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:border-red-800"
                  }`}>
                    {attempt.passed ? "Qualified" : "Failed"}
                  </span>
                  <Button variant="ghost" className="h-8 px-2.5 rounded-none border border-slate-200 dark:border-slate-800 text-[9px] uppercase tracking-wider font-bold">
                    Details
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
