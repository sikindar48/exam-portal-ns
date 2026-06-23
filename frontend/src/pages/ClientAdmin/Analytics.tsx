import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { statsApi, clientsApi } from "@/services/api/client";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Users,
  FileQuestion,
  ClipboardList,
  TrendingUp,
  Target,
  Award,
  BarChart3,
  Percent,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  AreaChart,
  Area,
  CartesianGrid,
  Legend,
} from "recharts";

export default function Analytics() {
  const navigate = useNavigate();
  const { clientId, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [features, setFeatures] = useState<string[]>([]);
  const [stats, setStats] = useState<any>({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
    topPerformers: [],
    testPerformance: []
  });

  const fetchAnalyticsData = async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const [statsRes, clientRes] = await Promise.all([
        statsApi.client(),
        clientsApi.get(clientId)
      ]);
      if (!statsRes.error && statsRes.data) {
        setStats(statsRes.data);
      }
      if (!clientRes.error && clientRes.data) {
        setFeatures((clientRes.data as any).features || []);
      }
    } catch (err) {
      console.error("Error loading analytics stats:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && !authLoading) {
      fetchAnalyticsData();
    }
  }, [clientId, authLoading]);

  // Derived metrics from testPerformance
  const hasPerformanceData = stats.testPerformance && stats.testPerformance.length > 0;
  
  // Calculate average of average test scores
  const overallPerformanceAverage = hasPerformanceData
    ? Math.round(stats.testPerformance.reduce((acc: number, curr: any) => acc + curr.avgScore, 0) / stats.testPerformance.length)
    : stats.avgScore;

  // Grade Tiering classification from testPerformance
  const gradeDistribution = [
    { tier: "High (>= 75%)", count: stats.testPerformance.filter((t: any) => t.avgScore >= 75).length, color: "#10b981" },
    { tier: "Medium (40% - 74%)", count: stats.testPerformance.filter((t: any) => t.avgScore >= 40 && t.avgScore < 75).length, color: "#f59e0b" },
    { tier: "Low (< 40%)", count: stats.testPerformance.filter((t: any) => t.avgScore < 40).length, color: "#ef4444" }
  ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Analytics" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Advanced Analytics"
          subtitle="Real-time examination & performance metrics"
          showBackButton={true}
          backPath="/client-admin"
          actions={
            <Button
              onClick={fetchAnalyticsData}
              variant="outline"
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest transition-all"
            >
              Refresh
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-8">
            
            {/* Metric Blocks */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600", desc: "Registered accounts" },
                { label: "Question Pool", value: stats.totalQuestions, icon: FileQuestion, color: "text-slate-600", desc: "Total database items" },
                { label: "Active Tests", value: stats.totalTests, icon: ClipboardList, color: "text-indigo-600", desc: "Available assessments" },
                { label: "Total Submissions", value: stats.totalAttempts, icon: TrendingUp, color: "text-emerald-600", desc: "Finished attempts" },
                { label: "Average Score", value: `${overallPerformanceAverage}%`, icon: Target, color: "text-amber-600", desc: "Classroom benchmark" },
                { label: "Pass Rate", value: `${stats.passRate}%`, icon: Award, color: "text-purple-600", desc: "Submission threshold" },
              ].map(({ label, value, icon: Icon, color, desc }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm hover:border-blue-500 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{label}</p>
                    <Icon className={`h-4 w-4 ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  {loading ? (
                    <Skeleton className="h-8 w-20 rounded-none" />
                  ) : (
                    <>
                      <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide mt-1">{desc}</p>
                    </>
                  )}
                </div>
              ))}
            </div>

            {/* Core Analytics Panels */}
            <div className="relative">
              <div className={!loading && !features.includes("analytics") ? "filter blur-sm select-none pointer-events-none transition-all duration-300" : ""}>
                <div className="grid gap-8 lg:grid-cols-3">
                  
                  {/* Test Performance Trend */}
                  <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-md">
                    <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <BarChart3 className="h-4 w-4 text-slate-400" />
                        <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Comparative Exam Performance</h3>
                      </div>
                    </div>

                     <div className="h-[190px]">
                      {loading ? (
                        <Skeleton className="w-full h-full rounded-none" />
                      ) : hasPerformanceData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={stats.testPerformance} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <defs>
                              <linearGradient id="colorAvg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#2563eb" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                              </linearGradient>
                              <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.15}/>
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" className="opacity-10" />
                            <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '0px', color: '#fff' }}
                              itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                              labelStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#94a3b8' }}
                              formatter={(value, name, props) => {
                                if (name === "Submissions") return [value, name];
                                return [`${value}%`, name];
                              }}
                            />
                            <Legend wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', paddingTop: '5px' }} />
                            <Area type="monotone" dataKey="avgScore" name="Avg Score" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorAvg)" />
                            <Area type="monotone" dataKey="passRate" name="Pass Rate" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorPass)" />
                            <Area type="monotone" dataKey="submissions" name="Submissions" stroke="transparent" fill="transparent" />
                          </AreaChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No submission analytics available</p>
                          <p className="text-[9px] text-slate-500 uppercase mt-1">Submit test attempts to generate analytics charts</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Pass Rate Donut & Metrics */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-md space-y-2">
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <Percent className="h-4 w-4 text-slate-400" />
                        <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Completion Assessment</h3>
                      </div>
                    </div>

                    {loading ? (
                      <Skeleton className="h-[180px] w-full rounded-none" />
                    ) : (
                      <div className="space-y-2">
                        <div className="relative flex items-center justify-center py-1">
                          {/* Standard CSS Dial Gauge */}
                          <div className="relative flex items-center justify-center h-20 w-20 rounded-full border-4 border-slate-100 dark:border-slate-800">
                            <div className="absolute text-center">
                              <p className="text-xl font-black text-blue-600">{stats.passRate}%</p>
                              <p className="text-[7px] font-black text-slate-400 uppercase tracking-widest">Pass Rate</p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-1.5 pt-1">
                          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-50 dark:border-slate-950 pb-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Total Submissions</span>
                            <span className="text-slate-900 dark:text-white">{stats.totalAttempts}</span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold border-b border-slate-50 dark:border-slate-950 pb-1">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Passing Candidates</span>
                            <span className="text-green-500">
                              {Math.round((stats.passRate / 100) * stats.totalAttempts)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-slate-400 uppercase text-[9px] tracking-wider">Needs Improvement</span>
                            <span className="text-red-500">
                              {stats.totalAttempts - Math.round((stats.passRate / 100) * stats.totalAttempts)}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Bottom Row */}
                <div className="grid gap-8 lg:grid-cols-2 mt-8">
                  
                  {/* Score Leaderboard */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-md">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <Award className="h-4 w-4 text-slate-400" />
                      <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Top Ranking Candidates</h3>
                    </div>

                    {loading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((n) => <Skeleton key={n} className="h-11 w-full rounded-none" />)}
                      </div>
                    ) : stats.topPerformers && stats.topPerformers.length > 0 ? (
                      <div className="space-y-3">
                        {stats.topPerformers.map((student: any, i: number) => (
                          <div key={i} className="space-y-1">
                            <div className="flex items-center justify-between text-xs font-bold">
                              <div className="flex items-center gap-3">
                                <span className={`flex h-5 w-5 items-center justify-center text-[9px] font-black ${i === 0 ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                                  0{i + 1}
                                </span>
                                <span className="uppercase text-slate-700 dark:text-slate-350 tracking-tight">{student.name}</span>
                              </div>
                              <span className="text-blue-600 font-black">{student.avg}%</span>
                            </div>
                            {/* Horizontal grade bar */}
                            <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-850">
                              <div className="h-full bg-blue-600" style={{ width: `${student.avg}%` }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-32">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No leaderboard records</p>
                      </div>
                    )}
                  </div>

                  {/* Assessment Grade distribution Tiers */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-md">
                    <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                      <BarChart3 className="h-4 w-4 text-slate-400" />
                      <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Exam Difficulty Distribution</h3>
                    </div>

                    <div className="h-[200px]">
                      {loading ? (
                        <Skeleton className="w-full h-full rounded-none" />
                      ) : hasPerformanceData ? (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={gradeDistribution} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                            <XAxis dataKey="tier" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <YAxis domain={[0, 'auto']} tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '0px', color: '#fff' }}
                              itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                            />
                            <Bar dataKey="count" name="Exams count" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40}>
                              {gradeDistribution.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No distribution data available</p>
                        </div>
                      )}
                    </div>
                  </div>

                </div>
              </div>

              {!loading && !features.includes("analytics") && (
                <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[1px]">
                  <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-none shadow-2xl text-center space-y-6">
                    <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                      <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                        Advanced Analytics
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold uppercase tracking-wider">
                        Upgrade to Starter for Advanced Analytics
                      </p>
                      <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                        Get comparative performance graphs, complete grading assessments, top candidate rankings, and exam difficulty distributions.
                      </p>
                    </div>
                    <div className="pt-2">
                      <Button
                        onClick={() => navigate("/client-admin/subscription")}
                        className="w-full h-11 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px]"
                      >
                        Upgrade Subscription
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}

// Custom Cell component for Recharts conditional coloring
import { Cell } from "recharts";
