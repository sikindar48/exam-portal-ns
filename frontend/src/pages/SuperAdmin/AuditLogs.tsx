import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ShieldCheck, RefreshCw, FileText, Search, Calendar, Eye } from "lucide-react";
import { apiClient } from "@/services/api/client";

export default function SuperAdminAuditLogs() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0 });
  const [selectedMeta, setSelectedMeta] = useState<any>(null);
  const { toast } = useToast();

  // Filter States
  const [userQuery, setUserQuery] = useState("");
  const [action, setAction] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    fetchLogs(1);
  }, [entityType, startDate, endDate]);

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: String(pagination.limit),
      });

      if (userQuery) queryParams.set("user_query", userQuery);
      if (action) queryParams.set("action", action);
      if (entityType) queryParams.set("entity_type", entityType);
      if (startDate) queryParams.set("start_date", startDate);
      if (endDate) queryParams.set("end_date", endDate);

      const res = await apiClient(`/api/superadmin/audit-logs?${queryParams.toString()}`);
      if (res && res.logs) {
        setLogs(res.logs);
        setPagination({
          page: res.pagination.page,
          limit: res.pagination.limit,
          total: res.pagination.total,
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load audit logs",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setUserQuery("");
    setAction("");
    setEntityType("");
    setStartDate("");
    setEndDate("");
    setTimeout(() => {
      fetchLogs(1);
    }, 0);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Audit Logs" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="System Audit"
          subtitle="Administrative Action Logs & Activity Trail"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <Button
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Sync Logs
            </Button>
          }
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-6">
          
          {/* Filters Bar */}
          <form onSubmit={handleFilterSubmit} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 rounded-none shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Filter Audit Trail</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">User Email/ID</label>
                <input
                  type="text"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder="e.g. admin@test.com"
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Action Keyword</label>
                <input
                  type="text"
                  value={action}
                  onChange={(e) => setAction(e.target.value)}
                  placeholder="e.g. plan changed"
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Entity Type</label>
                <select
                  value={entityType}
                  onChange={(e) => setEntityType(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
                >
                  <option value="">All Entities</option>
                  <option value="client_subscription">Subscriptions</option>
                  <option value="client">Clients / Tenants</option>
                  <option value="global_setting">Settings</option>
                  <option value="profile">Profiles / Users</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-red-500"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-red-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-900">
              <button
                type="button"
                onClick={handleClearFilters}
                className="h-9 px-4 border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900 transition-all rounded-none"
              >
                Clear Filters
              </button>
              <button
                type="submit"
                className="h-9 px-6 bg-slate-900 dark:bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none flex items-center gap-1.5"
              >
                <Search className="h-3.5 w-3.5" />
                Query Log
              </button>
            </div>
          </form>

          {/* Audit Logs Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-1/3">Admin User</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-1/3 max-w-[280px]">Action</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest w-[220px]">Timestamp</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right w-[120px]">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Fetching Audit Database...</p>
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <ShieldCheck className="h-10 w-10 text-green-500 opacity-30 mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">No administrative actions logged</p>
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                        <td className="py-4 px-6 w-1/3">
                          <div className="font-bold text-slate-900 dark:text-white text-xs">{log.user_name || "SYSTEM CORE"}</div>
                          <div className="text-[9px] text-slate-400 font-medium">{log.user_email}</div>
                        </td>
                        <td className="py-4 px-6 text-xs text-slate-700 dark:text-slate-300 font-bold w-1/3 max-w-[280px] truncate" title={log.action}>
                          {log.action}
                        </td>
                        <td className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase w-[220px]">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td className="py-4 px-6 text-right">
                          {log.metadata || log.entity_id ? (
                            <button
                              onClick={() => {
                                let parsedMeta = {};
                                if (log.metadata) {
                                  try {
                                    parsedMeta = typeof log.metadata === "string" ? JSON.parse(log.metadata) : log.metadata;
                                  } catch {
                                    parsedMeta = { raw_payload: log.metadata };
                                  }
                                }
                                setSelectedMeta({
                                  entity_type: log.entity_type,
                                  entity_id: log.entity_id,
                                  ...parsedMeta
                                });
                              }}
                              className="h-8 px-3 border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto transition-all rounded-none"
                            >
                              <Eye className="h-3.5 w-3.5" />
                              Inspect
                            </button>
                          ) : (
                            <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                              No Payload
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                  Page {pagination.page} of {totalPages} ({pagination.total} entries)
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchLogs(pagination.page - 1)}
                    disabled={pagination.page === 1 || loading}
                    className="h-8 px-3 rounded-none border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => fetchLogs(pagination.page + 1)}
                    disabled={pagination.page === totalPages || loading}
                    className="h-8 px-3 rounded-none border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest bg-transparent hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300"
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* View Metadata Details Dialog */}
      <Dialog open={selectedMeta !== null} onOpenChange={(open) => !open && setSelectedMeta(null)}>
        <DialogContent className="max-w-lg bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-6 text-slate-900 dark:text-white">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <FileText className="h-4 w-4 text-red-500" />
              Inspection Log Payload
            </DialogTitle>
          </DialogHeader>

          <div className="bg-slate-950 text-slate-300 font-mono text-[10px] p-4 overflow-y-auto max-h-[300px] border border-slate-900 whitespace-pre-wrap select-text">
            {JSON.stringify(selectedMeta, null, 2)}
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-900">
            <Button
              onClick={() => setSelectedMeta(null)}
              className="h-9 px-6 bg-slate-900 dark:bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
            >
              Close Inspector
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
