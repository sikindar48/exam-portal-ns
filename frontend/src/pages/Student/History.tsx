import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Trophy, Clock } from "lucide-react";
import { attemptsApi } from "@/services/api/client";
import { Toggle } from "@/components/Theme/Toggle";
import { Footer } from "@/components/Brand/Footer";

export default function TestHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterResult, setFilterResult] = useState<"all" | "passed" | "failed">("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = 20;

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 300);
    return () => clearTimeout(handler);
  }, [search]);

  const fetchAttempts = async (reset = false) => {
    if (!user) return;
    
    if (reset) {
      setLoading(true);
    }

    try {
      const currentPage = reset ? 0 : page;
      const from = currentPage * pageSize;
      const to = from + pageSize - 1;

      const { data: results, error } = await attemptsApi.list({
        student_id: user.id,
        status: "submitted"
      });

      if (error) throw error;

      // Filter and paginate client-side
      const allAttempts = (results || [])
        .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
      
      const paginatedAttempts = allAttempts.slice(from, to + 1);

      if (reset) {
        setAttempts(paginatedAttempts);
      } else {
        setAttempts((prev) => [...prev, ...paginatedAttempts]);
      }

      setHasMore(from + paginatedAttempts.length < allAttempts.length);
    } catch (err) {
      console.error("Error fetching attempts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      setPage(0);
      fetchAttempts(true);
    }
  }, [user, debouncedSearch]);

  useEffect(() => {
    if (user && page > 0) {
      fetchAttempts(false);
    }
  }, [page]);

  const handleLoadMore = () => {
    setPage((prev) => prev + 1);
  };

  const filteredAttempts = attempts.filter((attempt) => {
    const pct = attempt.total_marks > 0 ? (attempt.score / attempt.total_marks) * 100 : 0;
    const passed = pct >= 40;
    
    const matchesSearch = (attempt.tests?.test_name || "")
      .toLowerCase()
      .includes(search.toLowerCase());
      
    const matchesFilter = 
      filterResult === "all" ||
      (filterResult === "passed" && passed) ||
      (filterResult === "failed" && !passed);

    return matchesSearch && matchesFilter;
  });

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Professional Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-4 md:px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/student")}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-xs sm:text-sm font-black uppercase tracking-[0.2em]">Examination History</h1>
            <p className="text-[8px] sm:text-[9px] text-slate-500 font-bold uppercase tracking-widest">Student Performance Record</p>
          </div>
        </div>
        <Toggle />
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-5xl mx-auto p-4 md:p-8 space-y-8">
          
          <div className="flex items-center gap-3 mb-8 border-b-2 border-slate-900 dark:border-slate-800 pb-4">
            <Trophy className="h-5 w-5 text-slate-400" />
            <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">Performance Archives</h2>
          </div>

          {loading && attempts.length === 0 ? (
            <div className="space-y-4">
              {[1,2,3].map(i => <div key={i} className="h-32 bg-slate-100 dark:bg-slate-900 animate-pulse rounded-none" />)}
            </div>
          ) : attempts.length === 0 ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-20 text-center">
              <Trophy className="h-16 w-16 text-slate-200 mx-auto mb-6" />
              <h3 className="text-sm font-black uppercase tracking-widest text-slate-400 mb-2">No Records Found</h3>
              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-8">Complete your first examination to generate a performance transcript.</p>
              <Button
                variant="outline"
                onClick={() => navigate("/student")}
                className="h-11 rounded-none border-2 border-slate-900 dark:border-slate-700 font-black uppercase tracking-widest text-xs px-8 hover:bg-slate-900 hover:text-white transition-all"
              >
                Browse Available Tests
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm">
                <div className="relative flex-1">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-slate-400 tracking-wider">Search:</span>
                  <input
                    type="text"
                    placeholder="EXAMINATION NAME..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full h-10 pl-20 pr-4 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs font-bold uppercase tracking-tight focus:outline-none focus:ring-1 focus:ring-blue-600 rounded-none"
                  />
                </div>
                
                <select
                  value={filterResult}
                  onChange={(e) => setFilterResult(e.target.value as any)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-[10px] font-black uppercase tracking-widest focus:outline-none focus:ring-1 focus:ring-blue-600 rounded-none sm:w-48"
                >
                  <option value="all">ALL RESULTS</option>
                  <option value="passed">QUALIFIED</option>
                  <option value="failed">NOT QUALIFIED</option>
                </select>
              </div>

              {filteredAttempts.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400 rounded-none">
                  <p className="text-[10px] font-black uppercase tracking-widest">No matching performance records found</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAttempts.map((attempt) => {
                    const pct = attempt.total_marks > 0 ? (attempt.score / attempt.total_marks) * 100 : 0;
                    const passed = pct >= 40;
                    return (
                      <div 
                        key={attempt.id}
                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col md:flex-row group"
                      >
                        <div className={`w-2 shrink-0 ${passed ? "bg-green-500" : "bg-red-500"}`} />
                        
                        <div className="flex-1 p-6 flex flex-col md:flex-row md:items-center justify-between gap-8">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                                passed 
                                  ? "bg-green-50 text-green-600 border-green-100" 
                                  : "bg-red-50 text-red-600 border-red-100"
                              }`}>
                                {passed ? "Qualified" : "Not Qualified"}
                              </span>
                              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                {new Date(attempt.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <h4 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                              {attempt.tests?.test_name || "Examination Paper"}
                            </h4>
                            {attempt.tests?.allow_review && (
                              <Button
                                variant="link"
                                onClick={() => navigate(`/student/review/${attempt.id}`)}
                                className="p-0 h-auto text-xs font-black uppercase tracking-widest text-blue-600 hover:text-blue-700 mt-3"
                              >
                                Review Answers &rarr;
                              </Button>
                            )}
                          </div>

                          <div className="grid grid-cols-3 gap-8 md:gap-12 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800 pt-6 md:pt-0 md:pl-8">
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Score</p>
                              <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                                {attempt.score?.toFixed(1) || 0} <span className="text-[10px] text-slate-400">/ {attempt.total_marks || 0}</span>
                              </p>
                            </div>
                            <div>
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Time</p>
                              <p className="text-base font-black text-slate-900 dark:text-white tabular-nums">
                                {formatTime(attempt.time_taken || 0)}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Accuracy</p>
                              <p className={`text-base font-black tabular-nums ${passed ? "text-green-600" : "text-red-600"}`}>
                                {pct.toFixed(1)}%
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {hasMore && (
            <div className="mt-8 flex justify-center">
              <Button
                onClick={handleLoadMore}
                disabled={loading}
                variant="outline"
                className="h-11 px-8 rounded-none border-2 border-slate-900 dark:border-slate-700 font-black uppercase tracking-widest text-xs hover:bg-slate-900 hover:text-white dark:hover:bg-blue-600 transition-all"
              >
                {loading ? "Loading..." : "Load More Attempts"}
              </Button>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
