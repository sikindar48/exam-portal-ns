import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  GraduationCap,
  Shield,
  Clock,
  Users,
  BarChart3,
  CheckCircle,
  ArrowRight,
  BookOpen,
  Award,
  Zap,
  Globe,
  Lock,
  Sparkles,
  Laptop,
  HelpCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Footer } from "@/components/Brand/Footer";
import { ExamEngineMockup } from "./components/ExamEngineMockup";
import { InstructorPanelMockup } from "./components/InstructorPanelMockup";
import { StudentPortalMockup } from "./components/StudentPortalMockup";

export default function Page() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"engine" | "dashboard" | "student">("engine");
  const [timerText, setTimerText] = useState("59:54");
  const [examOption, setExamOption] = useState<number | null>(null);
  
  // FAQs state
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Live timer simulation for the mock exam engine
  useEffect(() => {
    let minutes = 59;
    let seconds = 54;
    const interval = setInterval(() => {
      if (seconds > 0) {
        seconds--;
      } else {
        if (minutes > 0) {
          minutes--;
          seconds = 59;
        } else {
          minutes = 59;
          seconds = 54;
        }
      }
      setTimerText(
        `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    {
      icon: <Shield className="h-6 w-6 text-blue-500" />,
      title: "Advanced Anti-Cheat Security",
      description:
        "Full-screen lock enforcement, tab-change detection, and background monitoring to ensure fair assessments.",
    },
    {
      icon: <Clock className="h-6 w-6 text-indigo-500" />,
      title: "Granular Timing Controls",
      description:
        "Define strict time constraints, custom duration, grace periods, and enable automatic test submission.",
    },
    {
      icon: <Users className="h-6 w-6 text-emerald-500" />,
      title: "Multi-Role Dashboards",
      description:
        "Tailored environments with specific permissions for Instructors, and Students.",
    },
    {
      icon: <BarChart3 className="h-6 w-6 text-amber-500" />,
      title: "Analytics & Gradebooks",
      description:
        "Generate automated scores, pass/fail results, visual statistics, and export comprehensive CSV reports.",
    },
    {
      icon: <BookOpen className="h-6 w-6 text-violet-500" />,
      title: "Categorized Question Banks",
      description:
        "Import questions in bulk via CSV, organize questions into hierarchical folders, and reuse them across exams.",
    },
    {
      icon: <Award className="h-6 w-6 text-rose-500" />,
      title: "Instant Scoring & Feedback",
      description:
        "Auto-grading of multiple-choice questions with immediate student scorecards and review screens.",
    },
  ];

  const faqs = [
    {
      question: "How secure is the examination environment?",
      answer: "The platform features a secure test engine that locks down the browser view. If a student attempts to switch tabs or minimize the window, the system automatically flags the incident, alerts the student, and logs the behavior for instructor review."
    },
    {
      question: "Can I import existing questions using spreadsheets?",
      answer: "Yes, instructors can easily upload questions in bulk using standard CSV templates. The system automatically parses options, correct answers, and marks/grades configurations."
    },
    {
      question: "Is the portal mobile-friendly for remote students?",
      answer: "Absolutely. The entire student testing engine and dashboard are fully responsive, working flawlessly on smartphones, tablets, laptops, and desktop computers."
    },
    {
      question: "What types of administrative dashboards are available?",
      answer: "We support a hierarchical structure: Instructors can set up testing guidelines and manage student accounts, and Students get a streamlined, distraction-free environment."
    }
  ];

  const stats = [
    { value: "99.99%", label: "Uptime SLA", desc: "Enterprise hosting" },
    { value: "100k+", label: "Exams Conducted", desc: "Reliable scaling" },
    { value: "15ms", label: "Avg. Response Latency", desc: "Ultra-fast servers" },
    { value: "100%", label: "Automated Grading", desc: "Instant score generation" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-500 selection:text-white transition-colors duration-300">
      
      {/* Background Blobs for Premium Aesthetic */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 dark:bg-blue-600/5 rounded-full blur-[100px] pointer-events-none -z-10" />
      <div className="absolute top-[20%] right-1/4 w-[500px] h-[500px] bg-indigo-400/10 dark:bg-indigo-600/5 rounded-full blur-[120px] pointer-events-none -z-10" />
      <div className="absolute top-[60%] left-10 w-80 h-80 bg-emerald-400/5 dark:bg-emerald-600/5 rounded-full blur-[80px] pointer-events-none -z-10" />

      {/* Glassmorphic Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/60 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md transition-colors duration-300">
        <div className="container mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl shadow-md shadow-blue-500/20">
              <GraduationCap className="h-5.5 w-5.5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 bg-clip-text text-transparent leading-none">
                NS Exam Portal
              </h1>
              <p className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5">
                by NS Software Solutions
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Features</a>
            <a href="#preview" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Live Preview</a>
            <a href="#stats" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Performance</a>
            <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">FAQs</a>
          </nav>

          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-900 text-sm hidden sm:inline-flex"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/25 transition-all hover:translate-y-[-1px] active:translate-y-0"
            >
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-20 pb-16 px-6">
        <div className="container mx-auto max-w-6xl text-center">
          <Badge
            variant="outline"
            className="mb-6 px-4 py-1.5 rounded-full border-blue-200 bg-blue-50/50 text-blue-700 dark:border-blue-900/40 dark:bg-blue-950/40 dark:text-blue-300 animate-pulse text-xs font-semibold"
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-blue-500 fill-blue-500/20" />
            Enterprise-Grade Assessment System
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-6 leading-[1.15]">
            Secure, Scalable & Smart
            <span className="block mt-2 text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-500 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              Online Examination Portal
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-600 dark:text-slate-400 mb-10 max-w-4xl mx-auto leading-relaxed">
            Conduct safe, high-integrity examinations online. Engineered for educational institutes, corporations, and testing hubs with real-time tracking, CSV import capability, and proctor protection.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold px-8 py-6 w-full sm:w-auto rounded-xl shadow-xl shadow-blue-600/20 hover:scale-[1.02] transition-all"
            >
              Start Creating Exams
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/join")}
              className="text-base font-semibold px-8 py-6 border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/80 w-full sm:w-auto rounded-xl shadow-sm hover:scale-[1.02] transition-all"
            >
              <Laptop className="mr-2 h-5 w-5 text-indigo-500" />
              Join a Test Session
            </Button>
          </div>
        </div>
      </section>

      {/* Interactive Portal Showcase Tabs */}
      <section id="preview" className="py-16 px-6 bg-slate-100/50 dark:bg-slate-900/30 border-y border-slate-200/50 dark:border-slate-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Explore the Interface
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-4xl mx-auto text-sm sm:text-base">
              Take a self-guided interactive tour through the exam workspace, administrative control, and student portal dashboard.
            </p>
          </div>

          {/* Selector Tabs */}
          <div className="flex justify-center gap-2 mb-8 p-1.5 bg-slate-200/60 dark:bg-slate-900/80 rounded-xl max-w-xl mx-auto border border-slate-200/30 dark:border-slate-800/40">
            <button
              onClick={() => setActiveTab("engine")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "engine"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Laptop className="h-4 w-4" />
              Exam Engine
            </button>
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "dashboard"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <Users className="h-4 w-4" />
              Instructor Panel
            </button>
            <button
              onClick={() => setActiveTab("student")}
              className={`flex-1 py-2.5 px-3 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                activeTab === "student"
                  ? "bg-white dark:bg-slate-850 text-blue-600 dark:text-blue-400 shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              <GraduationCap className="h-4 w-4" />
              Student Portal
            </button>
          </div>

          {/* Interactive Window Mockup */}
          <div className="bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden max-w-5xl mx-auto min-h-[520px] relative transition-all duration-300">
            <div className={`transition-all duration-350 ease-in-out ${activeTab === "engine" ? "opacity-100 scale-100 pointer-events-auto relative z-10" : "opacity-0 scale-[0.98] pointer-events-none absolute inset-0 z-0"}`}>
              <ExamEngineMockup
                timerText={timerText}
                examOption={examOption}
                setExamOption={setExamOption}
              />
            </div>

            <div className={`transition-all duration-350 ease-in-out ${activeTab === "dashboard" ? "opacity-100 scale-100 pointer-events-auto relative z-10" : "opacity-0 scale-[0.98] pointer-events-none absolute inset-0 z-0"}`}>
              <InstructorPanelMockup />
            </div>

            <div className={`transition-all duration-350 ease-in-out ${activeTab === "student" ? "opacity-100 scale-100 pointer-events-auto relative z-10" : "opacity-0 scale-[0.98] pointer-events-none absolute inset-0 z-0"}`}>
              <StudentPortalMockup />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section id="stats" className="py-20 px-6 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto max-w-5xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center group">
                <div className="text-4xl sm:text-5xl font-extrabold text-blue-600 dark:text-blue-400 bg-gradient-to-r from-blue-600 to-indigo-500 bg-clip-text text-transparent group-hover:scale-105 transition-transform duration-300 inline-block">
                  {stat.value}
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-2 text-sm sm:text-base">
                  {stat.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid Section */}
      <section id="features" className="py-20 px-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200/50 dark:border-slate-800/50 transition-colors duration-300">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none mb-3 px-3 py-1 font-semibold text-xs">
              Full Feature Tour
            </Badge>
            <h2 className="text-3xl sm:text-4xl font-bold text-slate-900 dark:text-white mb-4">
              Engineered for Ultimate Reliability
            </h2>
            <p className="text-base sm:text-lg text-slate-600 dark:text-slate-400 max-w-4xl mx-auto">
              We provide instructors, and students with all the tools required to build, secure, and clear online exams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feat, idx) => (
              <Card
                key={idx}
                className="border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group"
              >
                <CardHeader className="pb-3 flex flex-row items-center gap-4">
                  <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800/80 group-hover:bg-blue-500/10 group-hover:scale-110 transition-all">
                    {feat.icon}
                  </div>
                  <CardTitle className="text-base sm:text-lg font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                    {feat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Accordion Section */}
      <section id="faq" className="py-20 px-6 bg-white dark:bg-slate-950 transition-colors duration-300">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-12">
            <div className="flex items-center justify-center w-12 h-12 bg-blue-100 dark:bg-blue-950/40 rounded-full mx-auto mb-3 text-blue-600 dark:text-blue-400">
              <HelpCircle className="h-6 w-6" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base">
              Find answers to the most common questions about portal Instructor and student guidelines.
            </p>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden transition-all duration-200 bg-slate-50/50 dark:bg-slate-900/20"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-5 text-left font-semibold text-slate-900 dark:text-white text-sm sm:text-base hover:bg-slate-100/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-slate-500 flex-shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-slate-600 dark:text-slate-400 text-xs sm:text-sm border-t border-slate-200/50 dark:border-slate-800/50 leading-relaxed bg-white dark:bg-slate-900/10">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 relative bg-gradient-to-br from-blue-900 via-indigo-950 to-slate-950 text-white overflow-hidden border-t border-indigo-900/20">
        <div className="absolute top-1/2 left-1/2 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        
        <div className="container mx-auto max-w-4xl text-center relative z-10">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-6 tracking-tight leading-tight">
            Ready to Revolutionize Your Assessments?
          </h2>
          <p className="text-base sm:text-lg text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
            Create an account in less than two minutes. Deploy secure exam environments, manage instructors, and track grading efficiently.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white hover:bg-slate-100 text-blue-950 text-base font-semibold px-8 py-6 w-full sm:w-auto rounded-xl shadow-xl hover:scale-[1.02] transition-all"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-5 w-5 text-blue-600" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/join")}
              className="bg-transparent border border-slate-700 text-slate-200 hover:border-slate-600 hover:bg-slate-900/40 text-base font-semibold px-8 py-6 w-full sm:w-auto rounded-xl hover:scale-[1.02] transition-all"
            >
              Take a Mock Exam
            </Button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
