import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  Maximize,
  AlertTriangle,
  User,
  LayoutGrid,
  Info,
  RotateCcw,
} from "lucide-react";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  marks: number;
  difficulty: string;
  section_id: string;
  section_name: string;
}

export default function TestEngine() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();

  // Check if this is a guest session
  const isGuest = searchParams.get("guest") === "true";
  const guestName =
    searchParams.get("name") || sessionStorage.getItem("guestStudentName");
  const currentUserId =
    user?.id ||
    `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<
    Record<string, boolean>
  >({});
  const [visitedQuestions, setVisitedQuestions] = useState<
    Record<string, boolean>
  >({});
  const [attemptId, setAttemptId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [showSecurityAlert, setShowSecurityAlert] = useState(true);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerAlert = useCallback(() => {
    setShowSecurityAlert(true);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setShowSecurityAlert(false), 5000);
  }, []);

  // Initial banner should hide after 5 seconds too
  useEffect(() => {
    alertTimerRef.current = setTimeout(() => setShowSecurityAlert(false), 5000);
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);
  
  const timeLeftRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTriggered = useRef(false);

  const currentQuestion = questions[currentQuestionIndex];

  // Group questions by section
  const sections = useMemo(() => {
    const groups: Record<string, { id: string; name: string; questions: Question[] }> = {};
    questions.forEach((q) => {
      const sectionId = q.section_id || "default";
      const sectionName = q.section_name || "General Section";
      if (!groups[sectionId]) {
        groups[sectionId] = { id: sectionId, name: sectionName, questions: [] };
      }
      groups[sectionId].questions.push(q);
    });
    return Object.values(groups);
  }, [questions]);

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (!autoSubmit && !showSubmitDialog) {
        setShowSubmitDialog(true);
        return;
      }

      if (autoSubmitTriggered.current) return;
      autoSubmitTriggered.current = true;

      // Exit fullscreen on submit
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

      setLoading(true);

      // Fetch correct answers server-side for scoring
      const { data: testQuestions } = await supabase
        .from("test_questions")
        .select("question_id, questions(id, correct_answer, marks)")
        .eq("test_id", testId);

      let score = 0;
      let totalMarks = 0;

      if (testQuestions) {
        for (const tq of testQuestions) {
          const q = tq.questions as any;
          if (!q) continue;
          totalMarks += q.marks || 1;
          if (answers[q.id] === q.correct_answer) {
            score += q.marks || 1;
          } else if (test?.negative_marking && answers[q.id]) {
            score -= test.negative_marks || 0;
          }
        }
      }

      // Clamp score to 0 minimum
      score = Math.max(0, score);

      if (isGuest) {
        const guestResult = {
          testName: test?.test_name,
          studentName: guestName,
          score,
          totalMarks,
          timeTaken: (test?.timer * 60) - timeLeftRef.current,
          completedAt: new Date().toISOString(),
        };

        localStorage.setItem(
          `guest_result_${testId}`,
          JSON.stringify(guestResult),
        );

        toast({
          title: "Test Completed",
          description: `Thank you ${guestName}! Your score: ${score.toFixed(2)}/${totalMarks}`,
        });

        navigate("/join");
      } else {
        await supabase
          .from("attempts")
          .update({
            score,
            total_marks: totalMarks,
            status: "submitted",
            time_taken: (test?.timer * 60) - timeLeftRef.current,
          })
          .eq("id", attemptId);

        toast({
          title: "Test Submitted",
          description: `Your score: ${score.toFixed(2)}/${totalMarks}`,
        });

        navigate("/student");
      }
    },
    [answers, test, attemptId, testId, navigate, toast, isGuest, guestName, showSubmitDialog],
  );

  const enterFullscreen = useCallback(async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
        setShowFullscreenWarning(false);
      }
    } catch {
      toast({
        title: "Fullscreen Required",
        description: "Please allow fullscreen mode to take the test.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const initializeTest = useCallback(async () => {
    setLoading(true);

    const { data: testData, error: testError } = await supabase
      .from("tests")
      .select("*")
      .eq("id", testId)
      .single();

    if (testError || !testData) {
      toast({
        title: "Error",
        description: "Failed to load test",
        variant: "destructive",
      });
      navigate(isGuest ? "/join" : "/student");
      return;
    }

    if (!isGuest) {
      const attemptsAllowed = testData.attempts_allowed ?? 1;
      const { count: submittedCount } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("test_id", testId)
        .eq("student_id", user!.id)
        .eq("status", "submitted");

      if ((submittedCount ?? 0) >= attemptsAllowed) {
        toast({
          title: "Attempts Exhausted",
          description: `You have already used all ${attemptsAllowed} attempt(s) for this test.`,
          variant: "destructive",
        });
        navigate("/student");
        return;
      }

      const { data: existingAttempt } = await supabase
        .from("attempts")
        .select("*")
        .eq("test_id", testId)
        .eq("student_id", user!.id)
        .eq("status", "in_progress")
        .maybeSingle();

      if (existingAttempt) {
        setAttemptId(existingAttempt.id);
        const { data: savedAnswers } = await supabase
          .from("attempt_answers")
          .select("question_id, selected_option, marked_for_review")
          .eq("attempt_id", existingAttempt.id);

        if (savedAnswers) {
          const restoredAnswers: Record<string, string> = {};
          const restoredReview: Record<string, boolean> = {};
          const restoredVisited: Record<string, boolean> = {};
          savedAnswers.forEach((a) => {
            if (a.selected_option) restoredAnswers[a.question_id] = a.selected_option;
            if (a.marked_for_review) restoredReview[a.question_id] = true;
            restoredVisited[a.question_id] = true;
          });
          setAnswers(restoredAnswers);
          setMarkedForReview(restoredReview);
          setVisitedQuestions(restoredVisited);
        }
      } else {
        const { data: attemptData, error: attemptError } = await supabase
          .from("attempts")
          .insert({
            student_id: user?.id,
            test_id: testId,
            status: "in_progress",
          })
          .select()
          .single();

        if (attemptError || !attemptData) {
          toast({
            title: "Error",
            description: "Failed to create attempt",
            variant: "destructive",
          });
          navigate("/student");
          return;
        }
        setAttemptId(attemptData.id);
      }
    } else {
      setAttemptId(`guest_${currentUserId}_${testId}`);
      const savedGuestData = localStorage.getItem(`guest_answers_${testId}_${currentUserId}`);
      if (savedGuestData) {
        try {
          const { answers: savedAnswers, markedForReview: savedReview, visited: savedVisited } = JSON.parse(savedGuestData);
          setAnswers(savedAnswers || {});
          setMarkedForReview(savedReview || {});
          setVisitedQuestions(savedVisited || {});
        } catch (e) {
          console.warn("Failed to restore guest answers:", e);
        }
      }
    }

    setTest(testData);
    setTimeLeft(testData.timer * 60);

    const { data: questionData, error: questionsError } = await supabase.rpc(
      "get_test_questions_for_student",
      {
        _test_id: testId!,
        _student_id: currentUserId,
      },
    );

    if (questionsError || !questionData) {
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
      navigate(isGuest ? "/join" : "/student");
      return;
    }

    let questionsList = questionData as Question[];
    if (testData.shuffle) {
      questionsList = [...questionsList].sort(() => Math.random() - 0.5);
    }
    setQuestions(questionsList);
    setLoading(false);

    // Track first question as visited
    if (questionsList.length > 0) {
      setVisitedQuestions(prev => ({ ...prev, [questionsList[0].id]: true }));
    }

    setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {
        setShowFullscreenWarning(true);
      });
    }, 1000);
  }, [testId, user, isGuest, currentUserId, navigate, toast]);

  useEffect(() => {
    if ((user || isGuest) && testId) {
      initializeTest();
    }
  }, [initializeTest, user, isGuest, testId]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          triggerAlert();
          if (newCount >= 3) {
            toast({
              title: "\u26a0\ufe0f Test Auto-Submitted",
              description: "Too many tab switches detected.",
              variant: "destructive",
            });
            setTimeout(() => handleSubmit(true), 1000);
          } else {
            toast({
              title: `\u26a0\ufe0f Tab Switch Warning (${newCount}/3)`,
              description: `Switching tabs is not allowed.`,
              variant: "destructive",
            });
          }
          return newCount;
        });
      }
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setFullscreenExitCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast({
              title: "\u26a0\ufe0f Test Auto-Submitted",
              description: "Exited fullscreen too many times.",
              variant: "destructive",
            });
            setTimeout(() => handleSubmit(true), 1000);
          } else {
            setShowFullscreenWarning(true);
            triggerAlert();
          }
          return newCount;
        });
      } else {
        setIsFullscreen(true);
        setShowFullscreenWarning(false);
      }
    };

    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({ title: "Action Blocked", description: "Copy/paste is disabled.", variant: "destructive" });
    };

    const preventContextMenu = (e: MouseEvent) => e.preventDefault();

    const preventShortcuts = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && ["c", "v", "x", "a", "p", "u"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key === "F5")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("paste", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventShortcuts);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("paste", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventShortcuts);
    };
  }, [handleSubmit, toast]);

  useEffect(() => {
    if (timeLeft > 0) {
      timeLeftRef.current = timeLeft;
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          const next = prev - 1;
          timeLeftRef.current = next;
          if (next <= 0) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            handleSubmit(true);
            return 0;
          }
          return next;
        });
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timeLeft > 0, handleSubmit]);

  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    setVisitedQuestions(prev => ({ ...prev, [questionId]: true }));

    if (isGuest) {
      const guestData = {
        answers: { ...answers, [questionId]: answer },
        markedForReview,
        visited: { ...visitedQuestions, [questionId]: true }
      };
      localStorage.setItem(`guest_answers_${testId}_${currentUserId}`, JSON.stringify(guestData));
    } else {
      await supabase.from("attempt_answers").upsert(
        { attempt_id: attemptId, question_id: questionId, selected_option: answer },
        { onConflict: "attempt_id,question_id" }
      );
    }
  };

  const handleMarkForReview = (questionId: string) => {
    const newMarkedForReview = { ...markedForReview, [questionId]: !markedForReview[questionId] };
    setMarkedForReview(newMarkedForReview);

    if (isGuest) {
      const guestData = { answers, markedForReview: newMarkedForReview, visited: visitedQuestions };
      localStorage.setItem(`guest_answers_${testId}_${currentUserId}`, JSON.stringify(guestData));
    } else {
      supabase.from("attempt_answers").upsert(
        { attempt_id: attemptId, question_id: questionId, marked_for_review: newMarkedForReview[questionId] },
        { onConflict: "attempt_id,question_id" }
      );
    }
  };

  const clearAnswer = (questionId: string) => {
    const newAnswers = { ...answers };
    delete newAnswers[questionId];
    setAnswers(newAnswers);

    if (!isGuest) {
      supabase.from("attempt_answers").update({ selected_option: null })
        .eq("attempt_id", attemptId).eq("question_id", questionId);
    }
  };

  const navigateToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
    const qId = questions[index]?.id;
    if (qId) {
      setVisitedQuestions(prev => ({ ...prev, [qId]: true }));
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h.toString().padStart(2, "0") + ":" : ""}${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="relative">
          <div className="h-16 w-16 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
        </div>
        <p className="mt-4 text-sm font-medium text-muted-foreground animate-pulse">Initializing Secure Test Environment...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-[#f0f2f5] dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Security Banner (Persistent like in screenshot) */}
      {showSecurityAlert && (
        <div className="z-40 flex items-center justify-center bg-red-500/90 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white shadow-lg backdrop-blur-sm animate-in fade-in slide-in-from-top duration-500">
          <AlertTriangle className="mr-2 h-3.5 w-3.5" />
          Navigating from the current screen is prohibited. Session is being monitored.
        </div>
      )}

      {/* Secure Header */}
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b bg-[#1e293b] px-6 text-white shadow-md">
        <div className="flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/20 backdrop-blur-sm border border-white/10">
            <LayoutGrid className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight uppercase tracking-wider">{test?.test_name || "Assessment"}</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 font-semibold">Secure Examination System</p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3 rounded-full bg-white/5 px-4 py-1.5 border border-white/10">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium tracking-tight">{isGuest ? guestName : user?.email?.split('@')[0]}</span>
          </div>
          
          <div className={`flex flex-col items-end`}>
            <span className="text-[9px] font-bold uppercase text-slate-400 tracking-widest mb-0.5">Time Left</span>
            <div className={`flex items-center gap-2 font-mono text-2xl font-black ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-white"}`}>
              <span>{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Warning Banners (Dynamic) */}
      {showSecurityAlert && tabSwitchCount > 0 && (
        <div className="z-30 flex items-center justify-center bg-destructive/20 border-b border-destructive/30 py-1 text-[10px] font-bold uppercase tracking-widest text-destructive animate-pulse">
          Security Alert: Tab Switch Detected ({tabSwitchCount}/3)
        </div>
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {/* Subtle Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.02] rotate-[-25deg] select-none whitespace-nowrap overflow-hidden">
          <div className="text-[12rem] font-black uppercase tracking-[2rem]">
            {test?.test_name} {currentUserId.substring(0, 8)}
          </div>
        </div>

        {/* Main Content: Question Area (Moved to Left) */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Question Metadata Row (Matching Screenshot 2) */}
          <div className="flex items-center gap-8 px-8 py-3 border-b bg-slate-50 dark:bg-slate-900/50 text-[11px] font-bold text-slate-500 overflow-x-auto whitespace-nowrap">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase tracking-widest">Question:</span>
              <span className="text-primary text-sm font-black">{currentQuestionIndex + 1}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase tracking-widest">Group:</span>
              <span className="text-slate-700 dark:text-slate-300 uppercase">{currentQuestion?.section_name || "General"}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase tracking-widest">Section:</span>
              <span className="text-slate-700 dark:text-slate-300 uppercase">{currentQuestion?.section_name || "General"}</span>
            </div>
            <div className="h-4 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex items-center gap-2">
              <span className="text-slate-400 uppercase tracking-widest">Mark(s):</span>
              <span className="text-slate-700 dark:text-slate-300">{currentQuestion?.marks || 1}</span>
            </div>
            
            <div className="ml-auto">
               {!isFullscreen && (
                  <Button variant="ghost" size="xs" onClick={enterFullscreen} className="h-6 px-2 text-[9px] uppercase font-bold text-orange-600 hover:text-orange-700 hover:bg-orange-50">
                    <Maximize className="mr-1 h-3 w-3" /> Restore Fullscreen
                  </Button>
               )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto space-y-10">
              <div className="space-y-6">
                <div className="prose dark:prose-invert max-w-none">
                  <p className="text-lg font-medium leading-relaxed text-slate-800 dark:text-slate-200">
                    {currentQuestion?.question_text}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <RadioGroup
                  value={answers[currentQuestion?.id] || ""}
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                  className="grid gap-3"
                >
                  {["A", "B", "C", "D"].map((option) => {
                    const optText = currentQuestion?.[`option_${option.toLowerCase()}` as keyof Question];
                    if (!optText) return null;
                    
                    const isSelected = answers[currentQuestion.id] === option;
                    
                    return (
                      <Label
                        key={option}
                        htmlFor={`option-${option}`}
                        className={`group relative flex items-center gap-4 rounded-xl border p-5 transition-all duration-300 cursor-pointer ${
                          isSelected 
                            ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-md shadow-primary/5" 
                            : "border-slate-200 dark:border-slate-800 hover:border-primary/40 hover:bg-slate-50 dark:hover:bg-slate-800/30 hover:shadow-sm"
                        }`}
                      >
                        <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 transition-all duration-300 ${isSelected ? "border-primary bg-primary" : "border-slate-200 dark:border-slate-700 group-hover:border-primary/40"}`}>
                          {isSelected && <div className="h-2 w-2 rounded-full bg-white shadow-sm" />}
                          <RadioGroupItem value={option} id={`option-${option}`} className="sr-only" />
                        </div>
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black transition-all duration-300 ${isSelected ? "bg-primary text-white scale-110 shadow-lg shadow-primary/20" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-slate-200"}`}>
                          {option}
                        </div>
                        <span className={`flex-1 text-base transition-colors duration-300 ${isSelected ? "font-bold text-slate-900 dark:text-white" : "text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-slate-200"}`}>{optText}</span>
                      </Label>
                    );
                  })}
                </RadioGroup>

                <div className="flex items-center gap-4 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => clearAnswer(currentQuestion.id)}
                    disabled={!answers[currentQuestion?.id]}
                    className="h-8 px-4 rounded-lg border-slate-200 text-[10px] font-bold uppercase tracking-wider hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all disabled:opacity-0"
                  >
                    <RotateCcw className="mr-1.5 h-3 w-3" />
                    Unanswer
                  </Button>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleMarkForReview(currentQuestion.id)}
                    className={`h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all ${markedForReview[currentQuestion?.id] ? "bg-purple-500 text-white border-transparent shadow-md" : "border-slate-200 hover:border-purple-300 hover:text-purple-600 hover:bg-purple-50"}`}
                  >
                    <Flag className={`mr-1.5 h-3 w-3 ${markedForReview[currentQuestion?.id] ? "fill-current" : ""}`} />
                    {markedForReview[currentQuestion?.id] ? "Marked" : "Mark For Review"}
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Navigation */}
          <footer className="z-10 h-20 shrink-0 border-t bg-[#1e293b] px-8 flex items-center justify-between shadow-2xl">
            <div className="flex gap-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateToQuestion(currentQuestionIndex - 1)}
                disabled={currentQuestionIndex === 0}
                className="h-11 px-8 rounded-full border-slate-700 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-30"
              >
                <ChevronLeft className="mr-2 h-5 w-5" />
                Previous Question
              </Button>
              
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigateToQuestion(currentQuestionIndex + 1)}
                disabled={currentQuestionIndex === questions.length - 1}
                className="h-11 px-8 rounded-full border-slate-700 bg-white/5 text-white hover:bg-white/10 hover:text-white transition-all active:scale-95 disabled:opacity-30"
              >
                Next Question
                <ChevronRight className="ml-2 h-5 w-5" />
              </Button>
            </div>

            <Button
              onClick={() => handleSubmit(false)}
              size="lg"
              className="h-11 px-12 rounded-full bg-success hover:bg-success/90 text-white font-black uppercase tracking-widest transition-all active:scale-95"
            >
              Finish Test
            </Button>
          </footer>
        </main>

        {/* Sidebar: Question Palette (Moved to Right) */}
        <aside className="z-20 w-80 shrink-0 border-l bg-white dark:bg-slate-900 flex flex-col shadow-xl">
          <div className="p-4 border-b bg-slate-50 dark:bg-slate-800/50 flex items-center justify-between">
            <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-500">Question Palette</h3>
            <span className="text-[10px] font-bold bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
              {questions.length} Questions
            </span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
            {sections.map((section) => (
              <div key={section.id} className="mb-6">
                <div className="flex items-center gap-2 mb-3 border-b border-slate-100 dark:border-slate-800 pb-1">
                  <div className="h-2 w-2 rounded-full bg-primary/40" />
                  <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-tighter">{section.name}</h4>
                </div>
                <div className="grid grid-cols-5 gap-2.5">
                  {section.questions.map((q) => {
                    const idx = questions.findIndex(quest => quest.id === q.id);
                    const isCurrent = currentQuestionIndex === idx;
                    const isAnswered = !!answers[q.id];
                    const isMarked = !!markedForReview[q.id];
                    const isVisited = !!visitedQuestions[q.id];

                    let btnClass = "bg-slate-50 dark:bg-slate-800/50 text-slate-400 border border-slate-200 dark:border-slate-800";
                    if (isCurrent) btnClass = "ring-2 ring-primary ring-offset-2 scale-110 z-10 font-black shadow-lg bg-primary text-white border-transparent";
                    else if (isMarked) btnClass = "bg-purple-500 text-white shadow-md border-transparent";
                    else if (isAnswered) btnClass = "bg-green-500 text-white shadow-md border-transparent";
                    else if (isVisited) btnClass = "bg-red-50 text-red-500 border border-red-200";

                    return (
                      <button
                        key={q.id}
                        onClick={() => navigateToQuestion(idx)}
                        className={`flex h-10 w-10 items-center justify-center rounded-lg text-xs font-bold transition-all duration-200 hover:scale-105 active:scale-95 ${btnClass}`}
                      >
                        {idx + 1}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 border-t bg-slate-50 dark:bg-slate-800/50 space-y-4">
            <div className="grid grid-cols-2 gap-3 text-[9px] font-black uppercase tracking-tighter">
              <div className="flex items-center gap-2 text-green-600">
                <div className="h-3 w-3 rounded-sm bg-green-500 shadow-sm" /> Answered
              </div>
              <div className="flex items-center gap-2 text-red-500">
                <div className="h-3 w-3 rounded-sm bg-red-50 border border-red-200 shadow-sm" /> Not Answered
              </div>
              <div className="flex items-center gap-2 text-purple-600">
                <div className="h-3 w-3 rounded-sm bg-purple-500 shadow-sm" /> For Review
              </div>
              <div className="flex items-center gap-2 text-slate-400">
                <div className="h-3 w-3 rounded-sm bg-slate-100 border border-slate-200 shadow-sm" /> Not Visited
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Fullscreen Warning Overlay */}
      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300">
          <Card className="mx-4 max-w-md border-0 shadow-2xl overflow-hidden bg-white dark:bg-slate-900">
            <div className="h-2 bg-destructive animate-pulse" />
            <CardContent className="p-8 text-center space-y-6">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                <AlertTriangle className="h-10 w-10" />
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">Security Violation</h2>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  You have exited fullscreen mode. This assessment must be completed in fullscreen to ensure integrity. 
                  <span className="block mt-2 font-bold text-destructive">
                    Warnings: {fullscreenExitCount}/3. Further violations will result in automatic submission.
                  </span>
                </p>
              </div>
              <Button onClick={enterFullscreen} size="lg" className="w-full h-12 text-base font-bold bg-primary shadow-xl shadow-primary/20">
                <Maximize className="mr-2 h-5 w-5" />
                Return to Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="max-w-md rounded-2xl border-0 shadow-2xl">
          <AlertDialogHeader className="space-y-4">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Info className="h-8 w-8" />
            </div>
            <AlertDialogTitle className="text-2xl font-bold text-center">Ready to Finish?</AlertDialogTitle>
            <AlertDialogDescription className="text-center text-base space-y-4">
              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                <div className="text-center">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Answered</p>
                  <p className="text-2xl font-black text-green-500">{Object.keys(answers).length}</p>
                </div>
                <div className="text-center border-l dark:border-slate-700">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Remaining</p>
                  <p className="text-2xl font-black text-slate-400">{questions.length - Object.keys(answers).length}</p>
                </div>
              </div>
              {Object.values(markedForReview).filter(Boolean).length > 0 && (
                <p className="text-purple-500 font-bold text-sm bg-purple-500/10 py-2 rounded-lg">
                  \u26a0\ufe0f {Object.values(markedForReview).filter(Boolean).length} items are still marked for review.
                </p>
              )}
              <p>Are you sure you want to submit your assessment now? This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 flex-col sm:flex-row gap-3">
            <AlertDialogCancel className="w-full h-12 rounded-xl border-slate-200 font-bold">Continue Test</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)} className="w-full h-12 rounded-xl bg-primary text-white font-bold shadow-lg shadow-primary/20">
              Submit Now
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <style dangerouslySetInnerHTML={{ __html: `
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .dark .custom-scrollbar::-webkit-scrollbar-thumb { background: #334155; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      ` }} />
    </div>
  );
}
