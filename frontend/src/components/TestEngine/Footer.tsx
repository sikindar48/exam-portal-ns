import { ChevronLeft, ChevronRight, Flag, RotateCcw } from "lucide-react";

interface FooterProps {
  onPrevious: () => void;
  onNext: () => void;
  disablePrevious: boolean;
  disableNext: boolean;
  isMarked: boolean;
  onMarkForReview: () => void;
  onClear: () => void;
}

export function Footer({
  onPrevious,
  onNext,
  disablePrevious,
  disableNext,
  isMarked,
  onMarkForReview,
  onClear,
}: FooterProps) {
  return (
    <footer className="shrink-0 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 md:px-6 h-16 flex items-center justify-between gap-2 md:gap-4">
      {/* Left: actions */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onMarkForReview}
          className={`flex items-center gap-1 md:gap-1.5 h-9 px-2.5 md:px-4 text-xs font-semibold border transition-colors rounded-none ${
            isMarked
              ? "bg-purple-600 border-purple-600 text-white hover:bg-purple-700 hover:border-purple-700"
              : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-400 hover:text-slate-800 dark:hover:text-white dark:hover:border-slate-500"
          }`}
        >
          <Flag className="h-3.5 w-3.5 shrink-0" />
          <span>{isMarked ? "Review" : "Review"}</span>
        </button>

        <button
          onClick={onClear}
          className="flex items-center gap-1 md:gap-1.5 h-9 px-2.5 md:px-4 text-xs font-semibold rounded-none border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 hover:border-red-300 transition-colors"
        >
          <RotateCcw className="h-3.5 w-3.5 shrink-0" />
          <span>Clear</span>
        </button>
      </div>

      {/* Right: navigation */}
      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          onClick={onPrevious}
          disabled={disablePrevious}
          className="flex items-center h-9 px-3 md:px-5 text-xs font-semibold rounded-none border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:border-slate-400 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <ChevronLeft className="mr-0.5 md:mr-1 h-4 w-4 shrink-0" />
          <span>Prev</span>
        </button>

        <button
          onClick={onNext}
          disabled={disableNext}
          className="flex items-center h-9 px-3 md:px-5 text-xs font-semibold rounded-none bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:pointer-events-none"
        >
          <span>Next</span>
          <ChevronRight className="ml-0.5 md:ml-1 h-4 w-4 shrink-0" />
        </button>
      </div>
    </footer>
  );
}
