import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ClipboardList, LogIn } from 'lucide-react';

export default function JoinTest() {
  const { code } = useParams();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [test, setTest] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [manualCode, setManualCode] = useState(code || '');

  useEffect(() => {
    if (code) {
      fetchTest(code);
    } else {
      setLoading(false);
    }
  }, [code]);

  const fetchTest = async (shareCode: string) => {
    setLoading(true);
    const { data, error } = await supabase
      .from('tests')
      .select('id, test_name, timer, share_code, public_link_enabled')
      .eq('share_code', shareCode.toUpperCase())
      .eq('active', true)
      .single();

    if (error || !data) {
      toast({ title: 'Not Found', description: 'Invalid or inactive test code.', variant: 'destructive' });
      setTest(null);
    } else {
      setTest(data);
    }
    setLoading(false);
  };

  const handleJoin = () => {
    if (!user) {
      navigate(`/auth?redirect=/join/${test.share_code}`);
      return;
    }
    if (role === 'student') {
      navigate(`/student/test/${test.id}`);
    } else {
      toast({ title: 'Info', description: 'Only students can take tests.' });
    }
  };

  const handleCodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      fetchTest(manualCode.trim());
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-primary">
            {test ? test.test_name : 'Join Test'}
          </CardTitle>
          <CardDescription>
            {test ? `Duration: ${test.timer} minutes` : 'Enter a test invite code to get started'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!test ? (
            <form onSubmit={handleCodeSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Invite Code</Label>
                <Input
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value.toUpperCase())}
                  placeholder="Enter invite code"
                  className="font-mono text-center text-lg tracking-widest"
                  maxLength={8}
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Looking up...' : 'Find Test'}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted p-4 text-center">
                <ClipboardList className="mx-auto mb-2 h-8 w-8 text-primary" />
                <p className="font-semibold">{test.test_name}</p>
                <p className="text-sm text-muted-foreground">{test.timer} minutes</p>
              </div>
              {user ? (
                <Button onClick={handleJoin} className="w-full">
                  Start Test
                </Button>
              ) : (
                <Button onClick={() => navigate(`/auth?redirect=/join/${test.share_code}`)} className="w-full">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In to Take Test
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
