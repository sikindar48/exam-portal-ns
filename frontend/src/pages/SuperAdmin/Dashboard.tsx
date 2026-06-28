import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Building2, Users, FileQuestion, TrendingUp,
  ArrowRight, CheckCircle2, XCircle, RefreshCw,
  BookOpen, UserCheck, AlertCircle, AlertTriangle,
  Activity, Database, Zap, X,
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
  const [gcpStats, setGcpStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissedExpiry, setDismissedExpiry] = useState(() => {
    return sessionStorage.getItem("dismissed_expiry_alert") === "true";
  });

  useEffect(() => { loadStats(); }, []);

  const loadStats = async () => {
    setLoading(true);
    const [resPlatform, resGcp] = await Promise.all([
      statsApi.platform(),
      statsApi.gcp()
    ]);
    if (resPlatform.data) setStats(resPlatform.data as PlatformStats);
    if (resGcp.data) setGcpStats(resGcp.data);
    setLoading(false);
  };

  const ssd = stats?.subscriptionStatusBreakdown;
  const subPieData = ssd ? [
    { name: "Active",    value: ssd.active,    color: "#10b981" },
    { name: "Trial",     value: ssd.trial,     color: "#3b82f6" },
    { name: "Expired",   value: ssd.expired,   color: "#f59e0b" },
    { name: "Suspended", value: ssd.suspended, color: "#ef4444" },
  ].filter(d => d.value > 0) : [];

  const svc = gcpStats?.cloudRun?.find((s: any) => s.region === "asia-south1") || {
    requestRate: 0,
    cpuUtilization: 0,
    memoryUtilization: 0,
    instanceCount: 0,
    latencyMs: 0,
    netInKbps: 0,
    netOutKbps: 0
  };

  const latency = svc.latencyMs ?? 0;
  const cpu = svc.cpuUtilization ?? 0;
  const mem = svc.memoryUtilization ?? 0;

  let healthLabel = "Healthy";
  let healthColor = "bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800";
  let healthDot = "bg-emerald-500";

  if (latency > 500 || cpu > 90 || mem > 90) {
    healthLabel = "Critical";
    healthColor = "bg-red-50 dark:bg-red-950/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800 animate-pulse";
    healthDot = "bg-red-500";
  } else if (latency > 200 || cpu > 80 || mem > 80) {
    healthLabel = "Warning";
    healthColor = "bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800";
    healthDot = "bg-amber-500";
  }

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
          {!loading && (((stats?.expiringSoonCount ?? 0) > 0 && !dismissedExpiry) || (stats?.suspendedOrgs ?? 0) > 0) && (
            <div className="space-y-2">
              {(stats?.expiringSoonCount ?? 0) > 0 && !dismissedExpiry && (
                <div
                  onClick={() => navigate("/superadmin/subscriptions")}
                  className="flex items-center justify-between px-5 py-3 border border-amber-200 dark:border-amber-900/50 bg-amber-50 dark:bg-amber-950/10 cursor-pointer hover:bg-amber-100 dark:hover:bg-amber-950/20 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />
                    <p className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      <span className="font-black">{stats?.expiringSoonCount}</span> subscription{stats?.expiringSoonCount !== 1 ? "s" : ""} expiring within 7 days —{" "}
                      <span className="underline underline-offset-2">Review subscriptions</span>
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDismissedExpiry(true);
                      sessionStorage.setItem("dismissed_expiry_alert", "true");
                    }}
                    className="p-1 rounded-none hover:bg-amber-100 dark:hover:bg-amber-950 text-amber-500 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                    title="Dismiss alert"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
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

          {/* ── Row 2: Top Organizations & Subscription Health ─────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-stretch">

            {/* Top Orgs by Students (left col-span-2) */}
            <div className="lg:col-span-2 flex flex-col h-full">
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden flex-1 flex flex-col justify-between">
                <div className="px-5 py-3 border-b border-slate-100 dark:border-slate-800">
                  <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em]">Top Organizations by Students</h3>
                </div>
                <div className="p-5 space-y-3">
                  {loading
                    ? Array.from({ length: 5 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="h-3 w-24 bg-slate-100 dark:bg-slate-850 animate-pulse rounded" />
                          <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-850 animate-pulse" />
                          <div className="h-3 w-8 bg-slate-100 dark:bg-slate-850 animate-pulse rounded" />
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
                              <div className="flex-1 h-4 bg-slate-100 dark:bg-slate-850 relative overflow-hidden">
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

            {/* Right Column: Turso Database */}
            <div className="flex flex-col h-full">
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex-1 flex flex-col justify-between">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Database Server</span>
                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300 mt-0.5">Turso DB</h4>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-indigo-50 dark:bg-indigo-950/30 text-indigo-700 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 uppercase tracking-widest flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    {gcpStats?.turso?.type || "turso"}
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/2" />
                  </div>
                ) : (
                  (() => {
                    const db = gcpStats?.turso || {};
                    const sizeBytes = db.sizeBytes ?? 0;
                    const tablesCount = db.tablesCount ?? 0;
                    const url = db.url ?? "local.db";
                    
                    const storageLimit = db.storageLimit ?? 5368709120; // 5 GB
                    const rowsRead = db.rowsRead ?? 0;
                    const rowsReadLimit = db.rowsReadLimit ?? 500000000;
                    const rowsWritten = db.rowsWritten ?? 0;
                    const rowsWrittenLimit = db.rowsWrittenLimit ?? 10000000;

                    const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
                    
                    const storagePct = storageLimit > 0 ? (sizeBytes / storageLimit) * 100 : 0;
                    const readPct = rowsReadLimit > 0 ? (rowsRead / rowsReadLimit) * 100 : 0;
                    const writePct = rowsWrittenLimit > 0 ? (rowsWritten / rowsWrittenLimit) * 100 : 0;

                    const formatPct = (pct: number) => {
                      if (pct === 0) return "0%";
                      if (pct < 0.0001) return "< 0.0001%";
                      return `${pct.toFixed(4)}%`;
                    };

                    const formatNumber = (num: number) => {
                      return new Intl.NumberFormat().format(num);
                    };

                    const formatCompact = (num: number | undefined | null) => {
                      if (num === undefined || num === null) return "0";
                      if (num >= 1000000000) return `${(num / 1000000000).toFixed(0)} GB`;
                      if (num >= 1000000) return `${(num / 1000000).toFixed(0)}M`;
                      if (num >= 1000) return `${(num / 1000).toFixed(0)}K`;
                      return num.toString();
                    };

                    return (
                      <div className="space-y-3.5 mt-4">
                        {/* Usage Bars */}
                        <div className="space-y-3">
                          {/* Storage Size */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                              <span>Storage Used</span>
                              <span>{sizeMb} MB / {formatCompact(storageLimit)} ({formatPct(storagePct)})</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-850 relative overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-indigo-500" style={{ width: `${Math.min(100, storagePct)}%` }} />
                            </div>
                          </div>

                          {/* Rows Read */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                              <span>Rows Read</span>
                              <span>{formatNumber(rowsRead)} / {formatCompact(rowsReadLimit)} ({formatPct(readPct)})</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-850 relative overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-blue-500" style={{ width: `${Math.min(100, readPct)}%` }} />
                            </div>
                          </div>

                          {/* Rows Written */}
                          <div className="space-y-1">
                            <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                              <span>Rows Written</span>
                              <span>{formatNumber(rowsWritten)} / {formatCompact(rowsWrittenLimit)} ({formatPct(writePct)})</span>
                            </div>
                            <div className="h-1.5 bg-slate-100 dark:bg-slate-850 relative overflow-hidden">
                              <div className="absolute inset-y-0 left-0 bg-teal-500" style={{ width: `${Math.min(100, writePct)}%` }} />
                            </div>
                          </div>
                        </div>

                        {/* DB Health Alert check */}
                        <div className="text-[8px] font-black uppercase text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-3 mt-1">
                          <span>Tables: <strong className="text-slate-700 dark:text-slate-300 font-black">{tablesCount}</strong></span>
                          <span className="text-emerald-500 dark:text-emerald-400 flex items-center gap-1 font-black">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            ONLINE
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>
            </div>

          </div>

          {/* ── Row 3: GCP Live Infrastructure & Monitoring ────────────── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm overflow-hidden p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.18em] flex items-center gap-2">
                <Zap className="h-4 w-4 text-emerald-500 animate-pulse" />
                GCP Infrastructure
              </h3>
              {gcpStats?.isMock && (
                <span className="text-[8px] font-black px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-widest">
                  Simulated Mode
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Cloud Run Service 1: asia-south1 */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Cloud Run Service</span>
                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300 mt-0.5">exam-portal-api</h4>
                  </div>
                  <div className="flex items-center gap-2">
                    {!loading && (
                      <span className={`text-[8px] font-black px-1.5 py-0.5 border uppercase tracking-widest flex items-center gap-1.5 ${healthColor}`}>
                        <span className={`h-1.5 w-1.5 rounded-full ${healthDot}`} />
                        {healthLabel}
                      </span>
                    )}
                    <span className="text-[9px] font-black px-1.5 py-0.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 uppercase tracking-widest flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      asia-south1
                    </span>
                  </div>
                </div>

                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/2" />
                  </div>
                ) : (
                  (() => {
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-4 gap-2">
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Traffic</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.requestRate} req/s</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Latency</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.latencyMs ?? 54} ms</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">CPU Load</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.cpuUtilization}%</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Memory</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.memoryUtilization}%</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Instances</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{(svc.instanceCount !== undefined && svc.instanceCount !== null) ? svc.instanceCount : 1} Warm</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Network In</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.netInKbps ?? 0} KB/s</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 text-center">
                            <span className="text-[7px] font-black text-slate-400 block uppercase">Network Out</span>
                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">{svc.netOutKbps ?? 0} KB/s</span>
                          </div>
                          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2 flex items-center justify-center">
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Active</span>
                          </div>
                        </div>

                        {/* CPU progress bar */}
                        <div className="space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase text-slate-400">
                            <span>CPU Utilization</span>
                            <span>{svc.cpuUtilization}%</span>
                          </div>
                          <div className="h-1.5 bg-slate-100 dark:bg-slate-850 relative overflow-hidden">
                            <div className="absolute inset-y-0 left-0 bg-emerald-500" style={{ width: `${Math.min(100, svc.cpuUtilization)}%` }} />
                          </div>
                        </div>
                      </div>
                    );
                  })()
                )}
              </div>

              {/* Cloud Storage Bucket usage */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20 p-4 space-y-4">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2 flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block">Cloud Storage</span>
                    <h4 className="text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300 mt-0.5">Bucket Pools</h4>
                  </div>
                  <span className="text-[9px] font-black px-1.5 py-0.5 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 uppercase tracking-widest flex items-center gap-1">
                    <Database className="h-3 w-3" />
                    Storage
                  </span>
                </div>

                {loading ? (
                  <div className="space-y-2 animate-pulse">
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-850 rounded w-1/2" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    {gcpStats?.storage?.map((b: any) => {
                      const sizeGb = (b.totalBytes / (1024 * 1024 * 1024)).toFixed(3);
                      return (
                        <div key={b.bucketName} className="space-y-3">
                          <div className="flex items-center justify-between text-[10px] border-b border-slate-100 dark:border-slate-800 pb-2">
                            <div className="truncate pr-2">
                              <span className="font-bold text-slate-700 dark:text-slate-300 block truncate" title={b.bucketName}>
                                {b.bucketName.replace("run-sources-ns-exam-portal-", "")}
                              </span>
                              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">
                                {b.objectCount} Objects
                              </span>
                            </div>
                            <span className="font-black text-slate-900 dark:text-white shrink-0">
                              {sizeGb} GB
                            </span>
                          </div>

                          {/* File List */}
                          <div className="space-y-1.5">
                            <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Latest Objects:</span>
                            <div className="space-y-1 max-h-40 overflow-y-auto pr-1">
                              {b.fileList?.length ? (
                                b.fileList.map((file: any) => (
                                  <div key={file.name} className="flex items-center justify-between text-[9px] text-slate-500 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-950/40 p-2 border border-slate-200/50 dark:border-slate-800/50">
                                    <span className="truncate pr-3 font-semibold text-slate-700 dark:text-slate-300" title={file.name}>
                                      {file.name}
                                    </span>
                                    <span className="shrink-0 font-black text-slate-400 text-[8px]">
                                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[9px] text-slate-400 italic py-1">No objects found</p>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
