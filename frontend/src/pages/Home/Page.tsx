import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import {
  GraduationCap,
  Shield,
  Clock,
  Users,
  BarChart3,
  BookOpen,
  Award,
  ArrowRight,
  Laptop,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Menu,
  X,
} from "lucide-react";
import { Footer } from "@/components/Brand/Footer";
import { ExamEngineMockup } from "./components/ExamEngineMockup";
import { InstructorPanelMockup } from "./components/InstructorPanelMockup";
import { StudentPortalMockup } from "./components/StudentPortalMockup";

export default function Page() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [activeTab, setActiveTab] = useState<"engine" | "dashboard" | "student">("engine");
  const [examOption, setExamOption] = useState<number | null>(null);
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const ROLE_ROUTES = {
    superadmin: "/superadmin",
    clientadmin: "/client-admin",
    student: "/student",
  } as const;

  const features = [
    {
      icon: <Shield className="h-5 w-5 text-blue-600" />,
      title: "Anti-Cheat Security",
      description:
        "Full-screen lock, tab-change detection, and background monitoring to ensure fair assessments.",
    },
    {
      icon: <Clock className="h-5 w-5 text-indigo-600" />,
      title: "Granular Timing Controls",
      description:
        "Strict time constraints, custom duration, and automatic test submission on timeout.",
    },
    {
      icon: <Users className="h-5 w-5 text-emerald-600" />,
      title: "Multi-Role Dashboards",
      description:
        "Tailored environments with specific permissions for Instructors and Students.",
    },
    {
      icon: <BarChart3 className="h-5 w-5 text-amber-600" />,
      title: "Analytics & Gradebooks",
      description:
        "Automated scores, pass/fail results, visual statistics, and CSV export.",
    },
    {
      icon: <BookOpen className="h-5 w-5 text-violet-600" />,
      title: "Question Banks",
      description:
        "Bulk CSV import, hierarchical folders, and question reuse across exams.",
    },
    {
      icon: <Award className="h-5 w-5 text-rose-600" />,
      title: "Instant Scoring",
      description:
        "Auto-grading with immediate student scorecards and review screens.",
    },
  ];

  const faqs = [
    {
      question: "How secure is the examination environment?",
      answer:
        "The platform locks down the browser view. Tab switches or window minimization are flagged, the student is alerted, and the behavior is logged for instructor review.",
    },
    {
      question: "Can I import existing questions using spreadsheets?",
      answer:
        "Yes. Upload questions in bulk via standard CSV templates. The system parses options, correct answers, and marks automatically.",
    },
    {
      question: "Is the portal mobile-friendly?",
      answer:
        "The entire student engine and dashboard are fully responsive across smartphones, tablets, laptops, and desktops.",
    },
    {
      question: "What administrative dashboards are available?",
      answer:
        "Instructors manage testing guidelines and student accounts. Students get a streamlined, distraction-free environment.",
    },
  ];

  const stats = [
    { value: "99.99%", label: "Uptime SLA", desc: "Enterprise hosting" },
    { value: "100k+", label: "Exams Conducted", desc: "Reliable scaling" },
    { value: "15ms", label: "Avg. Response", desc: "Fast servers" },
    { value: "100%", label: "Auto Grading", desc: "Instant results" },
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">

      {/* Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-950/90 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-blue-600 rounded-lg">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-bold text-slate-900 dark:text-white leading-none">
                NS Exam Portal
              </h1>
              <p className="hidden sm:block text-[10px] text-slate-500 dark:text-slate-400 tracking-wider uppercase mt-0.5">
                by NS Software Solutions
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-blue-600 dark:hover:text-blue-400">Features</a>
            <a href="#preview" className="hover:text-blue-600 dark:hover:text-blue-400">Preview</a>
            <a href="#stats" className="hover:text-blue-600 dark:hover:text-blue-400">Stats</a>
            <a href="#faq" className="hover:text-blue-600 dark:hover:text-blue-400">FAQ</a>
          </nav>

          <div className="flex items-center gap-2">
            {user && !user.isAnonymous && role ? (
              <Button
                onClick={() => navigate(ROLE_ROUTES[role])}
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white text-sm"
              >
                Go to Dashboard
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="hidden sm:inline-flex text-sm"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-700 text-white text-sm"
                >
                  Get Started
                  <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg md:hidden text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-250 dark:border-slate-800 bg-white dark:bg-slate-950 px-6 py-4 flex flex-col gap-3 text-sm font-semibold shadow-inner animate-in slide-in-from-top duration-200">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-900">Features</a>
            <a href="#preview" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-900">Preview</a>
            <a href="#stats" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-900">Stats</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-blue-600 dark:hover:text-blue-400 border-b border-slate-100 dark:border-slate-900">FAQ</a>
            {user && !user.isAnonymous && role ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate(ROLE_ROUTES[role]); }}
                className="py-2 text-left text-blue-600 dark:text-blue-400 hover:underline"
              >
                Go to Dashboard
              </button>
            ) : (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                className="py-2 text-left text-blue-600 dark:text-blue-400 hover:underline"
              >
                Sign In / Register
              </button>
            )}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="pt-20 pb-16 px-6">
        <div className="container mx-auto max-w-5xl text-center">
          <Badge
            variant="outline"
            className="mb-5 px-3 py-1 border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300 text-xs font-semibold"
          >
            Enterprise-Grade Assessment System
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-5 leading-tight">
            Secure, Scalable &amp; Smart
            <span className="block mt-1 text-blue-600 dark:text-blue-400">
              Online Examination Portal
            </span>
          </h1>

          <p className="text-lg text-slate-600 dark:text-slate-400 mb-10 max-w-3xl mx-auto leading-relaxed">
            Conduct high-integrity examinations online. Built for educational institutes, corporations, and testing hubs with real-time tracking, CSV import, and proctor protection.
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            {user && !user.isAnonymous && role ? (
              <Button
                size="lg"
                onClick={() => navigate(ROLE_ROUTES[role])}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 w-full sm:w-auto"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button
                size="lg"
                onClick={() => navigate("/auth")}
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 w-full sm:w-auto"
              >
                Start Creating Exams
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            )}
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/join")}
              className="font-semibold px-8 w-full sm:w-auto border-slate-300 dark:border-slate-700"
            >
              <Laptop className="mr-2 h-4 w-4 text-indigo-500" />
              Join a Test Session
            </Button>
          </div>
        </div>
      </section>

      {/* Portal Preview Tabs - Hidden on Mobile, Desktop Only */}
      <section id="preview" className="hidden md:block py-16 px-6 bg-slate-100 dark:bg-slate-900/30 border-y border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Explore the Interface
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm">
              Tour the exam workspace, admin panel, and student portal.
            </p>
          </div>

          {/* Tabs */}
          <div className="flex justify-center gap-1 mb-8 p-1 bg-slate-200 dark:bg-slate-900 rounded-lg max-w-md mx-auto border border-slate-300/50 dark:border-slate-700/50">
            {(["engine", "dashboard", "student"] as const).map((tab) => {
              const labels = { engine: "Exam Engine", dashboard: "Instructor", student: "Student" };
              const icons = {
                engine: <Laptop className="hidden sm:inline h-3.5 w-3.5" />,
                dashboard: <Users className="hidden sm:inline h-3.5 w-3.5" />,
                student: <GraduationCap className="hidden sm:inline h-3.5 w-3.5" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-md text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 ${
                    activeTab === tab
                      ? "bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm"
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
                  }`}
                >
                  {icons[tab]}
                  {labels[tab]}
                </button>
              );
            })}
          </div>

          {/* Mockup window - swipable and scrollable on mobile */}
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-x-auto max-w-5xl mx-auto shadow-md scrollbar-thin">
            <div className="min-w-[768px] md:min-w-0 min-h-[520px] relative">
              <div className={activeTab === "engine" ? "relative z-10" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <ExamEngineMockup examOption={examOption} setExamOption={setExamOption} />
              </div>
              <div className={activeTab === "dashboard" ? "relative z-10" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <InstructorPanelMockup />
              </div>
              <div className={activeTab === "student" ? "relative z-10" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <StudentPortalMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section id="stats" className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-4xl">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl font-extrabold text-blue-600 dark:text-blue-400">
                  {stat.value}
                </div>
                <div className="font-semibold text-slate-800 dark:text-slate-200 mt-2 text-sm">
                  {stat.label}
                </div>
                <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  {stat.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-16 px-6 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-200 dark:border-slate-800">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-none mb-3 px-3 py-1 text-xs font-semibold">
              Features
            </Badge>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">
              Engineered for Reliability
            </h2>
            <p className="text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-sm">
              Everything instructors and students need to build, secure, and conduct online exams.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat, idx) => (
              <Card
                key={idx}
                className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-shadow"
              >
                <CardHeader className="pb-2 flex flex-row items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800">
                    {feat.icon}
                  </div>
                  <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                    {feat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    {feat.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-16 px-6 bg-white dark:bg-slate-950">
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-10">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-100 dark:bg-blue-950/40 rounded-full mx-auto mb-3">
              <HelpCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-600 dark:text-slate-400 text-sm">
              Common questions about the portal.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-200 dark:border-slate-800 rounded-lg overflow-hidden bg-slate-50 dark:bg-slate-900/20"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4 text-left font-semibold text-slate-900 dark:text-white text-sm hover:bg-slate-100 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-slate-500 flex-shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-500 flex-shrink-0 ml-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-slate-600 dark:text-slate-400 text-sm border-t border-slate-200 dark:border-slate-800 pt-3 leading-relaxed">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 bg-slate-900 dark:bg-slate-950 text-white border-t border-slate-800">
        <div className="container mx-auto max-w-3xl text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 tracking-tight">
            Ready to Modernise Your Assessments?
          </h2>
          <p className="text-slate-400 mb-8 max-w-xl mx-auto text-sm leading-relaxed">
            Create an account in under two minutes. Deploy secure exam environments, manage students, and track grading automatically.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white hover:bg-slate-100 text-slate-900 font-semibold px-8 w-full sm:w-auto"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4 text-blue-600" />
            </Button>
            <Button
              size="lg"
              onClick={() => navigate("/demo")}
              className="bg-slate-700 hover:bg-slate-600 text-white border border-slate-600 font-semibold px-8 w-full sm:w-auto"
            >
              Take a Mock Exam
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
