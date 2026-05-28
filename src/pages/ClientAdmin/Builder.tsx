import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Plus, BookOpen, Send } from "lucide-react";
import CSV from "@/components/QuestionImport/CSV";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Brand/Footer";

// Modular Components
import { Header } from "@/components/TestBuilder/Header";
import { Sidebar } from "@/components/TestBuilder/Sidebar";
import { QuestionCard } from "@/components/TestBuilder/QuestionCard";
import { QuestionRepositoryPicker } from "@/components/TestBuilder/QuestionRepositoryPicker";
import { Question, TestData } from "@/types/test";

export default function Builder() {
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
    shuffle: false,
    allow_review: true,
    negative_marking: false,
    negative_marks: 0.25,
    restrict_navigation: false,
    active: true,
    allow_guests: false,
    questions: [],
  });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);

  useEffect(() => {
    if (testId) loadTest();
  }, [testId]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const { data: test, error: testError } = await supabase
        .from("tests")
        .select("*")
        .eq("id", testId)
        .single();

      if (testError) throw testError;

      const { data: testQuestions, error: tqError } = await supabase
        .from("test_questions")
        .select("question_id")
        .eq("test_id", testId);

      if (tqError) throw tqError;

      const questionIds = testQuestions?.map((tq) => tq.question_id) || [];
      let questions: Question[] = [];

      if (questionIds.length > 0) {
        const { data: qData, error: qError } = await supabase
          .from("questions")
          .select("*")
          .in("id", questionIds);

        if (qError) throw qError;
        questions = qData as unknown as Question[];
      }

      setTestData({
        id: test.id,
        test_name: test.test_name,
        timer: test.timer,
        attempts_allowed: test.attempts_allowed,
        shuffle: test.shuffle ?? false,
        allow_review: test.allow_review ?? true,
        negative_marking: test.negative_marking ?? false,
        negative_marks: test.negative_marks ?? 0.25,
        restrict_navigation: test.restrict_navigation ?? false,
        active: test.active ?? true,
        allow_guests: test.allow_guests ?? false,
        share_code: test.share_code,
        questions: questions,
      });
    } catch (error) {
      console.error("Error loading test:", error);
      toast({ title: "Error", description: "Failed to load test data", variant: "destructive" });
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
    setTestData((prev) => ({ ...prev, questions: [...prev.questions, newQuestion] }));
  };

  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setTestData((prev) => ({
      ...prev,
      questions: prev.questions.map((q) => (q.id === id ? { ...q, [field]: value } : q)),
    }));
  };

  const deleteQuestion = (id: string) => {
    setTestData((prev) => ({
      ...prev,
      questions: prev.questions.filter((q) => q.id !== id),
    }));
  };

  const duplicateQuestion = (id: string) => {
    const question = testData.questions.find((q) => q.id === id);
    if (question) {
      setTestData((prev) => ({
        ...prev,
        questions: [...prev.questions, { ...question, id: `temp_${Date.now()}`, temp_id: Date.now() }],
      }));
    }
  };

  const onCsvImportSuccess = async (importedIds?: string[]) => {
    if (importedIds && importedIds.length > 0) {
      setLoading(true);
      try {
        const { data, error } = await supabase.from("questions").select("*").in("id", importedIds);
        if (error) throw error;
        if (data) {
          setTestData((prev) => ({ ...prev, questions: [...prev.questions, ...(data as unknown as Question[])] }));
          toast({ title: "Import Success", description: `${data.length} questions added.` });
        }
      } catch (err) {
        toast({ title: "Import Error", description: "Failed to display imported questions.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    }
    setCsvDialogOpen(false);
  };

  const onRepoImportSuccess = (importedQuestions: any[]) => {
    setTestData((prev) => ({ 
      ...prev, 
      questions: [...prev.questions, ...importedQuestions] 
    }));
    setRepoDialogOpen(false);
    toast({ title: "Import Success", description: `${importedQuestions.length} questions imported from repository.` });
  };

  const saveTest = async () => {
    if (!testData.test_name.trim() || testData.questions.length === 0) {
      toast({ title: "Validation Error", description: "Test name and at least one question are required.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      let testRecord;
      const isNew = !testData.id || testData.id.startsWith("temp_");
      
      const testPayload = {
        test_name: testData.test_name,
        timer: testData.timer,
        attempts_allowed: testData.attempts_allowed,
        shuffle: testData.shuffle,
        allow_review: testData.allow_review,
        negative_marking: testData.negative_marking,
        negative_marks: testData.negative_marks,
        restrict_navigation: testData.restrict_navigation,
        active: testData.active,
        allow_guests: testData.allow_guests ?? false,
        scheduled_start: (testData as any).scheduled_start || null,
        scheduled_end: (testData as any).scheduled_end || null,
        client_id: clientId,
      };

      if (isNew) {
        const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data, error } = await supabase.from("tests").insert({ ...testPayload, share_code: generatedCode }).select().single();
        if (error) throw error;
        testRecord = data;
      } else {
        const { data, error } = await supabase.from("tests").update(testPayload).eq("id", testData.id).select().single();
        if (error) throw error;
        testRecord = data;
      }

      const questionsPayload = testData.questions.map((q, index) => ({
        id: q.id,
        question_text: q.question_text,
        option_a: q.option_a,
        option_b: q.option_b,
        option_c: q.option_c,
        option_d: q.option_d,
        correct_answer: q.correct_answer,
        marks: q.marks,
        section_id: (q as any).section_id || null,
        position: index,
      }));

      const { data: rpcData, error: rpcError } = await supabase.rpc("upsert_test_questions", {
        _test_id: testRecord.id,
        _questions: questionsPayload,
      });

      if (rpcError) throw rpcError;
      if (rpcData && (rpcData as any).error) {
        throw new Error((rpcData as any).error);
      }

      toast({ title: "Success", description: "Test saved successfully" });
      navigate("/client-admin/tests");
    } catch (error: any) {
      console.error("Save test failed:", error);
      toast({ title: "Error", description: error?.message || "Failed to save test", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const totalMarks = testData.questions.reduce((total, q) => total + q.marks, 0);

  if (loading) {
    return <div className="flex items-center justify-center h-screen font-black uppercase tracking-widest text-slate-400">Loading Assessment Builder...</div>;
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans">
      <Header 
        testName={testData.test_name} 
        saving={saving} 
        onSave={saveTest} 
        onImport={() => setCsvDialogOpen(true)} 
      />

      <main className="container mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-1">
            <Sidebar 
              testData={testData} 
              setTestData={setTestData} 
              totalMarks={totalMarks} 
            />
          </div>

          <div className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between bg-white dark:bg-slate-900 p-4 border border-slate-200 dark:border-slate-800 rounded-none">
              <div className="flex items-center gap-3">
                <BookOpen className="h-5 w-5 text-blue-600" />
                <h2 className="font-black uppercase tracking-tight">Question Palette</h2>
                <span className="text-[10px] bg-slate-100 px-2 py-0.5 font-bold rounded-full">{testData.questions.length} Items</span>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setRepoDialogOpen(true)} variant="outline" className="border-slate-200 hover:bg-slate-50 font-black uppercase tracking-widest text-[10px] rounded-none h-8">
                  <BookOpen className="h-3.5 w-3.5 mr-2 text-blue-600" /> From Repository
                </Button>
                <Button onClick={addQuestion} className="bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-xs rounded-none h-8">
                  <Plus className="h-4 w-4 mr-2" /> Add Question
                </Button>
              </div>
            </div>

            <div className="space-y-8 pb-12">
              {testData.questions.map((question, index) => (
                <QuestionCard
                  key={question.id}
                  question={question}
                  index={index}
                  onUpdate={updateQuestion}
                  onDelete={deleteQuestion}
                  onDuplicate={duplicateQuestion}
                />
              ))}

              {testData.questions.length === 0 && (
                <Card className="border bg-white dark:bg-slate-900 rounded-none py-20">
                  <CardContent className="flex flex-col items-center justify-center text-center">
                    <Send className="h-12 w-12 text-slate-200 mb-4" />
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900">Your Palette is Empty</h3>
                    <p className="text-slate-500 text-sm max-w-xs mt-2">Start building your assessment by adding questions or importing from a CSV.</p>
                    <Button onClick={addQuestion} className="mt-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest rounded-none">Add Your First Question</Button>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={csvDialogOpen} onOpenChange={setCsvDialogOpen}>
        <DialogContent className="max-w-2xl bg-white dark:bg-slate-900 border-none rounded-none p-0 overflow-hidden">
          <div className="h-1 bg-blue-600" />
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Import Questions</DialogTitle>
          </DialogHeader>
          <div className="p-6">
            <CSV onImportSuccess={onCsvImportSuccess} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={repoDialogOpen} onOpenChange={setRepoDialogOpen}>
        <DialogContent className="max-w-4xl bg-white dark:bg-slate-900 border-none rounded-none p-0 overflow-hidden">
          <div className="h-1 bg-slate-900 dark:bg-blue-600" />
          <DialogHeader className="p-6 border-b">
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Import from Repository</DialogTitle>
          </DialogHeader>
          <QuestionRepositoryPicker 
            existingIds={testData.questions.map(q => q.id)}
            onSelect={onRepoImportSuccess}
            onCancel={() => setRepoDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
