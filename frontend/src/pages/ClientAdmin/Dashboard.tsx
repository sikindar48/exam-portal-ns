import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import {
  Users,
  FileQuestion,
  ClipboardList,
  Settings,
  TrendingUp,
  Target,
  Award,
  Shield,
  Activity,
  Calendar
} from "lucide-react";
import { statsApi, attemptsApi } from "@/services/api/client";
import { Footer } from "@/components/Brand/Footer";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ClientAdminDashboard() {
  const { signOut, clientId, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [recentAttempts, setRecentAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (clientId && !authLoading) {
      fetchDashboardData();
    }
  }, [clientId, authLoading]);

  const fetchDashboardData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [statsRes, attemptsRes] = await Promise.all([
        statsApi.client(),
        attemptsApi.list({ limit: "5", page: "1" } as any)
      ]);

      if (!statsRes.error && statsRes.data) {
        const d = statsRes.data as any;
        setStats({
          totalStudents: d.totalStudents,
          totalQuestions: d.totalQuestions,
          totalTests: d.totalTests,
          totalAttempts: d.totalAttempts,
          avgScore: d.avgScore,
          passRate: d.passRate,
        });
      }

      if (!attemptsRes.error && attemptsRes.data) {
        setRecentAttempts((attemptsRes.data as any).data || []);
      }
    } catch (err: any) {
      console.error("Error fetching dashboard data:", err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    let date;
    if (!dateStr.includes("Z") && !dateStr.includes("T")) {
      date = new Date(dateStr.replace(" ", "T") + "Z");
    } else {
      date = new Date(dateStr);
    }
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Dashboard" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="System Overview"
          subtitle="Real-time examination & performance metrics"
          showBackButton={false}
          actions={
            <Button 
              onClick={fetchDashboardData}
              variant="outline"
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Refresh Data
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">

            {/* Core Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600", desc: "Enrolled candidates" },
                { label: "Question Bank", value: stats.totalQuestions, icon: FileQuestion, color: "text-slate-600", desc: "Total items in pool" },
                { label: "Active Tests", value: stats.totalTests, icon: ClipboardList, color: "text-indigo-600", desc: "Available papers" },
                { label: "Total Attempts", value: stats.totalAttempts, icon: TrendingUp, color: "text-emerald-600", desc: "Total submissions" },
                { label: "Avg. Accuracy", value: `${stats.avgScore}%`, icon: Target, color: "text-amber-600", desc: "Average class mark" },
                { label: "Success Rate", value: `${stats.passRate}%`, icon: Award, color: "text-purple-600", desc: "Passed attempts" },
              ].map(({ label, value, icon: Icon, color, desc }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm hover:border-blue-500 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <Icon className={`h-4 w-4 ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                  <p className="text-[8px] font-bold text-slate-500 uppercase mt-1">{desc}</p>
                </div>
              ))}
            </div>

            {/* Grid Layout for Shortcuts and Recent Submissions */}
            <div className="grid gap-8 lg:grid-cols-3">
              
              {/* Quick Actions Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                    <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Quick Operations</h3>
                  </div>
                  <div className="space-y-4">
                    {[
                      { label: "Create Test Paper", desc: "Configure questions & settings", onClick: () => navigate("/client-admin/tests") },
                      { label: "Manage Candidates", desc: "Upload CSV, reset passwords", onClick: () => navigate("/client-admin/students") },
                      { label: "Audit Proctoring", desc: "Inspect real-time logs", onClick: () => navigate("/client-admin/proctoring") },
                      { label: "View Analytics", desc: "Deeper performance insights", onClick: () => navigate("/client-admin/analytics") }
                    ].map((shortcut, i) => (
                      <button
                        key={i}
                        onClick={shortcut.onClick}
                        className="w-full text-left p-3 border border-slate-100 dark:border-slate-850 hover:border-blue-500 transition-all flex flex-col justify-center"
                      >
                        <span className="text-xs font-black uppercase text-slate-850 dark:text-slate-200 tracking-tight">{shortcut.label}</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">{shortcut.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Recent Activity Table */}
              <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Activity className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Recent Examination Submissions</h3>
                </div>

                {loading ? (
                  <div className="space-y-3">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <div key={n} className="h-10 bg-slate-50 dark:bg-slate-950 animate-pulse rounded-none" />
                    ))}
                  </div>
                ) : recentAttempts.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-b border-slate-200 dark:border-slate-800">
                          <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Candidate</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest py-3">Assessment Paper</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest py-3 text-center">Score</TableHead>
                          <TableHead className="text-[9px] font-black uppercase tracking-widest py-3 text-right">Submitted At</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {recentAttempts.map((attempt) => (
                          <TableRow key={attempt.id} className="border-b border-slate-100 dark:border-slate-900/50 hover:bg-slate-50 dark:hover:bg-slate-950">
                            <TableCell className="py-3">
                              <p className="text-xs font-black uppercase text-slate-800 dark:text-slate-200">{attempt.profiles?.name || "Anonymous Guest"}</p>
                              <p className="text-[9px] font-semibold text-slate-500">{attempt.profiles?.email || "Guest Participant"}</p>
                            </TableCell>
                            <TableCell className="py-3">
                              <p className="text-xs font-bold text-slate-700 dark:text-slate-350">{attempt.tests?.test_name || "Assessment"}</p>
                            </TableCell>
                            <TableCell className="py-3 text-center">
                              {attempt.status === "submitted" ? (
                                <span className="text-xs font-black text-blue-600">{attempt.score} / {attempt.total_marks}</span>
                              ) : (
                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 px-1.5 py-0.5">In Progress</span>
                              )}
                            </TableCell>
                            <TableCell className="py-3 text-right text-slate-500 font-mono text-[10px]">
                              {attempt.status === "submitted" 
                                ? formatDate(attempt.submitted_at) 
                                : `${formatDate(attempt.started_at)} (Started)`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 text-center">
                    <Calendar className="h-8 w-8 text-slate-300 mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No recent attempts recorded</p>
                    <p className="text-[9px] text-slate-500 uppercase mt-1">Attempts will appear here as candidates submit exams</p>
                  </div>
                )}
              </div>

            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
