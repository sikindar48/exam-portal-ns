import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, Plus, Pencil, Trash2, FileQuestion } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import CSVImport from "@/components/QuestionImport/CSV";
import { Toggle } from "@/components/Theme/Toggle";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Footer } from "@/components/Brand/Footer";

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    question_text: "",
    option_a: "",
    option_b: "",
    option_c: "",
    option_d: "",
    correct_answer: "A",
    difficulty: "medium",
    marks: 1,
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useAuth();

  useEffect(() => {
    if (clientId) {
      fetchQuestions();
    }
  }, [clientId]);

  const fetchQuestions = async () => {
    setFetchLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch questions",
        variant: "destructive",
      });
    } else {
      setQuestions(data || []);
    }
    setFetchLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingQuestion) {
      const { error } = await supabase
        .from("questions")
        .update(formData)
        .eq("id", editingQuestion.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Question updated successfully",
        });
        setIsDialogOpen(false);
        fetchQuestions();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("questions")
        .insert([{ ...formData, client_id: clientId }]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Question added successfully",
        });
        setIsDialogOpen(false);
        fetchQuestions();
        resetForm();
      }
    }

    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Question deleted successfully",
      });
      fetchQuestions();
    }
    setDeleteTarget(null);
  };

  const handleEdit = (question: any) => {
    setEditingQuestion(question);
    setFormData({
      question_text: question.question_text,
      option_a: question.option_a,
      option_b: question.option_b,
      option_c: question.option_c,
      option_d: question.option_d,
      correct_answer: question.correct_answer,
      difficulty: question.difficulty || "medium",
      marks: question.marks || 1,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      question_text: "",
      option_a: "",
      option_b: "",
      option_c: "",
      option_d: "",
      correct_answer: "A",
      difficulty: "medium",
      marks: 1,
    });
    setEditingQuestion(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/client-admin")}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">Question Repository</h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Master Database / Item Management</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <Toggle />
          <CSVImport clientId={clientId!} onImportComplete={fetchQuestions} />
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={resetForm}
                className="h-9 px-6 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg"
              >
                <Plus className="mr-2 h-3.5 w-3.5" /> Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto rounded-none border-t-4 border-t-blue-600">
                <DialogHeader>
                  <DialogTitle>
                    {editingQuestion ? "Edit Question" : "Add New Question"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="question">Question *</Label>
                    <Textarea
                      id="question"
                      value={formData.question_text}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          question_text: e.target.value,
                        })
                      }
                      required
                      rows={3}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="option_a">Option A *</Label>
                      <Input
                        id="option_a"
                        value={formData.option_a}
                        onChange={(e) =>
                          setFormData({ ...formData, option_a: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_b">Option B *</Label>
                      <Input
                        id="option_b"
                        value={formData.option_b}
                        onChange={(e) =>
                          setFormData({ ...formData, option_b: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_c">Option C *</Label>
                      <Input
                        id="option_c"
                        value={formData.option_c}
                        onChange={(e) =>
                          setFormData({ ...formData, option_c: e.target.value })
                        }
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="option_d">Option D *</Label>
                      <Input
                        id="option_d"
                        value={formData.option_d}
                        onChange={(e) =>
                          setFormData({ ...formData, option_d: e.target.value })
                        }
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="correct">Correct Answer *</Label>
                    <Select
                      value={formData.correct_answer}
                      onValueChange={(value) =>
                        setFormData({ ...formData, correct_answer: value })
                      }
                    >
                      <SelectTrigger>
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
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="difficulty">Difficulty</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) =>
                          setFormData({ ...formData, difficulty: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="marks">Marks</Label>
                      <Input
                        id="marks"
                        type="number"
                        min="1"
                        value={formData.marks}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            marks: parseInt(e.target.value),
                          })
                        }
                      />
                    </div>
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? "Saving..." : editingQuestion ? "Update" : "Add"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          
          <section>
            <div className="flex items-center justify-between mb-8 pb-4 border-b-2 border-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <FileQuestion className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  Item Inventory
                </h2>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  {questions.length} Records
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Question Content</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Key</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Complexity</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Weightage</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {fetchLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                        <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                      </TableRow>
                    ))
                  ) : questions.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="py-20 text-center">
                        <div className="flex flex-col items-center gap-4 text-slate-400">
                          <FileQuestion className="h-12 w-12 opacity-20" />
                          <div>
                            <p className="text-xs font-black uppercase tracking-widest">No Assessment Items Found</p>
                            <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Initialize your repository by adding questions manually or via CSV.</p>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    questions.map((question) => (
                      <TableRow key={question.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                        <TableCell className="max-w-md truncate text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight py-4">
                          {question.question_text}
                        </TableCell>
                        <TableCell className="text-xs font-black text-blue-600 py-4">{question.correct_answer}</TableCell>
                        <TableCell className="py-4">
                          <span
                            className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                              question.difficulty === "easy"
                                ? "bg-green-50 text-green-600 border-green-100"
                                : question.difficulty === "hard"
                                  ? "bg-red-50 text-red-600 border-red-100"
                                  : "bg-amber-50 text-amber-600 border-amber-100"
                            }`}
                          >
                            {question.difficulty}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs font-black text-slate-900 dark:text-white tabular-nums py-4">{question.marks || 1} PT</TableCell>
                        <TableCell className="py-4 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(question)}
                              className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all p-0"
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeleteTarget(question.id)}
                              className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:border-red-200 transition-all p-0"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </main>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Question?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the question. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
}
