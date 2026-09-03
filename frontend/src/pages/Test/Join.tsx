import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { testsApi } from "@/services/api/client";
import { User, ArrowLeft, Key, ShieldCheck, Timer, CheckCircle2, ChevronRight, LogIn, RotateCcw } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

export default function Join() {
  const { code } = useParams();
  const { user, role, signInAnonymously } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState(code || "");
  const [studentName, setStudentName] = useState("");
  const [showNameForm, setShowNameForm] = useState(false);

  const fetchTest = useCallback(async (shareCode: string) => {
    setLoading(true);
    try {
      // First, find the test by code regardless of active status
      const { data } = await testsApi.getByShareCode(shareCode.toUpperCase());

      if (!data) {
        toast({
          title: "Not Found",
          description: `Test with code "${shareCode}" was not found.`,
          variant: "destructive",
        });
        setTest(null);
      } else if (data.active === false) {
        toast({
          title: "Test Unavailable",
          description: "This test is currently in Draft mode or not yet published.",
          variant: "warning",
        });
        setTest(null);
      } else {
        setTest(data);
      }
    } catch (err) {
      console.error("Error fetching test:", err);
      toast({
        title: "Error",
        description: "Failed to look up test code.",
        variant: "destructive",
      });
      setTest(null);
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (code) {
      fetchTest(code);
    } else {
      setLoading(false);
    }
  }, [code, fetchTest]);

  const handleJoin = () => {
    const isAnonymous = user?.isAnonymous;
    if (user && role === "student" && !isAnonymous) {
      // Logged in student — always allowed
      navigate(`/student/test/${test.id}`);
    } else if (user && role !== "student" && !isAnonymous) {
      toast({ 
        title: "Access Restricted", 
        description: "Only students can take tests. Please sign out of your admin account to continue.", 
        variant: "warning" 
      });
    } else {
      // Guest / Anonymous — check if test allows guests
      if (!test.allow_guests) {
        toast({
          title: "Sign in Required",
          description: "This test does not allow guest access. Please sign in to continue.",
          variant: "destructive",
        });
        return;
      }
      setShowNameForm(true);
    }
  };

  const handleGuestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentName.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your name to continue.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    // Authenticate anonymously so the guest has a valid Firebase token for API calls
    const { error: authError } = await signInAnonymously();
    if (authError) {
      toast({
        title: "Authentication Failed",
        description: authError.message || "Could not start guest session. Please try again.",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Store guest info in sessionStorage and navigate to test
    sessionStorage.setItem("guestStudentName", studentName.trim());
    sessionStorage.setItem("guestTestId", test.id);
    navigate(
      `/student/test/${test.id}?guest=true&name=${encodeURIComponent(studentName.trim())}`,
    );
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      fetchTest(manualCode.trim());
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 overflow-hidden selection:bg-blue-100">
      {/* Decorative background glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 dark:bg-blue-900/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-400/10 dark:bg-indigo-900/10 blur-[120px] pointer-events-none" />
      
      {/* Theme toggle in top corner */}
      <div className="absolute top-6 right-6">
        <Toggle />
      </div>

      <div className="flex flex-1 w-full items-center justify-center relative z-10 max-w-md my-auto">
        <div className="w-full backdrop-blur-md bg-white/80 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 shadow-[0_20px_50px_rgba(0,0,0,0.05)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-6 md:p-8 space-y-6">
          
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="flex items-center justify-center">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-none blur-sm opacity-20 group-hover:opacity-40 transition-opacity" />
                <div className="relative flex items-center justify-center w-16 h-16 bg-slate-900 dark:bg-slate-950 border border-slate-800 overflow-hidden shadow-inner">
                  {test?.clients?.logo_url ? (
                    <img src={test.clients.logo_url} alt={test.clients.name} className="h-full w-full object-cover" />
                  ) : (
                    <ShieldCheck className="h-8 w-8 text-blue-500 animate-pulse" />
                  )}
                </div>
              </div>
            </div>
            
            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                {test?.clients?.name || "Exam Portal"}
              </span>
              <h1 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                {test ? test.test_name : "Secure Exam Entry"}
              </h1>
              {!test && (
                <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Enter your invite code below to access your examination.
                </p>
              )}
            </div>
          </div>

          {/* Form Content */}
          <div className="space-y-6">
            {!test ? (
              <div className="space-y-4">
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="invite-code" className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                      Invite Code
                    </Label>
                    <div className="relative">
                      <Key className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-450" />
                      <Input
                        id="invite-code"
                        value={manualCode}
                        onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                        placeholder="ENTER INVITE CODE"
                        className="pl-10 text-center font-mono text-lg font-bold tracking-[0.3em] uppercase bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 h-12"
                        maxLength={8}
                        required
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold h-11 text-xs uppercase tracking-widest shadow-lg shadow-blue-500/10 hover:shadow-blue-500/20 transition-all duration-300"
                    disabled={loading}
                  >
                    {loading ? "Searching Repository..." : "Verify & Access Test"}
                  </Button>
                </form>

                <div className="text-center pt-2">
                  <button
                    onClick={() => navigate("/")}
                    className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors uppercase tracking-wider gap-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    Exit to Landing
                  </button>
                </div>
              </div>
            ) : showNameForm ? (
              <form onSubmit={handleGuestJoin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="student-name" className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Candidate Full Name
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                      id="student-name"
                      value={studentName}
                      onChange={(e) => setStudentName(e.target.value)}
                      placeholder="Enter your full name"
                      className="pl-10 text-sm font-semibold bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 h-11"
                      required
                      autoFocus
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 text-center font-medium leading-normal">
                    Please use your official name. This name will be recorded on your final report.
                  </p>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNameForm(false)}
                    className="flex-1 border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider h-11"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold h-11 text-xs uppercase tracking-widest shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-300"
                  >
                    Launch Exam
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-6">
                {/* Verified Test details grid */}
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-900 rounded-sm space-y-4">
                  <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Verified Examination</span>
                  </div>

                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <Timer className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Duration</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">{test?.timer} Min</p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-slate-400">
                        <RotateCcw className="h-3.5 w-3.5" />
                        <span className="text-[9px] font-black uppercase tracking-wider">Attempt Limit</span>
                      </div>
                      <p className="text-sm font-black text-slate-800 dark:text-slate-200">
                        {test?.attempts_allowed === null ? "Unlimited" : test?.attempts_allowed === 1 ? "1 Attempt" : `${test?.attempts_allowed} Attempts`}
                      </p>
                    </div>
                  </div>
                </div>

                {/* User action options */}
                <div className="space-y-3">
                  {user && role === "student" && !user.isAnonymous ? (
                    <Button
                      onClick={handleJoin}
                      className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold h-11 text-xs uppercase tracking-widest shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-300"
                    >
                      Start Examination
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  ) : user && role !== "student" && !user.isAnonymous ? (
                    <div className="text-center space-y-3">
                      <p className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider bg-amber-500/5 border border-amber-500/20 py-2.5 px-3">
                        Only Student accounts can take exams
                      </p>
                      <Button
                        variant="outline"
                        onClick={() => navigate("/")}
                        className="w-full border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider h-11"
                      >
                        Exit to Home
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {test?.allow_guests ? (
                        <Button
                          onClick={handleJoin}
                          className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-bold h-11 text-xs uppercase tracking-widest shadow-lg shadow-green-500/10 hover:shadow-green-500/20 transition-all duration-300"
                        >
                          <User className="mr-2 h-4 w-4 shrink-0" />
                          Take Exam as Guest
                        </Button>
                      ) : (
                        <div className="rounded-sm bg-red-500/5 dark:bg-red-950/10 border border-red-500/20 p-3 text-center">
                          <p className="text-xs font-black uppercase text-red-600 dark:text-red-400 tracking-wider">Authentication Required</p>
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1 leading-normal font-semibold">
                            Guest logins are disabled. You must sign in with an authorized student account.
                          </p>
                        </div>
                      )}

                      <div className="text-center space-y-2 pt-2 border-t border-slate-100 dark:border-slate-900">
                        <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          Authorized Student?
                        </p>
                        <Button
                          variant="outline"
                          onClick={() => navigate(`/login?redirect=/join/${test?.share_code}`)}
                          className="w-full border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-wider h-11 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-950"
                        >
                          <LogIn className="mr-2 h-4 w-4 shrink-0" />
                          Sign in to Account
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Absolute footer */}
      <div className="absolute bottom-6 text-center z-10">
        <p className="text-[10px] text-slate-400 dark:text-slate-600 uppercase tracking-[0.25em] font-black">
          NS Exam Portal &nbsp;·&nbsp; Secure Testing System
        </p>
      </div>
    </div>
  );
}
