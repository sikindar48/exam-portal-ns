import React, { useEffect, useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { testsApi, testQuestionsApi, attemptsApi, profilesApi, attemptAnswersApi, proctoringApi, clientsApi } from "@/services/api/client";
import { ProctoringTimeline } from "@/components/Admin/ProctoringTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Download, User, Clock, CheckCircle2, Eye, Users, Target, Award, Search, Filter, ArrowUpDown, RefreshCw } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Footer } from "@/components/Brand/Footer";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { useAuth } from "@/contexts/AuthContext";

const parseSQLiteDate = (dateStr: string | null | undefined): Date | null => {
  if (!dateStr) return null;
  if (!dateStr.includes("Z") && !dateStr.includes("T")) {
    return new Date(dateStr.replace(" ", "T") + "Z");
  }
  return new Date(dateStr);
};

export default function Results() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId, loading: authLoading } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [results, setResults] = useState<any[]>([]);
  const [testInfo, setTestInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [totalQuestions, setTotalQuestions] = useState<number>(0);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [attemptQuestions, setAttemptQuestions] = useState<any[]>([]);
  const [filterTab, setFilterTab] = useState<"all" | "correct" | "incorrect" | "unattempted" | "review">("all");

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pass" | "fail">("all");
  const [sortBy, setSortBy] = useState<"score-desc" | "score-asc" | "name-asc" | "name-desc" | "date-desc" | "date-asc">("score-desc");

  // Proctoring States
  const [proctoringEvents, setProctoringEvents] = useState<any[]>([]);
  const [totalRiskScore, setTotalRiskScore] = useState<number>(0);
  const [proctoringLoading, setProctoringLoading] = useState(false);
  const [detailTab, setDetailTab] = useState<"questions" | "proctoring">("questions");

  useEffect(() => {
    if (testId && !authLoading) {
      fetchResults();
    }
  }, [testId, authLoading]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Fetch test info, features, and questions count in parallel
      const [testRes, qCountRes, clientRes] = await Promise.all([
        testsApi.get(testId),
        testQuestionsApi.list(testId),
        clientId ? clientsApi.get(clientId) : Promise.resolve({ data: null })
      ]);
 
      if (!testRes.data) throw new Error("Test not found");
      
      if (clientRes.data && (clientRes.data as any).features) {
        setFeatures((clientRes.data as any).features);
      }
      
      setTestInfo(testRes.data);
      setTotalQuestions(qCountRes.data?.length || 0);

      // Fetch attempts with answers count nested
      const attemptsRes = await attemptsApi.listForTest(testId);
      const attemptsData = attemptsRes.data?.filter((a: any) => a.status === "submitted") || [];

      if (attemptsData && attemptsData.length > 0) {
        const studentIds = [...new Set(attemptsData.map((a: any) => a.student_id))];
        
        const profileRes = await profilesApi.getByIds(studentIds);
        const profileData = profileRes.data || [];
        const profileMap = new Map(profileData.map((p: any) => [p.id, p]));
        
        const mergedResults = attemptsData.map((a: any) => ({
          ...a,
          profiles: profileMap.get(a.student_id)
        }));

        // Sort by score percentage descending
        mergedResults.sort((x: any, y: any) => {
          const pctX = x.total_marks > 0 ? (x.score / x.total_marks) : 0;
          const pctY = y.total_marks > 0 ? (y.score / y.total_marks) : 0;
          return pctY - pctX;
        });

        const rankedResults = mergedResults.map((r: any, idx: number) => ({
          ...r,
          overallRank: idx + 1
        }));

        setResults(rankedResults);
      } else {
        setResults([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filteredAndSortedResults = useMemo(() => {
    let list = [...results];

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (r) =>
          r.profiles?.name?.toLowerCase().includes(q) ||
          r.profiles?.email?.toLowerCase().includes(q)
      );
    }

    // Status filter
    if (statusFilter === "pass") {
      list = list.filter((r) => r.total_marks > 0 && (r.score / r.total_marks) >= 0.4);
    } else if (statusFilter === "fail") {
      list = list.filter((r) => r.total_marks > 0 && (r.score / r.total_marks) < 0.4);
    }

    // Sorting
    list.sort((x, y) => {
      if (sortBy === "score-desc") {
        const pctX = x.total_marks > 0 ? (x.score / x.total_marks) : 0;
        const pctY = y.total_marks > 0 ? (y.score / y.total_marks) : 0;
        return pctY - pctX;
      }
      if (sortBy === "score-asc") {
        const pctX = x.total_marks > 0 ? (x.score / x.total_marks) : 0;
        const pctY = y.total_marks > 0 ? (y.score / y.total_marks) : 0;
        return pctX - pctY;
      }
      if (sortBy === "name-asc") {
        const nameX = (x.profiles?.name || "").toLowerCase();
        const nameY = (y.profiles?.name || "").toLowerCase();
        return nameX.localeCompare(nameY);
      }
      if (sortBy === "name-desc") {
        const nameX = (x.profiles?.name || "").toLowerCase();
        const nameY = (y.profiles?.name || "").toLowerCase();
        return nameY.localeCompare(nameX);
      }
      if (sortBy === "date-desc") {
        const dateY = parseSQLiteDate(y.submitted_at);
        const dateX = parseSQLiteDate(x.submitted_at);
        return (dateY?.getTime() || 0) - (dateX?.getTime() || 0);
      }
      if (sortBy === "date-asc") {
        const dateX = parseSQLiteDate(x.submitted_at);
        const dateY = parseSQLiteDate(y.submitted_at);
        return (dateX?.getTime() || 0) - (dateY?.getTime() || 0);
      }
      return 0;
    });

    return list;
  }, [results, searchQuery, statusFilter, sortBy]);

  const viewAttemptDetails = async (attempt: any) => {
    setSelectedAttempt(attempt);
    setShowDetailDialog(true);
    setDetailLoading(true);
    try {
      // Fetch test questions first
      const qRes = await testQuestionsApi.list(testId, true);
      const qData = qRes.data || [];

      // Fetch student's answers for this attempt
      const answersRes = await attemptAnswersApi.list(attempt.id);
      const answersData = answersRes.data || [];

      const answersMap = new Map(answersData.map((a: any) => [a.question_id, a]));

      const questionsList = qData
        ?.filter((tq: any) => tq.questions)
        .map((tq: any) => {
          const q = tq.questions as any;
          const ans = answersMap.get(q.id);
          return {
            id: q.id,
            question_text: q.question_text,
            option_a: q.option_a,
            option_b: q.option_b,
            option_c: q.option_c,
            option_d: q.option_d,
            correct_answer: q.correct_answer,
            marks: q.marks,
            student_answer: ans?.selected_option || null,
            marked_for_review: ans?.marked_for_review || false,
          };
        }) || [];

      setAttemptQuestions(questionsList);
      setFilterTab("all");
      setDetailTab("questions");

      // Fetch proctoring events
      setProctoringLoading(true);
      const { data: procRes, error: procError } = await proctoringApi.listEvents(attempt.id);
      if (!procError && procRes) {
        setProctoringEvents(procRes.events || []);
        setTotalRiskScore(procRes.total_risk_score || 0);
      } else {
        setProctoringEvents([]);
        setTotalRiskScore(0);
      }
      setProctoringLoading(false);
    } catch (err: any) {
      toast({ title: "Failed to load details", description: err.message, variant: "destructive" });
      setShowDetailDialog(false);
    } finally {
      setDetailLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const exportResults = () => {
    if (results.length === 0) return;
    
    const headers = ["Student Name", "Email", "Score", "Total Marks", "Time Taken", "Submitted At"];
    const csvContent = [
      headers.join(","),
      ...results.map(r => [
        `"${r.profiles?.name || 'N/A'}"`,
        r.profiles?.email || "N/A",
        r.score,
        r.total_marks,
        formatTime(r.time_taken),
        parseSQLiteDate(r.submitted_at)?.toLocaleString() || "N/A"
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${testInfo?.test_name || 'test'}_results.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const highestScore = results.length > 0
    ? Math.max(...results.map(r => r.score))
    : 0;
  const maxTotalMarks = results.length > 0 ? results[0].total_marks : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Examination Papers" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Results Dashboard"
          subtitle={testInfo?.test_name || "Assessment Performance"}
          showBackButton={true}
          backPath="/client-admin/tests"
          actions={
            features.includes("xlsx_export") ? (
              <Button
                onClick={exportResults}
                disabled={results.length === 0}
                className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <Download className="mr-2 h-3.5 w-3.5" /> Export Data
              </Button>
            ) : null
          }
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:-translate-y-1 hover:border-blue-500 transition-all duration-350">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Total Submissions</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">{results.length}</h3>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Finished exam papers</p>
                </div>
                <div className="text-slate-450 dark:text-slate-500 group-hover:scale-105 transition-transform duration-300">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:-translate-y-1 hover:border-blue-500 transition-all duration-350">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Average Score</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {results.length > 0 
                      ? (results.reduce((acc, r) => acc + (r.score / r.total_marks), 0) / results.length * 100).toFixed(1)
                      : "0.0"
                    }%
                  </h3>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Classroom benchmark</p>
                </div>
                <div className="text-slate-450 dark:text-slate-500 group-hover:scale-105 transition-transform duration-300">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:-translate-y-1 hover:border-blue-500 transition-all duration-350">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pass Rate {"(>=40%)"}</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {results.length > 0
                      ? (results.filter(r => (r.score / r.total_marks) >= 0.4).length / results.length * 100).toFixed(1)
                      : "0.0"
                    }%
                  </h3>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Passed threshold</p>
                </div>
                <div className="text-slate-450 dark:text-slate-500 group-hover:scale-105 transition-transform duration-300">
                  <Award className="h-5 w-5" />
                </div>
              </div>
              <div className="bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group hover:-translate-y-1 hover:border-blue-500 transition-all duration-350">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Highest Score</p>
                  <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
                    {results.length > 0 
                      ? `${highestScore}/${maxTotalMarks}`
                      : "0/0"
                    }
                  </h3>
                  <p className="text-[8px] font-bold text-slate-500 uppercase tracking-wide">Top performer record</p>
                </div>
                <div className="text-slate-450 dark:text-slate-500 group-hover:scale-105 transition-transform duration-300">
                  <Trophy className="h-5 w-5" />
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
              <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Candidate Score sheets</p>
                  <span className="text-[9px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-none uppercase">
                    {filteredAndSortedResults.length} / {results.length} Candidates
                  </span>
                </div>

                {/* Useful Quick Action: Clear all filters if dirty */}
                {(searchQuery || statusFilter !== "all" || sortBy !== "score-desc") && (
                  <button
                    onClick={() => {
                      setSearchQuery("");
                      setStatusFilter("all");
                      setSortBy("score-desc");
                    }}
                    className="text-[9px] font-black text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 uppercase tracking-widest transition-all"
                  >
                    Reset Filters
                  </button>
                )}
              </div>

              {/* Advanced Search & Filtering Controls */}
              <div className="p-4 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-850 flex flex-col md:flex-row gap-3 items-center justify-between">
                <div className="relative w-full md:w-80">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    placeholder="Search candidate name or email..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 rounded-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-xs text-slate-900 dark:text-white placeholder:text-slate-500 focus-visible:ring-blue-500"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-2.5 text-[9px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 uppercase tracking-wider"
                    >
                      Clear
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-end">
                  {/* Status Toggles */}
                  <div className="flex items-center gap-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-1">
                    {(["all", "pass", "fail"] as const).map((status) => (
                      <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-widest transition-all ${
                          statusFilter === status
                            ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
                            : "bg-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>

                  {/* Sorter Dropdown */}
                  <select
                    value={sortBy}
                    onChange={(e: any) => setSortBy(e.target.value)}
                    className="h-9 px-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-[10px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-350 focus:outline-none focus:border-blue-500"
                  >
                    <option value="score-desc">Score: High to Low</option>
                    <option value="score-asc">Score: Low to High</option>
                    <option value="name-asc">Name: A to Z</option>
                    <option value="name-desc">Name: Z to A</option>
                    <option value="date-desc">Date: Newest First</option>
                    <option value="date-asc">Date: Oldest First</option>
                  </select>

                  {/* Refetch Trigger */}
                  <Button
                    onClick={fetchResults}
                    disabled={loading}
                    variant="outline"
                    className="h-9 px-3 rounded-none border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-350 hover:text-slate-900 dark:hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1.5 ${loading ? "animate-spin" : ""}`} />
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 pl-6 w-24">Rank</TableHead>
                      <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Candidate</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Score</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Attempted Qs</TableHead>
                      <TableHead className="text-center text-[10px] font-black uppercase tracking-widest py-4">Duration</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Submission Date</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4 pr-6">Review</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                          <TableCell className="pl-6"><div className="h-4 w-8 bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-32 bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-12 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-12 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell><div className="h-4 w-16 mx-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell className="text-right"><div className="h-4 w-28 ml-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                          <TableCell className="text-right pr-6"><div className="h-8 w-8 ml-auto bg-slate-100 dark:bg-slate-800 animate-pulse" /></TableCell>
                        </TableRow>
                      ))
                    ) : filteredAndSortedResults.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="py-20 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                          No assessment submissions match the criteria.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedResults.map((r) => {
                        const attemptedCount = r.attempt_answers?.[0]?.count || 0;
                        return (
                          <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 transition-all">
                            <TableCell className="pl-6 py-4 font-black tabular-nums text-xs text-slate-500 dark:text-slate-400">
                              {r.overallRank === 1 ? (
                                <span className="h-5 px-1.5 bg-amber-100 border border-amber-200 text-amber-700 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 shrink-0 rounded-sm">
                                  <Trophy className="h-2.5 w-2.5" /> 1st
                                </span>
                              ) : r.overallRank === 2 ? (
                                <span className="h-5 px-1.5 bg-slate-100 border border-slate-200 text-slate-700 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 shrink-0 rounded-sm">
                                  <Trophy className="h-2.5 w-2.5 text-slate-400" /> 2nd
                                </span>
                              ) : r.overallRank === 3 ? (
                                <span className="h-5 px-1.5 bg-orange-100 border border-orange-200 text-orange-700 text-[8px] font-black uppercase tracking-widest inline-flex items-center gap-1 shrink-0 rounded-sm">
                                  <Trophy className="h-2.5 w-2.5 text-orange-400" /> 3rd
                                </span>
                              ) : (
                                <span className="pl-2">#{r.overallRank}</span>
                              )}
                            </TableCell>
                            <TableCell className="font-bold text-slate-900 dark:text-white uppercase tracking-tight py-4">
                              <div className="flex flex-col">
                                <span className="text-slate-800 dark:text-slate-200 font-black text-xs tracking-tight">{r.profiles?.name || "Anonymous Candidate"}</span>
                                <span className="text-[8.5px] font-bold text-slate-400 uppercase tracking-wider mt-0.5 normal-case">{r.profiles?.email || "No Email Address"}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center py-4">
                              <div className="flex flex-col items-center gap-1.5 justify-center">
                                <span className="font-extrabold text-slate-900 dark:text-white tabular-nums text-xs">
                                  {r.score} <span className="text-slate-400 font-semibold">/ {r.total_marks}</span>
                                </span>
                                <div className="w-16 h-1 bg-slate-100 dark:bg-slate-800">
                                  <div 
                                    className={`h-full ${
                                      (r.score / r.total_marks) >= 0.75 
                                        ? "bg-green-500" 
                                        : (r.score / r.total_marks) >= 0.4 
                                          ? "bg-blue-500" 
                                          : "bg-red-500"
                                    }`} 
                                    style={{ width: `${Math.min(100, (r.score / r.total_marks) * 100)}%` }} 
                                  />
                                </div>
                                <div className="mt-1">
                                  {r.total_marks > 0 && (r.score / r.total_marks) >= 0.4 ? (
                                    <span className="inline-flex items-center gap-1 text-[7.5px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/5 border border-emerald-500/25 px-1.5 py-0.5 rounded-none">
                                      <span className="h-1 w-1 rounded-full bg-emerald-500 animate-pulse"></span> Pass
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[7.5px] font-black uppercase tracking-widest text-red-650 bg-red-500/10 dark:bg-red-500/5 border border-red-500/25 px-1.5 py-0.5 rounded-none">
                                      <span className="h-1 w-1 rounded-full bg-red-500"></span> Fail
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-slate-700 dark:text-slate-350 tabular-nums text-xs py-4">
                              {attemptedCount} <span className="text-slate-450">/ {totalQuestions}</span>
                            </TableCell>
                            <TableCell className="text-center text-slate-500 font-bold text-xs py-4">
                              <div className="flex items-center justify-center gap-1">
                                <Clock className="h-3 w-3 text-slate-400" />
                                <span>{formatTime(r.time_taken)}</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest py-4">
                              {parseSQLiteDate(r.submitted_at)?.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <Button
                                variant="outline"
                                onClick={() => viewAttemptDetails(r)}
                                className="h-7 px-2.5 rounded-none border-slate-200 dark:border-slate-800 text-[8.5px] font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-blue-655 dark:hover:text-blue-400 transition-all flex items-center gap-1 ml-auto"
                              >
                                <Eye className="h-3.5 w-3.5" /> View Sheets
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </div>
        </main>

        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-6xl h-[85vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-2xl p-6 font-sans overflow-hidden">
            <DialogHeader className="border-b pb-4 mb-4 shrink-0">
              <DialogTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">
                Attempt Evaluation Sheet
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1.5 flex flex-wrap gap-x-4 gap-y-1">
                <span>Candidate: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt?.profiles?.name || "N/A"}</strong></span>
                <span>Score: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt?.score}/{selectedAttempt?.total_marks}</strong></span>
                <span>Submitted: <strong className="text-slate-700 dark:text-slate-200">{selectedAttempt && parseSQLiteDate(selectedAttempt.submitted_at)?.toLocaleString()}</strong></span>
              </DialogDescription>
            </DialogHeader>

            {detailLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center gap-4">
                <div className="relative h-10 w-10">
                  <div className="absolute inset-0 rounded-full border-4 border-slate-100 dark:border-slate-800" />
                  <div className="absolute inset-0 rounded-full border-4 border-t-blue-600 animate-spin" />
                </div>
                <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Loading Evaluation Sheets...</p>
              </div>
            ) : (() => {
              const showProctoring = testInfo?.camera_required === 1 || proctoringEvents.length > 0;

              const questionsSheet = (() => {
                const counts = {
                  all: attemptQuestions.length,
                  correct: attemptQuestions.filter(q => (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase() && q.student_answer).length,
                  incorrect: attemptQuestions.filter(q => (q.student_answer || '').trim().toUpperCase() !== (q.correct_answer || '').trim().toUpperCase() && q.student_answer).length,
                  unattempted: attemptQuestions.filter(q => !q.student_answer).length,
                  review: attemptQuestions.filter(q => q.marked_for_review).length,
                };

                const filteredQuestions = attemptQuestions.filter((q) => {
                  const isCorrect = (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                  const isUnattempted = !q.student_answer;
                  if (filterTab === "all") return true;
                  if (filterTab === "correct") return isCorrect && !isUnattempted;
                  if (filterTab === "incorrect") return !isCorrect && !isUnattempted;
                  if (filterTab === "unattempted") return isUnattempted;
                  if (filterTab === "review") return !!q.marked_for_review;
                  return true;
                });

                return (
                  <div className="space-y-6">
                    {/* Filter Tabs */}
                    <div className="flex flex-wrap gap-2 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                      {([
                        { id: "all", label: "All Questions" },
                        { id: "correct", label: "Correct" },
                        { id: "incorrect", label: "Incorrect" },
                        { id: "unattempted", label: "Unattempted" },
                        { id: "review", label: "Marked for Review" },
                      ] as const).map((tab) => (
                        <button
                           key={tab.id}
                           onClick={() => setFilterTab(tab.id)}
                           className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-widest border transition-all ${
                            filterTab === tab.id
                              ? "bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-transparent"
                              : "bg-transparent border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 hover:border-slate-400"
                          }`}
                        >
                          {tab.label} ({counts[tab.id]})
                        </button>
                      ))}
                    </div>

                    {filteredQuestions.length === 0 ? (
                      <div className="py-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                        No questions found matching this filter.
                      </div>
                    ) : (
                      filteredQuestions.map((q, idx) => {
                        const overallIdx = attemptQuestions.findIndex(aq => aq.id === q.id);
                        const displayIdx = overallIdx !== -1 ? overallIdx + 1 : idx + 1;
                        const isCorrect = (q.student_answer || '').trim().toUpperCase() === (q.correct_answer || '').trim().toUpperCase();
                        const isUnattempted = !q.student_answer;

                        return (
                          <div key={q.id} className="border border-slate-200 dark:border-slate-800 p-5 rounded-none space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
                            <div className="flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Question {displayIdx}</span>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{q.question_text}</p>
                              </div>
                              <span className="text-[10px] font-black px-2.5 py-1 border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 shrink-0 uppercase tracking-tight">
                                {q.marks} {q.marks === 1 ? "Mark" : "Marks"}
                              </span>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                              {(["a", "b", "c", "d"] as const).map((opt) => {
                                const optKey = `option_${opt}`;
                                const optText = q[optKey];
                                const optionLetter = opt.toUpperCase();

                                const isStudentChoice = q.student_answer === optionLetter;
                                const isCorrectChoice = q.correct_answer === optionLetter;

                                let optionStyle = "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300";
                                if (isStudentChoice) {
                                  optionStyle = isCorrect
                                    ? "border-green-600 bg-green-50/50 dark:bg-green-950/20 text-green-900 dark:text-green-200 border-l-4"
                                    : "border-red-600 bg-red-50/50 dark:bg-red-950/20 text-red-900 dark:text-red-200 border-l-4";
                                } else if (isCorrectChoice) {
                                  optionStyle = "border-green-500 bg-green-50/20 dark:bg-green-950/10 text-green-800 dark:text-green-300";
                                }

                                return (
                                  <div key={opt} className={`flex items-start gap-3 border px-4 py-2.5 text-xs transition-all ${optionStyle}`}>
                                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                      isStudentChoice
                                        ? isCorrect
                                          ? "border-green-600 bg-green-600 text-white"
                                          : "border-red-600 bg-red-600 text-white"
                                        : isCorrectChoice
                                          ? "border-green-500 bg-green-500 text-white"
                                          : "border-slate-300 dark:border-slate-700 text-slate-500"
                                    }`}>
                                      {optionLetter}
                                    </span>
                                    <span className="leading-relaxed">{optText}</span>
                                  </div>
                                );
                              })}
                            </div>

                            <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 dark:border-slate-800/80 text-[10px] font-black uppercase tracking-wider">
                              <div className="flex items-center gap-3">
                                {isUnattempted ? (
                                  <span className="text-slate-400">Status: Skipped (Unattempted)</span>
                                ) : isCorrect ? (
                                  <span className="text-green-600">Status: Correct (+{q.marks} Marks)</span>
                                ) : (
                                  <span className="text-red-600 font-bold">Status: Incorrect (Correct Option is {q.correct_answer})</span>
                                )}
                              </div>
                              {q.marked_for_review && (
                                <span className="text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2.5 py-0.5 font-black uppercase tracking-wider">
                                  Marked for Review
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
              })();

              if (showProctoring) {
                return (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 flex-1 min-h-0 overflow-hidden">
                    <div className="lg:col-span-2 overflow-y-auto pr-4 space-y-6">
                      {questionsSheet}
                    </div>
                    <div className="lg:col-span-1 border-l lg:pl-6 border-slate-200 dark:border-slate-800 overflow-y-auto pr-2">
                      <div className="space-y-4">
                        <ProctoringTimeline
                          events={proctoringEvents}
                          totalRiskScore={totalRiskScore}
                          loading={proctoringLoading}
                        />
                      </div>
                    </div>
                  </div>
                );
              }

              return (
                <div className="flex-1 overflow-y-auto pr-2">
                  {questionsSheet}
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        <Footer />
      </div>
    </div>
  );
}
