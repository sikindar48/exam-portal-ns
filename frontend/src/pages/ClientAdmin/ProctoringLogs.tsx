import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { proctoringApi, testsApi, clientsApi } from "@/services/api/client";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { Toggle } from "@/components/Theme/Toggle";
import { useAuth } from "@/contexts/AuthContext";
import {
  Shield,
  Eye,
  ArrowLeft,
  AlertTriangle,
  AlertOctagon,
  Clock,
  User,
  Calendar,
  AlertCircle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function ProctoringLogs() {
  const { clientId, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [featuresLoading, setFeaturesLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSeverity, setSelectedSeverity] = useState<string>("ALL");
  const [selectedEvidence, setSelectedEvidence] = useState<any | null>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [selectedTestId, setSelectedTestId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [searchDebounced, setSearchDebounced] = useState("");
  const [filterDate, setFilterDate] = useState("");
  const [filterStartTime, setFilterStartTime] = useState("");
  const [filterEndTime, setFilterEndTime] = useState("");

  const { toast } = useToast();
  const navigate = useNavigate();
  const limit = 10;

  const fetchFeatures = async () => {
    if (!clientId) {
      setFeaturesLoading(false);
      return;
    }
    setFeaturesLoading(true);
    try {
      const { data } = await clientsApi.get(clientId);
      if (data && (data as any).features) {
        setFeatures((data as any).features);
      }
    } catch (err) {
      console.error("Failed to fetch features", err);
    } finally {
      setFeaturesLoading(false);
    }
  };

  useEffect(() => {
    if (clientId && !authLoading) {
      fetchFeatures();
      fetchTests();
    }
  }, [clientId, authLoading]);

  // Search debouncer
  useEffect(() => {
    const handler = setTimeout(() => {
      setSearchDebounced(search);
    }, 500);
    return () => clearTimeout(handler);
  }, [search]);

  // Reset page on filter changes
  useEffect(() => {
    setPage(1);
  }, [selectedTestId, selectedSeverity, searchDebounced, filterDate, filterStartTime, filterEndTime]);

  useEffect(() => {
    if (selectedTestId && features.includes("camera_proctoring")) {
      fetchLogs();
    } else {
      setEvents([]);
      setTotalPages(1);
      setLoading(false);
    }
  }, [selectedTestId, page, features, selectedSeverity, searchDebounced, filterDate, filterStartTime, filterEndTime]);

  const fetchTests = async () => {
    try {
      const { data } = await testsApi.list();
      if (data) {
        setTests(data || []);
        if (data.length > 0) {
          setSelectedTestId(data[0].id);
        } else {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error("Failed to load tests", err);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await proctoringApi.listAllEvents({
        page,
        limit,
        test_id: selectedTestId || undefined,
        severity: selectedSeverity !== "ALL" ? selectedSeverity : undefined,
        search: searchDebounced || undefined,
        date: filterDate || undefined,
        start_time: filterStartTime ? `${filterStartTime}:00` : undefined,
        end_time: filterEndTime ? `${filterEndTime}:00` : undefined,
      });
      if (error) {
        toast({
          title: "Error",
          description: "Failed to fetch proctoring logs",
          variant: "destructive",
          });
      } else if (data) {
        setEvents(data.events || []);
        if (data.pagination) {
          setTotalPages(Math.ceil(data.pagination.total / limit) || 1);
        }
      }
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "HIGH":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-500/10 border border-red-500/30 text-red-500 rounded-none">
            <AlertOctagon className="h-3 w-3" />
            High
          </span>
        );
      case "MEDIUM":
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-none">
            <AlertTriangle className="h-3 w-3" />
            Medium
          </span>
        );
      case "LOW":
      default:
        return (
          <span className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-500/10 border border-slate-500/30 text-slate-500 dark:text-slate-400 rounded-none">
            <AlertCircle className="h-3 w-3" />
            Low
          </span>
        );
    }
  };

  const formatEventType = (type: string) => {
    return type
      ?.replace(/_/g, " ")
      ?.toLowerCase()
      ?.replace(/\b\w/g, (c) => c.toUpperCase());
  };

  // events is already filtered server-side
  const filteredEvents = events;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Proctoring Logs" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader 
          title="Proctoring Audit logs" 
          subtitle="Track real-time candidate browser activity, head turns, and camera status" 
          showBackButton={true} 
          backPath="/client-admin"
        />

        <main className="flex-1 overflow-y-auto relative">
          <div className={!authLoading && !featuresLoading && !features.includes("camera_proctoring") ? "filter blur-sm select-none pointer-events-none transition-all duration-300" : ""}>
            <div className="container max-w-7xl mx-auto p-8 space-y-10">

              {/* Controls Bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Select Exam Paper</label>
                    <select
                      value={selectedTestId}
                      onChange={(e) => setSelectedTestId(e.target.value)}
                      className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
                    >
                      <option value="">-- Select an Exam --</option>
                      {tests.map(t => (
                        <option key={t.id} value={t.id}>{t.test_name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Search Candidate (Name/Email)</label>
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Candidate name or email..."
                      className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Date Filter</label>
                    <input
                      type="date"
                      value={filterDate}
                      onChange={(e) => setFilterDate(e.target.value)}
                      className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  <div className="flex gap-2 w-full">
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Start Time</label>
                      <input
                        type="time"
                        value={filterStartTime}
                        onChange={(e) => setFilterStartTime(e.target.value)}
                        className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div className="flex-1 space-y-1">
                      <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">End Time</label>
                      <input
                        type="time"
                        value={filterEndTime}
                        onChange={(e) => setFilterEndTime(e.target.value)}
                        className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase tracking-wider text-slate-400">Severity Filter</label>
                    <div className="flex gap-1">
                      {(["ALL", "HIGH", "MEDIUM", "LOW"] as const).map((sev) => (
                        <button
                          key={sev}
                          onClick={() => setSelectedSeverity(sev)}
                          className={`h-8 px-4 text-[9px] font-black uppercase tracking-widest border transition-all ${
                            selectedSeverity === sev
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                              : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                          }`}
                        >
                          {sev}
                        </button>
                      ))}
                    </div>
                  </div>

                  {(search || filterDate || filterStartTime || filterEndTime || selectedSeverity !== "ALL") && (
                    <Button
                      onClick={() => {
                        setSearch("");
                        setFilterDate("");
                        setFilterStartTime("");
                        setFilterEndTime("");
                        setSelectedSeverity("ALL");
                      }}
                      variant="outline"
                      className="h-8 rounded-none border-slate-200 dark:border-slate-800 font-black uppercase tracking-widest text-[9px] text-slate-500 hover:text-red-650 self-end"
                    >
                      Clear All Filters
                    </Button>
                  )}
                </div>
              </div>

              {loading ? (
                <div className="py-20 flex flex-col items-center justify-center gap-4">
                  <div className="relative h-10 w-10">
                    <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                    <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
                  </div>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                    Loading Proctoring Logs...
                  </p>
                </div>
              ) : filteredEvents.length === 0 ? (
                <div className="border border-dashed border-slate-200 dark:border-slate-800 p-16 text-center">
                  <Shield className="h-10 w-10 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-600 dark:text-slate-400">
                    No Violations Recorded
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
                    No candidate proctoring events match the selected filter. This could indicate a clean, violation-free testing run.
                  </p>
                </div>
              ) : (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-widest text-slate-400">
                          <th className="p-4">Time</th>
                          <th className="p-4">Candidate</th>
                          <th className="p-4">Exam Paper</th>
                          <th className="p-4">Violation Details</th>
                          <th className="p-4">Severity</th>
                          <th className="p-4 text-center">Evidence</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {filteredEvents.map((row) => (
                          <tr
                            key={row.id}
                            className="hover:bg-slate-50/50 dark:hover:bg-slate-800/10 transition-colors text-xs"
                          >
                            <td className="p-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {new Date(row.created_at).toLocaleString()}
                              </div>
                            </td>
                            <td className="p-4">
                              <div className="font-bold text-slate-800 dark:text-slate-200">
                                {row.student_name || "Guest Student"}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {row.student_email}
                              </div>
                            </td>
                            <td className="p-4 font-semibold text-slate-700 dark:text-slate-300">
                              {row.test_name}
                            </td>
                            <td className="p-4">
                              <div className="font-black uppercase tracking-wider text-[11px] text-slate-900 dark:text-white">
                                {formatEventType(row.event_type)}
                              </div>
                              {row.duration_seconds > 0 && (
                                <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                                  <Clock className="h-3 w-3" />
                                  Duration: {row.duration_seconds.toFixed(1)}s
                                </div>
                              )}
                            </td>
                            <td className="p-4">{getSeverityBadge(row.severity)}</td>
                            <td className="p-4 text-center">
                              {row.has_evidence === 1 && row.image_url ? (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setSelectedEvidence(row)}
                                  className="h-7 rounded-none border-blue-500/20 text-blue-500 hover:bg-blue-500/5 px-2.5 text-[10px] font-black uppercase tracking-wider"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  Snapshot
                                </Button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                  N/A
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  <div className="border-t border-slate-200 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
                    <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                      Page {page} of {totalPages}
                    </div>
                    <div className="flex gap-1.5">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                        className="h-8 rounded-none text-[10px] font-black uppercase tracking-widest"
                      >
                        Prev
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                        className="h-8 rounded-none text-[10px] font-black uppercase tracking-widest"
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {!authLoading && !featuresLoading && !features.includes("camera_proctoring") && (
            <div className="absolute inset-0 z-10 flex items-center justify-center p-6 bg-slate-50/40 dark:bg-slate-950/40 backdrop-blur-[1px]">
              <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-none shadow-2xl text-center space-y-6">
                <div className="mx-auto w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                  <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">
                    Camera Proctoring
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-bold uppercase tracking-wider">
                    Your Plan doesn't include Camera Proctoring
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 leading-relaxed">
                    Upgrade to Starter or Standard plan to get this feature.
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
        </main>

        <Footer />
      </div>

      {/* Snapshot Dialog */}
      <Dialog
        open={!!selectedEvidence}
        onOpenChange={() => setSelectedEvidence(null)}
      >
        <DialogContent className="max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl p-6 font-sans">
          <DialogHeader className="border-b pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-white flex items-center gap-2">
              <Shield className="h-4.5 w-4.5 text-blue-500" />
              Evidence Snapshot
            </DialogTitle>
          </DialogHeader>

          {selectedEvidence && (
            <div className="space-y-4">
              <div className="aspect-video w-full bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden">
                <img
                  src={selectedEvidence.image_url}
                  alt="Violation evidence"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 space-y-2.5 text-xs text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Candidate: <strong>{selectedEvidence.student_name}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Timestamp:{" "}
                    <strong>
                      {new Date(selectedEvidence.created_at).toLocaleString()}
                    </strong>
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-3.5 w-3.5 text-slate-400" />
                  <span>
                    Violation:{" "}
                    <strong className="text-red-500 uppercase">
                      {formatEventType(selectedEvidence.event_type)}
                    </strong>
                  </span>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
