import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { testsApi } from "@/integrations/turso/client";
import { ClipboardList, User, ArrowLeft } from "lucide-react";

export default function Join() {
  const { code } = useParams();
  const { user, role, signInAnonymously } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState(code || "");
  const [studentName, setStudentName] = useState("");
  const [showNameForm, setShowNameForm] = useState(false);

  useEffect(() => {
    if (code) {
      fetchTest(code);
    } else {
      setLoading(false);
    }
  }, [code]);

  const fetchTest = async (shareCode: string) => {
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
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (user && role === "student") {
      // Logged in student — always allowed
      navigate(`/student/test/${test.id}`);
    } else if (user && role !== "student") {
      toast({ 
        title: "Access Restricted", 
        description: "Only students can take tests. Please sign out of your admin account to continue.", 
        variant: "warning" 
      });
    } else {
      // Guest — check if test allows guests
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

  // Add getByShareCode API method if not present
  // Will be added to testsApi in turso/client.ts

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900 p-4">
      <div className="flex flex-1 w-full items-center justify-center">
        <Card className="w-full max-w-md shadow-lg border border-slate-200 dark:border-slate-800 rounded-none bg-white dark:bg-slate-900">
          <CardHeader className="text-center">
            <div className="flex items-center justify-center mb-4">
              <div className="flex items-center justify-center w-14 h-14 bg-slate-800 rounded-none border border-slate-700 overflow-hidden">
                {test?.clients?.logo_url ? (
                  <img src={test.clients.logo_url} alt={test.clients.name} className="h-full w-full object-cover" />
                ) : (
                  <ClipboardList className="h-6 w-6 text-slate-400" />
                )}
              </div>
            </div>
            <CardTitle className="text-xl font-black text-slate-900 dark:text-white uppercase tracking-tight">
              {test ? test.test_name : "Join Examination"}
            </CardTitle>
            <CardDescription className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1.5">
              {test
                ? `${test.clients?.name ? `${test.clients.name} · ` : ""}Duration: ${test.timer} minutes`
                : "Enter a test invite code to get started"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!test ? (
              <div className="space-y-4">
                <form onSubmit={handleCodeSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-700 dark:text-slate-300">
                      Test Invite Code
                    </Label>
                    <Input
                      value={manualCode}
                      onChange={(e) =>
                        setManualCode(e.target.value.toUpperCase())
                      }
                      placeholder="Enter invite code"
                      className="font-mono text-center text-lg tracking-widest"
                      maxLength={8}
                    />
                  </div>
                  <Button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                    disabled={loading}
                  >
                    {loading ? "Looking up..." : "Find Test"}
                  </Button>
                </form>

                <div className="text-center">
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/")}
                    className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                  </Button>
                </div>
              </div>
            ) : showNameForm ? (
              <form onSubmit={handleGuestJoin} className="space-y-4">


                <div className="space-y-2">
                  <Label className="text-slate-700 dark:text-slate-300">
                    Your Name
                  </Label>
                  <Input
                    value={studentName}
                    onChange={(e) => setStudentName(e.target.value)}
                    placeholder="Enter your full name"
                    className="text-center"
                    required
                  />
                  <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
                    This will be used to identify your test submission
                  </p>
                </div>

                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowNameForm(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="submit"
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  >
                    Start Test
                  </Button>
                </div>
              </form>
            ) : (
              <div className="space-y-4">


                {user && role === "student" ? (
                  <Button
                    onClick={handleJoin}
                    className="w-full bg-green-600 hover:bg-green-700 text-white"
                  >
                    Start Test
                  </Button>
                ) : user && role !== "student" ? (
                  <div className="text-center space-y-3">
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Only students can take tests
                    </p>
                    <Button
                      variant="outline"
                      onClick={() => navigate("/")}
                      className="w-full"
                    >
                      Back to Home
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {test.allow_guests ? (
                      <Button
                        onClick={handleJoin}
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        <User className="mr-2 h-4 w-4" />
                        Take Test as Guest
                      </Button>
                    ) : (
                      <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 text-center">
                        <p className="text-sm font-semibold text-amber-800 dark:text-amber-400">Guest access is not allowed for this test.</p>
                        <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">Please sign in with a student account to continue.</p>
                      </div>
                    )}
                    <div className="text-center">
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
                        Already have an account?
                      </p>
                      <Button
                        variant="outline"
                        onClick={() =>
                          navigate(`/auth?redirect=/join/${test.share_code}`)
                        }
                        className="w-full"
                      >
                        Sign In
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
