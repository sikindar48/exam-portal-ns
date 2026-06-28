import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { ClipboardList, CheckCircle2, FileSpreadsheet, Loader2, Star, ThumbsUp, Award } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { auth } from "@/integrations/firebase/client";
import { feedbacksApi } from "@/services/api/client";

export default function SubmitSuccess() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [downloading, setDownloading] = useState(false);

  const candidateName = searchParams.get("name") || "Student";
  const orgName = searchParams.get("org") || "";
  const orgLogoUrl = searchParams.get("logo") || null;
  const isGuest = searchParams.get("isGuest") === "true";
  const attemptId = searchParams.get("attemptId") || "";
  const token = searchParams.get("token") || "";

  // Results visibility attributes
  const resultsVisible = searchParams.get("results_visible") === "true";
  const reportDownloadEnabled = searchParams.get("report_download_enabled") === "true";

  const score = searchParams.get("score") || "0";
  const totalMarks = searchParams.get("total_marks") || "0";
  const percentage = searchParams.get("percentage") || "0";
  const correct = searchParams.get("correct") || "0";
  const wrong = searchParams.get("wrong") || "0";
  const skipped = searchParams.get("skipped") || "0";

  // Feedback form states
  const [ratings, setRatings] = useState<Record<string, number>>({
    fast_smooth: 0,
    easy_to_use: 0,
    strong_security: 0,
    faced_errors: 0,
    good_design: 0
  });
  const [hoverRatings, setHoverRatings] = useState<Record<string, number>>({
    fast_smooth: 0,
    easy_to_use: 0,
    strong_security: 0,
    faced_errors: 0,
    good_design: 0
  });
  const [feedbackText, setFeedbackText] = useState("");
  const [isSubmittingFeedback, setIsSubmittingFeedback] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(() => {
    return localStorage.getItem(`feedback_submitted_${attemptId}`) === "true";
  });

  // Flow step control (Step 1 = Feedback form, Step 2 = Results screen)
  const [step, setStep] = useState<number>(() => {
    return localStorage.getItem(`feedback_submitted_${attemptId}`) === "true" ? 2 : 1;
  });

  const categories = [
    { key: "fast_smooth", label: "Fast & Smooth", desc: "Platform speed and responsiveness" },
    { key: "easy_to_use", label: "Easy to Use", desc: "Clear navigation and layout" },
    { key: "strong_security", label: "Strong Security", desc: "Security and stability feelings" },
    { key: "faced_errors", label: "Faced Errors / Issues", desc: "5 stars = No errors, 1 star = Many errors" },
    { key: "good_design", label: "Good Design", desc: "Aesthetics, fonts, and dark mode" }
  ] as const;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.values(ratings).some(r => r === 0)) {
      toast({
        title: "Ratings Required",
        description: "Please rate all 5 categories before submitting.",
        variant: "destructive"
      });
      return;
    }
    setIsSubmittingFeedback(true);
    try {
      const { error } = await feedbacksApi.submit({
        attempt_id: attemptId,
        fast_smooth: ratings.fast_smooth,
        easy_to_use: ratings.easy_to_use,
        strong_security: ratings.strong_security,
        faced_errors: ratings.faced_errors,
        good_design: ratings.good_design,
        feedback_text: feedbackText
      }, token);

      if (error) throw error;

      localStorage.setItem(`feedback_submitted_${attemptId}`, "true");
      setFeedbackSubmitted(true);
      toast({
        title: "Thank You!",
        description: "Your feedback has been recorded successfully."
      });
      setStep(2);
    } catch (err: any) {
      toast({
        title: "Feedback Failed",
        description: err.message || "Failed to submit feedback.",
        variant: "destructive"
      });
    } finally {
      setIsSubmittingFeedback(false);
    }
  };

  const handleDownloadReport = async () => {
    if (!attemptId) return;
    setDownloading(true);
    try {
      const tokenParam = token ? `?token=${encodeURIComponent(token)}` : "";
      const url = `${import.meta.env.VITE_API_URL || ""}/api/attempts/${attemptId}/report${tokenParam}`;
      
      const firebaseToken = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      const headers: Record<string, string> = {};
      if (firebaseToken) {
        headers["Authorization"] = `Bearer ${firebaseToken}`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to download report");
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = `Performance_Report_${attemptId}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(blobUrl);

      toast({
        title: "Download Started",
        description: "Your detailed performance report has been downloaded.",
      });
    } catch (err: any) {
      toast({
        title: "Download Failed",
        description: err.message || "Failed to download the performance report.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 font-sans select-none overflow-hidden">
      {/* Premium Dark Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-8 shrink-0 shadow-md">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            {orgLogoUrl ? (
              <img src={orgLogoUrl} alt={orgName} className="h-full w-full object-cover" />
            ) : (
              <ClipboardList className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] truncate">
              {orgName ? `${orgName} Portal` : "Student Portal"}
            </h1>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">Secure Testing System</p>
          </div>
        </div>
        <div className="text-right min-w-0 pl-2">
          <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mb-1">Candidate</p>
          <p className="text-xs font-bold text-slate-200 truncate max-w-[100px] sm:max-w-[200px]">{candidateName}</p>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto flex flex-col items-center justify-start px-6 py-8 bg-slate-50 dark:bg-slate-950">
        
        {step === 1 ? (
          /* STEP 1: FEEDBACK PANEL */
          <div className="max-w-xl w-full space-y-6 bg-white dark:bg-slate-900 p-8 border border-slate-100 dark:border-slate-800 shadow-xl rounded-none">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-900 animate-fade-in-scale">
                  <CheckCircle2 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                  Test Submitted Successfully!
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-center">
                  Your responses have been securely recorded.
                </p>
              </div>
            </div>

            {/* Form */}
            <div className="border border-slate-100 dark:border-slate-800 p-6 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-2">
                <ThumbsUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                Please share your feedback
              </h3>
              
              <form onSubmit={handleFeedbackSubmit} className="space-y-4">
                <div className="space-y-3">
                  {categories.map((cat) => {
                    const currentRating = ratings[cat.key];
                    const currentHover = hoverRatings[cat.key];
                    return (
                      <div key={cat.key} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/60 shadow-sm transition-all hover:border-slate-200 dark:hover:border-slate-800">
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{cat.label}</p>
                          <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{cat.desc}</p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          {[1, 2, 3, 4, 5].map((star) => {
                            const active = star <= (currentHover || currentRating);
                            return (
                              <button
                                type="button"
                                key={star}
                                onClick={() => setRatings(prev => ({ ...prev, [cat.key]: star }))}
                                onMouseEnter={() => setHoverRatings(prev => ({ ...prev, [cat.key]: star }))}
                                onMouseLeave={() => setHoverRatings(prev => ({ ...prev, [cat.key]: 0 }))}
                                className="p-0.5 transition-transform duration-100 active:scale-95 focus:outline-none"
                              >
                                <Star
                                  className={`h-5 w-5 ${
                                    active
                                      ? "text-amber-500 fill-amber-500 drop-shadow-[0_0_2px_rgba(245,158,11,0.4)]"
                                      : "text-slate-200 dark:text-slate-800"
                                  }`}
                                />
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="space-y-1">
                  <label htmlFor="feedback-text" className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                    Additional Comments (Optional)
                  </label>
                  <textarea
                    id="feedback-text"
                    value={feedbackText}
                    onChange={(e) => setFeedbackText(e.target.value)}
                    placeholder="Tell us about your experience..."
                    maxLength={500}
                    className="w-full min-h-[60px] p-3 text-xs bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-slate-400"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmittingFeedback || Object.values(ratings).some(r => r === 0)}
                  className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black uppercase tracking-widest rounded-none transition-all duration-300 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400"
                >
                  {isSubmittingFeedback ? "Submitting..." : "Submit Feedback & View Results"}
                </Button>
              </form>
            </div>
          </div>
        ) : (
          /* STEP 2: TEST RESULTS PANEL */
          <div className="max-w-xl w-full space-y-6 bg-white dark:bg-slate-900 p-8 border border-slate-100 dark:border-slate-800 shadow-xl rounded-none">
            {/* Header */}
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="h-16 w-16 bg-blue-50 dark:bg-blue-950/30 rounded-full flex items-center justify-center border border-blue-100 dark:border-blue-900 animate-fade-in-scale">
                  <Award className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
              <div className="space-y-2 text-center">
                <h2 className="text-2xl font-black text-blue-600 dark:text-blue-400 uppercase tracking-tight">
                  Your Performance Report
                </h2>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-medium text-center">
                  Review your score breakdown below.
                </p>
              </div>
            </div>

            {/* Results Grid */}
            {!resultsVisible ? (
              <div className="bg-slate-50 dark:bg-slate-950/50 p-6 text-center border border-slate-100 dark:border-slate-800 space-y-2">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">Results Pending</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Detailed results and scores will be released by the administrator.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Score Display Card */}
                <div className="bg-blue-50/50 dark:bg-blue-950/10 p-6 border border-blue-100/30 dark:border-blue-900/30 grid grid-cols-2 gap-4">
                  <div className="text-center border-r border-slate-200/50 dark:border-slate-800">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Score</p>
                    <p className="text-3xl font-black text-slate-800 dark:text-slate-100 mt-1">
                      {score} <span className="text-sm text-slate-400">/ {totalMarks}</span>
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Percentage</p>
                    <p className="text-3xl font-black text-blue-600 dark:text-blue-400 mt-1">
                      {percentage}%
                    </p>
                  </div>
                </div>

                {/* Metrics Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black uppercase text-green-600">Correct</p>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200 mt-0.5">{correct}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black uppercase text-red-500">Wrong</p>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200 mt-0.5">{wrong}</p>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900/30 p-3 text-center border border-slate-100 dark:border-slate-800">
                    <p className="text-[8px] font-black uppercase text-slate-400">Skipped</p>
                    <p className="text-lg font-black text-slate-700 dark:text-slate-200 mt-0.5">{skipped}</p>
                  </div>
                </div>

                {/* Report Download */}
                {reportDownloadEnabled && (
                  <div className="pt-2">
                    <Button
                      onClick={handleDownloadReport}
                      disabled={downloading}
                      className="w-full h-11 bg-green-600 hover:bg-green-700 text-white text-xs font-black uppercase tracking-widest rounded-none flex items-center justify-center gap-2"
                    >
                      {downloading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileSpreadsheet className="h-4 w-4" />
                      )}
                      {downloading ? "Generating Report..." : "Download XLSX Report"}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Exit/Dashboard action buttons */}
            <div className="flex flex-col gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
              <Button
                onClick={() => navigate(isGuest ? "/join" : "/student")}
                variant="outline"
                className="w-full h-11 border-slate-200 dark:border-slate-800 rounded-none text-xs font-black uppercase tracking-widest transition-all duration-300"
              >
                {isGuest ? "Exit to Join Screen" : "Return to Dashboard"}
              </Button>
            </div>
          </div>
        )}

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
