import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Plus,
  Trash2,
  Save,
  Upload,
  ArrowLeft,
  Copy,
  FileText,
  Clock,
  Target,
  BookOpen,
} from "lucide-react";
import CSVImport from "@/components/QuestionImport/CSVImport";
import { useAuth } from "@/contexts/AuthContext";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: "A" | "B" | "C" | "D";
  marks: number;
  temp_id?: number;
}

interface TestData {
  id?: string;
  test_name: string;
  timer: number;
  attempts_allowed: number | null;
  questions: Question[];
}

export default function TestBuilder() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testData, setTestData] = useState<TestData>({
    test_name: "",
    timer: 60,
    attempts_allowed: 1,
    questions: [],
  });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);

  // Load existing test if editing
  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  const loadTest = async () => {
    setLoading(true);
    try {
      // Load test basic info
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .single();

      if (testError) throw testError;

      // Load questions for this test
      const { data: testQuestions, error: testQuestionsError } = await supabase
        .from("test_questions")
        .select(
          `
          question_id,
          questions (*)
        `,
        )
        .eq("test_id", testId);

      if (testQuestionsError) throw testQuestionsError;

      const questions = testQuestions?.map((tq: any) => tq.questions) || [];

      setTestData({
        id: test.id,
        test_name: test.test_name,
        timer: test.timer,
        attempts_allowed: test.attempts_allowed,
        questions: questions,
      });
    } catch (error) {
      console.error("Error loading test:", error);
      toast({
        title: "Error",
        description: "Failed to load test data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    const newQuestion: Question = {
      id: `temp_${Date.now()}`,
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      marks: 1,
      temp_id: Date.now(),
    };

    setTestData((prev) => ({
      ...prev,
      questions: [...prev.questions, newQuestion],
    }));
  };

  const updateQuestion = (
    questionId: string,
    field: keyof Question,
    value: any,
  ) => {
    setTestData((prev) => ({
      ...prev,
      questions: prev.questions.map((question) =>
        question.id === questionId ? { ...question, [field]: value } : question,
      ),
    }));
  };

  const deleteQuestion = (questionId: string) => {
    setTestData((prev) => ({
      ...prev,
      questions: prev.questions.filter(
        (question) => question.id !== questionId,
      ),
    }));
  };

  const duplicateQuestion = (questionId: string) => {
    const question = testData.questions.find((q) => q.id === questionId);

    if (question) {
      const duplicatedQuestion: Question = {
        ...question,
        id: `temp_${Date.now()}`,
        temp_id: Date.now(),
      };

      setTestData((prev) => ({
        ...prev,
        questions: [...prev.questions, duplicatedQuestion],
      }));
    }
  };

  const onCsvImportSuccess = (importedIds?: string[]) => {
    if (importedIds && importedIds.length > 0) {
      // Reload the test data to get the imported questions
      if (testId) {
        loadTest();
      }
      toast({
        title: "Success",
        description: `${importedIds.length} questions imported successfully`,
      });
    }
    setCsvDialogOpen(false);
  };

  const saveTest = async () => {
    if (!testData.test_name.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test name",
        variant: "destructive",
      });
      return;
    }

    if (testData.questions.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one question",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      let testRecord;

      if (testData.id && !testData.id.startsWith("temp_")) {
        // Update existing test
        const { data, error } = await supabase
          .from("tests")
          .update({
            test_name: testData.test_name,
            timer: testData.timer,
            attempts_allowed: testData.attempts_allowed,
          })
          .eq("id", testData.id)
          .select()
          .single();

        if (error) throw error;
        testRecord = data;
      } else {
        // Create new test
        const { data, error } = await supabase
          .from("tests")
          .insert({
            test_name: testData.test_name,
            timer: testData.timer,
            attempts_allowed: testData.attempts_allowed,
            active: false,
            client_id: clientId,
          })
          .select()
          .single();

        if (error) throw error;
        testRecord = data;
      }

      // Save questions
      for (const question of testData.questions) {
        if (question.id.startsWith("temp_")) {
          // Create new question first
          const { data: newQuestion, error: questionError } = await supabase
            .from("questions")
            .insert({
              question_text: question.question_text,
              option_a: question.option_a,
              option_b: question.option_b,
              option_c: question.option_c,
              option_d: question.option_d,
              correct_answer: question.correct_answer,
              marks: question.marks,
              client_id: clientId,
            })
            .select()
            .single();

          if (questionError) throw questionError;

          // Link question to test
          const { error: linkError } = await supabase
            .from("test_questions")
            .insert({
              test_id: testRecord.id,
              question_id: newQuestion.id,
            });

          if (linkError) throw linkError;
        } else {
          // Update existing question
          const { error } = await supabase
            .from("questions")
            .update({
              question_text: question.question_text,
              option_a: question.option_a,
              option_b: question.option_b,
              option_c: question.option_c,
              option_d: question.option_d,
              correct_answer: question.correct_answer,
              marks: question.marks,
            })
            .eq("id", question.id);

          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: "Test saved successfully",
      });

      // Navigate back to tests list
      navigate("/client-admin/tests");
    } catch (error) {
      console.error("Error saving test:", error);
      toast({
        title: "Error",
        description: "Failed to save test",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = testData.questions.reduce(
    (total, question) => total + question.marks,
    0,
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Loading test...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {/* Header */}
      <div className="bg-white dark:bg-slate-900 border-b shadow-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/client-admin/tests")}
              className="text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Tests
            </Button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                {testId ? "Edit Test" : "Create New Test"}
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                Build your test with questions
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => navigate("/client-admin/tests")}
              >
                Cancel
              </Button>
              <Button
                onClick={saveTest}
                disabled={saving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Save className="h-4 w-4 mr-2" />
                {saving ? "Saving..." : "Save Test"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Sidebar - Test Information */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="h-5 w-5 text-blue-600" />
                    Test Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label
                      htmlFor="test_name"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Test Name *
                    </Label>
                    <Input
                      id="test_name"
                      value={testData.test_name}
                      onChange={(e) =>
                        setTestData((prev) => ({
                          ...prev,
                          test_name: e.target.value,
                        }))
                      }
                      placeholder="Enter test name"
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="timer"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Clock className="h-4 w-4" />
                        Duration (min)
                      </Label>
                      <Input
                        id="timer"
                        type="number"
                        min="1"
                        value={testData.timer}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            timer: Number(e.target.value),
                          }))
                        }
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label
                        htmlFor="attempts"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Attempts
                      </Label>
                      <Input
                        id="attempts"
                        type="number"
                        min="1"
                        value={testData.attempts_allowed || ""}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            attempts_allowed: e.target.value === "" ? null : Number(e.target.value),
                          }))
                        }
                        placeholder="Unlimited"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      Total Marks
                    </Label>
                      <div className="flex items-center h-10 px-3 border rounded-md bg-slate-50 dark:bg-slate-800 mt-1">
                        <Badge
                          variant="secondary"
                          className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                        >
                          {totalMarks}
                        </Badge>
                        <span className="ml-2 text-xs text-slate-500">
                          (auto-calculated)
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Stats */}
              <Card className="shadow-lg border-0 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
                <CardContent className="p-4">
                  <div className="grid grid-cols-1 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {testData.questions.length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Questions
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Right Content - Questions */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Test Questions
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Add and manage your test questions
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setCsvDialogOpen(true)}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Import CSV
                  </Button>
                  <Button
                    onClick={addQuestion}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Question
                  </Button>
                </div>
              </div>

              {testData.questions.length === 0 ? (
                <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="h-12 w-12 text-slate-400 mb-4" />
                    <div className="text-slate-600 dark:text-slate-400 mb-4 text-center">
                      <h3 className="font-medium mb-2">
                        No questions added yet
                      </h3>
                      <p className="text-sm">
                        Start by adding your first question or import from CSV
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        onClick={() => setCsvDialogOpen(true)}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Import CSV
                      </Button>
                      <Button
                        onClick={addQuestion}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-4">
                  {testData.questions.map((question, questionIndex) => (
                    <Card
                      key={question.id}
                      className="shadow-lg border-0 bg-white dark:bg-slate-900"
                    >
                      <CardContent className="p-6">
                        <div className="space-y-4">
                          {/* Question Header */}
                          <div className="flex items-center justify-between">
                            <Badge
                              variant="secondary"
                              className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                            >
                              Q{questionIndex + 1}
                            </Badge>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => duplicateQuestion(question.id)}
                                className="text-slate-600 hover:text-slate-900"
                              >
                                <Copy className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteQuestion(question.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Question Text */}
                          <div>
                            <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                              Question *
                            </Label>
                            <Textarea
                              value={question.question_text}
                              onChange={(e) =>
                                updateQuestion(
                                  question.id,
                                  "question_text",
                                  e.target.value,
                                )
                              }
                              placeholder="Enter your question here..."
                              rows={3}
                              className="mt-1"
                            />
                          </div>

                          {/* Options */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {(["A", "B", "C", "D"] as const).map((option) => (
                              <div key={option} className="space-y-1">
                                <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                  Option {option}
                                </Label>
                                <Input
                                  value={
                                    question[
                                      `option_${option.toLowerCase()}` as keyof Question
                                    ] as string
                                  }
                                  onChange={(e) =>
                                    updateQuestion(
                                      question.id,
                                      `option_${option.toLowerCase()}` as keyof Question,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={`Enter option ${option}`}
                                />
                              </div>
                            ))}
                          </div>

                          {/* Answer and Marks */}
                          <div className="flex items-center gap-4">
                            <div className="flex-1">
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Correct Answer
                              </Label>
                              <Select
                                value={question.correct_answer}
                                onValueChange={(value) =>
                                  updateQuestion(
                                    question.id,
                                    "correct_answer",
                                    value,
                                  )
                                }
                              >
                                <SelectTrigger className="mt-1">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="A">A</SelectItem>
                                  <SelectItem value="B">B</SelectItem>
                                  <SelectItem value="C">C</SelectItem>
                                  <SelectItem value="D">D</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="w-24">
                              <Label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                Marks
                              </Label>
                              <Input
                                type="number"
                                min="1"
                                value={question.marks}
                                onChange={(e) =>
                                  updateQuestion(
                                    question.id,
                                    "marks",
                                    Number(e.target.value),
                                  )
                                }
                                className="mt-1"
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CSV Import Dialog */}
      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Import Questions from CSV</DialogTitle>
          </DialogHeader>
          {clientId && (
            <CSVImport
              clientId={clientId}
              onImportComplete={onCsvImportSuccess}
              testId={testData.id}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
