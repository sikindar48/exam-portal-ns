import { useSearchParams, useNavigate } from "react-router-dom";
import { ClipboardList, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SubmitSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const candidateName = searchParams.get("name") || "Student";
  const orgName = searchParams.get("org") || "";
  const orgLogoUrl = searchParams.get("logo") || null;
  const isGuest = searchParams.get("isGuest") === "true";

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 font-sans select-none overflow-hidden">
      {/* Premium Dark Header matching the exam portal design */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-9 w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} className="h-full w-full object-cover" />
            ) : (
              <ClipboardList className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">
              {orgName ? `${orgName} Portal` : "Student Portal"}
            </h1>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Secure Testing System</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Candidate</p>
          <p className="text-xs font-bold text-slate-200 truncate max-w-[200px]">{candidateName}</p>
        </div>
      </header>

      {/* Main Success Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center bg-slate-50 dark:bg-slate-950">
        <div className="max-w-md w-full space-y-6">
          <div className="flex justify-center">
            <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-900 animate-bounce">
              <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <div className="space-y-3">
            <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
              Thanks for attending the test.
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
              It is now safe to close or navigate away from the current window.
            </p>
          </div>

          <div className="pt-4 flex flex-col gap-2">
            <Button
              onClick={() => navigate(isGuest ? "/join" : "/student")}
              className="w-full h-11 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 text-xs font-black uppercase tracking-widest rounded-none transition-all"
            >
              {isGuest ? "Exit to Join Screen" : "Return to Dashboard"}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer Branding */}
      <footer className="h-12 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-center shrink-0">
        <p className="text-[10px] text-slate-400 dark:text-slate-500 uppercase font-bold tracking-widest">
          NS Exam Portal &nbsp;·&nbsp; Secure Testing System
        </p>
      </footer>
    </div>
  );
}
