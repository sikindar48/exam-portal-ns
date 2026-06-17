import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Users,
  FileQuestion,
  ClipboardList,
  Settings,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { statsApi } from "@/integrations/turso/client";
import { Footer } from "@/components/Brand/Footer";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

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
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [testPerformance, setTestPerformance] = useState<any[]>([]);

  useEffect(() => {
    if (clientId && !authLoading) fetchStats();
  }, [clientId, authLoading]);

  const fetchStats = async () => {
    if (!clientId) return;
    try {
      const { data, error } = await statsApi.client();
      if (error || !data) throw error;
      const d = data as any;
      setStats({
        totalStudents: d.totalStudents,
        totalQuestions: d.totalQuestions,
        totalTests: d.totalTests,
        totalAttempts: d.totalAttempts,
        avgScore: d.avgScore,
        passRate: d.passRate,
      });
      setTopPerformers(d.topPerformers || []);
      setTestPerformance(d.testPerformance || []);
    } catch (err: any) {
      console.error("Error fetching stats:", err);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Dashboard" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Premium Admin Header */}
        <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-1.5 rounded-sm">
              <ClipboardList className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">Admin Command Center</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Institute Management Interface</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <Toggle />
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            
            {/* Header Section */}
            <div className="flex items-end justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Overview</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time examination & performance metrics</p>
              </div>
              <div className="text-right flex items-center gap-4">
                <Button 
                  onClick={fetchStats}
                  variant="outline"
                  className="h-10 rounded-none border-slate-200 uppercase text-[10px] font-black tracking-widest"
                >
                  Refresh Data
                </Button>
              </div>
            </div>

            {/* Core Metrics */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {[
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-blue-600" },
                { label: "Question Bank", value: stats.totalQuestions, icon: FileQuestion, color: "text-slate-600" },
                { label: "Active Tests", value: stats.totalTests, icon: ClipboardList, color: "text-indigo-600" },
                { label: "Total Attempts", value: stats.totalAttempts, icon: TrendingUp, color: "text-emerald-600" },
                { label: "Avg. Accuracy", value: `${stats.avgScore}%`, icon: Target, color: "text-amber-600" },
                { label: "Success Rate", value: `${stats.passRate}%`, icon: Award, color: "text-purple-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm hover:border-blue-500 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <Icon className={`h-4 w-4 ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                </div>
              ))}
            </div>

            {/* Analytical Charts & Tables */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <BarChart className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Examination Performance Analytics</h3>
                </div>
                <div className="h-[300px]">
                  {testPerformance.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={testPerformance} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <Tooltip 
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '0px', color: '#fff' }}
                          itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                        />
                        <Bar dataKey="avgScore" fill="#2563eb" radius={[0, 0, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No analytical data available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Award className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Top Ranking Candidates</h3>
                </div>
                <div className="space-y-2">
                  {topPerformers.length > 0 ? (
                    topPerformers.map((student, i) => (
                      <div key={i} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all">
                        <div className="flex items-center gap-4">
                          <span className={`flex h-6 w-6 items-center justify-center text-[10px] font-black ${i === 0 ? "bg-blue-600 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400"}`}>
                            0{i + 1}
                          </span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight">{student.name}</span>
                        </div>
                        <span className="text-xs font-black text-blue-600">{student.avg}%</span>
                      </div>
                    ))
                  ) : (
                    <div className="flex items-center justify-center h-32">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No candidates recorded</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
