import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  MessageSquare,
  Search,
  RefreshCw,
  Star,
  User,
  Users,
  Building,
  Calendar,
  AlertCircle
} from "lucide-react";
import { feedbacksApi } from "@/services/api/client";

export default function SuperAdminFeedbacks() {
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({
    avg_fast_smooth: "0.0",
    avg_easy_to_use: "0.0",
    avg_strong_security: "0.0",
    avg_faced_errors: "0.0",
    avg_good_design: "0.0",
    total: 0
  });
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0 });
  const { toast } = useToast();

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [candidateType, setCandidateType] = useState<string>("all");

  useEffect(() => {
    fetchFeedbacks(1);
  }, [candidateType]);

  const fetchFeedbacks = async (page = 1) => {
    setLoading(true);
    try {
      const { data, error } = await feedbacksApi.list({
        page,
        limit: pagination.limit,
        candidate_type: candidateType === "all" ? undefined : candidateType,
        search_query: searchQuery || undefined
      });

      if (error) {
        throw new Error(error.message || "Failed to retrieve feedbacks.");
      }

      if (data) {
        setFeedbacks(data.feedbacks || []);
        if (data.stats) {
          setStats(data.stats);
        }
        setPagination({
          page: data.pagination.page,
          limit: data.pagination.limit,
          total: data.pagination.total
        });
      }
    } catch (err: any) {
      toast({
        title: "Sync Failed",
        description: err.message || "Failed to retrieve feedbacks.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFeedbacks(1);
  };

  const handleClearFilters = () => {
    setSearchQuery("");
    setCandidateType("all");
    setTimeout(() => {
      fetchFeedbacks(1);
    }, 0);
  };

  const totalPages = Math.ceil(pagination.total / pagination.limit);

  // Helper to render mini star row
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((s) => (
          <Star
            key={s}
            className={`h-3 w-3 ${
              s <= rating ? "text-amber-500 fill-amber-500" : "text-slate-200 dark:text-slate-800"
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Feedbacks" />

      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        <ClientAdminHeader
          title="Exam Feedbacks"
          subtitle="Real-time Platform Feedback & Experience Ratings"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <Button
              onClick={() => fetchFeedbacks(pagination.page)}
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all border"
            >
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Sync Feedback
            </Button>
          }
        />

        <main className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
          {/* Top Metrics Cards Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {/* Stat Card: Fast & Smooth */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Fast & Smooth</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.avg_fast_smooth}</h4>
              </div>
              <div className="mt-2">{renderStars(Math.round(Number(stats.avg_fast_smooth)))}</div>
            </div>

            {/* Stat Card: Easy to Use */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Easy to Use</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.avg_easy_to_use}</h4>
              </div>
              <div className="mt-2">{renderStars(Math.round(Number(stats.avg_easy_to_use)))}</div>
            </div>

            {/* Stat Card: Strong Security */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Strong Security</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.avg_strong_security}</h4>
              </div>
              <div className="mt-2">{renderStars(Math.round(Number(stats.avg_strong_security)))}</div>
            </div>

            {/* Stat Card: Error Free */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Error Free</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.avg_faced_errors}</h4>
              </div>
              <div className="mt-2">{renderStars(Math.round(Number(stats.avg_faced_errors)))}</div>
            </div>

            {/* Stat Card: Good Design */}
            <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Good Design</p>
                <h4 className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-1">{stats.avg_good_design}</h4>
              </div>
              <div className="mt-2">{renderStars(Math.round(Number(stats.avg_good_design)))}</div>
            </div>

            {/* Stat Card: Total Feedbacks */}
            <div className="bg-blue-50/50 dark:bg-blue-950/10 border border-blue-100/30 dark:border-blue-900/30 p-4 shadow-sm relative overflow-hidden flex flex-col justify-between">
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-blue-500">Total Feedbacks</p>
                <h4 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">{stats.total}</h4>
              </div>
              <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 mt-2">
                <MessageSquare className="h-4 w-4" />
                <span className="text-[9px] font-bold uppercase tracking-wider">Responses</span>
              </div>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 p-4 shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
              {/* Type Tabs */}
              <div className="flex border border-slate-200 dark:border-slate-800 p-0.5 rounded-none w-full md:w-auto">
                <button
                  onClick={() => setCandidateType("all")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none ${
                    candidateType === "all"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  All Candidates
                </button>
                <button
                  onClick={() => setCandidateType("student")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none ${
                    candidateType === "student"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Students
                </button>
                <button
                  onClick={() => setCandidateType("guest")}
                  className={`flex-1 md:flex-none px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded-none ${
                    candidateType === "guest"
                      ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`}
                >
                  Guests
                </button>
              </div>

              {/* Search Form */}
              <form onSubmit={handleSearchSubmit} className="flex gap-2 w-full md:w-auto md:max-w-md flex-1">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search candidate name, email, exam, client..."
                    className="w-full pl-9 pr-4 h-9 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400 focus:border-transparent rounded-none"
                  />
                </div>
                <Button type="submit" className="h-9 px-4 rounded-none bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold uppercase tracking-wider shrink-0">
                  Search
                </Button>
                {(searchQuery || candidateType !== "all") && (
                  <Button type="button" onClick={handleClearFilters} variant="outline" className="h-9 px-3 rounded-none text-xs font-bold uppercase border-slate-200 dark:border-slate-800 shrink-0">
                    Clear
                  </Button>
                )}
              </form>
            </div>
          </div>

          {/* Feedback Table / Logs list */}
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800/60 bg-slate-50 dark:bg-slate-900/50">
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Candidate</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Exam / Client</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 text-center">Ratings Breakdown</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400">Comments</th>
                    <th className="p-4 text-[10px] font-black uppercase tracking-wider text-slate-400 whitespace-nowrap">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="h-4 w-4 animate-spin text-slate-500" />
                          <span>Syncing feedback logs...</span>
                        </div>
                      </td>
                    </tr>
                  ) : feedbacks.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-400 dark:text-slate-500">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <AlertCircle className="h-8 w-8 text-slate-300 dark:text-slate-700" />
                          <span className="text-sm font-bold">No feedback entries found</span>
                          <span className="text-xs text-slate-400 dark:text-slate-600">Try adjusting your filters or search query.</span>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    feedbacks.map((item) => (
                      <tr key={item.attempt_id} className="hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all">
                        {/* Candidate */}
                        <td className="p-4 min-w-[200px]">
                          <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200/40 dark:border-slate-700/40">
                              <User className="h-4 w-4 text-slate-500" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{item.candidate_name}</p>
                              {item.candidate_email ? (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 truncate">{item.candidate_email}</p>
                              ) : (
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">Guest Session</p>
                              )}
                              <span className={`inline-block text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 mt-1 rounded-sm border ${
                                item.candidate_type === "guest"
                                  ? "bg-amber-50/50 text-amber-700 border-amber-200/40 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30"
                                  : "bg-blue-50/50 text-blue-700 border-blue-200/40 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/30"
                              }`}>
                                {item.candidate_type}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Exam / Client */}
                        <td className="p-4 min-w-[180px]">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                              <MessageSquare className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{item.test_name}</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500">
                              <Building className="h-3.5 w-3.5 text-slate-400" />
                              <span className="truncate">{item.client_name}</span>
                            </div>
                          </div>
                        </td>

                        {/* Ratings */}
                        <td className="p-4 min-w-[220px]">
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 max-w-xs mx-auto">
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500">Smoothness:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {item.feedback_fast_smooth} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500">Usability:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {item.feedback_easy_to_use} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500">Security:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {item.feedback_strong_security} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="text-slate-400 dark:text-slate-500">Stability:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {item.feedback_faced_errors} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px] col-span-2 border-t border-slate-100 dark:border-slate-800/40 pt-1.5 mt-0.5">
                              <span className="text-slate-400 dark:text-slate-500">Design UI:</span>
                              <span className="font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                {item.feedback_good_design} <Star className="h-2.5 w-2.5 fill-amber-500 text-amber-500" />
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Comments */}
                        <td className="p-4 max-w-sm">
                          {item.feedback_text ? (
                            <p className="text-xs text-slate-600 dark:text-slate-300 italic bg-slate-50 dark:bg-slate-900/80 p-2.5 border border-slate-100 dark:border-slate-800/60 leading-relaxed break-words font-medium">
                              "{item.feedback_text}"
                            </p>
                          ) : (
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No comment left.</p>
                          )}
                        </td>

                        {/* Date */}
                        <td className="p-4 text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="h-3.5 w-3.5 text-slate-400" />
                            <span>
                              {item.submitted_at
                                ? new Date(item.submitted_at.replace(" ", "T") + "Z").toLocaleDateString(undefined, {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric"
                                  })
                                : "N/A"}
                            </span>
                          </div>
                          <span className="block text-[10px] text-slate-400 dark:text-slate-600 mt-0.5">
                            {item.submitted_at
                              ? new Date(item.submitted_at.replace(" ", "T") + "Z").toLocaleTimeString(undefined, {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })
                              : ""}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination controls */}
            {totalPages > 1 && (
              <div className="p-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs text-slate-400 dark:text-slate-500">
                  Showing page <strong className="text-slate-700 dark:text-slate-300">{pagination.page}</strong> of <strong className="text-slate-700 dark:text-slate-300">{totalPages}</strong>
                </span>
                <div className="flex gap-2">
                  <Button
                    onClick={() => fetchFeedbacks(pagination.page - 1)}
                    disabled={pagination.page <= 1 || loading}
                    variant="outline"
                    className="h-8 px-3 rounded-none text-xs font-bold uppercase tracking-wider"
                  >
                    Previous
                  </Button>
                  <Button
                    onClick={() => fetchFeedbacks(pagination.page + 1)}
                    disabled={pagination.page >= totalPages || loading}
                    variant="outline"
                    className="h-8 px-3 rounded-none text-xs font-bold uppercase tracking-wider"
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
    </div>
  );
}
