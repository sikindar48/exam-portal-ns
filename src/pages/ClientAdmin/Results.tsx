import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Trophy, Download, User, Clock, CheckCircle2 } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import { Footer } from "@/components/Brand/Footer";

export default function Results() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [results, setResults] = useState<any[]>([]);
  const [testInfo, setTestInfo] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (testId) {
      fetchResults();
    }
  }, [testId]);

  const fetchResults = async () => {
    setLoading(true);
    try {
      // Fetch test info
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("test_name, timer")
        .eq("id", testId)
        .single();

      if (testError) throw testError;
      setTestInfo(test);

      // Fetch attempts first
      const { data: attemptsData, error: attemptsError } = await supabase
        .from("attempts")
        .select("*")
        .eq("test_id", testId)
        .eq("status", "submitted")
        .order("submitted_at", { ascending: false });

      if (attemptsError) throw attemptsError;

      if (attemptsData && attemptsData.length > 0) {
        const studentIds = [...new Set(attemptsData.map(a => a.student_id))];
        
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id, name, email")
          .in("id", studentIds);

        if (profileError) {
          console.error("Error fetching profiles:", profileError);
          // Still show attempts even if profiles fail to load
          setResults(attemptsData);
        } else {
          const profileMap = new Map(profileData.map(p => [p.id, p]));
          const mergedResults = attemptsData.map(a => ({
            ...a,
            profiles: profileMap.get(a.student_id)
          }));
          setResults(mergedResults);
        }
      } else {
        setResults([]);
      }
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
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
        new Date(r.submitted_at).toLocaleString()
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

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/client-admin/tests")}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Performance Analytics</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">{testInfo?.test_name || "Assessment"}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Toggle />
          <Button
            onClick={exportResults}
            disabled={results.length === 0}
            className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Download className="mr-2 h-3.5 w-3.5" /> Export Data
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Submissions</p>
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{results.length}</h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Score</p>
              <h3 className="text-3xl font-black text-blue-600">
                {results.length > 0 
                  ? (results.reduce((acc, r) => acc + (r.score / r.total_marks), 0) / results.length * 100).toFixed(1)
                  : 0}%
              </h3>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">High Score</p>
              <h3 className="text-3xl font-black text-green-600">
                {results.length > 0 
                  ? Math.max(...results.map(r => (r.score / r.total_marks) * 100)).toFixed(1)
                  : 0}%
              </h3>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2">
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Student Candidate</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Score / Total</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Time Taken</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-center">Accuracy</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest py-4 text-right">Completion Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}><TableCell colSpan={5} className="h-16 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" /></TableRow>
                  ))
                ) : results.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-20 text-center text-slate-400 font-bold uppercase tracking-widest text-[10px]">
                      No evaluation data captured for this assessment yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  results.map((r) => {
                    const pct = (r.score / r.total_marks) * 100;
                    return (
                      <TableRow key={r.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                              <User className="h-4 w-4 text-slate-400" />
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight">{r.profiles?.name || "N/A"}</p>
                              <p className="text-[9px] font-bold text-slate-500 tracking-wider">{r.profiles?.email || "N/A"}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-slate-900 dark:text-white tabular-nums text-xs">
                          {r.score} <span className="text-slate-400">/ {r.total_marks}</span>
                        </TableCell>
                        <TableCell className="text-center text-slate-500 font-bold text-xs">
                          <div className="flex items-center justify-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(r.time_taken)}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={`text-[10px] font-black tabular-nums ${pct >= 40 ? "text-green-600" : "text-red-600"}`}>
                            {pct.toFixed(1)}%
                          </span>
                        </TableCell>
                        <TableCell className="text-right text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                          {new Date(r.submitted_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
