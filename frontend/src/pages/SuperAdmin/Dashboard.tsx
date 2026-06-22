import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, FileQuestion, TrendingUp,
  ArrowRight, CheckCircle2, XCircle, RefreshCw,
  BookOpen, UserCheck, AlertCircle, AlertTriangle,
  Activity, Cpu, Database, Zap, HardDrive,
} from "lucide-react";
import { statsApi } from "@/services/api/client";
import { Footer } from "@/components/Brand/Footer";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Button } from "@/components/ui/button";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

// ── Constants ──────────────────────────────────────────────────────────────────

const PLAN_COLORS: Record<string, string> = {
  free:       "#64748b",
  starter:    "#3b82f6",
  growth:     "#10b981",
  enterprise: "#a855f7",
};

const SUB_STATUS: Record<string, { label: string; cls: string }> = {
  active:    { label: "Active",    cls: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50" },
  trial:     { label: "Trial",     cls: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50" },
  expired:   { label: "Expired",   cls: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50" },
  suspended: { label: "Suspended", cls: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50" },
  cancelled: { label: "Cancelled", cls: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-900 dark:text-slate-500 dark:border-slate-800" },
};

// ── Types ──────────────────────────────────────────────────────────────────────

interface RecentClient {
  id: string; name: string; isActive: boolean; createdAt: string;
  subStatus: string; expiryDate: string; planName: string; planId: string;
}

interface TopOrg { name: string; students: number; planName: string; planId: string; }

interface PlatformStats {
  totalClients: number; totalStudents: number; totalQuestions: number;
  totalTests: number; totalAttempts: number; submittedAttempts: number;
  activeClients: number; suspendedOrgs: number; expiringSoonCount: number;
  todayAttempts: number; todayProctoringEvents: number; totalAuditLogs: number;
  newOrgsThisMonth: number;
  planDistribution: { name: string; id: string; count: number }[];
  subscriptionStatusBreakdown: { active: number; trial: number; expired: number; suspended: number; cancelled: number };
  recentClients: RecentClient[];
  topOrgsByStudents: TopOrg[];
  loadMetrics?: {
    concurrentUsers: number;
    rps: number;
    capacityUsage: number;
    cpuLoad: number;
    memoryUsed: number;
    apiLatency: number;
    dbPoolActive: number;
  };
}

// ── Main ───────────────────────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const { data } = await statsApi.platform();
    if (data) setStats(data as PlatformStats);
    setLoading(false);
  };

  const ssd = stats?.subscriptionStatusBreakdown;
  const subPieData = ssd ? [
    { name: "Active",    value: ssd.active,    color: "#10b981" },
    { name: "Trial",     value: ssd.trial,     color: "#3b82f6" },
    { name: "Expired",   value: ssd.expired,   color: "#f59e0b" },
    { name: "Suspended", value: ssd.suspended, color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Overview" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Platform Command"
          subtitle="Global overview — organizations, subscriptions & live activity"
          showBackButton={false}
          actions={
            <Button
              onClick={loadStats}
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        <main className="flex-1 container max-w-7xl mx-auto p-8 space-y-8">

          {/* ── Alert Banners ───────────────────────────────────────────── */}
          {!loading && ((stats?.expiringSoonCount ?? 0) > 0 || (stats?.suspendedOrgs ?? 0) > 0) && (
            <div className="space-y-2">
              {(stats?.expiringSoonCount ?? 0) > 0 && (
                <div
                  onClick={() => navigate("/superadmin/subscriptions")}
                  className="flex items-center gap-3 px-5 py-3 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/10 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/20 transition-all"
                >
                  <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                    <span className="font-black">{stats?.expiringSoonCount}</span> subscription{stats?.expiringSoonCount !== 1 ? "s" : ""} expiring within 7 days —{" "}
                    <span className="underline underline-offset-2">Review subscriptions</span>
                  </p>
                </div>
              )}
              {(stats?.suspendedOrgs ?? 0) > 0 && (
                <div
                  onClick={() => navigate("/superadmin/subscriptions")}
                  className="flex items-center gap-3 px-5 py-3 border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/10 cursor-pointer hover:bg-red-100 dark:hover:bg-red-950/20 transition-all"
                >
                  <AlertCircle className="h-4 w-4 text-red-500 shrink-0" />
                  <p className="text-xs font-bold text-red-700 dark:text-red-400">
                    <span className="font-black">{stats?.suspendedOrgs}</span> organization{stats?.suspendedOrgs !== 1 ? "s" : ""} currently suspended —{" "}
                    <span className="underline underline-offset-2">Manage subscriptions</span>
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Row 1: 5 KPI Cards ─────────────────────────────────────── */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: "Organizations",    value: stats?.totalClients     ?? 0, icon: Building2,    color: "text-blue-600",   border: "border-l-blue-500" },
              { label: "Active Orgs",      value: stats?.activeClients    ?? 0, icon: UserCheck,    color: "text-emerald-600",border: "border-l-emerald-500" },
              { label: "Total Students",   value: stats?.totalStudents    ?? 0, icon: Users,        color: "text-purple-600", border: "border-l-purple-500" },
              { label: "Tests Published",  value: stats?.totalTests       ?? 0, icon: BookOpen,     color: "text-indigo-600", border: "border-l-indigo-500" },
              { label: "Exams Submitted",  value: stats?.submittedAttempts ?? 0, icon: TrendingUp,  color: "text-cyan-600",   border: "border-l-cyan-500" },
            ].map(({ label, value, icon: Icon, color, border }) => (
              <div key={label} className={`bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 border-l-2 ${border} p-5 rounded-none shadow-sm group hover:shadow-md transition-all`}>
                <div className="flex items-center justify-between mb-3">
                  <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{label}</p>
                  <Icon className={`h-4 w-4 ${color} opacity-60 group-hover:opacity-100 transition-opacity`} />
                </div>
                {loading
                  ? <div className="h-8 w-16 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                  : <p className={`text-2xl font-black text-slate-900 dark:text-white tracking-tight`}>{value.toLocaleString()}</p>
                }
              </div>
            ))}
          </div>

          {/* ── Row 1.5: Load Monitoring & Server Pressure ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Card 1: Active Connection Pressure */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em] flex items-center gap-1.5">
                  <Activity className="h-3.5 w-3.5 text-blue-600 animate-pulse" />
                  Active Connection Pressure
                </h3>
                {loading ? (
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                ) : (
                  <span className={`text-[8px] font-black px-1.5 py-0.5 border tracking-widest uppercase ${
                    (stats?.loadMetrics?.capacityUsage ?? 0) > 80
                      ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                      : (stats?.loadMetrics?.capacityUsage ?? 0) > 50
                      ? "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50"
                      : "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50"
                  }`}>
                    {(stats?.loadMetrics?.capacityUsage ?? 0) > 80 ? "HIGH PRESSURE" : (stats?.loadMetrics?.capacityUsage ?? 0) > 50 ? "MODERATE LOAD" : "OPTIMAL"}
                  </span>
                )}
              </div>
              <div className="p-5 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Concurrent Sessions</p>
                    {loading ? (
                      <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {stats?.loadMetrics?.concurrentUsers ?? 0} <span className="text-[10px] text-slate-400 font-bold">Active</span>
                      </p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">API Request Velocity</p>
                    {loading ? (
                      <div className="h-6 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse" />
                    ) : (
                      <p className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                        {stats?.loadMetrics?.rps ?? 0} <span className="text-[10px] text-slate-400 font-bold">req/sec</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>Connection Capacity Utilization</span>
                    <span className="font-black text-slate-700 dark:text-slate-300">{stats?.loadMetrics?.capacityUsage ?? 0}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                    <div
                      className={`absolute inset-y-0 left-0 transition-all duration-500 ${
                        (stats?.loadMetrics?.capacityUsage ?? 0) > 80
                          ? "bg-red-600"
                          : (stats?.loadMetrics?.capacityUsage ?? 0) > 50
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${stats?.loadMetrics?.capacityUsage ?? 0}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Card 2: Database & API Performance Metrics */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em] flex items-center gap-1.5">
                  <Cpu className="h-3.5 w-3.5 text-purple-600" />
                  Database & API Pressure
                </h3>
                {loading ? (
                  <span className="h-2 w-2 rounded-full bg-slate-300 animate-pulse" />
                ) : (
                  <span className="text-[8px] font-black px-1.5 py-0.5 border border-green-100 bg-green-50 text-green-600 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50 tracking-widest uppercase">
                    HEALTHY
                  </span>
                )}
              </div>
              <div className="p-5">
                <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                  <div className="flex items-center gap-3">
                    <Zap className="h-4 w-4 text-amber-500 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Avg API Latency</p>
                      {loading ? (
                        <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse mt-0.5" />
                      ) : (
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{stats?.loadMetrics?.apiLatency ?? 0} ms</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Cpu className="h-4 w-4 text-purple-500 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Server CPU Load</p>
                      {loading ? (
                        <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse mt-0.5" />
                      ) : (
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{stats?.loadMetrics?.cpuLoad ?? 0}%</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <Database className="h-4 w-4 text-blue-500 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">DB Connection Pool</p>
                      {loading ? (
                        <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse mt-0.5" />
                      ) : (
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{stats?.loadMetrics?.dbPoolActive ?? 0}/20 Active</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <HardDrive className="h-4 w-4 text-emerald-500 shrink-0" />
                    <div>
                      <p className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">Memory Footprint</p>
                      {loading ? (
                        <div className="h-4 w-12 bg-slate-100 dark:bg-slate-800 animate-pulse mt-0.5" />
                      ) : (
                        <p className="text-xs font-black text-slate-800 dark:text-slate-200">{stats?.loadMetrics?.memoryUsed ?? 0} MB</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>

          {/* ── Row 2: Today + Subscription Distribution ───────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Top Orgs by Students (left col-span-2) */}
            <div className="lg:col-span-2 flex flex-col h-full">
              {/* Top Orgs by Students */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden flex-1 flex flex-col justify-between">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em]">Top Organizations by Students</h3>
                </div>
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-center">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                          <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 animate-pulse" />
                          <div className="h-3 w-8 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                        </div>
                      ))
                    : !(stats?.topOrgsByStudents?.length)
                      ? <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center py-4">No data yet</p>
                      : stats.topOrgsByStudents.map((org, i) => {
                          const max = stats.topOrgsByStudents[0]?.students || 1;
                          const pct = Math.max(4, Math.round((org.students / max) * 100));
                          const color = PLAN_COLORS[org.planId] || "#64748b";
                          return (
                            <div key={org.name} className="flex items-center gap-3">
                              <span className="text-[9px] font-black text-slate-400 w-4 text-right shrink-0">{i + 1}</span>
                              <p className="text-[10px] font-bold text-slate-700 dark:text-slate-300 w-28 truncate shrink-0" title={org.name}>{org.name}</p>
                              <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-800 relative overflow-hidden">
                                <div
                                  className="absolute inset-y-0 left-0"
                                  style={{ width: `${pct}%`, backgroundColor: `${color}30`, borderRight: `2px solid ${color}` }}
                                  />
                              </div>
                              <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 w-8 text-right shrink-0">{org.students}</span>
                            </div>
                          );
                        })
                  }
                </div>
              </div>
            </div>

            {/* Right Column: Subscription Distribution + Quick Actions */}
            <div className="flex flex-col h-full">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm p-5 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em] mb-4 pb-2 border-b border-slate-100 dark:border-slate-800">Subscription Health</h3>
                  
                  <div className="flex items-center gap-4 min-h-[96px]">
                    {/* Donut */}
                    <div className="w-1/2 h-24">
                      {loading || !subPieData.length ? (
                        <div className="h-full flex items-center justify-center">
                          <div className="h-6 w-6 border-2 border-slate-200 dark:border-slate-800 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                      ) : (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={subPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={20} outerRadius={36} paddingAngle={3}>
                              {subPieData.map((d, i) => <Cell key={i} fill={d.color} stroke="transparent" />)}
                            </Pie>
                            <Tooltip
                              contentStyle={{ backgroundColor: "#0f172a", border: "1px solid #1e293b", borderRadius: 0, color: "#fff", fontSize: 10 }}
                              formatter={(v: any, n: any) => [`${v} orgs`, n]}
                            />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>

                    {/* Status list */}
                    <div className="w-1/2 space-y-1.5 border-l border-slate-100 dark:border-slate-800 pl-4">
                      {ssd ? [
                        { key: "active",    label: "Active",    val: ssd.active,    color: "#10b981" },
                        { key: "trial",     label: "Trial",     val: ssd.trial,     color: "#3b82f6" },
                        { key: "expired",   label: "Expired",   val: ssd.expired,   color: "#f59e0b" },
                        { key: "suspended", label: "Suspended", val: ssd.suspended, color: "#ef4444" },
                      ].map(({ key, label, val, color }) => (
                        <div key={key} className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                            <span className="text-slate-500 dark:text-slate-400">{label}</span>
                          </div>
                          <span className="font-black text-slate-700 dark:text-slate-300">{val}</span>
                        </div>
                      )) : Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded" />
                      ))}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => navigate("/superadmin/subscriptions")}
                  className="mt-4 w-full text-[9px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all py-2 border border-slate-100 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600"
                >
                  Manage Subscriptions <ArrowRight className="h-3 w-3" />
                </button>
              </div>

            </div>
          </div>

          {/* ── Row 3: Recent Organizations ────────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em]">Recently Onboarded Organizations</h3>
              <button
                onClick={() => navigate("/superadmin/clients")}
                className="text-[9px] font-black text-slate-400 hover:text-slate-900 dark:hover:text-white uppercase tracking-widest flex items-center gap-1 transition-all"
              >
                View All <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Organization</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Plan</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Status</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Expiry</th>
                    <th className="px-4 py-3 text-left text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Onboarded</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100 dark:border-slate-900">
                        {[3, 2, 1.5, 2, 2].map((_, j) => (
                          <td key={j} className="px-6 py-4"><div className="h-3 bg-slate-100 dark:bg-slate-800 animate-pulse rounded w-3/4" /></td>
                        ))}
                      </tr>
                    ))
                  ) : !(stats?.recentClients?.length) ? (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">No organizations yet</td></tr>
                  ) : (
                    stats.recentClients.map((org) => {
                      const ss = SUB_STATUS[org.subStatus] || { label: org.subStatus || "—", cls: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-600 dark:border-slate-800" };
                      const isOverdue = org.expiryDate && new Date(org.expiryDate) < new Date();
                      const isNear = org.expiryDate && !isOverdue && new Date(org.expiryDate) < new Date(Date.now() + 7 * 86400000);
                      return (
                        <tr key={org.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-all">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-2">
                              {org.isActive
                                ? <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" />
                                : <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              }
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{org.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: PLAN_COLORS[org.planId] || "#64748b" }} />
                              {org.planName || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[9px] font-black px-2 py-0.5 border rounded-sm uppercase tracking-widest ${ss.cls}`}>{ss.label}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className={`text-[10px] font-bold ${isOverdue ? "text-red-500" : isNear ? "text-amber-500" : "text-slate-500 dark:text-slate-400"}`}>
                              {org.expiryDate || "—"}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-[10px] font-medium text-slate-400 dark:text-slate-500">
                            {new Date(org.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </main>

        <Footer />
      </div>
    </div>
  );
}
