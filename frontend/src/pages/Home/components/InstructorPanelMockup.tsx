import { ClipboardList, Users, FileQuestion, TrendingUp, Target, Award, BarChart3 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function InstructorPanelMockup() {
  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 animate-fade-in-scale">
      {/* Premium Admin Header Replica */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-6 shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="bg-blue-600 p-1.5 rounded-sm">
            <ClipboardList className="h-5 w-5 text-white" />
          </div>
          <div className="text-left">
            <h1 className="text-xs font-black uppercase tracking-[0.2em] text-white">Admin Command Center</h1>
            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Institute Management Interface</p>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6 text-left flex-1">
        {/* Header Section */}
        <div className="flex items-end justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-4">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Overview</h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time examination & performance metrics</p>
          </div>
          <Button
            variant="outline"
            className="h-8 rounded-none border-slate-200 dark:border-slate-800 uppercase text-[9px] font-black tracking-widest bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200"
          >
            Refresh Data
          </Button>
        </div>

        {/* Core Metrics Grid */}
        <div className="grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {[
            { label: "Total Students", value: "1,240", icon: Users, color: "text-blue-600" },
            { label: "Question Bank", value: "450", icon: FileQuestion, color: "text-slate-600" },
            { label: "Active Tests", value: "8", icon: ClipboardList, color: "text-indigo-600" },
            { label: "Total Attempts", value: "3,892", icon: TrendingUp, color: "text-emerald-600" },
            { label: "Avg. Accuracy", value: "78%", icon: Target, color: "text-amber-600" },
            { label: "Success Rate", value: "92%", icon: Award, color: "text-purple-600" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none shadow-sm hover:border-blue-500 transition-all group">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                <Icon className={`h-3.5 w-3.5 ${color} opacity-70`} />
              </div>
              <p className="text-lg font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
            </div>
          ))}
        </div>

        {/* Charts & Top Performers Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Left Block: Analytics */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <BarChart3 className="h-3.5 w-3.5 text-slate-450" />
              <h3 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Examination Performance Analytics</h3>
            </div>
            <div className="h-[120px] flex items-end justify-between gap-1.5 pt-2">
              {[
                { name: "Quiz 1", val: 82 },
                { name: "Finals", val: 74 },
                { name: "Aptitude", val: 90 },
                { name: "Midterm", val: 68 },
                { name: "Math I", val: 85 }
              ].map((item, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center">
                  <div
                    style={{ height: `${item.val}%` }}
                    className="w-full bg-blue-600 hover:bg-blue-700 transition-all rounded-t-sm"
                    title={`Avg: ${item.val}%`}
                  />
                  <span className="text-[8px] font-bold text-slate-400 mt-1 uppercase tracking-tighter truncate max-w-full">
                    {item.name}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Block: Top Candidates */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-none">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Award className="h-3.5 w-3.5 text-slate-450" />
              <h3 className="text-[9px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Top Ranking Candidates</h3>
            </div>
            <div className="space-y-1.5">
              {[
                { name: "ALICE SMITH", avg: 98 },
                { name: "BOB JOHNSON", avg: 95 },
                { name: "CHARLIE BROWN", avg: 92 }
              ].map((student, i) => (
                <div key={i} className="flex items-center justify-between p-2 border border-slate-100 dark:border-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-xs">
                  <div className="flex items-center gap-3">
                    <span className={`flex h-5 w-5 items-center justify-center text-[8px] font-black ${i === 0 ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                      0{i + 1}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{student.name}</span>
                  </div>
                  <span className="font-black text-blue-600">{student.avg}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
