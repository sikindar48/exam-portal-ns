import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiClient } from "@/services/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  Shield,
  Zap,
  Brain,
  Loader2,
  Building,
  Users,
} from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

export default function Forgot() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      await apiClient("/api/auth/forgot-password", {
        method: "POST",
        body: { email: email.trim() },
      });
      setSent(true);
      toast({
        title: "Reset link sent",
        description: "Check your inbox for the password reset instructions.",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to send reset link.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 p-12 relative overflow-hidden">
        {/* Subtle Ambient Glows */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/30 dark:bg-blue-600/30 blur-[90px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/30 dark:bg-indigo-600/30 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute -bottom-[10%] left-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/30 dark:bg-purple-600/30 blur-[90px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Ultra-subtle Grid Background */}
        <div className="absolute inset-0 z-0">
          <svg className="absolute inset-0 w-full h-full stroke-slate-300/40 dark:stroke-slate-800/40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="auth-grid-forgot" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V.5H40" fill="none" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid-forgot)" />
          </svg>
        </div>

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <img
              src="/logo.png"
              alt="NS Exam Portal Logo"
              className="h-12 w-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50"
            />
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
                Exam Portal
              </h1>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-1.5 font-bold">
                by NS Software Solutions
              </p>
            </div>
          </div>

          <div className="max-w-md">
            <span className="inline-block text-[11px] font-bold tracking-widest uppercase text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-3 py-1 border border-blue-200/60 dark:border-blue-900/60 mb-6">
              Account Recovery
            </span>
            <h2 className="text-3xl font-black text-slate-900 dark:text-white leading-tight mb-4 tracking-tight">
              Regain access to your examination workspace.
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed font-medium">
              We help educational institutions and enterprise teams keep examination workflows secure and uninterrupted.
            </p>
          </div>
        </div>

        {/* Feature Cards */}
        <div className="relative z-10 space-y-4 my-8">
          <div className="flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm transition-colors hover:border-blue-500">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none shrink-0">
              <Shield className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">
                Secure Reset Tokens
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Time-limited, cryptographically signed tokens ensure only you can reset your password.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm transition-colors hover:border-blue-500">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none shrink-0">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">
                Instant Delivery
              </h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">
                Delivered via high-reputation transactional mail with zero delay.
              </p>
            </div>
          </div>
        </div>

        {/* Footer / Social Proof */}
        <div className="relative z-10 pt-8 mt-8 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            TRUSTED BY LEADING INSTITUTIONS
          </p>
          <div className="flex -space-x-2 relative z-10">
            <div title="NS Software Solutions" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/logo.png" alt="NS" className="w-full h-full object-contain bg-white" />
            </div>
            <div title="RGM Institutions" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm text-slate-400 dark:text-slate-500">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div title="Smart Nurse" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm text-slate-400 dark:text-slate-500">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 dark:text-slate-300">+4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between relative bg-white dark:bg-slate-950">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between p-4 sm:p-6 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/login")}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Sign In
          </Button>
          <Toggle />
        </div>

        {/* Center Form Wrapper */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 pb-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-sm">
            {sent ? (
              <div className="space-y-6 text-center animate-in fade-in duration-300">
                <div className="w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-900/50 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
                  <Mail className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Check your inbox
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                    We sent a password reset link to{" "}
                    <strong className="text-slate-900 dark:text-slate-200 font-semibold">{email}</strong>.
                    Please check your inbox (and spam folder) to reset your password.
                  </p>
                </div>
                <div className="pt-2 space-y-3">
                  <Button
                    onClick={() => navigate("/login")}
                    className="w-full h-11 text-sm font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all"
                  >
                    Return to Sign In
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSent(false)}
                    className="text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-300"
                  >
                    Didn't receive the email? Try another address
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div>
                  <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1.5">
                    Reset your password
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                    Enter your registered email address and we'll send you a link to reset your credentials.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label
                      htmlFor="email"
                      className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400"
                    >
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                        className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 text-sm font-semibold mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending Reset Link...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => navigate("/login")}
                    className="text-xs font-semibold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  >
                    Remember your password? <span className="underline">Sign In</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom spacing helper */}
        <div className="p-4 sm:p-6 text-center text-xs text-slate-400 dark:text-slate-600">
          Secure, isolated exam portal authentication
        </div>
      </div>
    </div>
  );
}
