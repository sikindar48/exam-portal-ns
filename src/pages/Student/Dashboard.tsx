import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { LogOut, ClipboardList, History, Trophy } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Brand/Footer";

export default function StudentDashboard() {
  const { signOut, user, clientId } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [attemptCounts, setAttemptCounts] = useState<Record<string, number>>(
    {},
  );
  const [clientInfo, setClientInfo] = useState<{ name: string; logo_url: string | null } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && clientId) {
      fetchData();
    }
  }, [user, clientId]);

  const fetchData = async () => {
    setLoading(true);

    try {
      const [testsData, attemptsData] = await Promise.all([
        supabase
          .from("tests")
          .select("*")
          .eq("client_id", clientId)
          .eq("active", true)
          .order("created_at", { ascending: false }),
        supabase
          .from("attempts")
          .select(
            "id, test_id, score, total_marks, submitted_at, tests(test_name)",
          )
          .eq("student_id", user?.id)
          .eq("status", "submitted")
          .order("submitted_at", { ascending: false }),
      ]);

      if (testsData.error) console.error("Tests fetch error:", testsData.error);
      if (attemptsData.error) console.error("Attempts fetch error:", attemptsData.error);

      if (clientId) {
        const { data: clientData } = await supabase
          .from("clients")
          .select("name, logo_url")
          .eq("id", clientId)
          .single();
        if (clientData) {
          setClientInfo(clientData);
        }
      }

      const allAttempts = attemptsData.data || [];

      // Count per test and grab 5 most recent for display — single query
      const counts: Record<string, number> = {};
      allAttempts.forEach((a) => {
        counts[a.test_id] = (counts[a.test_id] || 0) + 1;
      });

      setTests(testsData.data || []);
      setAttempts(allAttempts.slice(0, 5));
      setAttemptCounts(counts);
    } catch (error) {
      console.error("fetchData error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartTest = (testId: string) => {
    navigate(`/student/test/${testId}`);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Professional Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
            {clientInfo?.logo_url ? (
              <img src={clientInfo.logo_url} alt={clientInfo.name} className="h-full w-full object-cover" />
            ) : (
              <ClipboardList className="h-5 w-5 text-slate-400" />
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] truncate">
              {clientInfo?.name ? `${clientInfo.name} Portal` : "Student Portal"}
            </h1>
            <p className="text-[8px] sm:text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5 truncate">Examination Management System</p>
          </div>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="hidden md:block text-right border-r border-slate-700 pr-6">
            <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Logged in as</p>
            <p className="text-xs font-bold text-slate-200">{user?.email}</p>
          </div>
          <div className="flex items-center gap-3">
            <Toggle />
            <Button 
              variant="ghost" 
              onClick={signOut}
              className="h-9 px-4 rounded-none border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white transition-all text-xs font-bold uppercase tracking-widest"
            >
              <LogOut className="mr-2 h-3.5 w-3.5" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-4 md:p-8 space-y-12">
          
          {/* Section: Available Tests */}
          <section>
            <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 border-b-2 border-slate-900 dark:border-slate-800 pb-4 gap-4">
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white uppercase tracking-tight">Available Examinations</h2>
                <p className="text-[10px] sm:text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Select a paper to begin your session</p>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active Papers</span>
                <p className="text-lg sm:text-xl font-black text-blue-600">{tests.length}</p>
              </div>
            </div>

            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-none" />)}
              </div>
            ) : tests.length === 0 ? (
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center">
                <ClipboardList className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">No examinations are currently scheduled for you.</p>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tests.map((test) => {
                  const used = attemptCounts[test.id] || 0;
                  const allowed = test.attempts_allowed ?? 1;
                  const exhausted = used >= allowed;
                  return (
                    <div 
                      key={test.id} 
                      className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none hover:border-blue-500 transition-all flex flex-col h-full"
                    >
                      <div className="p-6 flex-1">
                        <div className="flex justify-between items-start mb-4">
                          <span className={`text-[10px] font-black px-2 py-1 uppercase tracking-widest ${exhausted ? "bg-slate-100 text-slate-400" : "bg-blue-50 text-blue-600"}`}>
                            {exhausted ? "Exhausted" : "Active"}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                            {test.timer} Min
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-slate-900 dark:text-white leading-tight mb-2 group-hover:text-blue-600 transition-colors uppercase tracking-tight">
                          {test.test_name}
                        </h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          Attempts: <span className={exhausted ? "text-red-500" : "text-slate-600"}>{used} / {allowed}</span>
                        </p>
                      </div>
                      <div className="p-6 pt-0 mt-auto">
                        <Button
                          onClick={() => handleStartTest(test.id)}
                          disabled={exhausted}
                          className={`w-full h-11 rounded-none font-bold uppercase tracking-widest transition-all ${
                            exhausted 
                              ? "bg-slate-100 dark:bg-slate-800 text-slate-400" 
                              : "bg-slate-900 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700 shadow-md"
                          }`}
                        >
                          {exhausted ? "Limit Reached" : "Start Test"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Recent Activity */}
          <section>
            <div className="flex items-center gap-3 mb-8 border-b border-slate-200 dark:border-slate-800 pb-4">
              <History className="h-5 w-5 text-slate-400" />
              <h2 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recent Performance History</h2>
            </div>

            {attempts.length === 0 ? (
              <div className="bg-slate-50 dark:bg-slate-900/50 border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Your recent scores will appear here once you complete a test.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((attempt) => {
                  const pct = attempt.total_marks > 0 ? (attempt.score / attempt.total_marks) * 100 : 0;
                  const passed = pct >= 40;
                  return (
                    <div 
                      key={attempt.id}
                      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none flex flex-col md:flex-row md:items-center justify-between gap-4 group hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all"
                    >
                      <div className="flex-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                          {new Date(attempt.submitted_at).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                        </p>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                          {attempt.tests?.test_name || "Examination Paper"}
                        </h4>
                      </div>
                      
                      <div className="flex flex-wrap items-center justify-between md:justify-end gap-4 md:gap-8 w-full md:w-auto border-t md:border-t-0 pt-3 md:pt-0">
                        <div className="text-left md:text-right">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aggregate Score</p>
                          <p className="text-sm font-black text-slate-900 dark:text-white tabular-nums">
                            {attempt.score?.toFixed(1) || 0} <span className="text-slate-400 text-[10px]">/ {attempt.total_marks || 0}</span>
                          </p>
                        </div>
                        <div className="text-center">
                          <span className={`text-[10px] font-black px-3 py-1 uppercase tracking-widest border ${
                            passed 
                              ? "bg-green-50 text-green-600 border-green-200" 
                              : "bg-red-50 text-red-600 border-red-200"
                          }`}>
                            {passed ? "Qualified" : "Failed"}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate("/student/history")}
                          className="h-10 px-4 rounded-none border border-slate-200 dark:border-slate-800 hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 transition-all text-[10px] font-black uppercase tracking-widest w-full md:w-auto"
                        >
                          Details
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <div className="pt-8 flex justify-center">
            <Button
              onClick={() => navigate("/student/history")}
              variant="outline"
              className="h-12 px-10 rounded-none border-2 border-slate-900 dark:border-slate-700 font-black uppercase tracking-[0.2em] hover:bg-slate-900 hover:text-white transition-all text-xs"
            >
              Access Complete Archives
            </Button>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
