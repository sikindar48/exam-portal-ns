import { Button } from "@/components/ui/button";
import { User } from "lucide-react";

interface SidebarProps {
  studentName: string;
  sections: any[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  markedForReview: Record<string, boolean>;
  visitedQuestions: Record<string, boolean>;
  onNavigate: (index: number) => void;
  onSubmit: () => void;
  disableSubmit: boolean;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

export function Sidebar({
  studentName,
  sections,
  currentQuestionIndex,
  answers,
  markedForReview,
  visitedQuestions,
  onNavigate,
  onSubmit,
  disableSubmit,
  isSidebarOpen,
  setIsSidebarOpen,
}: SidebarProps) {
  let globalIndex = 0;
  const totalAnswered = Object.keys(answers).length;
  const totalMarked = Object.keys(markedForReview).filter((k) => markedForReview[k]).length;
  const totalQuestions = sections.reduce((acc, s) => acc + s.questions.length, 0);

  return (
    <>
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setIsSidebarOpen?.(false)}
        />
      )}
      <aside className={`fixed md:relative top-16 md:top-0 right-0 h-[calc(100vh-4rem)] md:h-full w-72 z-30 md:z-0 border-l border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 transition-transform duration-300 transform md:transform-none flex flex-col ${isSidebarOpen ? "translate-x-0" : "translate-x-full md:translate-x-0"}`}>

      {/* Candidate Info */}
      <div className="border-b border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
          <User className="h-4 w-4 text-slate-500" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-200">{studentName}</p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">Candidate</p>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 divide-x divide-slate-200 dark:divide-slate-700 border-b border-slate-200 dark:border-slate-700">
        <div className="flex flex-col items-center py-2">
          <span className="text-base font-bold text-green-600">{totalAnswered}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Answered</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="text-base font-bold text-slate-700 dark:text-slate-300">{totalQuestions - totalAnswered}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Pending</span>
        </div>
        <div className="flex flex-col items-center py-2">
          <span className="text-base font-bold text-purple-600">{totalMarked}</span>
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Marked</span>
        </div>
      </div>

      {/* Question Palette */}
      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-400">Question Palette</p>

        {sections.map((section) => (
          <div key={section.id} className="space-y-3">
            {sections.length > 1 && (
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1">
                {section.name}
              </p>
            )}
            <div className="grid grid-cols-5 gap-2">
              {section.questions.map((q: any) => {
                const idx = globalIndex++;
                const isCurrent = currentQuestionIndex === idx;
                const isAnswered = !!answers[q.id];
                const isMarked = !!markedForReview[q.id];
                const isVisited = !!visitedQuestions[q.id];

                let cls = "border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400";
                if (isCurrent)         cls = "border-2 border-blue-600 bg-blue-600 text-white font-bold";
                else if (isMarked)     cls = "border border-purple-500 bg-purple-500 text-white";
                else if (isAnswered)   cls = "border border-green-500 bg-green-500 text-white";
                else if (isVisited)    cls = "border border-red-300 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400";

                return (
                  <button
                    key={q.id}
                    onClick={() => onNavigate(idx)}
                    title={`Question ${idx + 1}`}
                    className={`h-9 w-full text-xs font-semibold transition-colors hover:opacity-80 ${cls}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="border-t border-slate-200 dark:border-slate-700 px-4 py-3 grid grid-cols-2 gap-y-2 gap-x-3">
        {[
          { color: "bg-green-500", label: "Answered" },
          { color: "bg-red-100 border border-red-300", label: "Not Answered" },
          { color: "bg-purple-500", label: "For Review" },
          { color: "bg-white border border-slate-300 dark:border-slate-600", label: "Not Visited" },
        ].map(({ color, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className={`h-3.5 w-3.5 shrink-0 ${color}`} />
            <span className="text-[11px] text-slate-500 dark:text-slate-400">{label}</span>
          </div>
        ))}
      </div>

      {/* Submit */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <Button
          onClick={onSubmit}
          disabled={disableSubmit}
          className="w-full h-10 rounded-none bg-green-600 hover:bg-green-700 text-white font-semibold text-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Test
        </Button>
        {disableSubmit && (
          <p className="mt-2 text-center text-[11px] text-slate-400">
            Answer all questions to submit
          </p>
        )}
      </div>
      </aside>
    </>
  );
}
