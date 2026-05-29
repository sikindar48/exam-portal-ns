import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Users,
  Building,
  FileQuestion,
  ClipboardList,
  TrendingUp,
} from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { supabase } from "@/integrations/supabase/client";
import { Footer } from "@/components/Brand/Footer";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(210, 95%, 45%)",
  "hsl(195, 70%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

export default function SuperAdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
  });
  const [clientData, setClientData] = useState<any[]>([]);
  const [attemptsByClient, setAttemptsByClient] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [clients, profiles, questions, tests, attempts] = await Promise.all([
      supabase.from("clients").select("id, name"),
      supabase.from("profiles").select("id, client_id", { count: "exact" }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("tests").select("id, client_id"),
      supabase
        .from("attempts")
        .select("id, test_id, score, total_marks, status"),
    ]);

    setStats({
      totalClients: clients.data?.length || 0,
      totalStudents: profiles.count || 0,
      totalQuestions: questions.count || 0,
      totalTests: tests.data?.length || 0,
      totalAttempts: attempts.data?.length || 0,
    });

    // Students per client
    if (clients.data && profiles.data) {
      const clientMap = new Map(clients.data.map((c) => [c.id, c.name]));
      const countMap = new Map<string, number>();
      profiles.data.forEach((p) => {
        if (p.client_id) {
          countMap.set(p.client_id, (countMap.get(p.client_id) || 0) + 1);
        }
      });
      setClientData(
        Array.from(countMap.entries()).map(([id, count]) => ({
          name: clientMap.get(id) || "Unknown",
          students: count,
        })),
      );
    }

    // Tests per client for pie chart
    if (clients.data && tests.data) {
      const clientMap = new Map(clients.data.map((c) => [c.id, c.name]));
      const testCountMap = new Map<string, number>();
      tests.data.forEach((t) => {
        if (t.client_id) {
          testCountMap.set(
            t.client_id,
            (testCountMap.get(t.client_id) || 0) + 1,
          );
        }
      });
      setAttemptsByClient(
        Array.from(testCountMap.entries()).map(([id, count]) => ({
          name: clientMap.get(id) || "Unknown",
          value: count,
        })),
      );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Platform Overview" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Premium Header */}
        <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
          <div className="flex items-center gap-4">
            <div className="bg-red-600 p-1.5 rounded-sm">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">Platform Command Center</h1>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">Global Admin Interface</p>
            </div>
          </div>
          
          <div className="flex items-center gap-6">
            <Toggle />
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            {/* Header Section */}
            <div className="flex items-end justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-6">
              <div>
                <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase tracking-tight">System Metrics</h2>
                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Real-time global instance indicators</p>
              </div>
            </div>

            {/* Core Metrics Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Total Clients", value: stats.totalClients, icon: Building, color: "text-blue-600" },
                { label: "Total Students", value: stats.totalStudents, icon: Users, color: "text-slate-600" },
                { label: "Total Questions", value: stats.totalQuestions, icon: FileQuestion, color: "text-indigo-600" },
                { label: "Total Tests", value: stats.totalTests, icon: ClipboardList, color: "text-emerald-600" },
                { label: "Total Attempts", value: stats.totalAttempts, icon: TrendingUp, color: "text-purple-600" },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-none shadow-sm hover:border-red-500 transition-all group">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</p>
                    <Icon className={`h-4 w-4 ${color} opacity-70 group-hover:opacity-100 transition-opacity`} />
                  </div>
                  <p className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{value}</p>
                </div>
              ))}
            </div>

            {/* Charts Section */}
            <div className="grid gap-8 lg:grid-cols-2">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <Users className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Students per Organization</h3>
                </div>
                <div className="h-[300px]">
                  {clientData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={clientData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <XAxis dataKey="name" tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <YAxis tick={{ fontSize: 9, fontWeight: 'bold' }} stroke="#94a3b8" />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '0px', color: '#fff' }}
                          itemStyle={{ fontSize: '10px', fontWeight: 'bold', color: '#fff' }}
                        />
                        <Bar dataKey="students" fill="#3b82f6" radius={[0, 0, 0, 0]} barSize={40} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No data available</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-none shadow-sm">
                <div className="flex items-center gap-2 mb-6 pb-4 border-b border-slate-100 dark:border-slate-800">
                  <ClipboardList className="h-4 w-4 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Tests by Organization</h3>
                </div>
                <div className="h-[300px] flex items-center justify-center">
                  {attemptsByClient.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attemptsByClient}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          labelLine={false}
                          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        >
                          {attemptsByClient.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', border: 'none', borderRadius: '0px', color: '#fff' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No data available</p>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Actions Panel */}
            <div className="pt-4 border-t border-slate-200 dark:border-slate-800">
              <Button
                onClick={() => navigate("/superadmin/clients")}
                className="rounded-none bg-slate-900 hover:bg-slate-800 text-white dark:bg-red-600 dark:hover:bg-red-700 text-xs font-black uppercase tracking-widest px-8 h-12 transition-all shadow-md"
              >
                <Building className="mr-2 h-4 w-4" />
                Manage Client Organizations
              </Button>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
