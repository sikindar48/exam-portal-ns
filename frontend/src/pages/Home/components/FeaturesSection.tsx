import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Laptop,
  Shield,
  Check,
  Users,
  Database,
  BarChart4,
  Palette,
} from "lucide-react";

export function FeaturesSection() {
  return (
    <section id="features" className="py-20 px-4 md:px-8 border-b border-slate-200 dark:border-slate-900 bg-slate-100/30 dark:bg-slate-900/10 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 1000px" } as React.CSSProperties}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
           <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full select-none cursor-default">
            Core Capabilities
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4">
            Everything Needed to Run Secure Exams
          </h2>
          <p className="text-slate-650 dark:text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
            We focus on intuitive exam construction, bulk onboarding tools, dynamic timing triggers, and robust security proctoring.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Feature 1: Create Exams (Bento Grid col-span-2) */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 lg:col-span-2 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded bg-transparent dark:bg-blue-950/40 border border-transparent dark:border-blue-900/40 group-hover:bg-blue-50 group-hover:border-blue-100 transition-all duration-300">
                    <Laptop className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Create Exams with Ease</h3>
                </div>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Build and configure test sheets within minutes. Group items into sections, customize marking rules, and establish access windows.
                </p>
              </div>
              <ul className="space-y-2.5 text-xs text-slate-650 dark:text-slate-400 leading-normal self-center">
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Question Bank Integration</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Section Management &amp; Timers</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Navigation Locks &amp; Shuffling</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Negative Marking &amp; Auto Grading</li>
                <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-blue-500 shrink-0" />Scheduling &amp; Multiple Attempts</li>
              </ul>
            </div>
          </Card>

          {/* Feature 2: Question Bank */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-transparent dark:bg-violet-950/40 border border-transparent dark:border-violet-800/40 group-hover:bg-violet-50 group-hover:border-violet-100 transition-all duration-300">
                <Database className="h-5 w-5 text-violet-600 dark:text-violet-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Question Bank</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-550 dark:text-slate-400 leading-normal">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Create &amp; Save Questions</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Organize Using Folders</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />CSV &amp; Excel templates Import</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Reuse Questions Across Tests</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-violet-500 shrink-0" />Multiple Question Types</li>
            </ul>
          </Card>

          {/* Feature 3: Student Management */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-transparent dark:bg-emerald-950/40 border border-transparent dark:border-emerald-800/40 group-hover:bg-emerald-50 group-hover:border-emerald-100 transition-all duration-300">
                <Users className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Student Management</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-550 dark:text-slate-400 leading-normal">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Add &amp; Manage Student Profiles</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />CSV &amp; Excel student Upload</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Bulk Registration Codes</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Guest Candidates Resumption</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500 shrink-0" />Secure Public Test Access Links</li>
            </ul>
          </Card>

          {/* Feature 5: Analytics & Reports */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-transparent dark:bg-amber-950/40 border border-transparent dark:border-amber-800/40 group-hover:bg-amber-50 group-hover:border-amber-100 transition-all duration-300">
                <BarChart4 className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Analytics &amp; Reports</h3>
            </div>
            <ul className="space-y-2.5 text-xs text-slate-550 dark:text-slate-400 leading-normal">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Live Examination Monitoring</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Candidate Performance Gradebooks</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Test Pass &amp; Score percentages</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />Dynamic PDF &amp; Result Reports</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-amber-500 shrink-0" />CSV &amp; Excel Exports</li>
            </ul>
          </Card>

          {/* Feature 6: Custom Branding */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded bg-transparent dark:bg-teal-950/40 border border-transparent dark:border-teal-900/40 group-hover:bg-teal-50 group-hover:border-teal-100 transition-all duration-300">
                <Palette className="h-5 w-5 text-teal-600 dark:text-teal-400" />
              </div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Customize Your Portal</h3>
            </div>
            <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
              Personalize your examination platform with custom branding modules to make it feel natively yours:
            </p>
            <ul className="space-y-2.5 text-xs text-slate-700 dark:text-slate-300 border-t border-slate-100 dark:border-slate-900 pt-3">
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />Personalize Organization Name</li>
              <li className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-teal-500 shrink-0" />Upload Custom Organization Logo</li>
            </ul>
          </Card>

          {/* Feature 4: Security & Proctoring (Bento Grid col-span-3) */}
          <Card className="group border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950/40 rounded-none p-6 space-y-4 lg:col-span-3 hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded bg-transparent dark:bg-red-950/40 border border-transparent dark:border-red-900/40 group-hover:bg-red-50 group-hover:border-red-100 transition-all duration-300">
                    <Shield className="h-5 w-5 text-red-600 dark:text-red-400" />
                  </div>
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white">Security &amp; Proctoring</h3>
                </div>
                <p className="text-xs text-slate-550 dark:text-slate-400 leading-relaxed">
                  Protect the integrity of your tests with robust cheat-prevention controls, active tab logging, and AI webcam proctoring triggers.
                </p>
              </div>
              <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/20 p-4 border border-slate-100 dark:border-slate-800/40 rounded-lg">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-405 dark:text-slate-500">Basic Security</h4>
                <ul className="space-y-2 text-[11px] text-slate-550 dark:text-slate-400">
                  <li>• Fullscreen Enforcement</li>
                  <li>• Tab Switch Detection</li>
                  <li>• Window Blur Logs</li>
                  <li>• Context Blockers (Copy/Paste)</li>
                  <li>• Function Key Lockout</li>
                </ul>
              </div>
              <div className="space-y-3 bg-blue-50/20 dark:bg-blue-950/10 p-4 border border-blue-100/30 dark:border-blue-900/20 rounded-lg">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">Camera Proctoring</h4>
                <ul className="space-y-2 text-[11px] text-slate-550 dark:text-slate-400">
                  <li>• Face Missing warnings</li>
                  <li>• Multiple Face flags</li>
                  <li>• Timeline Logs</li>
                  <li>• Evidence Snapshots</li>
                </ul>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
