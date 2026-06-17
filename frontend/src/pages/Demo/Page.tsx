import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  Clock,
  User,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

// ── Demo questions ────────────────────────────────────────────────────────────
const QUESTIONS = [
  {
    id: 1,
    text: "An enterprise system requires 99.99% availability over 365 days. What is the maximum allowable downtime per year?",
    options: [
      "Approximately 52.56 minutes",
      "Exactly 8.76 hours",
      "Approximately 5.26 minutes",
      "Exactly 24.00 minutes",
    ],
    correct: 0,
    marks: 2,
  },
  {
    id: 2,
    text: "Which data structure is best suited for implementing a browser's back/forward navigation?",
    options: ["Queue", "Stack", "Heap", "Graph"],
    correct: 1,
    marks: 1,
  },
  {
    id: 3,
    text: "What is the time complexity of binary search on a sorted array of n elements?",
    options: ["O(n)", "O(n²)", "O(log n)", "O(n log n)"],
    correct: 2,
    marks: 1,
  },
  {
    id: 4,
    text: "Which HTTP method is idempotent but NOT safe?",
    options: ["GET", "PUT", "POST", "DELETE"],
    correct: 1,
    marks: 1,
  },
  {
    id: 5,
    text: "In a relational database, what does ACID stand for?",
    options: [
      "Atomicity, Consistency, Isolation, Durability",
      "Access, Control, Integrity, Data",
      "Atomicity, Concurrency, Integrity, Distribution",
      "Access, Consistency, Isolation, Durability",
    ],
    correct: 0,
    marks: 2,
  },
  {
    id: 6,
    text: "Which OSI layer is responsible for end-to-end communication and error recovery?",
    options: ["Network Layer", "Data Link Layer", "Transport Layer", "Session Layer"],
    correct: 2,
    marks: 1,
  },
  {
    id: 7,
    text: "What does the 'S' in SOLID principles stand for?",
    options: [
      "Scalability Principle",
      "Single Responsibility Principle",
      "Strict Typing Principle",
      "Substitution Principle",
    ],
    correct: 1,
    marks: 1,
  },
  {
    id: 8,
    text: "Which sorting algorithm has the best average-case time complexity?",
    options: ["Bubble Sort", "Insertion Sort", "Merge Sort", "Selection Sort"],
    correct: 2,
    marks: 2,
  },
  {
    id: 9,
    text: "In CSS, which property controls the stacking order of elements?",
    options: ["position", "z-index", "display", "overflow"],
    correct: 1,
    marks: 1,
  },
  {
    id: 10,
    text: "What is the primary purpose of a JWT (JSON Web Token)?",
    options: [
      "Encrypt data at rest",
      "Compress JSON payloads",
      "Securely transmit claims between parties",
      "Store session data server-side",
    ],
    correct: 2,
    marks: 2,
  },
];

const TOTAL_SECONDS = 10 * 60; // 10 minutes
const TOTAL_MARKS = QUESTIONS.reduce((s, q) => s + q.marks, 0);

type Phase = "instructions" | "exam" | "result";

// ── Option labels ─────────────────────────────────────────────────────────────
const OPT = ["A", "B", "C", "D"];

