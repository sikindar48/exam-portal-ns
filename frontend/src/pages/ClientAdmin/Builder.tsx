import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { testsApi, testQuestionsApi, questionsApi, testSectionsApi, clientsApi } from "@/services/api/client";
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
  const { clientId, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletedSectionIds, setDeletedSectionIds] = useState<string[]>([]);
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
    camera_required: false,
    questions: [],
    sections: [],
  });
  const [csvDialogOpen, setCsvDialogOpen] = useState(false);
  const [repoDialogOpen, setRepoDialogOpen] = useState(false);
  const [features, setFeatures] = useState<string[]>([]);

  useEffect(() => {
    if (clientId && !authLoading) {
      const fetchClientFeatures = async () => {
        const { data } = await clientsApi.get(clientId);
        if (data && data.features) setFeatures(data.features);
      };
      fetchClientFeatures();
    }
  }, [clientId, authLoading]);

  useEffect(() => {
    if (testId && !authLoading) loadTest();
  }, [testId, authLoading]);

  const loadTest = async () => {
    setLoading(true);
    try {
      const { data: test, error: testError } = await testsApi.get(testId!);
      if (testError || !test) throw testError || new Error("Not found");

      const { data: testQuestions, error: tqError } = await testQuestionsApi.list(testId!, true);
      if (tqError) throw tqError;

      // Extract sections
      const { data: sectionsData, error: sectionsError } = await testSectionsApi.list(testId!);
      if (sectionsError) throw sectionsError;

      const sections = (sectionsData as any[])?.map((s: any) => ({
        id: s.id,
        test_id: s.test_id,
        name: s.name,
        position: s.position,
        duration_minutes: s.duration_minutes,
        negative_marks: s.negative_marks,
        shuffle_questions: s.shuffle_questions === 1 || s.shuffle_questions === true,
        shuffle_options: s.shuffle_options === 1 || s.shuffle_options === true,
        navigation_locked: s.navigation_locked === 1 || s.navigation_locked === true,
      })) || [];

      // Map questions keeping section_id and position
      const questions: Question[] = (testQuestions as any[])?.map((tq: any) => ({
        id: tq.question_id,
        question_text: tq.question_text || tq.questions?.question_text || "",
        option_a: tq.option_a || tq.questions?.option_a || "",
        option_b: tq.option_b || tq.questions?.option_b || "",
        option_c: tq.option_c || tq.questions?.option_c || "",
        option_d: tq.option_d || tq.questions?.option_d || "",
        correct_answer: tq.correct_answer || tq.questions?.correct_answer || "A",
        marks: tq.marks ?? tq.questions?.marks ?? 1,
        section_id: tq.section_id || null,
        position: tq.position ?? 0
      })) || [];

      const t = test as any;
      setTestData({
        id: t.id,
        test_name: t.test_name,
        timer: t.timer,
        attempts_allowed: t.attempts_allowed,
        shuffle: !!t.shuffle,
        allow_review: !!t.allow_review,
        negative_marking: !!t.negative_marking,
        negative_marks: t.negative_marks ?? 0.25,
        restrict_navigation: !!t.restrict_navigation,
        active: !!t.active,
        allow_guests: !!t.allow_guests,
        share_code: t.share_code,
        camera_required: !!t.camera_required,
        questions,
        sections,
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
      section_id: null,
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
        const { data, error } = await questionsApi.getByIds(importedIds);
        if (error) throw new Error(error.message);
        if (data) {
          setTestData((prev) => ({ ...prev, questions: [...prev.questions, ...(data as unknown as Question[])] }));
          toast({ title: "Import Success", description: `${(data as any[]).length} questions added.` });
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
        camera_required: !!testData.camera_required,
      };

      if (isNew) {
        const generatedCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        const { data, error } = await testsApi.create({ ...testPayload, share_code: generatedCode });
        if (error) throw new Error(error.message);
        testRecord = data;
      } else {
        const { data, error } = await testsApi.update(testData.id, testPayload);
        if (error) throw new Error(error.message);
        testRecord = data;
      }

      // Delete sections that were removed
      for (const delId of deletedSectionIds) {
        if (!delId.startsWith("temp_")) {
          await testSectionsApi.delete(delId);
        }
      }

      // Save / Update sections
      const sectionIdMapping: Record<string, string> = {};
      if (testData.sections) {
        for (const sec of testData.sections) {
          const secPayload = {
            test_id: testRecord.id,
            name: sec.name,
            position: sec.position,
            duration_minutes: sec.duration_minutes,
            negative_marks: sec.negative_marks,
            shuffle_questions: sec.shuffle_questions ? 1 : 0,
            shuffle_options: sec.shuffle_options ? 1 : 0,
            navigation_locked: sec.navigation_locked ? 1 : 0,
          };
          if (sec.id.startsWith("temp_")) {
            const { data: newSec, error: secErr } = await testSectionsApi.create(secPayload);
            if (secErr) throw new Error(secErr.message);
            sectionIdMapping[sec.id] = newSec.id;
          } else {
            const { error: secErr } = await testSectionsApi.update(sec.id, secPayload);
            if (secErr) throw new Error(secErr.message);
            sectionIdMapping[sec.id] = sec.id;
          }
        }
      }

      const questionsPayload = testData.questions.map((q, index) => {
        let sectionId = q.section_id || null;
        if (sectionId && sectionId.startsWith("temp_")) {
          sectionId = sectionIdMapping[sectionId] || null;
        }
        return {
          id: q.id,
          question_text: q.question_text,
          option_a: q.option_a,
          option_b: q.option_b,
          option_c: q.option_c,
          option_d: q.option_d,
          correct_answer: q.correct_answer,
          marks: q.marks,
          section_id: sectionId,
          position: index,
        };
      });

      const { error: rpcError } = await testQuestionsApi.replace(testRecord.id, questionsPayload);
      if (rpcError) throw new Error(rpcError.message);

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
              deletedSectionIds={deletedSectionIds}
              setDeletedSectionIds={setDeletedSectionIds}
              features={features}
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
                <Button onClick={() => setRepoDialogOpen(true)} variant="outline" className="border-slate-200 dark:border-slate-800 font-black uppercase tracking-widest text-[10px] rounded-none h-8">
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
                  sections={testData.sections}
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
