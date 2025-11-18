import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, FileQuestion, ClipboardList, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function ClientAdminDashboard() {
  const { signOut, clientId } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
    totalAttempts: 0,
  });

  useEffect(() => {
    if (clientId) {
      fetchStats();
    }
  }, [clientId]);

  const fetchStats = async () => {
    if (!clientId) return;

    const [students, questions, tests, attempts] = await Promise.all([
      supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('questions').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('tests').select('id', { count: 'exact', head: true }).eq('client_id', clientId),
      supabase.from('attempts').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalStudents: students.count || 0,
      totalQuestions: questions.count || 0,
      totalTests: tests.count || 0,
      totalAttempts: attempts.count || 0,
    });
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Client Admin Dashboard</h1>
          <Button variant="outline" onClick={signOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <div className="mb-6 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Questions</CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Tests</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <ClipboardList className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalAttempts}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Button onClick={() => navigate('/client-admin/students')} className="h-20">
            <Users className="mr-2 h-5 w-5" />
            Manage Students
          </Button>
          <Button onClick={() => navigate('/client-admin/questions')} className="h-20">
            <FileQuestion className="mr-2 h-5 w-5" />
            Manage Questions
          </Button>
          <Button onClick={() => navigate('/client-admin/tests')} className="h-20">
            <ClipboardList className="mr-2 h-5 w-5" />
            Manage Tests
          </Button>
          <Button onClick={() => navigate('/client-admin/settings')} variant="outline" className="h-20">
            <Settings className="mr-2 h-5 w-5" />
            Organization Settings
          </Button>
        </div>
      </main>
    </div>
  );
}
