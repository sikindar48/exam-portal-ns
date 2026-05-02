import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  ArrowLeft,
  ArrowRight,
  Maximize,
  AlertTriangle,
} from "lucide-react";

export default function TestEngine() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<
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
  const timeLeftRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTriggered = useRef(false);

  const handleSubmit = useCallback(
    async (autoSubmit = false) => {
      if (!autoSubmit) {
        setShowSubmitDialog(true);
        return;
      }

      if (autoSubmitTriggered.current) return;
      autoSubmitTriggered.current = true;

      // Exit fullscreen on submit
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }

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

      await supabase
        .from("attempts")
        .update({
          score,
          total_marks: totalMarks,
          status: "submitted",
          time_taken: test?.timer * 60 - timeLeftRef.current,
        })
        .eq("id", attemptId);

      toast({
        title: "Test Submitted",
        description: `Your score: ${score.toFixed(2)}/${totalMarks}`,
      });

      navigate("/student");
    },
    [answers, test, attemptId, testId, navigate, toast],
  );

  // Fullscreen management
  const enterFullscreen = useCallback(async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
      setShowFullscreenWarning(false);
    } catch {
      toast({
        title: "Fullscreen Required",
        description: "Please allow fullscreen mode to take the test.",
        variant: "destructive",
      });
    }
  }, [toast]);

  useEffect(() => {
    if (user && testId) {
      initializeTest();
    }

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast({
              title: "⚠️ Test Auto-Submitted",
              description:
                "Too many tab switches detected. Your test has been auto-submitted.",
              variant: "destructive",
            });
            setTimeout(() => handleSubmit(true), 1000);
          } else {
            toast({
              title: `⚠️ Tab Switch Warning (${newCount}/3)`,
              description: `Switching tabs is not allowed. ${3 - newCount} warnings remaining before auto-submit.`,
              variant: "destructive",
            });
          }
          return newCount;
        });
      }
    };

    // Fullscreen change detection
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setFullscreenExitCount((prev) => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast({
              title: "⚠️ Test Auto-Submitted",
              description:
                "Exited fullscreen too many times. Test auto-submitted.",
              variant: "destructive",
            });
            setTimeout(() => handleSubmit(true), 1000);
          } else {
            setShowFullscreenWarning(true);
          }
          return newCount;
        });
      } else {
        setIsFullscreen(true);
        setShowFullscreenWarning(false);
      }
    };

    // Prevent copy-paste
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: "Action Blocked",
        description: "Copy/paste is disabled during the test.",
        variant: "destructive",
      });
    };

    // Prevent right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    // Prevent keyboard shortcuts
    const preventShortcuts = (e: KeyboardEvent) => {
      // Block Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+A, Ctrl+P, F12, Ctrl+Shift+I
      if (
        (e.ctrlKey &&
          ["c", "v", "x", "a", "p", "u"].includes(e.key.toLowerCase())) ||
        e.key === "F12" ||
        (e.ctrlKey && e.shiftKey && ["i", "j"].includes(e.key.toLowerCase())) ||
        (e.ctrlKey && e.key === "F5")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    // Prevent print screen
    const preventPrintScreen = (e: KeyboardEvent) => {
      if (e.key === "PrintScreen") {
        e.preventDefault();
        navigator.clipboard.writeText("").catch(() => {});
        toast({
          title: "Action Blocked",
          description: "Screenshots are not allowed during the test.",
          variant: "destructive",
        });
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("copy", preventCopy);
    document.addEventListener("cut", preventCopy);
    document.addEventListener("paste", preventCopy);
    document.addEventListener("contextmenu", preventContextMenu);
    document.addEventListener("keydown", preventShortcuts);
    document.addEventListener("keyup", preventPrintScreen);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("copy", preventCopy);
      document.removeEventListener("cut", preventCopy);
      document.removeEventListener("paste", preventCopy);
      document.removeEventListener("contextmenu", preventContextMenu);
      document.removeEventListener("keydown", preventShortcuts);
      document.removeEventListener("keyup", preventPrintScreen);
      if (timerRef.current) clearInterval(timerRef.current);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [user, testId]);

  useEffect(() => {
    if (timeLeft > 0) {
      timeLeftRef.current = timeLeft;
      // Only start the interval once when timeLeft is first set (not on every tick)
      if (timerRef.current) return;
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
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeLeft > 0]); // eslint-disable-line react-hooks/exhaustive-deps

  const initializeTest = async () => {
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
      navigate("/student");
      return;
    }

    // Check attempts_allowed
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

    // Resume an existing in_progress attempt if one exists
    const { data: existingAttempt } = await supabase
      .from("attempts")
      .select("*")
      .eq("test_id", testId)
      .eq("student_id", user!.id)
      .eq("status", "in_progress")
      .maybeSingle();

    setTest(testData);
    setTimeLeft(testData.timer * 60);

    // Use secure function to get questions without correct_answer
    const { data: questionData, error: questionsError } = await supabase.rpc(
      "get_test_questions_for_student",
      {
        _test_id: testId!,
        _student_id: user!.id,
      },
    );

    if (questionsError || !questionData) {
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
      navigate("/student");
      return;
    }

    let questionsList = questionData as any[];
    if (testData.shuffle) {
      questionsList = [...questionsList].sort(() => Math.random() - 0.5);
    }
    setQuestions(questionsList);

    let currentAttemptId: string;

    if (existingAttempt) {
      currentAttemptId = existingAttempt.id;
      // Restore saved answers
      const { data: savedAnswers } = await supabase
        .from("attempt_answers")
        .select("question_id, selected_option, marked_for_review")
        .eq("attempt_id", existingAttempt.id);

      if (savedAnswers) {
        const restoredAnswers: Record<string, string> = {};
        const restoredReview: Record<string, boolean> = {};
        savedAnswers.forEach((a) => {
          if (a.selected_option)
            restoredAnswers[a.question_id] = a.selected_option;
          if (a.marked_for_review) restoredReview[a.question_id] = true;
        });
        setAnswers(restoredAnswers);
        setMarkedForReview(restoredReview);
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
      currentAttemptId = attemptData.id;
    }

    setAttemptId(currentAttemptId);
    setLoading(false);

    // Enter fullscreen after loading
    setTimeout(() => {
      document.documentElement.requestFullscreen().catch(() => {
        setShowFullscreenWarning(true);
      });
    }, 500);
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    await supabase.from("attempt_answers").upsert(
      {
        attempt_id: attemptId,
        question_id: questionId,
        selected_option: answer,
      },
      { onConflict: "attempt_id,question_id" },
    );
  };

  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading test...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div
      className="min-h-screen bg-muted select-none"
      style={{ userSelect: "none" }}
    >
      {/* Fullscreen Warning Overlay */}
      {showFullscreenWarning && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <Card className="mx-4 max-w-md">
            <CardContent className="p-6 text-center space-y-4">
              <AlertTriangle className="mx-auto h-12 w-12 text-destructive" />
              <h2 className="text-xl font-bold">Fullscreen Required</h2>
              <p className="text-muted-foreground">
                You have exited fullscreen mode ({fullscreenExitCount}/3
                warnings). Please return to fullscreen to continue the test.
                {3 - fullscreenExitCount > 0 &&
                  ` ${3 - fullscreenExitCount} warnings remaining before auto-submit.`}
              </p>
              <Button onClick={enterFullscreen} className="w-full">
                <Maximize className="mr-2 h-4 w-4" />
                Return to Fullscreen
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-primary">{test?.test_name}</h1>
          <div className="flex items-center gap-4">
            {!isFullscreen && (
              <Button variant="ghost" size="sm" onClick={enterFullscreen}>
                <Maximize className="h-4 w-4" />
              </Button>
            )}
            <div
              className={`flex items-center gap-2 ${timeLeft <= 60 ? "text-destructive animate-pulse" : "text-destructive"}`}
            >
              <Clock className="h-5 w-5" />
              <span className="text-lg font-bold">{formatTime(timeLeft)}</span>
            </div>
            {tabSwitchCount > 0 && (
              <span className="rounded-full bg-destructive/10 px-2 py-1 text-xs text-destructive">
                Warnings: {tabSwitchCount}/3
              </span>
            )}
          </div>
        </div>
      </header>

      <div className="container mx-auto grid gap-4 p-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg">{currentQuestion?.question_text}</p>

              <RadioGroup
                value={answers[currentQuestion?.id] || ""}
                onValueChange={(value) =>
                  handleAnswerChange(currentQuestion.id, value)
                }
              >
                <div className="space-y-4">
                  {["A", "B", "C", "D"].map((option) => (
                    <div
                      key={option}
                      className="flex items-center space-x-2 rounded-lg border p-4 hover:bg-muted/50 transition-colors"
                    >
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="flex-1 cursor-pointer">
                        {currentQuestion?.[`option_${option.toLowerCase()}`]}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() =>
                    setCurrentQuestionIndex((prev) => Math.max(0, prev - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleMarkForReview(currentQuestion.id)}
                >
                  <Flag
                    className={`mr-2 h-4 w-4 ${markedForReview[currentQuestion?.id] ? "fill-current text-warning" : ""}`}
                  />
                  {markedForReview[currentQuestion?.id]
                    ? "Marked"
                    : "Mark for Review"}
                </Button>

                <Button
                  onClick={() =>
                    setCurrentQuestionIndex((prev) =>
                      Math.min(questions.length - 1, prev + 1),
                    )
                  }
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button
            onClick={() => handleSubmit(false)}
            className="w-full"
            variant="destructive"
          >
            Submit Test
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => (
                <Button
                  key={q.id}
                  variant={
                    currentQuestionIndex === index ? "default" : "outline"
                  }
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`relative ${answers[q.id] ? "bg-success text-success-foreground hover:bg-success/90" : ""} ${markedForReview[q.id] ? "border-2 border-warning" : ""}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-success"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border-2 border-warning"></div>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border"></div>
                <span>Not Answered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              You have answered {Object.keys(answers).length} of{" "}
              {questions.length} questions.
              {Object.keys(markedForReview).filter((k) => markedForReview[k])
                .length > 0 &&
                ` ${Object.keys(markedForReview).filter((k) => markedForReview[k]).length} question(s) are marked for review.`}
              <br />
              Are you sure you want to submit?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)}>
              Submit
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
