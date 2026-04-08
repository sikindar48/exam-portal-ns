import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Clock, Flag, ArrowLeft, ArrowRight } from 'lucide-react';

export default function TestEngine() {
  const { testId } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [test, setTest] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [attemptId, setAttemptId] = useState<string>('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (user && testId) {
      initializeTest();
    }

    // Tab switch detection
    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitchCount(prev => {
          const newCount = prev + 1;
          if (newCount >= 3) {
            toast({
              title: 'Warning',
              description: 'Too many tab switches detected. Test will be auto-submitted.',
              variant: 'destructive',
            });
            setTimeout(() => handleSubmit(true), 2000);
          } else {
            toast({
              title: 'Warning',
              description: `Tab switch detected (${newCount}/3). Please stay on this page.`,
              variant: 'destructive',
            });
          }
          return newCount;
        });
      }
    };

    // Prevent copy-paste
    const preventCopy = (e: ClipboardEvent) => {
      e.preventDefault();
      toast({
        title: 'Action Blocked',
        description: 'Copy/paste is disabled during the test.',
        variant: 'destructive',
      });
    };

    // Prevent right-click
    const preventContextMenu = (e: MouseEvent) => {
      e.preventDefault();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('copy', preventCopy);
    document.addEventListener('cut', preventCopy);
    document.addEventListener('paste', preventCopy);
    document.addEventListener('contextmenu', preventContextMenu);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('copy', preventCopy);
      document.removeEventListener('cut', preventCopy);
      document.removeEventListener('paste', preventCopy);
      document.removeEventListener('contextmenu', preventContextMenu);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [user, testId]);

  useEffect(() => {
    if (timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            handleSubmit(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [timeLeft]);

  const initializeTest = async () => {
    setLoading(true);

    // Fetch test details
    const { data: testData, error: testError } = await supabase
      .from('tests')
      .select('*')
      .eq('id', testId)
      .single();

    if (testError || !testData) {
      toast({
        title: 'Error',
        description: 'Failed to load test',
        variant: 'destructive',
      });
      navigate('/student');
      return;
    }

    setTest(testData);
    setTimeLeft(testData.timer * 60);

    // Fetch test questions
    const { data: testQuestions, error: questionsError } = await supabase
      .from('test_questions')
      .select('question_id, questions(*)')
      .eq('test_id', testId);

    if (questionsError) {
      toast({
        title: 'Error',
        description: 'Failed to load questions',
        variant: 'destructive',
      });
      navigate('/student');
      return;
    }

    const questionsList = testQuestions.map(tq => tq.questions);
    
    if (testData.shuffle) {
      questionsList.sort(() => Math.random() - 0.5);
    }

    setQuestions(questionsList);

    // Create attempt record
    const { data: attemptData, error: attemptError } = await supabase
      .from('attempts')
      .insert({
        student_id: user?.id,
        test_id: testId,
        status: 'in_progress',
      })
      .select()
      .single();

    if (attemptError || !attemptData) {
      toast({
        title: 'Error',
        description: 'Failed to create attempt',
        variant: 'destructive',
      });
      navigate('/student');
      return;
    }

    setAttemptId(attemptData.id);
    setLoading(false);
  };

  const handleAnswerChange = async (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));

    // Auto-save answer
    await supabase
      .from('attempt_answers')
      .upsert({
        attempt_id: attemptId,
        question_id: questionId,
        selected_option: answer,
      }, {
        onConflict: 'attempt_id,question_id'
      });
  };

  const handleMarkForReview = (questionId: string) => {
    setMarkedForReview(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };

  const handleSubmit = async (autoSubmit = false) => {
    if (!autoSubmit) {
      setShowSubmitDialog(true);
      return;
    }

    // Calculate score
    let score = 0;
    let totalMarks = 0;

    for (const question of questions) {
      totalMarks += question.marks || 1;
      if (answers[question.id] === question.correct_answer) {
        score += question.marks || 1;
      } else if (test.negative_marking && answers[question.id]) {
        score -= test.negative_marks || 0;
      }
    }

    // Update attempt
    await supabase
      .from('attempts')
      .update({
        score,
        total_marks: totalMarks,
        status: 'submitted',
        time_taken: (test.timer * 60) - timeLeft,
      })
      .eq('id', attemptId);

    toast({
      title: 'Test Submitted',
      description: `Your score: ${score.toFixed(2)}/${totalMarks}`,
    });

    navigate('/student');
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p>Loading test...</p>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <h1 className="text-xl font-bold text-primary">{test.test_name}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-destructive">
              <Clock className="h-5 w-5" />
              <span className="text-lg font-bold">{formatTime(timeLeft)}</span>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto grid gap-4 p-6 lg:grid-cols-[1fr_300px]">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>
                Question {currentQuestionIndex + 1} of {questions.length}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-lg">{currentQuestion.question_text}</p>

              <RadioGroup
                value={answers[currentQuestion.id] || ''}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="space-y-4">
                  {['A', 'B', 'C', 'D'].map((option) => (
                    <div key={option} className="flex items-center space-x-2 rounded-lg border p-4">
                      <RadioGroupItem value={option} id={option} />
                      <Label htmlFor={option} className="flex-1 cursor-pointer">
                        {currentQuestion[`option_${option.toLowerCase()}`]}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>

              <div className="flex justify-between">
                <Button
                  variant="outline"
                  onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>

                <Button
                  variant="outline"
                  onClick={() => handleMarkForReview(currentQuestion.id)}
                >
                  <Flag className={`mr-2 h-4 w-4 ${markedForReview[currentQuestion.id] ? 'fill-current text-warning' : ''}`} />
                  {markedForReview[currentQuestion.id] ? 'Marked' : 'Mark for Review'}
                </Button>

                <Button
                  onClick={() => setCurrentQuestionIndex(prev => Math.min(questions.length - 1, prev + 1))}
                  disabled={currentQuestionIndex === questions.length - 1}
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button onClick={() => handleSubmit(false)} className="w-full" variant="destructive">
            Submit Test
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Question Palette</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => (
                <Button
                  key={q.id}
                  variant={currentQuestionIndex === index ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setCurrentQuestionIndex(index)}
                  className={`relative ${answers[q.id] ? 'bg-success text-success-foreground hover:bg-success/90' : ''} ${markedForReview[q.id] ? 'border-2 border-warning' : ''}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded bg-success"></div>
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border-2 border-warning"></div>
                <span>Marked for Review</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 rounded border"></div>
                <span>Not Answered</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Test?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit the test? You cannot change your answers after submission.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleSubmit(true)}>Submit</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
