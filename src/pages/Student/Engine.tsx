import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
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
import { Maximize, AlertTriangle } from "lucide-react";


// Modular Components
import { Header } from "@/components/TestEngine/Header";
import { Sidebar } from "@/components/TestEngine/Sidebar";
import { QuestionView } from "@/components/TestEngine/QuestionView";
import { Footer } from "@/components/TestEngine/Footer";
import { Instructions } from "@/components/TestEngine/Instructions";

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

export default function Engine() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();

  // Guest session
  const isGuest = searchParams.get("guest") === "true";
  const guestName = searchParams.get("name") || sessionStorage.getItem("guestStudentName") || "Guest Student";
  
  const currentUserId = useMemo(() => {
    return user?.id || `guest_${Math.random().toString(36).substr(2, 9)}`;
  }, [user?.id]);

  // URL-based instructions state — reflects in browser URL
  const showInstructions = searchParams.get("view") !== "test";
  const setShowInstructions = (show: boolean) => {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      p.set("view", show ? "instructions" : "test");
      return p;
    });
  };

  // Ensure URL reflects instructions state on mount
  useEffect(() => {
    if (!searchParams.get("view")) {
      setShowInstructions(true);
    }
  }, []);

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [visitedQuestions, setVisitedQuestions] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [showSecurityAlert, setShowSecurityAlert] = useState(true);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  const timeLeftRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTriggered = useRef(false);
  const dirtyAnswersRef = useRef<Record<string, string>>({});
  const globalDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const flushDirtyAnswers = useCallback(async () => {
    if (isGuest || !attemptId) return;

    const dirty = { ...dirtyAnswersRef.current };
    const entries = Object.entries(dirty);
    if (entries.length === 0) return;

    // Reset local dirty ref immediately to prevent duplicate runs
    dirtyAnswersRef.current = {};
    if (globalDebounceTimerRef.current) {
      clearTimeout(globalDebounceTimerRef.current);
      globalDebounceTimerRef.current = null;
    }

    try {
      const rows = entries.map(([qId, val]) => ({
        attempt_id: attemptId,
        question_id: qId,
        selected_option: val,
      }));

      const { error } = await supabase
        .from("attempt_answers")
        .upsert(rows, { onConflict: "attempt_id,question_id" });

      if (error) {
        console.error("Batch save error:", error);
        Object.assign(dirtyAnswersRef.current, dirty);
      }
    } catch (err) {
      console.error("Error batch saving:", err);
      Object.assign(dirtyAnswersRef.current, dirty);
    }
  }, [attemptId, isGuest]);

  // Cleanup/flush on unmount
  useEffect(() => {
    return () => {
      if (globalDebounceTimerRef.current) {
        clearTimeout(globalDebounceTimerRef.current);
      }
      if (attemptId && !isGuest) {
        const dirty = { ...dirtyAnswersRef.current };
        const entries = Object.entries(dirty);
        if (entries.length > 0) {
          const rows = entries.map(([qId, val]) => ({
            attempt_id: attemptId,
            question_id: qId,
            selected_option: val,
          }));
          supabase.from("attempt_answers").upsert(rows, { onConflict: "attempt_id,question_id" });
        }
      }
    };
  }, [attemptId, isGuest]);

  const triggerAlert = useCallback(() => {
    setShowSecurityAlert(true);
    if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    alertTimerRef.current = setTimeout(() => setShowSecurityAlert(false), 5000);
  }, []);

  useEffect(() => {
    alertTimerRef.current = setTimeout(() => setShowSecurityAlert(false), 5000);
    return () => {
      if (alertTimerRef.current) clearTimeout(alertTimerRef.current);
    };
  }, []);

  const answeredCount = useMemo(() => {
    return Object.values(answers).filter(val => val !== null && val !== undefined && val !== "").length;
  }, [answers]);

  const unansweredCount = useMemo(() => {
    return questions.length - answeredCount;
  }, [questions.length, answeredCount]);

  const sections = useMemo(() => {
    const groups: Record<string, { id: string; name: string; questions: Question[] }> = {};
    questions.forEach((q) => {
      const sId = q.section_id || "default";
      const sName = q.section_name || "General Section";
      if (!groups[sId]) groups[sId] = { id: sId, name: sName, questions: [] };
      groups[sId].questions.push(q);
    });
    return Object.values(groups);
  }, [questions]);

  const handleSubmit = useCallback(async (autoSubmit = false) => {
    if (!autoSubmit && !showSubmitDialog) {
      setShowSubmitDialog(true);
      return;
    }
    if (autoSubmitTriggered.current) return;
    autoSubmitTriggered.current = true;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setLoading(true);
    try {
      console.log("Starting submission for attempt:", attemptId);
      if (isGuest) {
        // Guest scoring logic (fallback for UI/Local)
        const { data: tqs } = await supabase.from("test_questions").select("questions(id, correct_answer, marks)").eq("test_id", testId);
        let score = 0, total = 0;
        tqs?.forEach(tq => {
          const q = tq.questions as any;
          if (!q) return;
          total += q.marks || 1;
          if (answers[q.id] === q.correct_answer) score += q.marks || 1;
          else if (test?.negative_marking && answers[q.id]) score -= test.negative_marks || 0;
        });
        localStorage.setItem(`guest_result_${testId}`, JSON.stringify({ testName: test?.test_name, studentName: guestName, score: Math.max(0, score), totalMarks: total }));
      }

      // Universal submission logic for both Guest and Registered students
      // Force-sync any pending answers before RPC call
      await flushDirtyAnswers();

      console.log("Calling submission RPC...");
      const { error } = await supabase.rpc("submit_test_attempt", { 
        _attempt_id: attemptId, 
        _time_taken: (test?.timer * 60) - timeLeftRef.current 
      });
      
      if (error) {
        console.error("Submission RPC error:", error);
        throw error;
      }
      
      toast({ title: "Success", description: "Assessment submitted successfully." });
      navigate(isGuest ? "/join" : "/student");
    } catch (err: any) {
      console.error("Detailed submission error:", err);
      toast({ 
        title: "Submission Failed", 
        description: err.message || "An unexpected error occurred during submission.",
        variant: "destructive" 
      });
      setLoading(false);
      autoSubmitTriggered.current = false;
    }
  }, [answers, test, attemptId, testId, navigate, toast, isGuest, guestName, showSubmitDialog, flushDirtyAnswers]);

  const enterFullscreen = useCallback(async () => {
    try {
      const el = document.documentElement as any;
      const req = el.requestFullscreen
        || el.webkitRequestFullscreen
        || el.mozRequestFullScreen
        || el.msRequestFullscreen;
      if (req) await req.call(el);
      // setShowFullscreenWarning is handled by the fullscreenchange event listener
    } catch (err) {
      console.warn("Fullscreen error:", err);
      // If fullscreen fails (e.g., mobile/sandboxed iframe), just dismiss the warning
      setShowFullscreenWarning(false);
      setIsFullscreen(true);
    }
  }, []);

  const initializeTest = useCallback(async () => {
    try {
      setLoading(true);
      const { data: testData } = await supabase.from("tests").select("*").eq("id", testId).single();
      if (!testData) throw new Error("Test not found");

      let finalStudentId = user?.id;

      if (isGuest) {
        // For guests, we need a profile in the database to store results
        const existingGuestId = sessionStorage.getItem(`guest_profile_id_${testId}`);
        const guestIdToUse = existingGuestId || 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
          var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
          return v.toString(16);
        });

        console.log("Syncing guest profile:", guestIdToUse);
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: guestIdToUse,
          name: `GUEST: ${guestName}`,
          email: `guest_${guestIdToUse.slice(0,8)}@temp.exam`,
          client_id: testData.client_id
        }, { onConflict: 'id' });

        if (profileError) {
          console.error("Critical: Guest profile sync failed:", profileError);
          sessionStorage.removeItem(`guest_profile_id_${testId}`); // Clear dirty session
          throw new Error(`Database security blocked guest registration. (Error: ${profileError.code})`);
        } 
        
        sessionStorage.setItem(`guest_profile_id_${testId}`, guestIdToUse);
        finalStudentId = guestIdToUse;
      }

      if (!finalStudentId) {
        throw new Error("Identity verification failed. Please try again.");
      }

      // Fetch completed attempts to calculate current attempt number
      const { count: completedCount } = await supabase
        .from("attempts")
        .select("id", { count: "exact", head: true })
        .eq("test_id", testId)
        .eq("student_id", finalStudentId)
        .eq("status", "submitted");

      setAttemptNumber((completedCount || 0) + 1);

      // Attempt management
      console.log("Verifying attempt for ID:", finalStudentId);
      const { data: existing, error: fetchError } = await supabase
        .from("attempts")
        .select("*")
        .eq("test_id", testId)
        .eq("student_id", finalStudentId)
        .eq("status", "in_progress")
        .maybeSingle();

      if (fetchError) {
        console.error("Attempt lookup failed:", fetchError);
        throw new Error(`Security policy blocked reading attempt status. (Error: ${fetchError.code})`);
      }

      if (existing) {
        setAttemptId(existing.id);
      } else {
        const { data: newAttempt, error: attemptError } = await supabase
          .from("attempts")
          .insert({ 
            student_id: finalStudentId, 
            test_id: testId, 
            status: "in_progress" 
          })
          .select()
          .single();
        
        if (attemptError) throw attemptError;
        if (newAttempt) setAttemptId(newAttempt.id);
      }

      setTest(testData);
      setTimeLeft(testData.timer * 60);

      const { data: qData } = await supabase.rpc("get_test_questions_for_student", { 
        _test_id: testId!, 
        _student_id: finalStudentId 
      });
      
      if (!qData || qData.length === 0) throw new Error("No questions found");
      
      setQuestions(testData.shuffle ? [...qData].sort(() => Math.random() - 0.5) : qData);
      if (qData.length > 0) setVisitedQuestions({ [qData[0].id]: true });
    } catch (err: any) {
      toast({ title: "Loading Failed", description: err.message, variant: "destructive" });
      navigate(isGuest ? "/join" : "/student");
    } finally {
      setLoading(false);
    }
  }, [testId, user, isGuest, currentUserId, navigate, toast]);

  useEffect(() => {
    if ((user || isGuest) && testId) initializeTest();
  }, [initializeTest, user, isGuest, testId]);

  useEffect(() => {
    if (!loading && !showInstructions && timeLeft > 0) {
      timeLeftRef.current = timeLeft;
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            handleSubmit(true);
            return 0;
          }
          timeLeftRef.current = prev - 1;
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timerRef.current!);
    }
  }, [loading, showInstructions, timeLeft, handleSubmit]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setFullscreenExitCount(prev => {
          const next = prev + 1;
          if (next >= 3) handleSubmit(true);
          else { setShowFullscreenWarning(true); triggerAlert(); }
          return next;
        });
      } else { setIsFullscreen(true); setShowFullscreenWarning(false); }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
  }, [handleSubmit, triggerAlert]);

  // Tab-switch detection
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden" && !showInstructions && !loading) {
        setFullscreenExitCount(prev => {
          const next = prev + 1;
          if (next >= 3) handleSubmit(true);
          else { setShowFullscreenWarning(true); triggerAlert(); }
          return next;
        });
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [handleSubmit, triggerAlert, showInstructions, loading]);

  const handleAnswer = (qId: string, val: string) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
    if (!isGuest) {
      dirtyAnswersRef.current[qId] = val;
      if (globalDebounceTimerRef.current) {
        clearTimeout(globalDebounceTimerRef.current);
      }
      globalDebounceTimerRef.current = setTimeout(() => {
        flushDirtyAnswers();
      }, 2000);
    }
  };

  const navigateToQuestion = (index: number) => {
    // Force flush dirty answers on navigation
    flushDirtyAnswers();
    setCurrentQuestionIndex(index);
    const qId = questions[index]?.id;
    if (qId) setVisitedQuestions(prev => ({ ...prev, [qId]: true }));
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, "0") + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-slate-950 gap-6">
      <div className="flex flex-col items-center gap-4">
        {/* Spinner */}
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Setting up secure environment</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please wait, loading your test...</p>
        </div>
      </div>
      {/* Branding */}
      <div className="absolute bottom-6 text-center">
        <p className="text-[11px] text-slate-300 dark:text-slate-600 uppercase tracking-widest">NS Exam Portal &nbsp;·&nbsp; Secure Testing System</p>
      </div>
    </div>
  );

  if (showInstructions) {
    return (
      <Instructions 
        testName={test?.test_name} 
        duration={test?.timer} 
        questionCount={questions.length} 
        negativeMarking={test?.negative_marking} 
        negativeMarks={test?.negative_marks} 
        sections={sections}
        studentName={isGuest ? guestName : user?.user_metadata?.full_name || user?.email}
        onStart={() => { setShowInstructions(false); enterFullscreen(); }} 
      />
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">
      {/* Mobile blocker */}
      <div className="md:hidden fixed inset-0 z-[200] flex flex-col items-center justify-center bg-white dark:bg-slate-950 px-8 text-center gap-6">
        <div className="flex h-16 w-16 items-center justify-center bg-slate-100 dark:bg-slate-800">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><rect x="2" y="3" width="20" height="14" rx="2" strokeWidth="2"/><path d="M8 21h8M12 17v4" strokeWidth="2" strokeLinecap="round"/></svg>
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Desktop Required</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">This examination must be taken on a desktop or laptop. Mobile and tablet devices are not supported.</p>
        </div>
      </div>

      {showSecurityAlert && (
        <div className="z-40 flex items-center justify-center bg-red-600 py-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white border-b border-red-700">
          <AlertTriangle className="mr-2 h-3.5 w-3.5" />
          Navigating from the current screen is prohibited. Session is being monitored.
        </div>
      )}

      <Header
        testName={test?.test_name}
        timeLeft={timeLeft}
        formatTime={formatTime}
        duration={test?.timer}
        questionCount={questions.length}
        negativeMarking={test?.negative_marking}
        negativeMarks={test?.negative_marks}
        attemptNumber={attemptNumber}
        attemptsAllowed={test?.attempts_allowed}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 overflow-y-auto px-10 py-8">
            {questions[currentQuestionIndex] && (
              <QuestionView
                question={questions[currentQuestionIndex]}
                index={currentQuestionIndex}
                answer={answers[questions[currentQuestionIndex].id]}
                onAnswer={handleAnswer}
              />
            )}
          </div>
          <Footer
            onPrevious={() => navigateToQuestion(currentQuestionIndex - 1)}
            onNext={() => navigateToQuestion(currentQuestionIndex + 1)}
            disablePrevious={currentQuestionIndex === 0}
            disableNext={currentQuestionIndex === questions.length - 1}
            isMarked={!!markedForReview[questions[currentQuestionIndex]?.id]}
            onMarkForReview={() => {
              const id = questions[currentQuestionIndex]?.id;
              if (id) setMarkedForReview(prev => ({ ...prev, [id]: !prev[id] }));
            }}
            onClear={() => {
              const id = questions[currentQuestionIndex]?.id;
              if (id) {
                handleAnswer(id, null as any);
              }
            }}
          />
        </main>

        <Sidebar 
          studentName={isGuest ? guestName : user?.user_metadata?.full_name || user?.email || "Student"} 
          sections={sections} 
          currentQuestionIndex={currentQuestionIndex} 
          answers={answers} 
          markedForReview={markedForReview} 
          visitedQuestions={visitedQuestions} 
          onNavigate={navigateToQuestion} 
          onSubmit={() => handleSubmit(false)} 
          disableSubmit={currentQuestionIndex !== questions.length - 1} 
        />
      </div>

      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Red top indicator */}
            <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-white shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Security Violation</p>
                <p className="text-red-200 text-[11px]">Warning {fullscreenExitCount} of 3</p>
              </div>
              {/* Violation progress dots */}
              <div className="ml-auto flex gap-1.5">
                {[1,2,3].map(n => (
                  <div key={n} className={`h-2.5 w-2.5 rounded-full border border-white/40 ${n <= fullscreenExitCount ? 'bg-white' : 'bg-red-400/40'}`} />
                ))}
              </div>
            </div>

            {/* Body */}
            <div className="px-5 py-5 space-y-4">
              <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                You have exited fullscreen mode. This exam requires fullscreen at all times.
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {3 - fullscreenExitCount > 0
                  ? `${3 - fullscreenExitCount} more violation(s) will result in automatic test submission.`
                  : 'Next violation will auto-submit your test.'}
              </p>

              <button
                onClick={enterFullscreen}
                className="w-full h-10 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold transition-colors"
              >
                Return to Fullscreen
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-none shadow-2xl">
          <div className="h-1 bg-green-600 w-full absolute top-0 left-0" />
          <AlertDialogHeader className="pt-4">
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight">Final Submission</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              You have answered {answeredCount} out of {questions.length} questions. {unansweredCount > 0 ? `${unansweredCount} questions are unanswered.` : 'All questions have been answered.'} Are you sure you want to finish the test? You cannot change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pb-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Back to Test</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest">Submit Assessment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
