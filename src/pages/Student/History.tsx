import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

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
      .from('attempts')
      .select('*, tests(test_name, timer)')
      .eq('student_id', user?.id)
      .eq('status', 'submitted')
      .order('submitted_at', { ascending: false });

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
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Button variant="ghost" onClick={() => navigate('/student')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold text-primary">Test History</h1>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {loading ? (
          <p>Loading...</p>
        ) : attempts.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-center">
              <p className="text-muted-foreground">No test attempts found.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt) => (
              <Card key={attempt.id}>
                <CardHeader>
                  <CardTitle>{attempt.tests?.test_name || 'Test'}</CardTitle>
                  <CardDescription>
                    Submitted: {new Date(attempt.submitted_at).toLocaleString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-5 w-5 text-warning" />
                      <div>
                        <p className="text-sm text-muted-foreground">Score</p>
                        <p className="text-lg font-bold">
                          {attempt.score?.toFixed(2) || 0} / {attempt.total_marks || 0}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-primary" />
                      <div>
                        <p className="text-sm text-muted-foreground">Time Taken</p>
                        <p className="text-lg font-bold">{formatTime(attempt.time_taken || 0)}</p>
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Percentage</p>
                      <p className="text-lg font-bold">
                        {attempt.total_marks > 0 
                          ? ((attempt.score / attempt.total_marks) * 100).toFixed(2) 
                          : 0}%
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
