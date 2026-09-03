import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import {
  Check,
  ChevronDown,
  Shield,
  Award,
  FileText,
  Briefcase,
  Users,
} from "lucide-react";

type SubPlan = "starter" | "growth" | "enterprise";
type PayPerTestPkg = "base" | "basic" | "standard" | "professional" | "placement_drive";

const packageIcons: Record<PayPerTestPkg, React.ReactNode> = {
  base: <FileText className="h-4 w-4 text-emerald-500 shrink-0" />,
  basic: <Award className="h-4 w-4 text-blue-500 shrink-0" />,
  standard: <Shield className="h-4 w-4 text-indigo-500 shrink-0" />,
  professional: <Briefcase className="h-4 w-4 text-amber-500 shrink-0" />,
  placement_drive: <Users className="h-4 w-4 text-rose-500 shrink-0" />,
};

export function PricingSection() {
  const navigate = useNavigate();
  const [selectedSubPlan, setSelectedSubPlan] = useState<SubPlan>("starter");
  const [selectedPayPerTestPkg, setSelectedPayPerTestPkg] = useState<PayPerTestPkg>("standard");
  const [isPayPerTestDropdownOpen, setIsPayPerTestDropdownOpen] = useState(false);

  return (
    <section id="pricing" className="py-20 px-4 md:px-8 border-b border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 content-visibility-auto" style={{ contentVisibility: "auto", containIntrinsicSize: "0 800px" } as React.CSSProperties}>
      <div className="container mx-auto max-w-6xl">
        <div className="text-center mb-16">
          <Badge className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/30 hover:text-blue-600 dark:hover:text-blue-400 border-none mb-3 px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full select-none cursor-default">
            Flexible Pricing
          </Badge>
          <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-4">
            Pay Only For What You Need
          </h2>
          <p className="text-slate-600 dark:text-slate-400 max-w-xl mx-auto text-xs md:text-sm font-medium">
            Choose between recurring subscription plans, simple pay-per-test assessments, or get started immediately with our free plan.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start max-w-5xl mx-auto">
          {/* Free Plan Card */}
          <Card className="flex flex-col justify-between border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 rounded-none p-6 shadow-xl relative hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div>
              <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-400 border border-slate-200 dark:border-slate-800 mb-4 font-black uppercase tracking-wider text-[9px] rounded-none px-2.5 py-1 select-none cursor-default">
                Standard Access
              </Badge>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Free Plan</CardTitle>
              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">₹0</span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold"> / Forever</span>
              </div>
              <CardDescription className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed border-t border-slate-100 dark:border-slate-900 pt-4 mb-6">
                Perfect for individual trainers and schools starting out with smaller test sizes.
              </CardDescription>
              
              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span><strong>3 Exams</strong> / Month</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span><strong>50 Questions</strong> / Exam</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span><strong>20 Candidates</strong> / Exam</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span><strong>25 MB Storage</strong> Limit</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>Question Shuffle &amp; Analytics</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="h-4 w-4 text-blue-500 shrink-0" />
                  <span>No Proctoring Security</span>
                </li>
              </ul>
            </div>
            <Button
              onClick={() => navigate("/register")}
              className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6"
            >
              Get Started Free
            </Button>
          </Card>

          {/* Subscriptions Card */}
          <Card className="flex flex-col justify-between border-2 border-blue-600 bg-blue-55/5 dark:bg-slate-900/50 rounded-none p-6 shadow-2xl relative scale-100 lg:scale-[1.02] transition-all duration-300">
            <div className="absolute top-0 right-6 -translate-y-1/2">
              <Badge className="bg-blue-600 text-white hover:bg-blue-600 hover:text-white font-black uppercase tracking-wider text-[9px] rounded-none px-3 py-1 shadow-lg shadow-blue-600/25 select-none cursor-default">
                Best Value
              </Badge>
            </div>
            <div>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Subscription Plans</CardTitle>
              
              <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg mb-4 mt-2">
                {(["starter", "growth", "enterprise"] as const).map((tier) => (
                  <button
                    key={tier}
                    onClick={() => setSelectedSubPlan(tier)}
                    className={`py-2 px-1 rounded text-[9px] font-black uppercase tracking-wider transition-all text-center ${
                      selectedSubPlan === tier
                        ? "bg-white dark:bg-slate-800 text-blue-650 dark:text-blue-450 shadow-sm border border-slate-200 dark:border-slate-700/50"
                        : "text-slate-500 hover:text-slate-855 dark:hover:text-slate-300"
                    }`}
                  >
                    {tier}
                  </button>
                ))}
              </div>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {selectedSubPlan === "starter" ? "₹1,999" : selectedSubPlan === "growth" ? "₹3,999" : "Custom"}
                </span>
                {selectedSubPlan !== "enterprise" && (
                  <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold"> / Month</span>
                )}
              </div>

              <CardDescription className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed border-t border-slate-200 dark:border-slate-800 pt-4 mb-6">
                {selectedSubPlan === "starter" && "For growing academies conducting standard online exams regularly."}
                {selectedSubPlan === "growth" && "For mid-size training hubs and universities needing higher capacity limits."}
                {selectedSubPlan === "enterprise" && "For large institutions requiring full browser lockouts and camera proctoring."}
              </CardDescription>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {selectedSubPlan === "starter" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>25 Exams</strong> / Month</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>100 Questions</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>100 Candidates</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>250 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>CSV Imports &amp; XLSX Exports</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>Custom Branding &amp; Analytics</span></li>
                  </>
                )}
                {selectedSubPlan === "growth" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>50 Exams</strong> / Month</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>200 Questions</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>250 Candidates</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>1 GB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>Camera Proctoring</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>Everything in Starter</span></li>
                  </>
                )}
                {selectedSubPlan === "enterprise" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>100 Exams</strong> / Month</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>300 Questions</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>500 Candidates</strong> / Exam</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span><strong>5 GB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>Camera Proctoring &amp; Branding</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 dark:text-blue-400 shrink-0" /><span>Dedicated Support &amp; SLA</span></li>
                  </>
                )}
              </ul>
            </div>
            <Button
              onClick={() => navigate("/register")}
              className="mt-8 bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6 shadow-lg shadow-blue-600/15"
            >
              Choose Subscription
            </Button>
          </Card>

          {/* Pay Per Test Card */}
          <Card className="flex flex-col justify-between border border-slate-200 dark:border-slate-900 bg-white dark:bg-slate-950 rounded-none p-6 shadow-xl relative hover:border-slate-350 dark:hover:border-slate-800 transition-all duration-300">
            <div>
              <Badge className="bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-600 dark:hover:text-slate-400 border border-slate-200 dark:border-slate-800 mb-4 font-black uppercase tracking-wider text-[9px] rounded-none px-2.5 py-1 select-none cursor-default">
                One-Time Packages
              </Badge>
              <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white mb-2">Pay Per Test</CardTitle>
              
              <div className="relative mb-4 mt-2">
                <button
                  type="button"
                  onClick={() => setIsPayPerTestDropdownOpen(!isPayPerTestDropdownOpen)}
                  className="w-full flex items-center justify-between bg-slate-50 dark:bg-slate-900 border border-slate-205 dark:border-slate-800 text-[10px] font-black uppercase tracking-wider py-2.5 px-3 rounded text-slate-800 dark:text-white text-left focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <span className="flex items-center gap-2">
                    {packageIcons[selectedPayPerTestPkg]}
                    {selectedPayPerTestPkg === "base" && "Base Assessment (₹99)"}
                    {selectedPayPerTestPkg === "basic" && "Basic Assessment (₹199)"}
                    {selectedPayPerTestPkg === "standard" && "Standard Assessment (₹399)"}
                    {selectedPayPerTestPkg === "professional" && "Professional Assessment (₹499)"}
                    {selectedPayPerTestPkg === "placement_drive" && "Placement Drive (₹1,499)"}
                  </span>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-500 transition-transform ${isPayPerTestDropdownOpen ? "rotate-180" : ""}`} />
                </button>

                {isPayPerTestDropdownOpen && (
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-205 dark:border-slate-800 rounded-lg shadow-2xl z-30 py-1 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                    {(["base", "basic", "standard", "professional", "placement_drive"] as const).map((pkg) => {
                      const labels = {
                        base: "Base Assessment (₹99)",
                        basic: "Basic Assessment (₹199)",
                        standard: "Standard Assessment (₹399)",
                        professional: "Professional Assessment (₹499)",
                        placement_drive: "Placement Drive (₹1,499)"
                      };
                      return (
                        <button
                          key={pkg}
                          type="button"
                          onClick={() => {
                            setSelectedPayPerTestPkg(pkg);
                            setIsPayPerTestDropdownOpen(false);
                          }}
                          className={`w-full flex items-center gap-2 text-left py-2.5 px-3 text-[10px] font-black uppercase tracking-wider transition-colors hover:bg-slate-50 dark:hover:bg-slate-800 ${
                            selectedPayPerTestPkg === pkg
                              ? "text-blue-600 dark:text-blue-450 bg-blue-50/20 dark:bg-blue-950/20"
                              : "text-slate-650 dark:text-slate-350"
                          }`}
                        >
                          {packageIcons[pkg]}
                          {labels[pkg]}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="my-6">
                <span className="text-4xl font-extrabold text-slate-900 dark:text-white">
                  {selectedPayPerTestPkg === "base" && "₹99"}
                  {selectedPayPerTestPkg === "basic" && "₹199"}
                  {selectedPayPerTestPkg === "standard" && "₹399"}
                  {selectedPayPerTestPkg === "professional" && "₹499"}
                  {selectedPayPerTestPkg === "placement_drive" && "₹1,499"}
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-xs font-semibold"> / Per Test</span>
              </div>

              <CardDescription className="text-slate-650 dark:text-slate-400 text-xs leading-relaxed border-t border-slate-105 dark:border-slate-900 pt-4 mb-6">
                {selectedPayPerTestPkg === "base" && "Simple one-time test with no proctoring security options."}
                {selectedPayPerTestPkg === "basic" && "Standard test with basic browser tracking proctoring."}
                {selectedPayPerTestPkg === "standard" && "Secure one-time test with full webcam camera proctoring."}
                {selectedPayPerTestPkg === "professional" && "High-capacity test with full webcam camera proctoring."}
                {selectedPayPerTestPkg === "placement_drive" && "Bulk candidate capacity limits for large placement drives."}
              </CardDescription>

              <ul className="space-y-3 text-xs text-slate-700 dark:text-slate-300">
                {selectedPayPerTestPkg === "base" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Single-use test package</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Questions</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Candidates</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>25 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Analytics &amp; Custom Branding</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>No Proctoring Security</span></li>
                  </>
                )}
                {selectedPayPerTestPkg === "basic" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Single-use test package</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Questions</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Candidates</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>CSV Imports &amp; XLSX Exports</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Basic Security (Browser Lock)</span></li>
                  </>
                )}
                {selectedPayPerTestPkg === "standard" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Single-use test package</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Questions</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>50 Candidates</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>100 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Camera Proctoring</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>CSV Imports &amp; XLSX Exports</span></li>
                  </>
                )}
                {selectedPayPerTestPkg === "professional" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Single-use test package</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>100 Questions</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>100 Candidates</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>100 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Camera Proctoring</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>CSV Imports &amp; XLSX Exports</span></li>
                  </>
                )}
                {selectedPayPerTestPkg === "placement_drive" && (
                  <>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Single-use test package</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>200 Questions</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>500 Candidates</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span><strong>100 MB Storage</strong> Limit</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>Camera Proctoring</span></li>
                    <li className="flex items-center gap-2.5"><Check className="h-4 w-4 text-blue-500 shrink-0" /><span>CSV Imports &amp; XLSX Exports</span></li>
                  </>
                )}
              </ul>
            </div>
            <Button
              onClick={() => navigate("/register")}
              className="mt-8 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-[10px] tracking-wider rounded-none py-6"
            >
              Buy Test Packages
            </Button>
          </Card>
        </div>
      </div>
    </section>
  );
}
