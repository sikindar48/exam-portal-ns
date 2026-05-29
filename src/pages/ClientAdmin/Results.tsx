import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
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
        supabase
          .from("tests")
          .select("test_name, timer")
          .eq("id", testId)
          .single(),
        supabase
          .from("test_questions")
          .select("question_id", { count: "exact", head: true })
          .eq("test_id", testId)
      ]);

      if (testRes.error) throw testRes.error;
      setTestInfo(testRes.data);
      setTotalQuestions(qCountRes.count || 0);

      // Fetch attempts with answers count nested
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("attempts")
        .select(`
          *,
          attempt_answers(count)
        `)
        .eq("test_id", testId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      if (attemptsData && attemptsData.length > 0) {
        const studentIds = [...new Set(attemptsData.map(a => a.student_id))];
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", studentIds);

        if (profileError) {
          console.error("Error fetching profiles:", profileError);
          setResults(attemptsData);
        } else {
          const profileMap = new Map(profileData.map(p => [p.id, p]));
          const mergedResults = attemptsData.map(a => ({
            ...a,
            profiles: profileMap.get(a.student_id)
          }));
          setResults(mergedResults);
        }
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
      const { data: qData, error: qError } = await supabase
        .from("test_questions")
        .select("question_id, questions(id, question_text, option_a, option_b, option_c, option_d, correct_answer, marks)")
        .eq("test_id", testId)
        .order("position", { ascending: true });

      if (qError) throw qError;

      // Fetch student's answers for this attempt
      const { data: answersData, error: answersError } = await supabase
        .from("attempt_answers")
        .select("*")
        .eq("attempt_id", attempt.id);

      if (answersError) throw answersError;

      const answersMap = new Map(answersData?.map((a) => [a.question_id, a.selected_option]) || []);

      const questionsList = qData?.map((tq) => {
        const q = tq.questions as any;
        return {
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          marks: q.marks,
          student_answer: answersMap.get(q.id) || null,
        };
      }) || [];

      setAttemptQuestions(questionsList);
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
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
                  : 0}%
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High Score</p>
              <h3 className="text-3xl font-black text-green-600">
                {results.length > 0 
                  ? Math.max(...results.map(r => (r.score / r.total_marks) * 100)).toFixed(1)
                  : 0}%
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Student Candidate</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Score / Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Attempted Qs</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Time Taken</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Accuracy</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Completion Date</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right pr-6">Review</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={7} className="h-16 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" /></TableRow>
                  ))
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      No evaluation data captured for this assessment yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => {
                    const pct = (r.score / r.total_marks) * 100;
                    const attemptedCount = r.attempt_answers?.[0]?.count || 0;
                    return (
                      <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{r.profiles?.name || "N/A"}</p>
                              <p className="text-[9px] font-bold text-slate-500 tracking-wider">{r.profiles?.email || "N/A"}</p>
                            </div>
                          </div>
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
                            {formatTime(r.time_taken)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-black tabular-nums ${pct >= 40 ? "text-green-600" : "text-red-600"}`}>
                            {pct.toFixed(1)}%
                          </span>
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
          ) : (
            <div className="space-y-6">
              {attemptQuestions.map((q, idx) => {
                const isCorrect = (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                const isUnattempted = !q.student_answer;
                
                return (
                  <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {idx + 1}</span>
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

                    <div className="flex items-center gap-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-black uppercase tracking-wider">
                      {isUnattempted ? (
                        <span className="text-slate-400">Status: Skipped (Unattempted)</span>
                      ) : isCorrect ? (
                        <span className="text-green-600">Status: Correct (+{q.marks} Marks)</span>
                      ) : (
                        <span className="text-red-600 font-bold">Status: Incorrect (Correct Option is {q.correct_answer})</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
