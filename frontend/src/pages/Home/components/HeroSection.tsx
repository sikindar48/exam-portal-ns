import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  GraduationCap,
  ArrowRight,
  Laptop,
  BookOpen,
  Award,
  Building,
  School,
  Briefcase,
  Users,
} from "lucide-react";

const targetAudiences = [
  { label: "Schools", icon: <School className="h-4 w-4 text-emerald-500 dark:text-emerald-400" /> },
  { label: "Colleges & Universities", icon: <GraduationCap className="h-4 w-4 text-blue-500 dark:text-blue-400" /> },
  { label: "Coaching Institutes", icon: <BookOpen className="h-4 w-4 text-violet-500 dark:text-violet-400" /> },
  { label: "Training Institutes", icon: <Briefcase className="h-4 w-4 text-amber-500 dark:text-amber-400" /> },
  { label: "Placement Drives", icon: <Award className="h-4 w-4 text-rose-500 dark:text-rose-400" /> },
  { label: "Corporate Assessments", icon: <Building className="h-4 w-4 text-indigo-500 dark:text-indigo-400" /> },
  { label: "Individual Trainers", icon: <Users className="h-4 w-4 text-teal-500 dark:text-teal-400" /> },
];

export function HeroSection() {
  const navigate = useNavigate();

  return (
    <section className="relative pt-16 sm:pt-24 pb-12 sm:pb-20 px-4 md:px-8 overflow-hidden">
      <div className="container mx-auto max-w-5xl text-center relative z-10">
        <h1 className="text-3xl sm:text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 dark:text-white mb-4 sm:mb-6 leading-[1.15] sm:leading-[1.1]">
          {/* Mobile Title */}
          <span className="block sm:hidden">
            Secure Online
            <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              Exam Platform
            </span>
          </span>
          {/* Desktop Title */}
          <span className="hidden sm:block">
            Secure, Scalable &amp; Reliable
            <span className="block mt-2 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              Online Examination Platform
            </span>
          </span>
        </h1>

        <p className="text-xs sm:text-sm md:text-base text-slate-600 dark:text-slate-400 mb-8 sm:mb-12 max-w-3xl mx-auto leading-relaxed font-medium">
          {/* Mobile Description */}
          <span className="block sm:hidden">
            Conduct secure online exams with automated grading, live proctoring, and smart analytics.
          </span>
          {/* Desktop Description */}
          <span className="hidden sm:block">
            Conduct online examinations with built-in security, automated evaluation, camera proctoring, analytics, and flexible pricing. Fully tailored for schools, colleges, drives, and corporate training programs.
          </span>
        </p>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3.5 justify-center items-center mb-10 sm:mb-16">
          <Button
            size="lg"
            onClick={() => navigate("/register")}
            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs tracking-wider rounded-none px-8 py-5 sm:py-6 w-full sm:w-auto transition-all shadow-xl shadow-blue-900/10 hover:shadow-blue-500/25"
          >
            Get Started Free
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate("/join")}
            className="font-black uppercase text-xs tracking-wider rounded-none px-8 py-5 sm:py-6 w-full sm:w-auto border-slate-350 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          >
            <Laptop className="mr-2 h-4 w-4 text-indigo-500" />
            Join Test Session
          </Button>
        </div>

        {/* Perfect For Section */}
        <div className="border-t border-slate-200 dark:border-slate-900 pt-8 sm:pt-10 max-w-6xl mx-auto">
          <p className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500 mb-6">
            PERFECT FOR EVERY INSTITUTION
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3">
            {targetAudiences.map((audience, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-3 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm hover:border-blue-500 dark:hover:border-blue-500 transition-all duration-200 group"
              >
                <div className="p-1 rounded bg-slate-50 dark:bg-slate-800 group-hover:bg-blue-50 dark:group-hover:bg-blue-950/50 transition-colors shrink-0">
                  {audience.icon}
                </div>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 tracking-tight leading-tight text-left">
                  {audience.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
