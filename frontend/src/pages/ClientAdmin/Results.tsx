import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { testsApi, testQuestionsApi, attemptsApi, profilesApi } from "@/integrations/turso/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Download, User, Clock, CheckCircle2, Eye } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Footer } from "@/components/Brand/Footer";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { testQuestionsApi, attemptAnswersApi } from "@/integrations/turso/client";

export default function Results() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [testInfo, setTestInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "correct" | "incorrect" | "unattempted" | "review">("all");

  useEffect(() => {
    if (testId) {
      fetchResults();
    }
  }, [testId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Fetch test info and questions count in parallel
      const [testRes, qCountRes] = await Promise.all([
        testsApi.get(testId),
        testQuestionsApi.list(testId)
      ]);

      if (!testRes.data) throw new Error("Test not found");
      
      setTestInfo(testRes.data);
      setTotalQuestions(qCountRes.data?.length || 0);

      // Fetch attempts with answers count nested
      const attemptsRes = await attemptsApi.listForTest(testId);
      const attemptsData = attemptsRes.data?.filter((a: any) => a.status === "submitted") || [];

      if (attemptsData && attemptsData.length > 0) {
        const studentIds = [...new Set(attemptsData.map((a: any) => a.student_id))];
        
        const profileRes = await profilesApi.getByIds(studentIds);
        const profileData = profileRes.data || [];
        const profileMap = new Map(profileData.map((p: any) => [p.id, p]));
        
        const mergedResults = attemptsData.map((a: any) => ({
          ...a,
          profiles: profileMap.get(a.student_id)
        }));
        setResults(mergedResults);
      } else {
        setResults([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const viewAttemptDetails = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setShowDetailDialog(true);
    setDetailLoading(true);
    try {
      // Fetch test questions first
      const qRes = await testQuestionsApi.list(testId, true);
      const qData = qRes.data || [];

      // Fetch student's answers for this attempt
      const answersRes = await attemptAnswersApi.list(attempt.id);
      const answersData = answersRes.data || [];

      const answersMap = new Map(answersData.map((a: any) => [a.question_id, a]));

      const questionsList = qData
        ?.filter((tq: any) => tq.questions)
        .map((tq: any) => {
          const q = tq.questions as any;
          const ans = answersMap.get(q.id);
          return {
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            marks: q.marks,
            student_answer: ans?.selected_option || null,
            marked_for_review: ans?.marked_for_review || false,
          };
        }) || [];

      setAttemptQuestions(questionsList);
      setFilterTab("all");
    } catch (err: any) {
      toast({ title: "Failed to load details", description: err.message, variant: "destructive" });
      setShowDetailDialog(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportResults = () => {
    if (results.length === 0) return;
    
    const headers = ["Student Name", "Email", "Score", "Total Marks", "Time Taken", "Submitted At"];
    const csvContent = [
      headers.join(","),
      ...results.map(r => [
        `"${r.profiles?.name || 'N/A'}"`,
        r.profiles?.email || "N/A",
        r.score,
        r.total_marks,
        formatTime(r.time_taken),
        new Date(r.submitted_at).toLocaleString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${testInfo?.test_name || 'test'}_results.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Examination Papers" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              onClick={() => navigate("/client-admin/tests")}
              className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex flex-col">
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">Performance Analytics</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{testInfo?.test_name || "Assessment"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Toggle />
            <Button
              onClick={exportResults}
              disabled={results.length === 0}
              className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <Download className="mr-2 h-3.5 w-3.5" /> Export Data
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white">{results.length}</h3>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Score</p>
                <h3 className="text-3xl font-black text-blue-600">
                  {results.length > 0 
                    ? (results.reduce((acc, r) => acc + (r.score / r.total_marks), 0) / results.length * 100).toFixed(1)
                    : "0.0"
                  }%
                </h3>
              </div>
              <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{"Pass Rate (>=40%)"}</p>
                <h3 className="text-3xl font-black text-emerald-600">
                  {results.length > 0
                    ? (results.filter(r => (r.score / r.total_marks) >= 0.4).length / results.length * 100).toFixed(1)
                    : "0.0"
                  }%
                </h3>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Candidate Score sheets</p>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6">Candidate</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Score</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Attempted Qs</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Duration</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Submission Date</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4 pr-6">Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-6"><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-12 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-12 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-16 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell className="text-right"><div className="h-4 w-28 ml-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell className="text-right pr-6"><div className="h-8 w-8 ml-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                        </TableRow>
                      ))
                    ) : results.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                          No assessment submissions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      results.map((r) => {
                        const attemptedCount = r.attempt_answers?.[0]?.count || 0;
                        return (
                          <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-all">
                            <TableCell className="font-bold text-slate-900 dark:text-white uppercase tracking-tight py-4 pl-6">
                              {r.profiles?.name || "Anonymous Candidate"}
                            </TableCell>
                            <TableCell className="text-center font-black text-slate-900 dark:text-white tabular-nums text-xs">
                              {r.score} <span className="text-slate-400">/ {r.total_marks}</span>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 tabular-nums text-xs">
                              {attemptedCount} <span className="text-slate-400">/ {totalQuestions}</span>
                            </TableCell>
                            <TableCell className="text-center text-slate-500 font-bold text-xs">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3" />
                                <span>{formatTime(r.time_taken)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              {new Date(r.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-right pr-6">
                              <Button
                                variant="ghost"
                                onClick={() => viewAttemptDetails(r)}
                                className="h-8 w-8 rounded-none border border-slate-200 dark:border-slate-800 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl p-6 font-sans">
            <DialogHeader className="border-b pb-4 mb-4">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Attempt Evaluation Sheet
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                <span>Candidate: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt?.profiles?.name || "N/A"}</strong></span>
                <span>Score: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt?.score}/{selectedAttempt?.total_marks}</strong></span>
                <span>Submitted: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt && new Date(selectedAttempt.submitted_at).toLocaleString()}</strong></span>
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="py-12 flex flex-col items-center justify-center gap-4">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Evaluation Sheets...</p>
              </div>
            ) : (() => {
              const counts = {
                all: attemptQuestions.length,
                correct: attemptQuestions.filter(q => (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase() && q.student_answer).length,
                incorrect: attemptQuestions.filter(q => (q.student_answer || '').trim().toUpperCase() !== (q.correct_answer || '').trim().toUpperCase() && q.student_answer).length,
                unattempted: attemptQuestions.filter(q => !q.student_answer).length,
                review: attemptQuestions.filter(q => q.marked_for_review).length,
              };

              const filteredQuestions = attemptQuestions.filter((q) => {
                const isCorrect = (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                const isUnattempted = !q.student_answer;
                if (filterTab === "all") return true;
                if (filterTab === "correct") return isCorrect && !isUnattempted;
                if (filterTab === "incorrect") return !isCorrect && !isUnattempted;
                if (filterTab === "unattempted") return isUnattempted;
                if (filterTab === "review") return !!q.marked_for_review;
                return true;
              });

              return (
                <div className="space-y-6">
                  {/* Premium Filter Tabs */}
                  <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                    {([
                      { id: "all", label: "All Questions" },
                      { id: "correct", label: "Correct" },
                      { id: "incorrect", label: "Incorrect" },
                      { id: "unattempted", label: "Unattempted" },
                      { id: "review", label: "Marked for Review" },
                    ] as const).map((tab) => (
                      <button
                        key={tab.id}
                        onClick={() => setFilterTab(tab.id)}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${
                          filterTab === tab.id
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                            : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400"
                        }`}
                      >
                        {tab.label} ({counts[tab.id]})
                      </button>
                    ))}
                  </div>

                  {filteredQuestions.length === 0 ? (
                    <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                      No questions found matching this filter.
                    </div>
                  ) : (
                    filteredQuestions.map((q, idx) => {
                      const overallIdx = attemptQuestions.findIndex(aq => aq.id === q.id);
                      const displayIdx = overallIdx !== -1 ? overallIdx + 1 : idx + 1;
                      const isCorrect = (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                      const isUnattempted = !q.student_answer;
                      
                      return (
                        <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="flex items-start justify-between gap-4">
                            <div className="space-y-1">
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {displayIdx}</span>
                              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{q.question_text}</p>
                            </div>
                            <span className="text-[10px] font-black px-2.5 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 uppercase tracking-tight">
                              {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                            {(["a", "b", "c", "d"] as const).map((opt) => {
                              const optKey = `option_${opt}`;
                              const optText = q[optKey];
                              const optionLetter = opt.toUpperCase();
                              
                              const isStudentChoice = q.student_answer === optionLetter;
                              const isCorrectChoice = q.correct_answer === optionLetter;

                              let optionStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                              if (isStudentChoice) {
                                optionStyle = isCorrect
                                  ? "border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-900 dark:text-green-200 border-l-4"
                                  : "border-red-600 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 border-l-4";
                              } else if (isCorrectChoice) {
                                optionStyle = "border-green-500 bg-green-50/20 dark:bg-green-950/10 text-green-800 dark:text-green-300";
                              }

                              return (
                                <div key={opt} className={`flex items-start gap-3 border px-4 py-2.5 text-xs transition-all ${optionStyle}`}>
                                  <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                    isStudentChoice
                                      ? isCorrect
                                        ? "border-green-600 bg-green-600 text-white"
                                        : "border-red-600 bg-red-600 text-white"
                                      : isCorrectChoice
                                        ? "border-green-500 bg-green-500 text-white"
                                        : "border-slate-300 dark:border-slate-700 text-slate-500"
                                  }`}>
                                    {optionLetter}
                                  </span>
                                  <span className="leading-relaxed">{optText}</span>
                                </div>
                              );
                            })}
                          </div>

                          <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-black uppercase tracking-wider">
                            <div className="flex items-center gap-3">
                              {isUnattempted ? (
                                <span className="text-slate-400">Status: Skipped (Unattempted)</span>
                              ) : isCorrect ? (
                                <span className="text-green-600">Status: Correct (+{q.marks} Marks)</span>
                              ) : (
                                <span className="text-red-600 font-bold">Status: Incorrect (Correct Option is {q.correct_answer})</span>
                              )}
                            </div>
                            {q.marked_for_review && (
                              <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2.5 py-0.5 font-black uppercase tracking-wider">
                                Marked for Review
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Footer />
      </div>
    </div>
  );
}
