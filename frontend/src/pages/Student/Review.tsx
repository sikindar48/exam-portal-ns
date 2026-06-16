import { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { attemptsApi, attemptAnswersApi, testQuestionsApi } from "@/integrations/turso/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft, 
  Trophy, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle,
  HelpCircle,
  Award
} from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { Footer } from "@/components/Brand/Footer";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  difficulty: string | null;
}

interface TestQuestion {
  id: string;
  question_id: string;
  test_id: string;
  section_id: string | null;
  position: number;
  questions: Question;
}

interface Section {
  id: string;
  name: string;
  position: number;
  questions: TestQuestion[];
}

export default function Review() {
  const { attemptId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState<any>(null);
  const [testInfo, setTestInfo] = useState<any>(null);
  const [testQuestions, setTestQuestions] = useState<TestQuestion[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, any>>({});
  const [errorState, setErrorState] = useState<string | null>(null);

  useEffect(() => {
    if (attemptId) {
      loadReviewData();
    }
  }, [attemptId]);

  const loadReviewData = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      // 1. Fetch Attempt & Test config
      const { data: attemptData, error: attemptErr } = await attemptsApi.get(attemptId!);

      if (attemptErr || !attemptData) {
        throw new Error("Could not load examination attempt details.");
      }

      setAttempt(attemptData);
      setTestInfo(attemptData.test);

      // Verify if review is permitted
      if (!attemptData.test?.allow_review) {
        setErrorState("Review access is disabled for this examination by the administrator.");
        setLoading(false);
        return;
      }

      // 2. Fetch student answers for this attempt
      const { data: answersData, error: answersErr } = await attemptAnswersApi.list(attemptId!);

      if (answersErr) throw answersErr;

      const answerMap: Record<string, any> = {};
      (answersData || []).forEach((ans) => {
        answerMap[ans.question_id] = ans;
      });
      setStudentAnswers(answerMap);

      // 3. Fetch all test questions (API now returns with sections and questions)
      const { data: tqData, error: tqErr } = await testQuestionsApi.list(attemptData.test_id, false);

      if (tqErr) throw tqErr;

      const validTQs = (tqData || []).filter(tq => tq.questions) as unknown as TestQuestion[];
      setTestQuestions(validTQs);

      // Organize questions into sections
      const sections: Record<string, Section> = {};
      validTQs.forEach((tq) => {
        const sectionId = tq.section_id || "general";
        const sectionName = tq.section_name || "General Section";
        if (!sections[sectionId]) {
          sections[sectionId] = {
            id: sectionId,
            name: sectionName,
            position: tq.position || 0,
            questions: [],
          };
        }
        sections[sectionId].questions.push(tq);
      });

      setSections(Object.values(sections).filter(s => s.questions.length > 0));
    } catch (err: any) {
      console.error("Error loading review:", err);
      setErrorState(err.message || "Failed to load examination review workspace.");
    } finally {
      setLoading(false);
    }
  };

  const scoreStats = useMemo(() => {
    if (!testQuestions.length) return { correct: 0, incorrect: 0, unattempted: 0 };
    let correct = 0;
    let incorrect = 0;
    let unattempted = 0;

    testQuestions.forEach((tq) => {
      const q = tq.questions;
      const ans = studentAnswers[q.id];
      if (!ans || !ans.selected_option) {
        unattempted++;
      } else if (ans.selected_option === q.correct_answer) {
        correct++;
      } else {
        incorrect++;
      }
    });

    return { correct, incorrect, unattempted };
  }, [testQuestions, studentAnswers]);

  const scrollToQuestion = (qId: string) => {
    const el = document.getElementById(`q-${qId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-slate-950 gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">Loading Review Session...</p>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col justify-between font-sans">
        <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8">
          <Button variant="ghost" onClick={() => navigate("/student/history")} className="text-slate-400 hover:text-white rounded-none border border-slate-700 p-2">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back
          </Button>
          <Toggle />
        </header>
        <main className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md w-full border-red-200 dark:border-red-900 rounded-none shadow-lg">
            <CardContent className="flex flex-col items-center text-center pt-8">
              <AlertTriangle className="h-12 w-12 text-red-500 mb-4" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-900 dark:text-white mb-2">Access Denied</h3>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500 leading-relaxed mb-6">{errorState}</p>
              <Button onClick={() => navigate("/student/history")} className="bg-slate-900 text-white font-black uppercase text-xs tracking-widest rounded-none px-8 h-10">
                Back to History
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  const accuracy = attempt?.total_marks > 0 ? ((attempt.score / attempt.total_marks) * 100) : 0;
  const passed = accuracy >= 40;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans select-none">
      {/* Review Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/student/history")}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Examination Review</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{testInfo?.test_name || "Assessment"}</p>
          </div>
        </div>
        <Toggle />
      </header>

      {/* Review Dashboard Metrics */}
      <section className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 p-4 md:p-8 shrink-0">
        <div className="container max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-5 gap-6">
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Result Status</span>
            <span className={`text-xs font-black px-3 py-1 border uppercase tracking-widest w-fit ${
              passed ? "bg-green-50 text-green-600 border-green-200" : "bg-red-50 text-red-600 border-red-200"
            }`}>
              {passed ? "Qualified" : "Not Qualified"}
            </span>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Final Score</span>
            <h3 className="text-2xl font-black text-slate-900 dark:text-white tabular-nums">
              {attempt.score?.toFixed(1)} <span className="text-xs text-slate-400 font-bold">/ {attempt.total_marks}</span>
            </h3>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Accuracy</span>
            <h3 className={`text-2xl font-black tabular-nums ${passed ? "text-green-600" : "text-red-600"}`}>
              {accuracy.toFixed(1)}%
            </h3>
          </div>

          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Time Elapsed</span>
            <h3 className="text-2xl font-black text-slate-700 dark:text-slate-300 tabular-nums flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-slate-400" />
              {formatTime(attempt.time_taken || 0)}
            </h3>
          </div>

          <div className="col-span-2 md:col-span-1 flex items-center md:justify-end gap-3 border-t md:border-t-0 border-slate-100 dark:border-slate-800 pt-4 md:pt-0">
            <div className="flex gap-1">
              <div className="flex flex-col items-center px-2 py-1 bg-green-50 border border-green-100 rounded-none min-w-[40px]">
                <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">OK</span>
                <span className="text-xs font-black text-green-600 tabular-nums">{scoreStats.correct}</span>
              </div>
              <div className="flex flex-col items-center px-2 py-1 bg-red-50 border border-red-100 rounded-none min-w-[40px]">
                <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">ERR</span>
                <span className="text-xs font-black text-red-600 tabular-nums">{scoreStats.incorrect}</span>
              </div>
              <div className="flex flex-col items-center px-2 py-1 bg-slate-50 border border-slate-200 rounded-none min-w-[40px]">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">SKIP</span>
                <span className="text-xs font-black text-slate-500 tabular-nums">{scoreStats.unattempted}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Workspace split */}
      <div className="flex-1 flex overflow-hidden">
        {/* Scrollable Questions Panel */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 p-4 md:p-8">
          <div className="container max-w-4xl mx-auto space-y-12">
            {sections.map((sec) => (
              <div key={sec.id} className="space-y-6">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200 dark:border-slate-800">
                  <Award className="h-4 w-4 text-blue-600" />
                  <h2 className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.25em]">{sec.name}</h2>
                </div>

                <div className="space-y-6">
                  {sec.questions.map((tq, idx) => {
                    const q = tq.questions;
                    const ans = studentAnswers[q.id];
                    const selected = ans?.selected_option || null;
                    const correct = q.correct_answer;
                    const isCorrect = selected === correct;
                    const isUnattempted = !selected;

                    return (
                      <Card 
                        id={`q-${q.id}`}
                        key={tq.id}
                        className={`rounded-none shadow-sm transition-all border ${
                          isUnattempted
                            ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                            : isCorrect
                              ? "border-green-200 dark:border-green-950 bg-white dark:bg-slate-900"
                              : "border-red-200 dark:border-red-950 bg-white dark:bg-slate-900"
                        }`}
                      >
                        <CardContent className="p-6 space-y-6">
                          {/* Question Meta Header */}
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-400">
                            <span>Question {idx + 1}</span>
                            <div className="flex items-center gap-3">
                              {q.difficulty && (
                                <span className="border px-1.5 py-0.5 rounded-none">{q.difficulty}</span>
                              )}
                              <span className={`px-2 py-0.5 border ${
                                isUnattempted
                                  ? "bg-slate-100 border-slate-200 text-slate-500"
                                  : isCorrect
                                    ? "bg-green-50 border-green-100 text-green-600"
                                    : "bg-red-50 border-red-100 text-red-600"
                              }`}>
                                {isUnattempted 
                                  ? "Unattempted (0 Marks)" 
                                  : isCorrect 
                                    ? `Correct (+${q.marks} Marks)` 
                                    : testInfo?.negative_marking 
                                      ? `Incorrect (-${testInfo.negative_marks} Marks)` 
                                      : "Incorrect (0 Marks)"
                                }
                              </span>
                            </div>
                          </div>

                          {/* Question Text */}
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-tight leading-relaxed">
                            {q.question_text}
                          </h4>

                          {/* Options grid */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {[
                              { key: "A", text: q.option_a },
                              { key: "B", text: q.option_b },
                              { key: "C", text: q.option_c },
                              { key: "D", text: q.option_d },
                            ].map((opt) => {
                              const isOptionSelected = selected === opt.key;
                              const isOptionCorrect = correct === opt.key;

                              let cardStyle = "border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50";
                              let iconEl = null;

                              if (isOptionCorrect) {
                                cardStyle = "border-green-500 bg-green-50/20 dark:bg-green-950/20 text-green-700 dark:text-green-300 font-bold";
                                iconEl = <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
                              } else if (isOptionSelected && !isCorrect) {
                                cardStyle = "border-red-500 bg-red-50/20 dark:bg-red-950/20 text-red-700 dark:text-red-300 font-bold";
                                iconEl = <XCircle className="h-4 w-4 text-red-500 shrink-0" />;
                              }

                              return (
                                <div 
                                  key={opt.key}
                                  className={`flex items-center justify-between p-4 border transition-all ${cardStyle}`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 bg-white dark:bg-slate-800 border px-1.5 py-0.5 rounded-none">
                                      {opt.key}
                                    </span>
                                    <span className="text-xs uppercase tracking-tight">{opt.text}</span>
                                  </div>
                                  {iconEl}
                                </div>
                              );
                            })}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </main>

        {/* Sidebar Question Navigator Map */}
        <aside className="w-80 shrink-0 border-l border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col hidden lg:flex">
          <div className="p-6 border-b border-slate-200 dark:border-slate-800">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-1">Question Navigator</h3>
            <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Click a number to scroll to details</p>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {sections.map((sec) => (
              <div key={sec.id} className="space-y-3">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">{sec.name}</span>
                <div className="grid grid-cols-5 gap-2">
                  {sec.questions.map((tq, idx) => {
                    const q = tq.questions;
                    const ans = studentAnswers[q.id];
                    const selected = ans?.selected_option || null;
                    const correct = q.correct_answer;
                    const isCorrect = selected === correct;
                    const isUnattempted = !selected;

                    let btnStyle = "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500 hover:border-slate-400";
                    if (isCorrect) {
                      btnStyle = "bg-green-600 text-white border-green-600 hover:bg-green-700";
                    } else if (!isUnattempted) {
                      btnStyle = "bg-red-600 text-white border-red-600 hover:bg-red-700";
                    }

                    return (
                      <button
                        key={tq.id}
                        onClick={() => scrollToQuestion(q.id)}
                        className={`h-9 w-9 rounded-none border text-xs font-black uppercase tracking-tight flex items-center justify-center transition-all ${btnStyle}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </aside>
      </div>

      <Footer />
    </div>
  );
}