export default function DemoPage() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("instructions");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({}); // questionId → optionIdx
  const [timeLeft, setTimeLeft] = useState(TOTAL_SECONDS);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Start timer when exam begins
  useEffect(() => {
    if (phase !== "exam") return;
    timerRef.current = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          setPhase("result");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [phase]);

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const select = (qId: number, optIdx: number) =>
    setAnswers((prev) => ({ ...prev, [qId]: optIdx }));

  const submit = () => {
    clearInterval(timerRef.current!);
    setPhase("result");
  };

  // Score calculation
  const score = QUESTIONS.reduce((total, q) => {
    return answers[q.id] === q.correct ? total + q.marks : total;
  }, 0);
  const passed = score >= TOTAL_MARKS * 0.6; // 60% pass mark

  // ── Instructions ─────────────────────────────────────────────────────────────
  if (phase === "instructions") {
    return (
      <div className="min-h-screen bg-white dark:bg-slate-950 flex flex-col">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
          <Toggle />
        </header>

        <div className="flex-1 flex flex-col md:flex-row max-w-5xl mx-auto w-full px-6 py-10 gap-10">
          {/* Left */}
          <div className="flex-1 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-600">
                <GraduationCap className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 dark:text-white">
                  NS Exam Portal — Demo Test
                </h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  General Computing &amp; Aptitude · Free &amp; Open
                </p>
              </div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-1">
              <p className="text-sm font-semibold text-blue-800 dark:text-blue-300">
                About this test
              </p>
              <p className="text-xs text-blue-700 dark:text-blue-400 leading-relaxed">
                This is a fully functional demo of the NS Exam Portal exam engine.
                No sign-in required. Your responses are not stored anywhere.
              </p>
            </div>

            <div className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
              {[
                "Read each question carefully before selecting an answer.",
                "You can navigate between questions using the palette or Prev/Next buttons.",
                "The timer counts down from 10 minutes. The test auto-submits on timeout.",
                "Each question shows its mark value. Pass mark is 60%.",
                "Results and correct answers are shown immediately after submission.",
              ].map((inst, i) => (
                <div key={i} className="flex gap-3">
                  <span className="text-xs font-bold text-slate-400 w-5 shrink-0 mt-0.5">
                    {i + 1}.
                  </span>
                  <span>{inst}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — summary card */}
          <div className="w-full md:w-72 shrink-0 space-y-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden">
              <div className="bg-slate-900 dark:bg-slate-800 px-4 py-3">
                <p className="text-xs font-bold text-white uppercase tracking-widest">
                  Test Summary
                </p>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ["Questions", `${QUESTIONS.length}`],
                  ["Total Marks", `${TOTAL_MARKS}`],
                  ["Duration", "10 Minutes"],
                  ["Pass Mark", "60%"],
                  ["Negative Marking", "None"],
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between px-4 py-2.5 text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{label}</span>
                    <span className="font-semibold text-slate-900 dark:text-white">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold h-11"
              onClick={() => setPhase("exam")}
            >
              Begin Test
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Results ───────────────────────────────────────────────────────────────────
  if (phase === "result") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
        <header className="h-14 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between px-6">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
            <BookOpen className="h-4 w-4 text-blue-600" />
            Demo Test — Results
          </div>
          <Toggle />
        </header>

        <div className="max-w-3xl mx-auto px-6 py-10 space-y-8">
          {/* Score card */}
          <div className={`rounded-xl border p-6 text-center ${passed ? "border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20"}`}>
            <div className="flex justify-center mb-3">
              {passed
                ? <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
                : <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />}
            </div>
            <p className={`text-3xl font-extrabold ${passed ? "text-green-700 dark:text-green-300" : "text-red-700 dark:text-red-300"}`}>
              {score} / {TOTAL_MARKS}
            </p>
            <p className={`mt-1 text-sm font-semibold ${passed ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"}`}>
              {passed ? "Passed — Well done!" : "Not Passed — Keep practising!"}
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
              {Object.keys(answers).length} of {QUESTIONS.length} questions attempted ·{" "}
              {Math.round((score / TOTAL_MARKS) * 100)}% score
            </p>
          </div>

          {/* Answer review */}
          <div className="space-y-4">
            <h2 className="text-base font-bold text-slate-900 dark:text-white">Answer Review</h2>
            {QUESTIONS.map((q, qi) => {
              const userAns = answers[q.id] ?? null;
              const isCorrect = userAns === q.correct;
              const unattempted = userAns === null || userAns === undefined;
              return (
                <div
                  key={q.id}
                  className={`border rounded-lg p-4 space-y-3 ${
                    unattempted
                      ? "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      : isCorrect
                      ? "border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/20"
                      : "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      <span className="text-xs font-bold text-slate-400 mr-2">Q{qi + 1}.</span>
                      {q.text}
                    </p>
                    <span className="text-[10px] font-bold uppercase shrink-0 px-2 py-0.5 rounded border
                      border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                      {q.marks} {q.marks === 1 ? "mark" : "marks"}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {q.options.map((opt, oi) => {
                      const isUser = userAns === oi;
                      const isRight = q.correct === oi;
                      let cls = "border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400";
                      if (isRight) cls = "border-green-500 bg-green-50 dark:bg-green-950/30 text-green-800 dark:text-green-300 font-semibold";
                      else if (isUser && !isRight) cls = "border-red-400 bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300 line-through";
                      return (
                        <div key={oi} className={`flex items-center gap-3 border rounded px-3 py-2 text-xs ${cls}`}>
                          <span className="font-bold w-4 shrink-0">{OPT[oi]}</span>
                          <span>{opt}</span>
                          {isRight && <CheckCircle2 className="h-3.5 w-3.5 text-green-600 ml-auto shrink-0" />}
                          {isUser && !isRight && <XCircle className="h-3.5 w-3.5 text-red-500 ml-auto shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                  {unattempted && (
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <AlertTriangle className="h-3.5 w-3.5" /> Not attempted
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold"
              onClick={() => {
                setAnswers({});
                setCurrent(0);
                setTimeLeft(TOTAL_SECONDS);
                setPhase("instructions");
              }}
            >
              Retake Demo Test
            </Button>
            <Button
              variant="outline"
              className="flex-1 font-semibold"
              onClick={() => navigate("/auth")}
            >
              Create a Free Account
            </Button>
            <Button
              variant="ghost"
              className="font-semibold"
              onClick={() => navigate("/")}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Home
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ── Exam ──────────────────────────────────────────────────────────────────────
  const q = QUESTIONS[current];
  const answered = Object.keys(answers).length;

  return (
    <div className="flex h-screen flex-col bg-white dark:bg-slate-950 overflow-hidden select-none">
      {/* Top bar */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-700 bg-slate-900 px-4 md:px-6 text-white gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-800 border border-slate-700 shrink-0">
            <GraduationCap className="h-4 w-4 text-slate-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-white truncate">
              Demo — General Computing &amp; Aptitude
            </p>
            <p className="text-[9px] uppercase tracking-widest text-slate-500">
              NS Exam Portal · Free Demo
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 border px-3 py-1 text-sm font-mono font-bold tabular-nums ${timeLeft < 60 ? "border-red-600 bg-red-600/10 text-red-400" : "border-slate-700 bg-slate-800 text-white"}`}>
            <Clock className={`h-3.5 w-3.5 ${timeLeft < 60 ? "text-red-400" : "text-slate-400"}`} />
            {formatTime(timeLeft)}
          </div>
        </div>
      </header>

      {/* Body */}
      <div className="flex flex-1 overflow-hidden">
        {/* Question area */}
        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto px-6 py-6 md:px-10 md:py-8">
            <div className="max-w-2xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-3">
                <span className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wide">
                  Question {current + 1} of {QUESTIONS.length}
                </span>
                <span className="text-xs text-slate-500 border border-slate-200 dark:border-slate-700 px-2 py-0.5">
                  {q.marks} {q.marks === 1 ? "mark" : "marks"}
                </span>
              </div>

              <p className="text-sm md:text-base leading-7 text-slate-800 dark:text-slate-100 font-medium">
                {q.text}
              </p>

              <div className="space-y-2.5">
                {q.options.map((opt, oi) => {
                  const sel = answers[q.id] === oi;
                  return (
                    <div
                      key={oi}
                      onClick={() => select(q.id, oi)}
                      className={`flex cursor-pointer items-start gap-3 border px-4 py-3 rounded transition-colors ${
                        sel
                          ? "border-l-4 border-blue-600 bg-blue-50 dark:bg-blue-950/30 border-t-blue-200 border-r-blue-200 border-b-blue-200 dark:border-t-blue-800 dark:border-r-blue-800 dark:border-b-blue-800"
                          : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`}
                    >
                      <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-bold ${sel ? "border-blue-600 bg-blue-600 text-white" : "border-slate-300 dark:border-slate-600 text-slate-500"}`}>
                        {OPT[oi]}
                      </span>
                      <span className={`text-sm leading-relaxed ${sel ? "text-blue-900 dark:text-blue-100 font-semibold" : "text-slate-700 dark:text-slate-300"}`}>
                        {opt}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Footer nav */}
          <footer className="shrink-0 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 md:px-6 h-14 flex items-center justify-between gap-2">
            <button
              onClick={() => setCurrent((c) => Math.max(0, c - 1))}
              disabled={current === 0}
              className="flex items-center h-9 px-4 text-xs font-semibold border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none rounded"
            >
              <ChevronLeft className="mr-1 h-4 w-4" /> Prev
            </button>

            {current === QUESTIONS.length - 1 ? (
              <Button
                onClick={submit}
                className="h-9 px-6 bg-green-600 hover:bg-green-700 text-white text-xs font-bold uppercase tracking-wider rounded"
              >
                Submit Test
              </Button>
            ) : (
              <button
                onClick={() => setCurrent((c) => Math.min(QUESTIONS.length - 1, c + 1))}
                className="flex items-center h-9 px-4 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded"
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </button>
            )}
          </footer>
        </main>

        {/* Sidebar palette */}
        <aside className="hidden md:flex w-56 shrink-0 flex-col border-l border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
          <div className="border-b border-slate-200 dark:border-slate-800 px-4 py-3 flex items-center gap-2">
            <User className="h-4 w-4 text-slate-400" />
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Guest</p>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-slate-800 border-b border-slate-200 dark:border-slate-800 text-center">
            <div className="py-2">
              <p className="text-sm font-bold text-green-600">{answered}</p>
              <p className="text-[9px] uppercase text-slate-400">Answered</p>
            </div>
            <div className="py-2">
              <p className="text-sm font-bold text-slate-500">{QUESTIONS.length - answered}</p>
              <p className="text-[9px] uppercase text-slate-400">Remaining</p>
            </div>
          </div>

          {/* Palette */}
          <div className="flex-1 p-3 overflow-y-auto">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-slate-400 mb-2">
              Question Palette
            </p>
            <div className="grid grid-cols-5 gap-1.5">
              {QUESTIONS.map((qp, qi) => {
                const isCurrent = qi === current;
                const isAnswered = answers[qp.id] !== undefined;
                let cls = "border border-slate-200 dark:border-slate-700 text-slate-500 bg-white dark:bg-slate-900";
                if (isCurrent) cls = "border-2 border-blue-600 bg-blue-50 dark:bg-blue-950/30 text-blue-600 font-bold";
                else if (isAnswered) cls = "border border-green-500 bg-green-500 text-white";
                return (
                  <button
                    key={qp.id}
                    onClick={() => setCurrent(qi)}
                    className={`h-8 w-full text-xs flex items-center justify-center rounded ${cls}`}
                  >
                    {qi + 1}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 p-3">
            <Button
              onClick={submit}
              className="w-full h-8 bg-green-600 hover:bg-green-700 text-white text-xs font-semibold"
            >
              Submit Test
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
