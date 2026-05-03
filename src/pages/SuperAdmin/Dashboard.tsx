import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import {
  LogOut,
  Users,
  Building,
  FileQuestion,
  ClipboardList,
  TrendingUp,
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
  PieChart,
  Pie,
  Cell,
} from "recharts";

const COLORS = [
  "hsl(210, 95%, 45%)",
  "hsl(195, 70%, 50%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(0, 84%, 60%)",
];

export default function SuperAdminDashboard() {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
  });
  const [clientData, setClientData] = useState<any[]>([]);
  const [attemptsByClient, setAttemptsByClient] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [clients, profiles, questions, tests, attempts] = await Promise.all([
      supabase.from("clients").select("id, name"),
      supabase.from("profiles").select("id, client_id", { count: "exact" }),
      supabase.from("questions").select("id", { count: "exact", head: true }),
      supabase.from("tests").select("id, client_id"),
      supabase
        .from("attempts")
        .select("id, test_id, score, total_marks, status"),
    ]);

    setStats({
      totalClients: clients.data?.length || 0,
      totalStudents: profiles.count || 0,
      totalQuestions: questions.count || 0,
      totalTests: tests.data?.length || 0,
      totalAttempts: attempts.data?.length || 0,
    });

    // Students per client
    if (clients.data && profiles.data) {
      const clientMap = new Map(clients.data.map((c) => [c.id, c.name]));
      const countMap = new Map<string, number>();
      profiles.data.forEach((p) => {
        if (p.client_id) {
          countMap.set(p.client_id, (countMap.get(p.client_id) || 0) + 1);
        }
      });
      setClientData(
        Array.from(countMap.entries()).map(([id, count]) => ({
          name: clientMap.get(id) || "Unknown",
          students: count,
        })),
      );
    }

    // Tests per client for pie chart
    if (clients.data && tests.data) {
      const clientMap = new Map(clients.data.map((c) => [c.id, c.name]));
      const testCountMap = new Map<string, number>();
      tests.data.forEach((t) => {
        if (t.client_id) {
          testCountMap.set(
            t.client_id,
            (testCountMap.get(t.client_id) || 0) + 1,
          );
        }
      });
      setAttemptsByClient(
        Array.from(testCountMap.entries()).map(([id, count]) => ({
          name: clientMap.get(id) || "Unknown",
          value: count,
        })),
      );
    }
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">
            Super Admin Dashboard
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

      <main className="container mx-auto p-6 space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          {[
            {
              label: "Total Clients",
              value: stats.totalClients,
              icon: Building,
            },
            {
              label: "Total Students",
              value: stats.totalStudents,
              icon: Users,
            },
            {
              label: "Total Questions",
              value: stats.totalQuestions,
              icon: FileQuestion,
            },
            {
              label: "Total Tests",
              value: stats.totalTests,
              icon: ClipboardList,
            },
            {
              label: "Total Attempts",
              value: stats.totalAttempts,
              icon: TrendingUp,
            },
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Students per Organization</CardTitle>
            </CardHeader>
            <CardContent>
              {clientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={clientData}>
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis />
                    <Tooltip />
                    <Bar
                      dataKey="students"
                      fill="hsl(210, 95%, 45%)"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tests by Organization</CardTitle>
            </CardHeader>
            <CardContent>
              {attemptsByClient.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={attemptsByClient}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label
                    >
                      {attemptsByClient.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No data available
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        <Button
          onClick={() => navigate("/superadmin/clients")}
          className="w-full md:w-auto"
        >
          <Building className="mr-2 h-4 w-4" />
          Manage Clients
        </Button>
      </main>
      <BrandFooter />
    </div>
  );
}
