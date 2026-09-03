import { useState, useEffect } from "react";
import { useNavigate, useSearchParams, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { clientsApi } from "@/services/api/client";
import { Eye, EyeOff, Loader2, ArrowLeft, GraduationCap, Globe, CheckCircle2, Lock, Mail, Building2, User, Shield, Zap, Brain, Command, Figma, Trello, Box, Building, Users } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

const ROLE_ROUTES = {
  superadmin: "/superadmin",
  clientadmin: "/client-admin",
  student: "/student",
} as const;

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [signinLoading, setSigninLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const location = useLocation();
  const isRegister = location.pathname.includes("register") || location.pathname.includes("signup");
  const [activeTab, setActiveTab] = useState(isRegister ? "signup" : "signin");

  const { signIn, signUp, signInWithGoogle, signInAnonymously, user, role } = useAuth();
  const anyLoading = signinLoading || signupLoading || googleLoading || guestLoading;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    setActiveTab(isRegister ? "signup" : "signin");
  }, [isRegister]);

  useEffect(() => {
    clientsApi.listActive().then(({ data }) => {
      setClients((data as any[]) ?? []);
    });
  }, []);

  useEffect(() => {
    if (user && !user.isAnonymous && role) {
      navigate(redirectTo ?? ROLE_ROUTES[role] ?? "/login", { replace: true });
    }
  }, [user, role, navigate, redirectTo]);

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSigninLoading(true);
    const { error } = await signIn(email.trim(), password);
    setSigninLoading(false);
    if (error) {
      toast({ title: "Sign in failed", description: error.message ?? "An unexpected error occurred.", variant: "destructive" });
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim()) {
      toast({ title: "Error", description: "Please enter your organization name.", variant: "destructive" });
      return;
    }
    setSignupLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim(), orgName.trim());
    setSignupLoading(false);
    if (error) {
      toast({ title: "Sign up failed", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Account created successfully!", description: "Please sign in with your credentials." });
      setActiveTab("signin");
      setPassword("");
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    const { error } = await signInWithGoogle();
    setGoogleLoading(false);
    if (error) {
      toast({ title: "Google sign in failed", description: error.message, variant: "destructive" });
    }
  };

  const handleAnonymousSignIn = async () => {
    setGuestLoading(true);
    const { error } = await signInAnonymously();
    setGuestLoading(false);
    if (error) {
      toast({ title: "Anonymous sign in failed", description: error.message, variant: "destructive" });
    } else {
      navigate(redirectTo ?? "/join", { replace: true });
    }
  };


  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      {/* Left Side - Hero Section */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-900 p-12 relative overflow-hidden">
        
        {/* Subtle Ambient Glows for Glossy Effect */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] rounded-full bg-blue-500/30 dark:bg-blue-600/30 blur-[90px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute top-[30%] -right-[10%] w-[70%] h-[70%] rounded-full bg-indigo-500/30 dark:bg-indigo-600/30 blur-[100px] mix-blend-multiply dark:mix-blend-screen" />
          <div className="absolute -bottom-[10%] left-[10%] w-[60%] h-[60%] rounded-full bg-purple-500/30 dark:bg-purple-600/30 blur-[90px] mix-blend-multiply dark:mix-blend-screen" />
        </div>

        {/* Ultra-subtle Grid Background matching Landing Page style */}
        <div className="absolute inset-0 z-0">
          <svg className="absolute inset-0 w-full h-full stroke-slate-300/40 dark:stroke-slate-800/40" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="auth-grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 40V.5H40" fill="none" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#auth-grid)"/>
          </svg>
        </div>

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-4 mb-12">
            <img src="/logo.png" alt="NS Exam Portal Logo" className="h-12 w-12 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50" />
            <div>
              <h1 className="text-xl md:text-2xl font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
                Exam Portal
              </h1>
              <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-1.5 font-bold">
                by NS Software Solutions
              </p>
            </div>
          </div>
          <h2 className="text-4xl font-black tracking-tight text-slate-900 dark:text-white mb-4 leading-[1.1]">
            SECURE & SCALABLE
            <span className="block mt-1 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 dark:from-blue-400 dark:via-indigo-400 dark:to-violet-400">
              ASSESSMENT PLATFORM
            </span>
          </h2>
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400 leading-relaxed max-w-md">
            Conduct secure online exams with automated evaluation, camera proctoring, and flexible pricing. Fully tailored for institutions and corporate programs.
          </p>
        </div>

        {/* Features - Sharp Brutalist Cards */}
        <div className="relative z-10 space-y-4">
          <div className="flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm transition-colors hover:border-blue-500">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none shrink-0">
              <Zap className="h-5 w-5 text-blue-600 dark:text-blue-400"/>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">High-Capacity Engine</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Handle thousands of concurrent test-takers flawlessly.</p>
            </div>
          </div>
          <div className="flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm transition-colors hover:border-blue-500">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none shrink-0">
              <Brain className="h-5 w-5 text-indigo-600 dark:text-indigo-400"/>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">AI-Driven Proctoring</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Automated invigilation ensuring strict exam integrity.</p>
            </div>
          </div>
          <div className="flex gap-4 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm transition-colors hover:border-blue-500">
            <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-none shrink-0">
              <Shield className="h-5 w-5 text-violet-600 dark:text-violet-400"/>
            </div>
            <div>
              <h3 className="text-slate-900 dark:text-slate-200 font-bold text-xs uppercase tracking-wider mb-1">Isolated Tenancy</h3>
              <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">Enterprise-grade RBAC and data isolation per organization.</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 pt-8 mt-8 border-t border-slate-300 dark:border-slate-800 flex items-center justify-between">
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 dark:text-slate-500">
            TRUSTED BY LEADING INSTITUTIONS
          </p>
          <div className="flex -space-x-2 relative z-10">
            {/* NS Software Solutions */}
            <div title="NS Software Solutions" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-white dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm">
              <img src="/logo.png" alt="NS" className="w-full h-full object-contain bg-white" />
            </div>
            {/* RGM */}
            <div title="RGM Institutions" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm text-slate-400 dark:text-slate-500">
              <Building className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            {/* Smart Nurse */}
            <div title="Smart Nurse" className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-50 dark:bg-slate-900 flex items-center justify-center overflow-hidden shadow-sm text-slate-400 dark:text-slate-500">
              <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </div>
            {/* +4 More */}
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-100 dark:border-slate-950 bg-slate-200 dark:bg-slate-800 flex items-center justify-center shadow-sm">
              <span className="text-[8px] sm:text-[9px] font-bold text-slate-600 dark:text-slate-300">+4</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900 min-h-screen overflow-y-auto">
        {/* Top Header Bar */}
        <div className="w-full flex items-center justify-between p-4 sm:p-6 shrink-0">
          <Button variant="outline" size="sm" onClick={() => navigate("/")} className="gap-2">
            <ArrowLeft className="h-4 w-4"/>
            Back
          </Button>
          <Toggle/>
        </div>

        {/* Center Form Wrapper */}
        <div className="flex-1 flex flex-col justify-center items-center px-4 pb-12 sm:px-6 lg:px-8">
          <div className="w-full max-w-sm">
          <Tabs value={activeTab} onValueChange={(val) => {
            setActiveTab(val);
            navigate(val === "signup" ? "/register" : "/login", { replace: true });
          }}>
            <div className="mb-4 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1.5">
                {activeTab === "signin" ? "Welcome back" : "Register Organization"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {activeTab === "signin" ? "Sign in to continue" : "Create a new workspace for your institution."}
              </p>
            </div>

            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 sm:space-y-4">
              {/* Email Form */}
              <form onSubmit={handleSignIn} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <Label htmlFor="password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[10px] uppercase font-bold text-slate-500 hover:text-indigo-500 transition-colors"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Forgot?
                    </Button>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 hover:text-indigo-600 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4 text-slate-400"/> : <Eye className="h-4 w-4 text-slate-400"/>}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" disabled={anyLoading} className="w-full h-11 text-sm font-semibold mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all">
                  {signinLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Signing In...</> : "Sign In"}
                </Button>
              </form>

              {/* Divider */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"/>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">OR</span>
                <div className="flex-1 h-px bg-slate-200 dark:bg-slate-800"/>
              </div>

              {/* Google Button */}
              <Button onClick={handleGoogleSignIn} disabled={anyLoading} className="w-full h-11 border-2 text-sm" variant="outline">
                {googleLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Connecting...</>
                ) : (
                  <>
                    <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>

              {/* Guest Button */}
              <Button onClick={handleAnonymousSignIn} disabled={anyLoading} className="w-full h-11 border-2 text-sm" variant="outline">
                {guestLoading ? (
                  <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Connecting...</>
                ) : (
                  <>
                    <Globe className="h-4 w-4 mr-2"/>
                    Continue as Guest
                  </>
                )}
              </Button>

              <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
                No account? <button type="button" onClick={() => { setActiveTab("signup"); navigate("/register", { replace: true }); }} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign up</button>
              </p>
            </TabsContent>

            <TabsContent value="signup" className="space-y-4 pt-2">
              {/* Form */}
              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="name" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                      <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="orgName" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Organization Name</Label>
                    <div className="relative">
                      <Building2 className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                      <Input id="orgName" type="text" value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="Acme Institute" required className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                    </div>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-email" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@gmail.com" required className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="signup-password" className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Secure Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400"/>
                    <Input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} className="pl-9 h-10 text-sm bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 focus-visible:ring-indigo-500 placeholder:text-slate-400 dark:placeholder:text-slate-500"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-2.5 hover:text-indigo-600 transition-colors">
                      {showPassword ? <EyeOff className="h-4 w-4 text-slate-400"/> : <Eye className="h-4 w-4 text-slate-400"/>}
                    </button>
                  </div>
                </div>
                
                <Button type="submit" disabled={anyLoading || !orgName.trim()} className="w-full h-11 text-sm font-semibold mt-6 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-md border-0 transition-all">
                  {signupLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Creating Account...</> : "Create Account"}
                </Button>
              </form>

              <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
                Have an account? <button onClick={() => setActiveTab("signin")} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign in</button>
              </p>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  </div>
  );
}
