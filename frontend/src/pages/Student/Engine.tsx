import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { testsApi, attemptsApi, attemptAnswersApi, testQuestionsApi, rpc, profilesApi, testSectionsApi, proctoringApi } from "@/services/api/client";
import { useProctoring } from "@/hooks/useProctoring";
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
import { Maximize, AlertTriangle, Layers, Clock } from "lucide-react";

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
  option_mapping?: Record<string, string>; // Maps Shuffled Options key to Original key (e.g. A -> C)
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
  const [attemptToken, setAttemptToken] = useState<string>("");
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [attemptNumber, setAttemptNumber] = useState<number>(1);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showFullscreenWarning, setShowFullscreenWarning] = useState(false);
  const [fullscreenExitCount, setFullscreenExitCount] = useState(0);
  const [showSecurityAlert, setShowSecurityAlert] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const alertTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Camera stream state
  const [cameraStream, setCameraStream] = useState<MediaStream | null>(null);

  // Section States
  const [sectionsDataList, setSectionsDataList] = useState<any[]>([]);
  const [lockedSectionIds, setLockedSectionIds] = useState<string[]>([]);
  const [sectionTimeLeft, setSectionTimeLeft] = useState<number | null>(null);
  const [showSectionIntro, setShowSectionIntro] = useState<boolean>(false);
  const [showSectionTransitionConfirm, setShowSectionTransitionConfirm] = useState(false);
  const [pendingNextIndex, setPendingNextIndex] = useState<number | null>(null);

  const timeLeftRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSubmitTriggered = useRef(false);
  const dirtyAnswersRef = useRef<Record<string, { selected_option: string | null; marked_for_review: boolean }>>({});
  const globalDebounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentQ = questions[currentQuestionIndex];
  const currentSection = useMemo(() => {
    if (!currentQ || !sectionsDataList.length) return null;
    return sectionsDataList.find(s => s.id === currentQ.section_id);
  }, [currentQ, sectionsDataList]);

  const flushDirtyAnswers = useCallback(async () => {
    if (!attemptId) return;

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
      const rows = entries.map(([qId, data]) => ({
        attempt_id: attemptId,
        question_id: qId,
        selected_option: data.selected_option,
        marked_for_review: data.marked_for_review,
      }));

      const { error } = await attemptAnswersApi.upsert(rows);

      if (error) {
        console.error("Batch save error:", error);
        Object.assign(dirtyAnswersRef.current, dirty);
      }
    } catch (err) {
      console.error("Error batch saving:", err);
      Object.assign(dirtyAnswersRef.current, dirty);
    }
  }, [attemptId]);

  // Cleanup/flush on unmount
  useEffect(() => {
    return () => {
      if (globalDebounceTimerRef.current) {
        clearTimeout(globalDebounceTimerRef.current);
      }
      if (attemptId) {
        const dirty = { ...dirtyAnswersRef.current };
        const entries = Object.entries(dirty);
        if (entries.length > 0) {
          const rows = entries.map(([qId, data]) => ({
            attempt_id: attemptId,
            question_id: qId,
            selected_option: data.selected_option,
            marked_for_review: data.marked_for_review,
          }));
          attemptAnswersApi.upsert(rows);
        }
      }
    };
  }, [attemptId]);

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
    
    // Stop all webcam tracks immediately on submit
    if (cameraStream) {
      cameraStream.getTracks().forEach((track) => track.stop());
    }

    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setLoading(true);
    try {
      console.log("Starting submission for attempt:", attemptId);
      if (isGuest) {
        // Guest scoring logic (fallback for UI/Local)
        const { data: tqs } = await testQuestionsApi.list(testId!);
        let score = 0, total = 0;
        (tqs || []).forEach(tq => {
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
      const { data: submitData, error } = await rpc.submitAttempt(attemptId, (test?.timer * 60) - timeLeftRef.current);
      
      if (error) {
        console.error("Submission RPC error:", error);
        throw error;
      }
      
      toast({ title: "Success", description: "Assessment submitted successfully." });
      const candidateName = isGuest ? guestName : user?.user_metadata?.full_name || user?.email || "Student";
      
      const params = new URLSearchParams();
      params.set("name", candidateName);
      params.set("org", test?.clients?.name || "");
      params.set("logo", test?.clients?.logo_url || "");
      params.set("isGuest", isGuest ? "true" : "false");
      params.set("attemptId", attemptId);

      if (submitData) {
        params.set("results_visible", submitData.results_visible ? "true" : "false");
        params.set("report_download_enabled", submitData.report_download_enabled ? "true" : "false");
        if (submitData.results_visible) {
          params.set("score", String(submitData.score ?? 0));
          params.set("total_marks", String(submitData.total_marks ?? 0));
          params.set("percentage", String(submitData.percentage ?? 0));
          params.set("correct", String(submitData.correct ?? 0));
          params.set("wrong", String(submitData.wrong ?? 0));
          params.set("skipped", String(submitData.skipped ?? 0));
        }
      }

      // Pass attempt_token if it exists (for guest user report downloads)
      if (attemptToken) {
        params.set("token", attemptToken);
      } else if (submitData && (submitData as any).attempt_token) {
        params.set("token", (submitData as any).attempt_token);
      }

      if (typeof window !== "undefined" && window.sessionStorage) {
        sessionStorage.removeItem("guest_attempt_token");
      }
      navigate(`/student/submit-success?${params.toString()}`);
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
      setShowFullscreenWarning(false);
      setIsFullscreen(true);
    } catch (err) {
      console.warn("Fullscreen error:", err);
      setShowFullscreenWarning(false);
      setIsFullscreen(true);
    }
  }, []);

  const initializeTest = useCallback(async () => {
    try {
      setLoading(true);
      const { data: testData } = await testsApi.get(testId!);
      if (!testData) throw new Error("Test not found");

      let finalStudentId = user?.uid;

      if (isGuest) {
        if (!user?.uid) {
          throw new Error("Guest authentication is not ready. Please wait or reload.");
        }
        const guestIdToUse = user.uid;

        console.log("Syncing guest profile:", guestIdToUse);
        const { error: profileError } = await profilesApi.upsert({
          id: guestIdToUse,
          name: `GUEST: ${guestName}`,
          email: `guest_${guestIdToUse.slice(0,8)}@temp.exam`,
          client_id: testData.client_id
        });

        if (profileError) {
          console.error("Critical: Guest profile sync failed:", profileError);
          throw new Error(`Database security blocked guest registration. (Error: ${profileError})`);
        } 
        
        finalStudentId = guestIdToUse;
      }

      if (!finalStudentId) {
        throw new Error("Identity verification failed. Please try again.");
      }

      // Fetch completed attempts to calculate current attempt number
      const { data: completedList } = await attemptsApi.list({
        student_id: finalStudentId,
        test_id: testId,
        status: "submitted"
      });
      const completedCount = (completedList || []).length;

      setAttemptNumber(completedCount + 1);

      // Attempt management
      console.log("Verifying attempt for ID:", finalStudentId);
      const { data: existingList, error: fetchError } = await attemptsApi.getInProgress(testId!, finalStudentId);

      if (fetchError) {
        console.error("Attempt lookup failed:", fetchError);
        throw new Error(`Security policy blocked reading attempt status. (Error: ${fetchError})`);
      }

      let activeAttemptId = existingList && existingList.length > 0 ? existingList[0].id : null;
      let activeAttemptToken = existingList && existingList.length > 0 ? existingList[0].attempt_token : null;

      if (!activeAttemptId) {
        const { data: newAttempt, error: attemptError } = await attemptsApi.create({ 
          student_id: finalStudentId, 
          test_id: testId, 
          status: "in_progress" 
        });
        
        if (attemptError) throw attemptError;
        if (newAttempt) {
          activeAttemptId = newAttempt.id;
          activeAttemptToken = newAttempt.attempt_token;
          setAttemptId(newAttempt.id);
          setAttemptToken(newAttempt.attempt_token || "");
          if (newAttempt.attempt_token) {
            sessionStorage.setItem("guest_attempt_token", newAttempt.attempt_token);
          }
        }
      } else {
        setAttemptId(activeAttemptId);
        setAttemptToken(activeAttemptToken || "");
        if (activeAttemptToken) {
          sessionStorage.setItem("guest_attempt_token", activeAttemptToken);
        }
      }

      setTest(testData);

      // Fetch test sections
      const { data: secsData } = await testSectionsApi.list(testId!);
      const dbSections = (secsData || []) as any[];
      const defaultSec = {
        id: "default",
        test_id: testId!,
        name: "General Section",
        position: 0,
        duration_minutes: null,
        negative_marks: testData.negative_marks || 0,
        shuffle_questions: false,
        shuffle_options: false,
        navigation_locked: false
      };
      const finalSections = dbSections.length > 0 ? dbSections : [defaultSec];
      setSectionsDataList(finalSections);

      // Fetch test questions
      const { data: qData } = await testQuestionsApi.list(testId!);
      if (!qData || qData.length === 0) throw new Error("No questions found");

      const groupedQuestionsMap: Record<string, any[]> = {};
      finalSections.forEach(s => {
        groupedQuestionsMap[s.id] = [];
      });

      (qData || []).forEach((tq: any) => {
        const sId = tq.section_id && groupedQuestionsMap[tq.section_id] ? tq.section_id : finalSections[0].id;
        const questionObj = {
          ...tq.questions,
          section_id: sId,
          section_name: finalSections.find(s => s.id === sId)?.name || "General Section",
          position: tq.position ?? 0
        };
        groupedQuestionsMap[sId].push(questionObj);
      });

      let finalQuestionsList: Question[] = [];
      finalSections.forEach((s) => {
        let secQs = groupedQuestionsMap[s.id];
        secQs.sort((a, b) => a.position - b.position);
        
        if (s.shuffle_questions === 1 || s.shuffle_questions === true) {
          secQs = [...secQs].sort(() => Math.random() - 0.5);
        }

        if (s.shuffle_options === 1 || s.shuffle_options === true) {
          secQs = secQs.map(q => {
            if (q.question_type === "true_false") {
              return q;
            }
            const opts = [
              { key: "A", val: q.option_a },
              { key: "B", val: q.option_b },
              { key: "C", val: q.option_c },
              { key: "D", val: q.option_d },
            ];
            const shuffledOpts = [...opts].sort(() => Math.random() - 0.5);
            const originalCorrect = q.correct_answer;
            const originalCorrectVal = opts.find(o => o.key === originalCorrect)?.val;
            
            const newCorrectKey = ["A", "B", "C", "D"][shuffledOpts.findIndex(o => o.val === originalCorrectVal)] as any || "A";

            const mapping: Record<string, string> = {
              A: opts.find(o => o.val === shuffledOpts[0].val)?.key || "A",
              B: opts.find(o => o.val === shuffledOpts[1].val)?.key || "B",
              C: opts.find(o => o.val === shuffledOpts[2].val)?.key || "C",
              D: opts.find(o => o.val === shuffledOpts[3].val)?.key || "D",
            };

            return {
              ...q,
              option_a: shuffledOpts[0].val,
              option_b: shuffledOpts[1].val,
              option_c: shuffledOpts[2].val,
              option_d: shuffledOpts[3].val,
              correct_answer: newCorrectKey,
              option_mapping: mapping
            };
          });
        }
        finalQuestionsList = [...finalQuestionsList, ...secQs];
      });

      setQuestions(finalQuestionsList);

      const initialVisited: Record<string, boolean> = {};
      if (finalQuestionsList.length > 0) {
        initialVisited[finalQuestionsList[0].id] = true;
      }

      if (activeAttemptId) {
        const { data: answersData } = await attemptAnswersApi.list(activeAttemptId);

        if (answersData && answersData.length > 0) {
          const answerMap: Record<string, string> = {};
          const markedMap: Record<string, boolean> = {};
          
          (answersData || []).forEach((ans) => {
            const question = finalQuestionsList.find(q => q.id === ans.question_id);
            let clientVal = ans.selected_option;
            if (question?.option_mapping && ans.selected_option) {
              const shuffledKey = Object.keys(question.option_mapping).find(
                k => question.option_mapping![k] === ans.selected_option
              );
              if (shuffledKey) clientVal = shuffledKey;
            }

            if (clientVal) {
              answerMap[ans.question_id] = clientVal;
              initialVisited[ans.question_id] = true;
            }
            if (ans.marked_for_review) {
              markedMap[ans.question_id] = true;
              initialVisited[ans.question_id] = true;
            }
          });
          
          setAnswers(answerMap);
          setMarkedForReview(markedMap);
        }
      }

      // Calculate remaining time securely based on the server-authoritative attempt start time (started_at)
      let calculatedTimeLeft = testData.timer * 60;
      let startQIndex = 0;
      let finalLockedSectionIds: string[] = [];

      if (activeAttemptId && existingList && existingList.length > 0) {
        const attempt = existingList[0];
        if (attempt.started_at) {
          // Normalize SQLite UTC datetime to JS Date object
          const startStr = attempt.started_at.replace(" ", "T") + "Z";
          const startMs = new Date(startStr).getTime();
          const nowMs = Date.now();
          let elapsedSecs = Math.max(0, Math.floor((nowMs - startMs) / 1000));
          calculatedTimeLeft = Math.max(0, testData.timer * 60 - elapsedSecs);

          // If there are section-specific timers, calculate active section and lock expired sections
          const hasSectionTimers = dbSections.some(s => s.duration_minutes !== null);
          if (hasSectionTimers && dbSections.length > 0) {
            let activeSecId = dbSections[0].id;
            
            // Loop through sections in position order
            for (let i = 0; i < dbSections.length; i++) {
              const sec = dbSections[i];
              if (sec.duration_minutes !== null) {
                const secDurationSecs = sec.duration_minutes * 60;
                if (elapsedSecs >= secDurationSecs) {
                  // This section has fully expired! Lock it.
                  finalLockedSectionIds.push(sec.id);
                  elapsedSecs -= secDurationSecs;
                } else {
                  // The user belongs in this section, with the remaining section time!
                  activeSecId = sec.id;
                  const secRemaining = secDurationSecs - elapsedSecs;
                  localStorage.setItem(`section_time_${activeAttemptId}_${sec.id}`, String(secRemaining));
                  break;
                }
              } else {
                activeSecId = sec.id;
                break;
              }
            }

            // Find the first question index for the active section
            const activeQIndex = finalQuestionsList.findIndex(q => q.section_id === activeSecId);
            if (activeQIndex !== -1) {
              startQIndex = activeQIndex;
            }
          }
        }
      }

      setTimeLeft(calculatedTimeLeft);
      if (finalLockedSectionIds.length > 0) {
        setLockedSectionIds(finalLockedSectionIds);
        localStorage.setItem(`locked_sections_${activeAttemptId}`, JSON.stringify(finalLockedSectionIds));
      }
      if (startQIndex > 0) {
        setCurrentQuestionIndex(startQIndex);
        if (finalQuestionsList[startQIndex]) {
          initialVisited[finalQuestionsList[startQIndex].id] = true;
        }
      }

      setVisitedQuestions(initialVisited);
    } catch (err: any) {
      toast({ title: "Loading Failed", description: err.message, variant: "destructive" });
      navigate(isGuest ? "/join" : "/student");
    } finally {
      setLoading(false);
    }
  }, [testId, user, isGuest, guestName, navigate, toast]);

  useEffect(() => {
    if (user && testId) initializeTest();
  }, [initializeTest, user, testId]);

  // Sync Section remaining time
  useEffect(() => {
    if (currentSection) {
      if (currentSection.duration_minutes !== null) {
        const storageKey = `section_time_${attemptId}_${currentSection.id}`;
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setSectionTimeLeft(parseInt(saved));
        } else {
          setSectionTimeLeft(currentSection.duration_minutes * 60);
        }
      } else {
        setSectionTimeLeft(null);
      }
    }
  }, [currentSection, attemptId]);

  // Load locked sections from localStorage on mount/resume
  useEffect(() => {
    if (attemptId) {
      const saved = localStorage.getItem(`locked_sections_${attemptId}`);
      if (saved) {
        try {
          setLockedSectionIds(JSON.parse(saved));
        } catch (e) {
          console.error("Failed to parse locked sections", e);
        }
      }
    }
  }, [attemptId]);

  // Save locked sections to localStorage whenever it changes
  useEffect(() => {
    if (attemptId && lockedSectionIds.length > 0) {
      localStorage.setItem(`locked_sections_${attemptId}`, JSON.stringify(lockedSectionIds));
    }
  }, [lockedSectionIds, attemptId]);

  const handleSectionTimeout = useCallback(() => {
    if (!currentSection) return;
    toast({ title: "Section Time Out", description: `Time has expired for section: ${currentSection.name}` });
    
    if (currentSection.navigation_locked && !lockedSectionIds.includes(currentSection.id)) {
      setLockedSectionIds(prev => [...prev, currentSection.id]);
    }

    const currentSecIdx = sectionsDataList.findIndex(s => s.id === currentSection.id);
    if (currentSecIdx < sectionsDataList.length - 1) {
      const nextSec = sectionsDataList[currentSecIdx + 1];
      const nextQIdx = questions.findIndex(q => q.section_id === nextSec.id);
      if (nextQIdx !== -1) {
        navigateToQuestion(nextQIdx);
        setShowSectionIntro(true);
      } else {
        handleSubmit(true);
      }
    } else {
      handleSubmit(true);
    }
  }, [currentSection, sectionsDataList, questions, lockedSectionIds, handleSubmit]);

  // Main Timer Effect
  useEffect(() => {
    if (!loading && !showInstructions && timeLeft > 0) {
      timeLeftRef.current = timeLeft;
      const interval = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            handleSubmit(true);
            return 0;
          }
          timeLeftRef.current = prev - 1;
          return prev - 1;
        });

        setSectionTimeLeft((secPrev) => {
          if (secPrev === null) return null;
          if (secPrev <= 1) {
            handleSectionTimeout();
            return 0;
          }
          if (currentSection) {
            const storageKey = `section_time_${attemptId}_${currentSection.id}`;
            localStorage.setItem(storageKey, String(secPrev - 1));
          }
          return secPrev - 1;
        });
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [loading, showInstructions, timeLeft, currentSection, attemptId, handleSectionTimeout]);

  const lastExitTimeRef = useRef<number>(0);

  // Unified Security Violation Handlers (Fullscreen, Visibility, Focus/Blur)
  useEffect(() => {
    if (showInstructions || loading) return;
    const proctoringEnabled = 
      !!test?.clients?.features?.includes("advanced_proctoring") || 
      !!test?.clients?.features?.includes("basic_proctoring") || 
      !!test?.clients?.features?.includes("camera_proctoring") || 
      !!test?.camera_required;
    if (!proctoringEnabled) return;

    const triggerExitViolation = (type: "FULLSCREEN_EXIT" | "TAB_SWITCH" | "WINDOW_BLUR") => {
      const now = Date.now();
      // Ignore duplicate events within 1.5s (e.g. switching tabs triggers blur, visibility, and fullscreenchange)
      if (now - lastExitTimeRef.current < 1500) return;
      lastExitTimeRef.current = now;

      setFullscreenExitCount(prev => {
        const next = prev + 1;

        proctoringApi.logEvent({
          attempt_id: attemptId,
          test_id: testId!,
          event_type: type,
          duration_seconds: 0
        }).catch(console.error);

        if (next >= 3) {
          handleSubmit(true);
        } else {
          setShowFullscreenWarning(true);
          triggerAlert();
        }
        return next;
      });
    };

    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        triggerExitViolation("FULLSCREEN_EXIT");
      } else {
        setIsFullscreen(true);
        setShowFullscreenWarning(false);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        triggerExitViolation("TAB_SWITCH");
      }
    };

    const handleBlur = () => {
      // Delay blur detection slightly to verify it isn't a tab switch
      setTimeout(() => {
        if (document.visibilityState !== "hidden") {
          triggerExitViolation("WINDOW_BLUR");
        }
      }, 200);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key && /^F[1-9]$|^F1[0-2]$/.test(e.key)) {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("blur", handleBlur);
    window.addEventListener("keydown", handleKeyDown, { capture: true });

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("keydown", handleKeyDown, { capture: true });
    };
  }, [handleSubmit, triggerAlert, attemptId, testId, test, showInstructions, loading]);

  // Cleanup camera tracks on unmount
  useEffect(() => {
    return () => {
      if (cameraStream) {
        cameraStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [cameraStream]);

  // Camera Proctoring Hook initialization
  const { activeViolation } = useProctoring({
    enabled: !!(test?.camera_required && !showInstructions && cameraStream),
    stream: cameraStream,
    attemptId,
    testId: testId!,
  });

  // Secure Browsing
  useEffect(() => {
    if (!loading && !showInstructions) {
      const proctoringEnabled = !!test?.clients?.features?.includes("advanced_proctoring") || !!test?.camera_required;
      if (!proctoringEnabled) return;

      const preventDefault = (e: Event) => e.preventDefault();
      
      document.addEventListener("contextmenu", preventDefault);
      document.addEventListener("copy", preventDefault);
      document.addEventListener("cut", preventDefault);
      document.addEventListener("paste", preventDefault);
      
      return () => {
        document.removeEventListener("contextmenu", preventDefault);
        document.removeEventListener("copy", preventDefault);
        document.removeEventListener("cut", preventDefault);
        document.removeEventListener("paste", preventDefault);
      };
    }
  }, [loading, showInstructions, test]);

  const handleAnswer = (qId: string, val: string | null) => {
    const question = questions.find(q => q.id === qId);
    let dbValue = val;
    if (question?.option_mapping && val) {
      dbValue = question.option_mapping[val] || val;
    }

    setAnswers(prev => {
      const nextAnswers = { ...prev, [qId]: val || "" };
      const isMarked = !!markedForReview[qId];
      dirtyAnswersRef.current[qId] = {
        selected_option: dbValue,
        marked_for_review: isMarked
      };
      if (globalDebounceTimerRef.current) {
        clearTimeout(globalDebounceTimerRef.current);
      }
      globalDebounceTimerRef.current = setTimeout(() => {
        flushDirtyAnswers();
      }, 2000);
      return nextAnswers;
    });
  };

  const navigateToQuestion = useCallback((index: number) => {
    if (index < 0 || index >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const targetQ = questions[index];
    
    if (currentQuestion && targetQ && currentQuestion.section_id !== targetQ.section_id) {
      const currentSec = sectionsDataList.find(s => s.id === currentQuestion.section_id);
      
      if (currentSec?.navigation_locked) {
        const currentSecIdx = sectionsDataList.findIndex(s => s.id === currentQuestion.section_id);
        const targetSecIdx = sectionsDataList.findIndex(s => s.id === targetQ.section_id);
        
        if (targetSecIdx < currentSecIdx) {
          toast({ title: "Navigation Locked", description: "You cannot return to a completed section.", variant: "destructive" });
          return;
        } else {
          if (!lockedSectionIds.includes(currentQuestion.section_id)) {
            setLockedSectionIds(prev => [...prev, currentQuestion.section_id]);
          }
        }
      }
    }
    
    if (targetQ && lockedSectionIds.includes(targetQ.section_id)) {
      toast({ title: "Section Locked", description: "This section is locked and cannot be re-entered.", variant: "destructive" });
      return;
    }

    flushDirtyAnswers();
    setCurrentQuestionIndex(index);
    const qId = questions[index]?.id;
    if (qId) setVisitedQuestions(prev => ({ ...prev, [qId]: true }));
    setIsSidebarOpen(false);
  }, [questions, currentQuestionIndex, sectionsDataList, lockedSectionIds, flushDirtyAnswers, toast]);

  const handleNextClick = () => {
    const nextIdx = currentQuestionIndex + 1;
    if (nextIdx >= questions.length) return;
    
    const currentQuestion = questions[currentQuestionIndex];
    const nextQ = questions[nextIdx];
    
    if (currentQuestion && nextQ && currentQuestion.section_id !== nextQ.section_id) {
      const currentSec = sectionsDataList.find(s => s.id === currentQuestion.section_id);
      if (currentSec?.navigation_locked) {
        setPendingNextIndex(nextIdx);
        setShowSectionTransitionConfirm(true);
        return;
      }
    }
    
    navigateToQuestion(nextIdx);
  };

  const formatTime = (s: number) => {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
    return `${h > 0 ? h.toString().padStart(2, "0") + ":" : ""}${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  if (loading) return (
    <div className="flex h-screen flex-col items-center justify-center bg-white dark:bg-slate-950 gap-6">
      <div className="flex flex-col items-center gap-4">
        <div className="relative h-12 w-12">
          <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
          <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">Setting up secure environment</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Please wait, loading your test...</p>
        </div>
      </div>
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
        onStart={(stream) => { 
          if (stream) setCameraStream(stream);
          setShowInstructions(false); 
          enterFullscreen(); 
        }} 
        orgName={test?.clients?.name}
        orgLogoUrl={test?.clients?.logo_url}
        cameraRequired={!!test?.camera_required}
      />
    );
  }

  // Section Instruction/Transition Overlay Screen
  if (showSectionIntro && currentSection) {
    const secQuestions = questions.filter(q => q.section_id === currentSection.id);
    const secMarks = secQuestions.reduce((tot, q) => tot + q.marks, 0);
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-900 text-white p-6 select-none">
        <div className="max-w-md w-full border border-slate-800 bg-slate-950 p-8 space-y-6">
          <div className="space-y-2">
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-blue-500">Section Transition</span>
            <h2 className="text-3xl font-black uppercase tracking-tight">{currentSection.name}</h2>
          </div>
          <div className="space-y-4 text-sm text-slate-400">
            <p>You are entering a new section of the exam. Please review the rules:</p>
            <ul className="space-y-2 border-y border-slate-800 py-4 font-semibold text-xs uppercase tracking-wider">
              <li className="flex justify-between">
                <span>Total Questions</span>
                <span className="text-white">{secQuestions.length}</span>
              </li>
              <li className="flex justify-between">
                <span>Section Marks</span>
                <span className="text-white">{secMarks}</span>
              </li>
              {currentSection.duration_minutes !== null && (
                <li className="flex justify-between text-blue-400">
                  <span>Section Duration</span>
                  <span>{currentSection.duration_minutes} Minutes</span>
                </li>
              )}
              {currentSection.navigation_locked ? (
                <li className="flex justify-between text-red-400">
                  <span>Navigation Lock</span>
                  <span>ENABLED (Cannot return)</span>
                </li>
              ) : null}
            </ul>
          </div>
          <Button
            onClick={() => setShowSectionIntro(false)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-xs h-11"
          >
            Start Section
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden select-none">

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
        orgName={test?.clients?.name}
        orgLogoUrl={test?.clients?.logo_url}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
        sectionTimeLeft={sectionTimeLeft}
        sectionName={currentSection?.name}
        sections={sections}
      />

      <div className="flex flex-1 overflow-hidden">
        <main className="flex flex-1 flex-col overflow-hidden bg-slate-50 dark:bg-slate-950">
          <div className="flex-1 overflow-y-auto px-4 md:px-10 py-6 md:py-8">
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
            onNext={handleNextClick}
            disablePrevious={currentQuestionIndex === 0}
            disableNext={currentQuestionIndex === questions.length - 1}
            isMarked={!!markedForReview[questions[currentQuestionIndex]?.id]}
            onMarkForReview={() => {
              const id = questions[currentQuestionIndex]?.id;
              if (id) {
                setMarkedForReview(prev => {
                  const nextVal = !prev[id];
                  const currentAnswer = answers[id] || null;
                  dirtyAnswersRef.current[id] = {
                    selected_option: currentAnswer,
                    marked_for_review: nextVal
                  };
                  if (globalDebounceTimerRef.current) {
                    clearTimeout(globalDebounceTimerRef.current);
                  }
                  globalDebounceTimerRef.current = setTimeout(() => {
                    flushDirtyAnswers();
                  }, 2000);
                  return { ...prev, [id]: nextVal };
                });
              }
            }}
            onClear={() => {
              const id = questions[currentQuestionIndex]?.id;
              if (id) {
                handleAnswer(id, null as any);
              }
            }}
            onSubmit={() => handleSubmit(false)}
            disableSubmit={currentQuestionIndex !== questions.length - 1}
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
          isSidebarOpen={isSidebarOpen}
          setIsSidebarOpen={setIsSidebarOpen}
          lockedSectionIds={lockedSectionIds}
        />
      </div>

      {showFullscreenWarning && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70">
          <div className="w-full max-w-sm mx-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="bg-red-600 px-5 py-3 flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-white shrink-0" />
              <div>
                <p className="text-white font-bold text-sm">Security Violation</p>
                <p className="text-red-200 text-[11px]">Warning {fullscreenExitCount} of 3</p>
              </div>
              <div className="ml-auto flex gap-1.5">
                {[1,2,3].map(n => (
                  <div key={n} className={`h-2.5 w-2.5 rounded-full border border-white/40 ${n <= fullscreenExitCount ? 'bg-white' : 'bg-red-400/40'}`} />
                ))}
              </div>
            </div>

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

      {activeViolation && activeViolation !== "CAMERA_DISCONNECTED" && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="w-full max-w-md mx-4 bg-white dark:bg-slate-900 border-2 border-red-500 dark:border-red-600 rounded-none overflow-hidden shadow-2xl">
            <div className="bg-red-600 px-6 py-4 flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-white animate-pulse" />
              <div>
                <h3 className="text-white font-black uppercase tracking-wider text-sm">Proctoring Warning</h3>
                <p className="text-red-100 text-[10px] uppercase font-bold tracking-widest">Action Required</p>
              </div>
            </div>
            <div className="px-6 py-6 space-y-4 text-center">
              <p className="text-sm font-bold text-slate-800 dark:text-slate-200 leading-relaxed">
                {activeViolation === "NO_FACE"
                  ? "No face detected in the camera feed. Please position your face clearly in front of the camera."
                  : activeViolation === "MULTIPLE_FACES"
                    ? "Multiple faces detected. Please ensure you are alone in front of the camera."
                    : "Camera feed issue detected. Please check your webcam."}
              </p>
              <div className="p-3 bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/50">
                <p className="text-[10px] text-red-600 dark:text-red-400 font-black uppercase tracking-widest leading-normal">
                  Continuous violations will result in automatic test submission.
                </p>
              </div>
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
              Answered: {answeredCount}/{questions.length}. {unansweredCount > 0 ? `Unanswered: ${unansweredCount}.` : 'All answered.'} Submit test? This is final.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pb-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Back to Test</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)} className="bg-green-600 hover:bg-green-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest">Submit Assessment</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Section Transition Confirm AlertDialog */}
      <AlertDialog open={showSectionTransitionConfirm} onOpenChange={setShowSectionTransitionConfirm}>
        <AlertDialogContent className="bg-white dark:bg-slate-900 border-none rounded-none shadow-2xl">
          <div className="h-1 bg-blue-600 w-full absolute top-0 left-0" />
          <AlertDialogHeader className="pt-4">
            <AlertDialogTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <Layers className="h-5 w-5 text-blue-600" />
              Lock Section & Proceed?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500">
              You are moving to the next section. This section has <strong>Navigation Lock</strong> enabled. Once you proceed, you will not be able to return or edit your answers in <strong>{currentSection?.name}</strong>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pb-4">
            <AlertDialogCancel onClick={() => setPendingNextIndex(null)} className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setShowSectionTransitionConfirm(false);
                if (pendingNextIndex !== null) {
                  navigateToQuestion(pendingNextIndex);
                  setPendingNextIndex(null);
                  setShowSectionIntro(true); // Show intro screen for new section
                }
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest"
            >
              Lock & Proceed
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
