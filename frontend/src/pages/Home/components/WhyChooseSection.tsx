import { Badge } from "@/components/ui/badge";
import {
  Lock,
  FileText,
  Video,
  BarChart4,
  CheckCircle,
  UserCheck,
  FileSpreadsheet,
  Zap,
} from "lucide-react";

const items = [
  {
    title: "Secure Exams",
    desc: "Anti-cheat lockouts, browser restriction locks, and window switch detection logs.",
    icon: <Lock className="h-5 w-5 text-blue-600 dark:text-blue-400" />,
    colorClass: "hover:border-blue-500/50 dark:hover:border-blue-500/30",
    iconBg: "bg-blue-50 dark:bg-blue-950/40 border-blue-100 dark:border-blue-900/30 text-blue-600 dark:text-blue-400"
  },
  {
    title: "Easy Test Creation",
    desc: "Build assessments in minutes with organized question banks and hierarchical folder trees.",
    icon: <FileText className="h-5 w-5 text-violet-600 dark:text-violet-400" />,
    colorClass: "hover:border-violet-500/50 dark:hover:border-violet-500/30",
    iconBg: "bg-violet-50 dark:bg-violet-950/40 border-violet-100 dark:border-violet-900/30 text-violet-600 dark:text-violet-400"
  },
  {
    title: "Camera Proctoring",
    desc: "Live webcam tracking detects face visibility or multiple people with snapshot logs.",
    icon: <Video className="h-5 w-5 text-rose-600 dark:text-rose-400" />,
    colorClass: "hover:border-rose-500/50 dark:hover:border-rose-500/30",
    iconBg: "bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-400"
  },
  {
    title: "Real-Time Analytics",
    desc: "Monitor active candidates, warning thresholds, and test completion rates in real-time.",
    icon: <BarChart4 className="h-5 w-5 text-amber-600 dark:text-amber-400" />,
    colorClass: "hover:border-amber-500/50 dark:hover:border-amber-500/30",
    iconBg: "bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30 text-amber-600 dark:text-amber-400"
  },
  {
    title: "Automated Evaluation",
    desc: "Generate grades, scorecard distributions, and detailed section-wise analytics instantly.",
    icon: <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />,
    colorClass: "hover:border-emerald-500/50 dark:hover:border-emerald-500/30",
    iconBg: "bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900/30 text-emerald-600 dark:text-emerald-400"
  },
  {
    title: "Multi-Role Access",
    desc: "Separate dashboard panels and specialized logs tailored for administrators and candidates.",
    icon: <UserCheck className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />,
    colorClass: "hover:border-indigo-500/50 dark:hover:border-indigo-500/30",
    iconBg: "bg-indigo-50 dark:bg-indigo-950/40 border-indigo-100 dark:border-indigo-900/30 text-indigo-600 dark:text-indigo-400"
  },
  {
    title: "Bulk Imports",
    desc: "Upload lists of hundreds of students or question banks instantly using CSV/Excel templates.",
    icon: <FileSpreadsheet className="h-5 w-5 text-teal-600 dark:text-teal-400" />,
    colorClass: "hover:border-teal-500/50 dark:hover:border-teal-500/30",
    iconBg: "bg-teal-50 dark:bg-teal-950/40 border-teal-100 dark:border-teal-900/30 text-teal-600 dark:text-teal-400"
  },
  {
    title: "Fast Setup",
    desc: "Initialize organization workspaces, seed settings, and launch exams in under 60 seconds.",
    icon: <Zap className="h-5 w-5 text-pink-600 dark:text-pink-400" />,
    colorClass: "hover:border-pink-500/50 dark:hover:border-pink-500/30",
    iconBg: "bg-pink-50 dark:bg-pink-950/40 border-pink-100 dark:border-pink-900/30 text-pink-600 dark:text-pink-400"
  }
];

export function WhyChooseSection() {
  return (
    <section id="why-choose" className="py-20 px-4 md:px-8 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 600px" } as React.CSSProperties}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full select-none cursor-default">
            Trust &amp; Security
          </Badge>
          <h2 className="text-2xl md:text-4xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4">
            Why Choose NS Exam Portal?
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {items.map((item, idx) => (
            <div
              key={idx}
              className={`p-6 text-left border border-slate-205 dark:border-slate-900 bg-white dark:bg-slate-950/40 hover:-translate-y-1 hover:shadow-xl transition-all duration-300 ${item.colorClass}`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center border mb-4 ${item.iconBg}`}>
                {item.icon}
              </div>
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 dark:text-white mb-2">{item.title}</h4>
              <p className="text-[10px] text-slate-550 dark:text-slate-400 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
