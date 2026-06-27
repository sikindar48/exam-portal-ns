import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Laptop, Users, GraduationCap } from "lucide-react";
import { ExamEngineMockup } from "./ExamEngineMockup";
import { InstructorPanelMockup } from "./InstructorPanelMockup";
import { StudentPortalMockup } from "./StudentPortalMockup";

export function PreviewSection() {
  const [activeTab, setActiveTab] = useState<"engine" | "dashboard" | "student">("engine");
  const [examOption, setExamOption] = useState<number | null>(null);

  return (
    <section id="preview" className="hidden md:block py-16 px-4 md:px-8 border-y border-slate-200 dark:border-slate-900 bg-slate-100/50 dark:bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-10">
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
            Explore the Workspace
          </Badge>
          <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">
            Intuitive Interface
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
            Explore the exam workspaces designed for both administrators and student test takers.
          </p>
        </div>

        <div className="flex justify-center gap-1.5 mb-8 p-1.5 bg-slate-100 dark:bg-slate-955 border border-slate-200 dark:border-slate-900 rounded-xl max-w-md mx-auto">
          {(["engine", "dashboard", "student"] as const).map((tab) => {
            const labels = { engine: "Exam Engine", dashboard: "Instructor", student: "Student" };
            const icons = {
              engine: <Laptop className="h-3.5 w-3.5" />,
              dashboard: <Users className="h-3.5 w-3.5" />,
              student: <GraduationCap className="h-3.5 w-3.5" />,
            };
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                  activeTab === tab
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm border border-slate-200 dark:border-slate-800"
                    : "text-slate-500 dark:text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                }`}
              >
                {icons[tab]}
                <span className="hidden xs:inline">{labels[tab]}</span>
              </button>
            );
          })}
        </div>

        <div className="bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-900 overflow-x-auto max-w-5xl mx-auto shadow-2xl p-1 shadow-black/5 dark:shadow-black/80 scrollbar-thin">
          <div className="min-w-[768px] md:min-w-0 min-h-[520px] relative">
            <div className={activeTab === "engine" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
              <ExamEngineMockup examOption={examOption} setExamOption={setExamOption} />
            </div>
            <div className={activeTab === "dashboard" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
              <InstructorPanelMockup />
            </div>
            <div className={activeTab === "student" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
              <StudentPortalMockup />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
