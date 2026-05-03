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
import { supabase } from "@/integrations/supabase/client";
import { ThemeToggle } from "@/components/theme-toggle";
import { BrandFooter } from "@/components/BrandFooter";

export default function TestHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchAttempts();
    }
  }, [user]);

  const fetchAttempts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("attempts")
      .select("*, tests(test_name, timer)")
      .eq("student_id", user?.id)
      .eq("status", "submitted")
      .order("submitted_at", { ascending: false });

    if (!error) {
      setAttempts(data || []);
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  return (
    <div className="min-h-screen bg-muted flex flex-col">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/student")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Test History</h1>
          </div>
          <ThemeToggle />
        </div>
      </header>

      <main className="container mx-auto p-6">
        {loading ? (
          <p>Loading...</p>
        ) : attempts.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-3 text-muted-foreground">
                <Trophy className="h-12 w-12 opacity-30" />
                <p className="text-lg font-medium">No attempts yet</p>
                <p className="text-sm">
                  Complete a test to see your history here.
                </p>
                <Button
                  variant="outline"
                  className="mt-2"
                  onClick={() => navigate("/student")}
                >
                  Browse Tests
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => {
              const pct =
                attempt.total_marks > 0
                  ? (attempt.score / attempt.total_marks) * 100
                  : 0;
              const passed = pct >= 40;
              return (
                <Card key={attempt.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>
                          {attempt.tests?.test_name || "Test"}
                        </CardTitle>
                        <CardDescription>
                          Submitted:{" "}
                          {new Date(attempt.submitted_at).toLocaleString()}
                        </CardDescription>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                      >
                        {passed ? "Passed" : "Failed"}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-5 w-5 text-warning" />
                        <div>
                          <p className="text-sm text-muted-foreground">Score</p>
                          <p className="text-lg font-bold">
                            {attempt.score?.toFixed(2) || 0} /{" "}
                            {attempt.total_marks || 0}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-5 w-5 text-primary" />
                        <div>
                          <p className="text-sm text-muted-foreground">
                            Time Taken
                          </p>
                          <p className="text-lg font-bold">
                            {formatTime(attempt.time_taken || 0)}
                          </p>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">
                          Percentage
                        </p>
                        <p
                          className={`text-lg font-bold ${pct >= 40 ? "text-success" : "text-destructive"}`}
                        >
                          {pct.toFixed(1)}%
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
      <BrandFooter />
    </div>
  );
}
