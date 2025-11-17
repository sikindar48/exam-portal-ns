import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { LogOut, ClipboardList, History, Trophy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function StudentDashboard() {
  const { signOut, user, clientId } = useAuth();
  const navigate = useNavigate();
  const [tests, setTests] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && clientId) {
      fetchData();
    }
  }, [user, clientId]);

  const fetchData = async () => {
    setLoading(true);
    
    const [testsData, attemptsData] = await Promise.all([
      supabase
        .from('tests')
        .select('*')
        .eq('client_id', clientId)
        .eq('active', true)
        .order('created_at', { ascending: false }),
      supabase
        .from('attempts')
        .select('*, tests(test_name)')
        .eq('student_id', user?.id)
        .eq('status', 'submitted')
        .order('submitted_at', { ascending: false })
        .limit(5)
    ]);

    setTests(testsData.data || []);
    setAttempts(attemptsData.data || []);
    setLoading(false);
  };

  const handleStartTest = (testId: string) => {
    navigate(`/student/test/${testId}`);
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Student Dashboard</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-8">
          <h2 className="mb-4 text-xl font-bold">Available Tests</h2>
          {loading ? (
            <p>Loading...</p>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No tests available at the moment.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {tests.map((test) => (
                <Card key={test.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{test.test_name}</CardTitle>
                    <CardDescription>{test.timer} minutes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button onClick={() => handleStartTest(test.id)} className="w-full">
                      <ClipboardList className="mr-2 h-4 w-4" />
                      Start Test
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div>
          <h2 className="mb-4 text-xl font-bold">Recent Attempts</h2>
          {attempts.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">No test attempts yet.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {attempts.map((attempt) => (
                <Card key={attempt.id}>
                  <CardHeader>
                    <CardTitle className="text-base">{attempt.tests?.test_name || 'Test'}</CardTitle>
                    <CardDescription>
                      Submitted: {new Date(attempt.submitted_at).toLocaleDateString()}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Trophy className="h-4 w-4 text-warning" />
                        <span className="font-bold">
                          Score: {attempt.score?.toFixed(2) || 0} / {attempt.total_marks || 0}
                        </span>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => navigate('/student/history')}>
                        View Details
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="mt-8">
          <Button onClick={() => navigate('/student/history')} variant="outline">
            <History className="mr-2 h-4 w-4" />
            View Test History
          </Button>
        </div>
      </main>
    </div>
  );
}
