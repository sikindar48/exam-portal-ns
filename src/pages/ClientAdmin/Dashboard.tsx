import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Users,
  FileQuestion,
  ClipboardList,
  Settings,
  TrendingUp,
  Target,
  Award,
} from "lucide-react";
import { ThemeToggle } from "@/components/theme-toggle";
import { supabase } from "@/integrations/supabase/client";
import { BrandFooter } from "@/components/BrandFooter";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

export default function ClientAdminDashboard() {
  const { signOut, clientId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
    avgScore: 0,
    passRate: 0,
  });
  const [topPerformers, setTopPerformers] = useState<any[]>([]);
  const [testPerformance, setTestPerformance] = useState<any[]>([]);

  useEffect(() => {
    if (clientId) fetchStats();
  }, [clientId]);

  const fetchStats = async () => {
    if (!clientId) return;

    const [students, questions, tests] = await Promise.all([
      supabase
        .from("user_roles")
        .select("user_id", { count: "exact", head: true })
        .eq("client_id", clientId)
        .eq("role", "student"),
      supabase
        .from("questions")
        .select("id", { count: "exact", head: true })
        .eq("client_id", clientId),
      supabase.from("tests").select("id, test_name").eq("client_id", clientId),
    ]);

    const testIds = (tests.data || []).map((t) => t.id);

    // Only fetch attempts for this client's tests — avoids full-table scan
    const attempts =
      testIds.length > 0
        ? await supabase
            .from("attempts")
            .select(
              "id, student_id, score, total_marks, test_id, tests(test_name)",
            )
            .eq("status", "submitted")
            .in("test_id", testIds)
        : { data: [] };

    const clientAttempts = attempts.data || [];

    let totalScore = 0;
    let totalMaxScore = 0;
    let passCount = 0;

    clientAttempts.forEach((a) => {
      totalScore += a.score || 0;
      totalMaxScore += a.total_marks || 0;
      if (a.total_marks && a.score && a.score / a.total_marks >= 0.4)
        passCount++;
    });

    const avgScore =
      clientAttempts.length > 0 ? (totalScore / totalMaxScore) * 100 : 0;
    const passRate =
      clientAttempts.length > 0 ? (passCount / clientAttempts.length) * 100 : 0;

    setStats({
      totalStudents: students.count || 0,
      totalQuestions: questions.count || 0,
      totalTests: tests.data?.length || 0,
      totalAttempts: clientAttempts.length,
      avgScore: Math.round(avgScore),
      passRate: Math.round(passRate),
    });

    // For top performers: fetch names directly from profiles
    // (RLS fixed to allow clientadmin to read profiles of users in their client)
    const uniqueStudentIds = [
      ...new Set(clientAttempts.map((a) => a.student_id)),
    ];

    let studentMap = new Map<string, string>();
    if (uniqueStudentIds.length > 0) {
      const { data: profileRows } = await supabase
        .from("profiles")
        .select("id, name")
        .in("id", uniqueStudentIds);

      studentMap = new Map((profileRows || []).map((r: any) => [r.id, r.name]));
    }

    // Top performers
    const studentScores = new Map<
      string,
      { name: string; totalScore: number; count: number }
    >();

    clientAttempts.forEach((a) => {
      const name = studentMap.get(a.student_id) || "Unknown";
      const existing = studentScores.get(a.student_id) || {
        name,
        totalScore: 0,
        count: 0,
      };
      existing.totalScore += a.total_marks
        ? ((a.score || 0) / a.total_marks) * 100
        : 0;
      existing.count += 1;
      studentScores.set(a.student_id, existing);
    });

    const sorted = Array.from(studentScores.values())
      .map((s) => ({ name: s.name, avg: Math.round(s.totalScore / s.count) }))
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5);
    setTopPerformers(sorted);

    // Test performance chart
    const testScores = new Map<
      string,
      { name: string; totalPct: number; count: number }
    >();
    clientAttempts.forEach((a) => {
      const tName = (a.tests as any)?.test_name || "Test";
      const existing = testScores.get(a.test_id) || {
        name: tName,
        totalPct: 0,
        count: 0,
      };
      existing.totalPct += a.total_marks
        ? ((a.score || 0) / a.total_marks) * 100
        : 0;
      existing.count += 1;
      testScores.set(a.test_id, existing);
    });
    setTestPerformance(
      Array.from(testScores.values()).map((t) => ({
        name: t.name.length > 15 ? t.name.slice(0, 15) + "…" : t.name,
        avgScore: Math.round(t.totalPct / t.count),
      })),
    );
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">
            Client Admin Dashboard
          </h1>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button variant="outline" onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6 space-y-6 flex-1">
        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {[
            { label: "Students", value: stats.totalStudents, icon: Users },
            {
              label: "Questions",
              value: stats.totalQuestions,
              icon: FileQuestion,
            },
            { label: "Tests", value: stats.totalTests, icon: ClipboardList },
            { label: "Attempts", value: stats.totalAttempts, icon: TrendingUp },
            { label: "Avg Score", value: `${stats.avgScore}%`, icon: Target },
            { label: "Pass Rate", value: `${stats.passRate}%`, icon: Award },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">{label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Charts */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Average Score by Test</CardTitle>
            </CardHeader>
            <CardContent>
              {testPerformance.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={testPerformance}>
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis domain={[0, 100]} />
                    <Tooltip formatter={(value: number) => `${value}%`} />
                    <Bar
                      dataKey="avgScore"
                      fill="hsl(210, 95%, 45%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No test data yet
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Top Performers</CardTitle>
            </CardHeader>
            <CardContent>
              {topPerformers.length > 0 ? (
                <div className="space-y-3">
                  {topPerformers.map((student, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${i === 0 ? "bg-warning text-warning-foreground" : "bg-muted text-muted-foreground"}`}
                        >
                          {i + 1}
                        </span>
                        <span className="font-medium">{student.name}</span>
                      </div>
                      <span className="font-bold text-primary">
                        {student.avg}%
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No student data yet
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button
            onClick={() => navigate("/client-admin/students")}
            className="h-20"
          >
            <Users className="mr-2 h-5 w-5" />
            Manage Students
          </Button>
          <Button
            onClick={() => navigate("/client-admin/questions")}
            className="h-20"
          >
            <FileQuestion className="mr-2 h-5 w-5" />
            Manage Questions
          </Button>
          <Button
            onClick={() => navigate("/client-admin/tests")}
            className="h-20"
          >
            <ClipboardList className="mr-2 h-5 w-5" />
            Manage Tests
          </Button>
          <Button
            onClick={() => navigate("/client-admin/settings")}
            variant="outline"
            className="h-20"
          >
            <Settings className="mr-2 h-5 w-5" />
            Organization Settings
          </Button>
        </div>
      </main>
      <BrandFooter />
    </div>
  );
}
