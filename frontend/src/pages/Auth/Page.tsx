import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { clientsApi } from "@/services/api/client";
import { Eye, EyeOff, Loader2, ArrowLeft, GraduationCap, Globe, CheckCircle2, Lock, Mail } from "lucide-react";
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
  const [selectedClient, setSelectedClient] = useState("");
  const [clients, setClients] = useState<any[]>([]);
  const [signinLoading, setSigninLoading] = useState(false);
  const [signupLoading, setSignupLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [activeTab, setActiveTab] = useState("signin");

  const { signIn, signUp, signInWithGoogle, signInAnonymously, user, role } = useAuth();
  const anyLoading = signinLoading || signupLoading || googleLoading || guestLoading;
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTo = searchParams.get("redirect");

  useEffect(() => {
    clientsApi.listActive().then(({ data }) => {
      setClients((data as any[]) ?? []);
    });
  }, []);

  useEffect(() => {
    // Never auto-redirect anonymous/guest users — they have no real session
    if (user && !user.isAnonymous && role) {
      navigate(redirectTo ?? ROLE_ROUTES[role] ?? "/auth", { replace: true });
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
    if (!selectedClient) {
      toast({ title: "Error", description: "Please select an organization.", variant: "destructive" });
      return;
    }
    setSignupLoading(true);
    const { error } = await signUp(email.trim(), password, name.trim(), selectedClient);
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
    const { error } = await signInWithGoogle(selectedClient || undefined);
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
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 p-12 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <svg viewBox="0 0 1200 1000" className="w-full h-full">
            <defs>
              <pattern id="grid" width="100" height="100" patternUnits="userSpaceOnUse">
                <path d="M 100 0 L 0 0 0 100" fill="none" stroke="white" strokeWidth="1"/>
              </pattern>
            </defs>
            <rect width="1200" height="1000" fill="url(#grid)"/>
            <circle cx="600" cy="500" r="300" fill="none" stroke="white" strokeWidth="2" opacity="0.2"/>
            <circle cx="200" cy="200" r="150" fill="white" opacity="0.05"/>
            <circle cx="1000" cy="800" r="200" fill="white" opacity="0.05"/>
          </svg>
        </div>

        {/* Animated Blobs */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-400/20 rounded-full blur-3xl animate-pulse"/>
        <div className="absolute bottom-20 right-20 w-72 h-72 bg-purple-400/20 rounded-full blur-3xl animate-pulse"/>

        {/* Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl hover:bg-white/30 transition-all">
              <GraduationCap className="h-8 w-8 text-white"/>
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">NS Exam Portal</h1>
              <p className="text-blue-100 text-sm">Online Assessment Platform</p>
            </div>
          </div>
          <p className="text-blue-50 text-lg leading-relaxed max-w-md">
            Secure, reliable exam management for educational institutions and professional certifications.
          </p>
        </div>

        {/* Features */}
        <div className="relative z-10 space-y-6">
          <div className="flex gap-4 items-start">
            <CheckCircle2 className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1"/>
            <div>
              <h3 className="text-white font-semibold text-lg">Secure Authentication</h3>
              <p className="text-blue-100 text-sm">Multi-method login with Firebase enterprise security</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <CheckCircle2 className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1"/>
            <div>
              <h3 className="text-white font-semibold text-lg">Student-Friendly</h3>
              <p className="text-blue-100 text-sm">Intuitive interface designed for better learning</p>
            </div>
          </div>
          <div className="flex gap-4 items-start">
            <CheckCircle2 className="h-6 w-6 text-blue-200 flex-shrink-0 mt-1"/>
            <div>
              <h3 className="text-white font-semibold text-lg">Data Protected</h3>
              <p className="text-blue-100 text-sm">Enterprise-grade encryption and privacy compliance</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-blue-100 text-sm flex items-center gap-3">
          <span className="font-semibold">Trusted by thousands of students</span>
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
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <div className="mb-4 sm:mb-8">
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white mb-1.5">
                {activeTab === "signin" ? "Welcome back" : "Get started"}
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400">
                {activeTab === "signin" ? "Sign in to continue" : "Create your account"}
              </p>
            </div>

            <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-8">
              <TabsTrigger value="signin">Sign In</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            <TabsContent value="signin" className="space-y-3 sm:space-y-4">
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

              {/* Divider */}
              <div className="flex items-center gap-3 my-3">
                <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"/>
                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">OR</span>
                <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"/>
              </div>

              {/* Email Form */}
              <form onSubmit={handleSignIn} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="email" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Email</Label>
                  <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-10 text-sm"/>
                </div>
                <div>
                  <div className="flex justify-between mb-1.5">
                    <Label htmlFor="password" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Password</Label>
                    <Button
                      type="button"
                      variant="link"
                      size="sm"
                      className="h-auto p-0 text-[10px] uppercase font-bold text-slate-500 hover:text-blue-600"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Forgot?
                    </Button>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required className="h-10 text-sm"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 text-slate-400"/> : <Eye className="h-3.5 w-3.5 text-slate-400"/>}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={anyLoading} className="w-full h-11 text-sm font-semibold mt-2">
                  {signinLoading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Signing In...</> : "Sign In"}
                </Button>
              </form>

              <p className="text-center text-xs text-slate-600 dark:text-slate-400 pt-2">
                No account? <button onClick={() => setActiveTab("signup")} className="text-blue-600 dark:text-blue-400 font-bold hover:underline">Sign up</button>
              </p>
            </TabsContent>

            <TabsContent value="signup" className="space-y-3 sm:space-y-4">
              {/* Google - Hidden on mobile screens */}
              <div className="hidden sm:block">
                <Button onClick={handleGoogleSignIn} disabled={anyLoading} className="w-full h-11 border-2 text-sm mb-3" variant="outline">
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
                      Sign up with Google
                    </>
                  )}
                </Button>
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"/>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 font-bold uppercase">OR</span>
                  <div className="flex-1 h-px bg-slate-300 dark:bg-slate-700"/>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleSignUp} className="space-y-3 sm:space-y-4">
                <div>
                  <Label htmlFor="name" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Name</Label>
                  <Input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required className="h-10 text-sm"/>
                </div>
                <div>
                  <Label htmlFor="signup-email" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Email</Label>
                  <Input id="signup-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required className="h-10 text-sm"/>
                </div>
                <div>
                  <Label htmlFor="org" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Organization</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger id="org" className="h-10 text-sm">
                      <SelectValue placeholder="Select organization"/>
                    </SelectTrigger>
                    <SelectContent>
                      {clients.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          <div className="flex items-center gap-2">
                            {c.logo_url ? (
                              <img src={c.logo_url} alt="" className="h-5 w-5 rounded object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shrink-0" />
                            ) : (
                              <div className="h-5 w-5 rounded bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-[9px] font-black uppercase shrink-0">{c.name.charAt(0)}</div>
                            )}
                            <span>{c.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="signup-password" className="text-xs font-bold uppercase text-slate-500 dark:text-slate-400">Password</Label>
                  <div className="relative">
                    <Input id="signup-password" type={showPassword ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" required minLength={6} className="h-10 text-sm"/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-3">
                      {showPassword ? <EyeOff className="h-3.5 w-3.5 text-slate-400"/> : <Eye className="h-3.5 w-3.5 text-slate-400"/>}
                    </button>
                  </div>
                </div>
                <Button type="submit" disabled={anyLoading || !selectedClient} className="w-full h-11 text-sm font-semibold mt-2">
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
