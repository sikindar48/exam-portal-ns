import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import TestSharing from '@/components/TestSharing';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';

export default function TestsManagement() {
  const [tests, setTests] = useState<any[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    test_name: '',
    timer: 30,
    shuffle: false,
    allow_review: true,
    negative_marking: false,
    negative_marks: 0.25,
    restrict_navigation: false,
    attempts_allowed: 1,
    active: true,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useAuth();

  useEffect(() => {
    if (clientId) {
      fetchTests();
      fetchQuestions();
    }
  }, [clientId]);

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('*')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false });

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch tests',
        variant: 'destructive',
      });
    } else {
      setTests(data || []);
    }
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from('questions')
      .select('*')
      .eq('client_id', clientId);

    if (error) {
      toast({
        title: 'Error',
        description: 'Failed to fetch questions',
        variant: 'destructive',
      });
    } else {
      setQuestions(data || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one question',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    const { data: testData, error: testError } = await supabase
      .from('tests')
      .insert([{ ...formData, client_id: clientId }])
      .select()
      .single();

    if (testError || !testData) {
      toast({
        title: 'Error',
        description: testError?.message || 'Failed to create test',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const testQuestions = selectedQuestions.map(qId => ({
      test_id: testData.id,
      question_id: qId,
    }));

    const { error: questionsError } = await supabase
      .from('test_questions')
      .insert(testQuestions);

    if (questionsError) {
      toast({
        title: 'Error',
        description: questionsError.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Test created successfully',
      });
      setIsDialogOpen(false);
      fetchTests();
      resetForm();
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this test?')) return;

    const { error } = await supabase
      .from('tests')
      .delete()
      .eq('id', id);

    if (error) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } else {
      toast({
        title: 'Success',
        description: 'Test deleted successfully',
      });
      fetchTests();
    }
  };

  const resetForm = () => {
    setFormData({
      test_name: '',
      timer: 30,
      shuffle: false,
      allow_review: true,
      negative_marking: false,
      negative_marks: 0.25,
      restrict_navigation: false,
      attempts_allowed: 1,
      active: true,
    });
    setSelectedQuestions([]);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev =>
      prev.includes(questionId)
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/client-admin')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Manage Tests</h1>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={resetForm}>
                <Plus className="mr-2 h-4 w-4" />
                Create Test
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Test</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="test_name">Test Name *</Label>
                  <Input
                    id="test_name"
                    value={formData.test_name}
                    onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timer">Duration (minutes) *</Label>
                  <Input
                    id="timer"
                    type="number"
                    min="1"
                    value={formData.timer}
                    onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) })}
                    required
                  />
                </div>
                
                <div className="space-y-3 rounded-lg border p-4">
                  <h3 className="font-semibold">Settings</h3>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="shuffle"
                      checked={formData.shuffle}
                      onCheckedChange={(checked) => setFormData({ ...formData, shuffle: checked })}
                    />
                    <Label htmlFor="shuffle">Shuffle Questions</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="allow_review"
                      checked={formData.allow_review}
                      onCheckedChange={(checked) => setFormData({ ...formData, allow_review: checked })}
                    />
                    <Label htmlFor="allow_review">Allow Review After Test</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="negative_marking"
                      checked={formData.negative_marking}
                      onCheckedChange={(checked) => setFormData({ ...formData, negative_marking: checked })}
                    />
                    <Label htmlFor="negative_marking">Enable Negative Marking</Label>
                  </div>
                  {formData.negative_marking && (
                    <div className="ml-6 space-y-2">
                      <Label htmlFor="negative_marks">Negative Marks per Wrong Answer</Label>
                      <Input
                        id="negative_marks"
                        type="number"
                        step="0.25"
                        min="0"
                        value={formData.negative_marks}
                        onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) })}
                      />
                    </div>
                  )}
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={formData.active}
                      onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                    />
                    <Label htmlFor="active">Active</Label>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Select Questions * ({selectedQuestions.length} selected)</Label>
                  <div className="max-h-60 space-y-2 overflow-y-auto rounded-lg border p-4">
                    {questions.map((question) => (
                      <div key={question.id} className="flex items-start space-x-2">
                        <Checkbox
                          id={question.id}
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={() => toggleQuestionSelection(question.id)}
                        />
                        <Label htmlFor={question.id} className="flex-1 cursor-pointer text-sm">
                          {question.question_text}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Test'}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Tests ({tests.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Duration</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">{test.test_name}</TableCell>
                    <TableCell>{test.timer} mins</TableCell>
                    <TableCell>
                      <span className={`rounded-full px-2 py-1 text-xs ${test.active ? 'bg-success/10 text-success' : 'bg-muted text-muted-foreground'}`}>
                        {test.active ? 'Active' : 'Inactive'}
                      </span>
                    </TableCell>
                    <TableCell>{new Date(test.created_at).toLocaleDateString()}</TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <TestSharing test={test} onUpdate={fetchTests} />
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(test.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
