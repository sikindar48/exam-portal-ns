import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { Footer } from "@/components/Brand/Footer";
import { proctoringApi, clientsApi } from "@/services/api/client";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, AlertTriangle, Eye, RefreshCw, Calendar, FileImage, ShieldCheck } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function SuperAdminSecurity() {
  const [events, setEvents] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 15, total: 0 });
  const { toast } = useToast();

  // Filters state
  const [clientId, setClientId] = useState("");
  const [eventType, setEventType] = useState("");
  const [severity, setSeverity] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Modal for evidence preview
  const [selectedEvidence, setSelectedEvidence] = useState<{ url: string; eventType: string; candidate: string } | null>(null);

  useEffect(() => {
    fetchClients();
  }, []);

  useEffect(() => {
    fetchLogs(1);
  }, [clientId, eventType, severity, startDate, endDate]);

  const fetchClients = async () => {
    const { data } = await clientsApi.list();
    if (data) setClients(data);
  };

  const fetchLogs = async (page = 1) => {
    setLoading(true);
    const { data, error } = await proctoringApi.listAllEvents({
      page,
      limit: pagination.limit,
      client_id: clientId || undefined,
      event_type: eventType || undefined,
      severity: severity || undefined,
      start_date: startDate ? new Date(startDate).toISOString() : undefined,
      end_date: endDate ? new Date(endDate).toISOString() : undefined,
    });

    if (error) {
      toast({ title: "Error", description: error.message || "Failed to fetch logs", variant: "destructive" });
    } else if (data) {
      setEvents(data.events || []);
      setPagination({
        page: data.pagination.page,
        limit: data.pagination.limit,
        total: data.pagination.total,
      });
    }
    setLoading(false);
  };

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const handleClearFilters = () => {
    setClientId("");
    setEventType("");
    setSeverity("");
    setStartDate("");
    setEndDate("");
    // Fetch logs after resetting state variables
    setTimeout(() => {
      fetchLogs(1);
    }, 0);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Security" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Security Control Center"
          subtitle="Cross-Tenant Monitoring & Fraud Detection Audits"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <Button
              onClick={() => fetchLogs(pagination.page)}
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Sync Records
            </Button>
          }
        />

        {/* Content */}
        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-6">
          
          {/* Violation Stats Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 flex items-center justify-between rounded-none shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Total Anomalies</p>
                <h4 className="text-2xl font-black uppercase tracking-tight mt-1 text-slate-900 dark:text-white">{pagination.total}</h4>
              </div>
              <AlertTriangle className="h-8 w-8 text-amber-500 opacity-80" />
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 flex items-center justify-between rounded-none shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">High Risk Events</p>
                <h4 className="text-2xl font-black uppercase tracking-tight mt-1 text-red-600">{events.filter(e => e.severity === "HIGH").length}</h4>
              </div>
              <ShieldAlert className="h-8 w-8 text-red-500 opacity-80" />
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 flex items-center justify-between rounded-none shadow-sm">
              <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Secured Organizations</p>
                <h4 className="text-2xl font-black uppercase tracking-tight mt-1 text-slate-900 dark:text-white">{clients.length}</h4>
              </div>
              <ShieldCheck className="h-8 w-8 text-green-500 opacity-80" />
            </div>
          </div>

          {/* Filter Bar */}
          <form onSubmit={handleFilterSubmit} className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 space-y-4 rounded-none shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Filter Log Records</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Organization</label>
                <select
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
                >
                  <option value="">All Organizations</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Event Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
                >
                  <option value="">All Types</option>
                  <option value="TAB_SWITCH">Tab Switch</option>
                  <option value="WINDOW_BLUR">Window Blur</option>
                  <option value="FULLSCREEN_EXIT">Fullscreen Exit</option>
                  <option value="NO_FACE">No Face Detected</option>
                  <option value="MULTIPLE_FACES">Multiple Faces Detected</option>
                  <option value="CAMERA_DISCONNECTED">Camera Disconnected</option>
                  <option value="CAMERA_PERMISSION_DENIED">Camera Permission Denied</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Severity</label>
                <select
                  value={severity}
                  onChange={(e) => setSeverity(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
                >
                  <option value="">All Severities</option>
                  <option value="LOW">Low Risk</option>
                  <option value="MEDIUM">Medium Risk</option>
                  <option value="HIGH">High Risk</option>
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
                className="h-9 px-6 bg-slate-900 dark:bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
              >
                Search Audit Trail
              </button>
            </div>
          </form>

          {/* Logs Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Candidate</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Organization</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Event Type</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Severity</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Timestamp</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Evidence</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Retrieving Database Entries...</p>
                      </td>
                    </tr>
                  ) : events.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <ShieldCheck className="h-10 w-10 text-green-500 opacity-30 mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">No monitoring anomalies flagged</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mt-1">Platform integrity is fully secure. Adjust filter settings to view older entries.</p>
                      </td>
                    </tr>
                  ) : (
                    events.map((evt) => {
                      let sevBadge = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
                      if (evt.severity === "MEDIUM") sevBadge = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
                      if (evt.severity === "HIGH") sevBadge = "bg-red-50 text-red-600 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50";

                      return (
                        <tr key={evt.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                          <td className="py-4 px-6">
                            <div className="font-bold text-slate-900 dark:text-white text-xs">{evt.student_name || "UNKNOWN CANDIDATE"}</div>
                            <div className="text-[10px] text-slate-400 font-medium">{evt.student_email}</div>
                          </td>
                          <td className="py-4 px-6 text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {evt.client_name || "SYSTEM CORE"}
                          </td>
                          <td className="py-4 px-6 text-xs font-black uppercase text-slate-900 dark:text-white">
                            {evt.event_type.replace(/_/g, " ")}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black px-2 py-0.5 border rounded-sm uppercase tracking-widest ${sevBadge}`}>
                              {evt.severity}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-[10px] font-bold text-slate-500 uppercase">
                            {new Date(evt.created_at).toLocaleString()}
                          </td>
                          <td className="py-4 px-6 text-right">
                            {evt.image_url ? (
                              <button
                                onClick={() => setSelectedEvidence({
                                  url: evt.image_url,
                                  eventType: evt.event_type,
                                  candidate: evt.student_name || evt.student_email,
                                })}
                                className="h-8 px-3 border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto transition-all rounded-none"
                              >
                                <Eye className="h-3.5 w-3.5" />
                                Inspect Evidence
                              </button>
                            ) : (
                              <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest">
                                No Evidence
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Showing Page {pagination.page} of {totalPages} ({pagination.total} records)
                </span>
                <div className="flex gap-1">
                  <button
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchLogs(pagination.page - 1)}
                    className="h-8 px-3 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-none bg-white dark:bg-slate-950"
                  >
                    Previous
                  </button>
                  <button
                    disabled={pagination.page >= totalPages || loading}
                    onClick={() => fetchLogs(pagination.page + 1)}
                    className="h-8 px-3 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 disabled:opacity-50 text-[10px] font-black uppercase tracking-widest rounded-none bg-white dark:bg-slate-950"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* Evidence Viewer Dialog */}
      <Dialog open={!!selectedEvidence} onOpenChange={(open) => !open && setSelectedEvidence(null)}>
        <DialogContent className="max-w-lg rounded-none border-t-4 border-t-red-600 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-red-600">
              <FileImage className="h-5 w-5" />
              Proctoring Violation Evidence
            </DialogTitle>
          </DialogHeader>
          {selectedEvidence && (
            <div className="space-y-4 pt-2">
              <div className="border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden bg-black flex items-center justify-center max-h-[300px]">
                <img
                  src={selectedEvidence.url}
                  alt="Proctoring violation snapshot"
                  className="max-h-[300px] w-auto object-contain"
                />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-1.5 text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
                <div>Candidate: <span className="font-black text-slate-900 dark:text-white">{selectedEvidence.candidate}</span></div>
                <div>Anomaly Flagged: <span className="font-black text-slate-900 dark:text-white">{selectedEvidence.eventType.replace(/_/g, " ")}</span></div>
              </div>
              <button
                onClick={() => setSelectedEvidence(null)}
                className="w-full h-10 bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-widest text-[10px] rounded-none hover:bg-slate-800 transition-all"
              >
                Close Inspector
              </button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
