import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { LogOut, Users, Building, FileQuestion } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

export default function SuperAdminDashboard() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalClients: 0,
    totalStudents: 0,
    totalQuestions: 0,
    totalTests: 0,
  });

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [clients, profiles, questions, tests] = await Promise.all([
      supabase.from('clients').select('id', { count: 'exact', head: true }),
      supabase.from('profiles').select('id', { count: 'exact', head: true }),
      supabase.from('questions').select('id', { count: 'exact', head: true }),
      supabase.from('tests').select('id', { count: 'exact', head: true }),
    ]);

    setStats({
      totalClients: clients.count || 0,
      totalStudents: profiles.count || 0,
      totalQuestions: questions.count || 0,
      totalTests: tests.count || 0,
    });
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-2xl font-bold text-primary">Super Admin Dashboard</h1>
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
              <CardTitle className="text-sm font-medium">Total Clients</CardTitle>
              <Building className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalClients}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalStudents}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalQuestions}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <FileQuestion className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Button onClick={() => navigate('/superadmin/clients')} className="w-full md:w-auto">
            <Building className="mr-2 h-4 w-4" />
            Manage Clients
          </Button>
        </div>
      </main>
    </div>
  );
}
