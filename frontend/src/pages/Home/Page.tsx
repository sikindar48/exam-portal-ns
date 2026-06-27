import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from "@/components/ui/card";
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
  Check,
  Zap,
  Lock,
  Globe,
  Settings,
  Image,
  Sparkles,
  Building,
  School,
  Briefcase,
  FileSpreadsheet,
  CheckCircle,
  Layers,
  HeartHandshake,
  FileText,
  UserCheck,
  Video,
  Database,
  BarChart4,
  Palette
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

  const targetAudiences = [
    { label: "Schools", icon: <School className="h-4 w-4 text-emerald-400" /> },
    { label: "Colleges & Universities", icon: <GraduationCap className="h-4 w-4 text-blue-400" /> },
    { label: "Coaching Institutes", icon: <BookOpen className="h-4 w-4 text-violet-400" /> },
    { label: "Training Institutes", icon: <Briefcase className="h-4 w-4 text-amber-400" /> },
    { label: "Placement Drives", icon: <Award className="h-4 w-4 text-rose-400" /> },
    { label: "Corporate Assessments", icon: <Building className="h-4 w-4 text-indigo-400" /> },
    { label: "Individual Trainers", icon: <Users className="h-4 w-4 text-teal-400" /> },
  ];

  const faqs = [
    {
      question: "Can I import students using CSV or Excel?",
      answer: "Yes, you can register and onboard candidates in bulk by uploading simple CSV or Excel sheets directly through the Student Management panel.",
    },
    {
      question: "Can I import questions in bulk?",
      answer: "Absolutely. The platform supports importing questions in bulk using CSV and Excel templates, allowing you to quickly seed folders and reference them in multiple tests.",
    },
    {
      question: "Can candidates take exams as guests?",
      answer: "Yes. You can enable guest mode and generate secure public links, allowing candidates to take exams instantly without having predefined user accounts.",
    },
    {
      question: "Does the platform support camera proctoring?",
      answer: "Yes. Our camera proctoring maps AI face tracking to log violations (like face missing or multiple faces in the frame) in real time with snapshot evidence.",
    },
    {
      question: "Can I customize the portal with my organization’s name and logo?",
      answer: "Yes. Custom branding features allow you to upload your own organization logo and customize the brand name across the student workspace and dashboards.",
    },
    {
      question: "Do you offer Pay Per Test plans?",
      answer: "Yes. Pay Per Test plans are perfect for organizations running one-off assessments, placement drives, or recruitment campaigns, without long-term commitments.",
    },
    {
      question: "Is there a Free Plan?",
      answer: "Yes, our generous Free Plan is free forever and includes up to 3 exams per month, 50 questions per exam, and 20 candidates per exam.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-blue-600/30 selection:text-blue-200">
      
      {/* Dynamic Background Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] pointer-events-none overflow-hidden opacity-30 z-0">
        <div className="absolute -top-[30%] left-[10%] w-[500px] h-[500px] rounded-full bg-blue-600/20 blur-[120px]" />
        <div className="absolute -top-[20%] right-[10%] w-[600px] h-[600px] rounded-full bg-indigo-600/20 blur-[150px]" />
      </div>

      {/* Glassmorphic Navbar */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-900 bg-slate-950/70 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg shadow-blue-500/10">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm md:text-base font-black uppercase tracking-wider text-white leading-none">
                NS Exam Portal
              </h1>
              <p className="hidden sm:block text-[9px] text-slate-500 tracking-widest uppercase mt-1">
                by NS Software Solutions
              </p>
            </div>
          </div>

          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
            <a href="#why-choose" className="hover:text-white transition-colors">Why Choose Us</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          </nav>

          <div className="flex items-center gap-3">
            {user && !user.isAnonymous && role ? (
              <Button
                onClick={() => navigate(ROLE_ROUTES[role])}
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-none px-5 py-2 shadow-lg shadow-blue-600/25 transition-all duration-300"
              >
                Go to Dashboard
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/auth")}
                  className="hidden sm:inline-flex text-xs font-black uppercase tracking-wider text-slate-300 hover:text-white hover:bg-slate-900 rounded-none px-4 py-2"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate("/auth")}
                  className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-none px-5 py-2 shadow-lg shadow-blue-600/25 transition-all duration-300"
                >
                  Get Started Free
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded bg-slate-900 border border-slate-800 md:hidden text-slate-300 hover:text-white transition-colors"
              aria-label="Toggle menu"
            >
              {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <nav className="md:hidden border-t border-slate-900 bg-slate-950/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4 text-xs font-black uppercase tracking-wider shadow-2xl animate-in slide-in-from-top duration-300">
            <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white border-b border-slate-900/50">Features</a>
            <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white border-b border-slate-900/50">Pricing</a>
            <a href="#why-choose" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white border-b border-slate-900/50">Why Choose Us</a>
            <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-white border-b border-slate-900/50">FAQ</a>
            {user && !user.isAnonymous && role ? (
              <button
                onClick={() => { setMobileMenuOpen(false); navigate(ROLE_ROUTES[role]); }}
                className="py-2.5 text-left text-blue-400 hover:text-blue-300"
              >
                Go to Dashboard
              </button>
            ) : (
              <div className="flex flex-col gap-2.5 pt-2">
                <Button
                  variant="outline"
                  onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                  className="rounded-none font-black text-slate-300 border-slate-800"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                  className="bg-blue-600 hover:bg-blue-500 rounded-none font-black text-white"
                >
                  Get Started Free
                </Button>
              </div>
            )}
          </nav>
        )}
      </header>

      {/* Hero Section */}
      <section className="relative pt-24 pb-20 px-4 md:px-8 overflow-hidden">
        <div className="container mx-auto max-w-5xl text-center relative z-10">
          <Badge
            variant="outline"
            className="mb-6 px-4 py-1.5 border-blue-900/50 bg-blue-950/20 text-blue-400 text-[10px] font-black uppercase tracking-widest rounded-full"
          >
            <Sparkles className="h-3 w-3 mr-1.5 animate-pulse text-indigo-400" />
            Enterprise-Grade Assessment System
          </Badge>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6 leading-[1.1]">
            Secure, Scalable &amp; Reliable
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-400 via-indigo-400 to-violet-400">
              Online Examination Platform
            </span>
          </h1>

          <p className="text-sm md:text-base text-slate-400 mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
            Conduct online examinations with built-in security, automated evaluation, camera proctoring, analytics, and flexible pricing. Fully tailored for schools, colleges, drives, and corporate training programs.
          </p>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-16">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto transition-all shadow-xl shadow-blue-900/10 hover:shadow-blue-500/25"
            >
              Get Started Free
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const element = document.getElementById("pricing");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white"
            >
              View Pricing
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate("/join")}
              className="font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto border-slate-800 hover:bg-slate-900 text-slate-300 hover:text-white"
            >
              <Laptop className="mr-2 h-4 w-4 text-indigo-500" />
              Book Demo
            </Button>
          </div>

          {/* Perfect For Section */}
          <div className="border-t border-slate-900 pt-10">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-6">
              Perfect For Every Institution
            </p>
            <div className="flex flex-wrap gap-2.5 justify-center max-w-4xl mx-auto">
              {targetAudiences.map((audience, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 px-4 py-2 border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition-all rounded-full"
                >
                  {audience.icon}
                  <span className="text-xs font-semibold text-slate-300">{audience.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Explore Mockups Tabbed Preview */}
      <section id="preview" className="py-16 px-4 md:px-8 border-y border-slate-900 bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-10">
            <Badge className="bg-blue-900/30 text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
              Explore the Workspace
            </Badge>
            <h2 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-white mb-2">
              Intuitive Interface
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
              Explore the exam workspaces designed for both administrators and student test takers.
            </p>
          </div>

          <div className="flex justify-center gap-1.5 mb-8 p-1.5 bg-slate-955 border border-slate-900 rounded-xl max-w-md mx-auto">
            {(["engine", "dashboard", "student"] as const).map((tab) => {
              const labels = { engine: "Exam Engine", dashboard: "Instructor", student: "Student" };
              const icons = {
                engine: <Laptop className="h-3.5 w-3.5" />,
                dashboard: <Users className="h-3.5 w-3.5" />,
                student: <GraduationCap className="h-3.5 w-3.5" />,
              };
              return (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
                    activeTab === tab
                      ? "bg-slate-900 text-blue-400 shadow-inner border border-slate-800"
                      : "text-slate-500 hover:text-slate-300"
                  }`}
                >
                  {icons[tab]}
                  <span className="hidden xs:inline">{labels[tab]}</span>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-950 rounded-2xl border border-slate-900 overflow-x-auto max-w-5xl mx-auto shadow-2xl p-1 shadow-black/80 scrollbar-thin">
            <div className="min-w-[768px] md:min-w-0 min-h-[520px] relative">
              <div className={activeTab === "engine" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <ExamEngineMockup examOption={examOption} setExamOption={setExamOption} />
              </div>
              <div className={activeTab === "dashboard" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <InstructorPanelMockup />
              </div>
              <div className={activeTab === "student" ? "relative z-10 animate-in fade-in duration-300" : "opacity-0 pointer-events-none absolute inset-0 z-0"}>
                <StudentPortalMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Flexible Pricing Section */}
      <section id="pricing" className="py-24 px-4 md:px-8 border-b border-slate-900 bg-slate-950 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" } as React.CSSProperties}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-indigo-900/30 text-indigo-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
              Flexible Pricing
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              Pay Only For What You Need
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
              Choose between recurring subscription plans, simple pay-per-test assessments, or get started immediately with our free plan.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch max-w-5xl mx-auto">
            {/* Free Plan Card */}
            <Card className="flex flex-col justify-between border border-slate-900 bg-slate-950 rounded-none p-6 shadow-xl relative hover:border-slate-800 transition-all duration-300">
              <div>
                <Badge className="bg-slate-900 text-slate-400 border border-slate-800 mb-4 font-black uppercase tracking-wider text-[9px] rounded-none px-2.5 py-1">
                  Standard Access
                </Badge>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-white mb-2">Free Plan</CardTitle>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">$0</span>
                  <span className="text-slate-500 text-xs font-semibold"> / Forever</span>
                </div>
                <CardDescription className="text-slate-400 text-xs leading-relaxed border-t border-slate-900 pt-4 mb-6">
                  Perfect for individual trainers and schools starting out with smaller test sizes.
                </CardDescription>
                
                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span><strong>3 Exams</strong> / Month</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span><strong>50 Questions</strong> / Exam</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span><strong>20 Candidates</strong> / Exam</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span>Basic Proctoring &amp; Logs</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6 border border-slate-800"
              >
                Get Started Free
              </Button>
            </Card>

            {/* Subscriptions Card */}
            <Card className="flex flex-col justify-between border-2 border-blue-600 bg-slate-900/50 rounded-none p-6 shadow-2xl relative scale-100 lg:scale-[1.03] transition-all duration-300">
              <div className="absolute top-0 right-6 -translate-y-1/2">
                <Badge className="bg-blue-600 text-white font-black uppercase tracking-wider text-[9px] rounded-none px-3 py-1 shadow-lg shadow-blue-600/25">
                  Best Value
                </Badge>
              </div>
              <div>
                <Badge className="bg-blue-950/40 text-blue-400 border border-blue-900/35 mb-4 font-black uppercase tracking-wider text-[9px] rounded-none px-2.5 py-1">
                  Recurring Licences
                </Badge>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-white mb-2">Subscription Plans</CardTitle>
                <div className="my-6 flex items-baseline gap-1">
                  <span className="text-xs text-slate-500 font-bold">Starting from </span>
                  <span className="text-4xl font-extrabold text-white">$49</span>
                  <span className="text-slate-500 text-xs font-semibold"> / Month</span>
                </div>
                <CardDescription className="text-slate-400 text-xs leading-relaxed border-t border-slate-800 pt-4 mb-6">
                  Ideal for universities, schools, coaching hubs, and corporations conducting exams regularly.
                </CardDescription>

                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                    <span>Flexible tier limits (Starter / Growth / Enterprise)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                    <span>Up to <strong>Unlimited</strong> Exams &amp; Questions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                    <span>Full candidate analytics &amp; score statistics</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-400 shrink-0" />
                    <span>Active Camera Proctoring &amp; custom overrides</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6 shadow-lg shadow-blue-600/15"
              >
                Choose Subscription
              </Button>
            </Card>

            {/* Pay Per Test Card */}
            <Card className="flex flex-col justify-between border border-slate-900 bg-slate-950 rounded-none p-6 shadow-xl relative hover:border-slate-800 transition-all duration-300">
              <div>
                <Badge className="bg-slate-900 text-slate-400 border border-slate-800 mb-4 font-black uppercase tracking-wider text-[9px] rounded-none px-2.5 py-1">
                  One-Time Packages
                </Badge>
                <CardTitle className="text-xl font-black uppercase tracking-tight text-white mb-2">Pay Per Test</CardTitle>
                <div className="my-6">
                  <span className="text-4xl font-extrabold text-white">Single-Use</span>
                  <span className="text-slate-500 text-xs font-semibold"> / Per Test</span>
                </div>
                <CardDescription className="text-slate-400 text-xs leading-relaxed border-t border-slate-900 pt-4 mb-6">
                  Perfect for recruitment drives, one-time placement assessments, and training institutes.
                </CardDescription>

                <ul className="space-y-3.5 text-xs text-slate-300">
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span>Buy single-use test packages on demand</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span>Caps scale up to <strong className="font-extrabold text-white">500 Candidates</strong> &amp; <strong className="font-extrabold text-white">200 Questions</strong></span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span>Includes CSV Excel imports &amp; exports</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check className="h-4.5 w-4.5 text-blue-500 shrink-0" />
                    <span>Camera Proctoring and custom branding options</span>
                  </li>
                </ul>
              </div>
              <Button
                onClick={() => navigate("/auth")}
                className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6 border border-slate-800"
              >
                Buy Test Packages
              </Button>
            </Card>
          </div>
        </div>
      </section>

      {/* Feature Deep Dive Grid */}
      <section id="features" className="py-24 px-4 md:px-8 border-b border-slate-900 bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 1000px" } as React.CSSProperties}>
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-16">
            <Badge className="bg-blue-900/30 text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
              Core Capabilities
            </Badge>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-white mb-4">
              Everything Needed to Run Secure Exams
            </h2>
            <p className="text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
              We focus on intuitive exam construction, bulk onboarding tools, dynamic timing triggers, and robust security proctoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1: Create Exams */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-blue-950 border border-blue-900/30">
                  <Laptop className="h-5 w-5 text-blue-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Create Exams with Ease</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 leading-normal">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Question Bank Integration</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Section Management &amp; Timers</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Navigation Locks &amp; Shuffling</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Negative Marking &amp; Auto Grading</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Scheduling &amp; Multiple Attempts</li>
              </ul>
            </Card>

            {/* Feature 2: Question Bank */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-violet-950 border border-violet-900/30">
                  <Database className="h-5 w-5 text-violet-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Question Bank</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 leading-normal">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Create &amp; Save Questions</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Organize Using Folders</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />CSV &amp; Excel templates Import</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Reuse Questions Across Tests</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Multiple Question Types</li>
              </ul>
            </Card>

            {/* Feature 3: Student Management */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-emerald-950 border border-emerald-900/30">
                  <Users className="h-5 w-5 text-emerald-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Student Management</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 leading-normal">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Add &amp; Manage Student Profiles</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />CSV &amp; Excel student Upload</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Bulk Registration Codes</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Guest Candidates Resumption</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Secure Public Test Access Links</li>
              </ul>
            </Card>

            {/* Feature 4: Security & Proctoring */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 md:col-span-2 lg:col-span-1 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-red-950 border border-red-900/30">
                  <Shield className="h-5 w-5 text-red-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Security &amp; Proctoring</h3>
              </div>
              <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Basic Security</h4>
                  <ul className="space-y-2 text-[11px] text-slate-400">
                    <li>• Fullscreen Enforcement</li>
                    <li>• Tab Switch Detection</li>
                    <li>• Window Blur Logs</li>
                    <li>• Context Blockers (Copy/Paste)</li>
                    <li>• Function Key Lockout</li>
                  </ul>
                </div>
                <div className="space-y-2">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-500">Camera Proctoring</h4>
                  <ul className="space-y-2 text-[11px] text-slate-400">
                    <li>• Face Missing warnings</li>
                    <li>• Multiple Face flags</li>
                    <li>• Timeline Logs</li>
                    <li>• Evidence Snapshots</li>
                  </ul>
                </div>
              </div>
            </Card>

            {/* Feature 5: Analytics & Reports */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-amber-950 border border-amber-900/30">
                  <BarChart4 className="h-5 w-5 text-amber-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Analytics &amp; Reports</h3>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-400 leading-normal">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Live Examination Monitoring</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Candidate Performance Gradebooks</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Test Pass &amp; Score percentages</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Dynamic PDF &amp; Result Reports</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />CSV &amp; Excel Exports</li>
              </ul>
            </Card>

            {/* Feature 6: Custom Branding */}
            <Card className="border border-slate-900 bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-800 transition-all duration-300">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded bg-teal-950 border border-teal-900/30">
                  <Palette className="h-5 w-5 text-teal-400" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-wider text-white">Customize Your Portal</h3>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Personalize your examination platform with custom branding modules to make it feel natively yours:
              </p>
              <ul className="space-y-2.5 text-xs text-slate-300 border-t border-slate-900 pt-3">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />Personalize Organization Name</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />Upload Custom Organization Logo</li>
              </ul>
            </Card>
          </div>
        </div>
      </section>

      {/* Why Choose Us */}
      <section id="why-choose" className="py-24 px-4 md:px-8 border-b border-slate-900 bg-slate-950 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-16">
            <Badge className="bg-blue-900/30 text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full">
              Trust &amp; Security
            </Badge>
            <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-white mb-4">
              Why Choose NS Exam Portal?
            </h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {[
              { title: "Secure Exams", desc: "Anti-cheat lockouts and restriction interceptors" },
              { title: "Easy Test Creation", desc: "Organized question banks with folder trees" },
              { title: "Camera Proctoring", desc: "Live webcam AI face detection warnings" },
              { title: "Real-Time Analytics", desc: "Live dashboard tracking active attempt statuses" },
              { title: "Automated Evaluation", desc: "Instant score generation after submissions" },
              { title: "Multi-Role Access", desc: "Specific dashboards for superadmin, client, and student" },
              { title: "Fast Setup", desc: "Deploy exam workspaces in under a minute" },
              { title: "Cloud-Based Platform", desc: "Scalable hosting with minimal hardware requirements" }
            ].map((item, idx) => (
              <div key={idx} className="p-5 border border-slate-900 bg-slate-950/40 hover:border-slate-800 transition-all">
                <CheckCircle className="h-5 w-5 text-indigo-400 mx-auto mb-3" />
                <h4 className="text-xs font-black uppercase tracking-wider text-white mb-1.5">{item.title}</h4>
                <p className="text-[10px] text-slate-400 leading-normal">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-24 px-4 md:px-8 border-b border-slate-900 bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
        <div className="container mx-auto max-w-3xl">
          <div className="text-center mb-16">
            <div className="flex items-center justify-center w-10 h-10 bg-blue-950/40 border border-blue-900/30 rounded-full mx-auto mb-4">
              <HelpCircle className="h-5 w-5 text-blue-400" />
            </div>
            <h2 className="text-3xl font-black uppercase tracking-tight text-white mb-2">
              Frequently Asked Questions
            </h2>
            <p className="text-slate-400 text-xs font-semibold">
              Everything you need to know about the portal and plans.
            </p>
          </div>

          <div className="space-y-3.5">
            {faqs.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="border border-slate-900 rounded bg-slate-950/60 transition-all duration-300"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between p-4.5 text-left font-black uppercase tracking-wide text-white text-xs hover:bg-slate-900/50 transition-colors"
                  >
                    <span>{faq.question}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4.5 w-4.5 text-slate-500 shrink-0 ml-4" />
                    ) : (
                      <ChevronDown className="h-4.5 w-4.5 text-slate-500 shrink-0 ml-4" />
                    )}
                  </button>
                  {isOpen && (
                    <div className="px-4.5 pb-4.5 text-slate-400 text-xs border-t border-slate-900/60 pt-3 leading-relaxed font-medium animate-in fade-in duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Ready to Conduct / CTA */}
      <section className="py-24 px-4 md:px-8 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-950/20 blur-[150px] pointer-events-none" />
        
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <Badge className="bg-blue-900/40 text-blue-400 border border-blue-900/35 mb-4 font-black uppercase tracking-widest text-[9px] rounded-none px-2.5 py-1">
            Secure Platform
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4 leading-tight">
            Ready to Conduct Your Next Examination?
          </h2>
          <p className="text-slate-400 mb-10 max-w-xl mx-auto text-xs md:text-sm font-semibold leading-relaxed">
            Start with the Free Plan, choose a Subscription, or purchase a Pay Per Test package.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white hover:bg-slate-150 text-slate-955 font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto shadow-xl transition-all"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4 text-blue-600" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => {
                const element = document.getElementById("pricing");
                element?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto"
            >
              View Pricing
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open("mailto:sales@nssoftwaresolutions.in")}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
