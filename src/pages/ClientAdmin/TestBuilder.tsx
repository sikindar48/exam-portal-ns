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
import { Separator } from "@/components/ui/separator";
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
  GripVertical,
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
  temp_id?: number; // For new questions before saving
}

interface Section {
  id: string;
  name: string;
  order_index: number;
  questions: Question[];
  temp_id?: number; // For new sections before saving
}

interface TestData {
  id?: string;
  title: string;
  description: string;
  duration_minutes: number;
  total_marks: number;
  sections: Section[];
}

export default function TestBuilder() {
  const { testId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { clientId } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testData, setTestData] = useState<TestData>({
    title: "",
    description: "",
    duration_minutes: 60,
    total_marks: 0,
    sections: [],
  });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [selectedSectionForCsv, setSelectedSectionForCsv] = useState<
    string | null
  >(null);

  // Load existing test if editing
  useEffect(() => {
    if (testId) {
      loadTest();
    }
  }, [testId]);

  // Calculate total marks whenever sections change
  useEffect(() => {
    const totalMarks = testData.sections.reduce((total, section) => {
      return (
        total +
        section.questions.reduce((sectionTotal, question) => {
          return sectionTotal + question.marks;
        }, 0)
      );
    }, 0);

    setTestData((prev) => ({ ...prev, total_marks: totalMarks }));
  }, [testData.sections]);

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

      // Load sections
      const { data: sections, error: sectionsError } = await supabase
        .from("test_sections")
        .select("*")
        .eq("test_id", testId)
        .order("order_index");

      if (sectionsError) throw sectionsError;

      // Load questions for each section
      const sectionsWithQuestions = await Promise.all(
        sections.map(async (section) => {
          const { data: questions, error: questionsError } = await supabase
            .from("test_questions")
            .select("*")
            .eq("section_id", section.id)
            .order("created_at");

          if (questionsError) throw questionsError;

          return {
            ...section,
            questions: questions || [],
          };
        }),
      );

      setTestData({
        id: test.id,
        title: test.title,
        description: test.description || "",
        duration_minutes: test.duration_minutes,
        total_marks: test.total_marks,
        sections: sectionsWithQuestions,
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

  const addSection = () => {
    const newSection: Section = {
      id: `temp_${Date.now()}`,
      name: "New Section",
      order_index: testData.sections.length,
      questions: [],
      temp_id: Date.now(),
    };

    setTestData((prev) => ({
      ...prev,
      sections: [...prev.sections, newSection],
    }));
  };

  const updateSection = (
    sectionId: string,
    field: keyof Section,
    value: any,
  ) => {
    setTestData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId ? { ...section, [field]: value } : section,
      ),
    }));
  };

  const deleteSection = (sectionId: string) => {
    setTestData((prev) => ({
      ...prev,
      sections: prev.sections.filter((section) => section.id !== sectionId),
    }));
  };

  const addQuestion = (sectionId: string) => {
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
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? { ...section, questions: [...section.questions, newQuestion] }
          : section,
      ),
    }));
  };

  const updateQuestion = (
    sectionId: string,
    questionId: string,
    field: keyof Question,
    value: any,
  ) => {
    setTestData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.map((question) =>
                question.id === questionId
                  ? { ...question, [field]: value }
                  : question,
              ),
            }
          : section,
      ),
    }));
  };

  const deleteQuestion = (sectionId: string, questionId: string) => {
    setTestData((prev) => ({
      ...prev,
      sections: prev.sections.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              questions: section.questions.filter(
                (question) => question.id !== questionId,
              ),
            }
          : section,
      ),
    }));
  };

  const duplicateQuestion = (sectionId: string, questionId: string) => {
    const section = testData.sections.find((s) => s.id === sectionId);
    const question = section?.questions.find((q) => q.id === questionId);

    if (question) {
      const duplicatedQuestion: Question = {
        ...question,
        id: `temp_${Date.now()}`,
        temp_id: Date.now(),
      };

      setTestData((prev) => ({
        ...prev,
        sections: prev.sections.map((section) =>
          section.id === sectionId
            ? {
                ...section,
                questions: [...section.questions, duplicatedQuestion],
              }
            : section,
        ),
      }));
    }
  };

  const handleCsvImport = (sectionId: string) => {
    setSelectedSectionForCsv(sectionId);
    setCsvDialogOpen(true);
  };

  const onCsvImportSuccess = (importedIds?: string[]) => {
    if (selectedSectionForCsv && importedIds && importedIds.length > 0) {
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
    setSelectedSectionForCsv(null);
  };

  const saveTest = async () => {
    if (!testData.title.trim()) {
      toast({
        title: "Error",
        description: "Please enter a test title",
        variant: "destructive",
      });
      return;
    }

    if (testData.sections.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one section",
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
            title: testData.title,
            description: testData.description,
            duration_minutes: testData.duration_minutes,
            total_marks: testData.total_marks,
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
            title: testData.title,
            description: testData.description,
            duration_minutes: testData.duration_minutes,
            total_marks: testData.total_marks,
            is_published: false,
            client_id: clientId,
          })
          .select()
          .single();

        if (error) throw error;
        testRecord = data;
      }

      // Save sections and questions
      for (const section of testData.sections) {
        let sectionRecord;

        if (section.id.startsWith("temp_")) {
          // Create new section
          const { data, error } = await supabase
            .from("test_sections")
            .insert({
              test_id: testRecord.id,
              name: section.name,
              order_index: section.order_index,
            })
            .select()
            .single();

          if (error) throw error;
          sectionRecord = data;
        } else {
          // Update existing section
          const { data, error } = await supabase
            .from("test_sections")
            .update({
              name: section.name,
              order_index: section.order_index,
            })
            .eq("id", section.id)
            .select()
            .single();

          if (error) throw error;
          sectionRecord = data;
        }

        // Save questions for this section
        for (const question of section.questions) {
          if (question.id.startsWith("temp_")) {
            // Create new question
            const { error } = await supabase.from("test_questions").insert({
              test_id: testRecord.id,
              section_id: sectionRecord.id,
              question_text: question.question_text,
              option_a: question.option_a,
              option_b: question.option_b,
              option_c: question.option_c,
              option_d: question.option_d,
              correct_answer: question.correct_answer,
              marks: question.marks,
            });

            if (error) throw error;
          } else {
            // Update existing question
            const { error } = await supabase
              .from("test_questions")
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
                Build your test with sections and questions
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
                      htmlFor="title"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Test Title *
                    </Label>
                    <Input
                      id="title"
                      value={testData.title}
                      onChange={(e) =>
                        setTestData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      placeholder="Enter test title"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label
                      htmlFor="description"
                      className="text-sm font-medium text-slate-700 dark:text-slate-300"
                    >
                      Description
                    </Label>
                    <Textarea
                      id="description"
                      value={testData.description}
                      onChange={(e) =>
                        setTestData((prev) => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                      placeholder="Enter test description (optional)"
                      rows={3}
                      className="mt-1"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label
                        htmlFor="duration"
                        className="text-sm font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1"
                      >
                        <Clock className="h-4 w-4" />
                        Duration (min)
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        min="1"
                        value={testData.duration_minutes}
                        onChange={(e) =>
                          setTestData((prev) => ({
                            ...prev,
                            duration_minutes: Number(e.target.value),
                          }))
                        }
                        className="mt-1"
                      />
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
                          {testData.total_marks}
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
                  <div className="grid grid-cols-2 gap-4 text-center">
                    <div>
                      <div className="text-2xl font-bold text-blue-600">
                        {testData.sections.length}
                      </div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Sections
                      </div>
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-indigo-600">
                        {testData.sections.reduce(
                          (total, section) => total + section.questions.length,
                          0,
                        )}
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

          {/* Right Content - Sections and Questions */}
          <div className="lg:col-span-2">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Test Sections
                  </h2>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                    Organize your questions into sections
                  </p>
                </div>
                <Button
                  onClick={addSection}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Section
                </Button>
              </div>

              {testData.sections.length === 0 ? (
                <Card className="shadow-lg border-0 bg-white dark:bg-slate-900">
                  <CardContent className="flex flex-col items-center justify-center py-16">
                    <BookOpen className="h-12 w-12 text-slate-400 mb-4" />
                    <div className="text-slate-600 dark:text-slate-400 mb-4 text-center">
                      <h3 className="font-medium mb-2">
                        No sections added yet
                      </h3>
                      <p className="text-sm">
                        Start by adding your first section to organize questions
                      </p>
                    </div>
                    <Button
                      onClick={addSection}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Your First Section
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                testData.sections.map((section, sectionIndex) => (
                  <Card
                    key={section.id}
                    className="shadow-lg border-0 bg-white dark:bg-slate-900 overflow-hidden"
                  >
                    <CardHeader className="bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-b">
                      <div className="flex items-center gap-4">
                        <GripVertical className="h-5 w-5 text-slate-400" />
                        <div className="flex-1">
                          <Input
                            value={section.name}
                            onChange={(e) =>
                              updateSection(section.id, "name", e.target.value)
                            }
                            placeholder="Section name"
                            className="font-medium text-lg border-0 bg-transparent focus:bg-white dark:focus:bg-slate-800 shadow-none"
                          />
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-white dark:bg-slate-800"
                          >
                            {section.questions.length} question
                            {section.questions.length !== 1 ? "s" : ""}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleCsvImport(section.id)}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          >
                            <Upload className="h-4 w-4 mr-2" />
                            Import CSV
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSection(section.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>

                    <CardContent className="p-6">
                      <div className="space-y-4">
                        {section.questions.map((question, questionIndex) => (
                          <Card
                            key={question.id}
                            className="border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50"
                          >
                            <CardContent className="p-4">
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
                                      onClick={() =>
                                        duplicateQuestion(
                                          section.id,
                                          question.id,
                                        )
                                      }
                                      className="text-slate-600 hover:text-slate-900"
                                    >
                                      <Copy className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() =>
                                        deleteQuestion(section.id, question.id)
                                      }
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
                                        section.id,
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
                                  {(["A", "B", "C", "D"] as const).map(
                                    (option) => (
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
                                              section.id,
                                              question.id,
                                              `option_${option.toLowerCase()}` as keyof Question,
                                              e.target.value,
                                            )
                                          }
                                          placeholder={`Enter option ${option}`}
                                        />
                                      </div>
                                    ),
                                  )}
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
                                          section.id,
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
                                          section.id,
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

                        {/* Add Question Button */}
                        <Button
                          variant="outline"
                          onClick={() => addQuestion(section.id)}
                          className="w-full border-dashed border-2 border-slate-300 dark:border-slate-600 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 py-8"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question to {section.name}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
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
              sectionId={selectedSectionForCsv}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
