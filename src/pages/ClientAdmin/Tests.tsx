import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plus,
  Trash2,
  ClipboardList,
  Folder,
  FolderOpen,
  FolderPlus,
  MoveRight,
  X,
  ChevronRight,
  Send,
  FileText,
  Calendar,
  Infinity,
} from "lucide-react";
import TestSharing from "@/components/TestSharing";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Switch } from "@/components/ui/switch";
import { ThemeToggle } from "@/components/theme-toggle";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Pencil } from "lucide-react";
import { BrandFooter } from "@/components/BrandFooter";

type TestFolder = {
  id: string;
  name: string;
  client_id: string;
  created_at: string | null;
};

type Test = {
  id: string;
  test_name: string;
  timer: number;
  active: boolean | null;
  status: string | null;
  created_at: string | null;
  folder_id: string | null;
  share_code: string | null;
  public_link_enabled: boolean | null;
  shuffle: boolean | null;
  allow_review: boolean | null;
  negative_marking: boolean | null;
  negative_marks: number | null;
  restrict_navigation: boolean | null;
  attempts_allowed: number | null; // null = unlimited
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_id: string;
};

const defaultFormData = {
  test_name: "",
  timer: 30,
  shuffle: false,
  allow_review: true,
  negative_marking: false,
  negative_marks: 0.25,
  restrict_navigation: false,
  attempts_allowed: "1" as string, // "unlimited" or numeric string
  scheduled_start: "",
  scheduled_end: "",
};

const QUESTIONS_PER_PAGE = 10;

// Convert local datetime-local string to ISO for Supabase (or null if empty)
function toISO(val: string): string | null {
  if (!val) return null;
  return new Date(val).toISOString();
}

// Format ISO to datetime-local input value
function toLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  // datetime-local needs "YYYY-MM-DDTHH:mm"
  return d.toISOString().slice(0, 16);
}

export default function TestsManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);

  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const [isCreateTestOpen, setIsCreateTestOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveTestOpen, setIsMoveTestOpen] = useState(false);
  const [moveTestTarget, setMoveTestTarget] = useState<Test | null>(null);
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>("none");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(
    null,
  );
  const [newFolderName, setNewFolderName] = useState("");

  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [formData, setFormData] = useState(defaultFormData);

  // Edit state
  const [isEditTestOpen, setIsEditTestOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [editFormData, setEditFormData] = useState(defaultFormData);
  const [editSelectedQuestions, setEditSelectedQuestions] = useState<string[]>(
    [],
  );

  // Publish dialog state
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<Test | null>(null);
  const [publishSchedule, setPublishSchedule] = useState({
    start: "",
    end: "",
  });

  // Question pagination
  const [createQPage, setCreateQPage] = useState(1);
  const [editQPage, setEditQPage] = useState(1);

  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useAuth();

  useEffect(() => {
    if (clientId) fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    setFetchLoading(true);
    await Promise.all([fetchTests(), fetchFolders(), fetchQuestions()]);
    setFetchLoading(false);
  };

  const fetchTests = async () => {
    const { data, error } = await supabase
      .from("tests")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });
    if (!error) setTests((data as unknown as Test[]) || []);
  };

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from("test_folders")
      .select("*")
      .eq("client_id", clientId)
      .order("name", { ascending: true });
    if (!error) setFolders((data as TestFolder[]) || []);
  };

  const fetchQuestions = async () => {
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("client_id", clientId);
    if (!error) setQuestions(data || []);
  };

  // ── Create Test ──────────────────────────────────────────────────────────────
  const handleCreateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one question",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const attemptsValue =
      formData.attempts_allowed === "unlimited"
        ? null
        : parseInt(formData.attempts_allowed);

    const { data: testData, error: testError } = await supabase
      .from("tests")
      .insert([
        {
          test_name: formData.test_name,
          timer: formData.timer,
          shuffle: formData.shuffle,
          allow_review: formData.allow_review,
          negative_marking: formData.negative_marking,
          negative_marks: formData.negative_marks,
          restrict_navigation: formData.restrict_navigation,
          attempts_allowed: attemptsValue,
          scheduled_start: toISO(formData.scheduled_start),
          scheduled_end: toISO(formData.scheduled_end),
          active: true,
          client_id: clientId,
          folder_id: openFolderId ?? null,
        } as any,
      ])
      .select()
      .single();

    if (testError || !testData) {
      toast({
        title: "Error",
        description: testError?.message || "Failed to create test",
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    const { error: qError } = await supabase.from("test_questions").insert(
      selectedQuestions.map((qId) => ({
        test_id: testData.id,
        question_id: qId,
      })),
    );

    if (qError) {
      toast({
        title: "Error",
        description: qError.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Test saved as draft",
        description: "Use the Publish button when ready to make it live.",
      });
      setIsCreateTestOpen(false);
      resetForm();
      fetchTests();
    }
    setLoading(false);
  };

  // ── Publish / Unpublish ───────────────────────────────────────────────────────
  const openPublishDialog = (test: Test) => {
    setPublishTarget(test);
    setPublishSchedule({
      start: toLocalInput(test.scheduled_start),
      end: toLocalInput(test.scheduled_end),
    });
    setIsPublishDialogOpen(true);
  };

  const handlePublish = async () => {
    if (!publishTarget) return;
    const { error } = await supabase
      .from("tests")
      .update({
        status: "published",
        scheduled_start: toISO(publishSchedule.start),
        scheduled_end: toISO(publishSchedule.end),
      } as any)
      .eq("id", publishTarget.id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Test published",
        description: "Students can now see this test.",
      });
      setIsPublishDialogOpen(false);
      setPublishTarget(null);
      fetchTests();
    }
  };

  const handleUnpublish = async (test: Test) => {
    const { error } = await supabase
      .from("tests")
      .update({ status: "draft" } as any)
      .eq("id", test.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Moved to draft",
        description: "Test is now hidden from students.",
      });
      fetchTests();
    }
  };

  // ── Edit Test ─────────────────────────────────────────────────────────────────
  const openEditDialog = async (test: Test) => {
    setEditingTest(test);
    setEditFormData({
      test_name: test.test_name,
      timer: test.timer,
      shuffle: test.shuffle ?? false,
      allow_review: test.allow_review ?? true,
      negative_marking: test.negative_marking ?? false,
      negative_marks: test.negative_marks ?? 0.25,
      restrict_navigation: test.restrict_navigation ?? false,
      attempts_allowed:
        test.attempts_allowed === null
          ? "unlimited"
          : String(test.attempts_allowed),
      scheduled_start: toLocalInput(test.scheduled_start),
      scheduled_end: toLocalInput(test.scheduled_end),
    });
    // Load existing question selections for this test
    const { data } = await supabase
      .from("test_questions")
      .select("question_id")
      .eq("test_id", test.id);
    setEditSelectedQuestions((data || []).map((r: any) => r.question_id));
    setEditQPage(1);
    setIsEditTestOpen(true);
  };

  const handleEditTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTest) return;
    if (editSelectedQuestions.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one question",
        variant: "destructive",
      });
      return;
    }
    setLoading(true);

    const attemptsValue =
      editFormData.attempts_allowed === "unlimited"
        ? null
        : parseInt(editFormData.attempts_allowed);

    const { error: updateError } = await supabase
      .from("tests")
      .update({
        test_name: editFormData.test_name,
        timer: editFormData.timer,
        shuffle: editFormData.shuffle,
        allow_review: editFormData.allow_review,
        negative_marking: editFormData.negative_marking,
        negative_marks: editFormData.negative_marks,
        restrict_navigation: editFormData.restrict_navigation,
        attempts_allowed: attemptsValue,
        scheduled_start: toISO(editFormData.scheduled_start),
        scheduled_end: toISO(editFormData.scheduled_end),
      } as any)
      .eq("id", editingTest.id);

    if (updateError) {
      toast({
        title: "Error",
        description: updateError.message,
        variant: "destructive",
      });
      setLoading(false);
      return;
    }

    // Replace all question associations
    await supabase
      .from("test_questions")
      .delete()
      .eq("test_id", editingTest.id);
    const { error: qError } = await supabase.from("test_questions").insert(
      editSelectedQuestions.map((qId) => ({
        test_id: editingTest.id,
        question_id: qId,
      })),
    );

    if (qError) {
      toast({
        title: "Error",
        description: qError.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Test updated successfully" });
      setIsEditTestOpen(false);
      setEditingTest(null);
      fetchTests();
    }
    setLoading(false);
  };

  // ── Create Folder ─────────────────────────────────────────────────────────────
  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("test_folders")
      .insert([{ name: newFolderName.trim(), client_id: clientId }]);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Folder "${newFolderName.trim()}" created`,
      });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      fetchFolders();
    }
    setLoading(false);
  };

  // ── Move Test ─────────────────────────────────────────────────────────────────
  const openMoveDialog = (test: Test) => {
    setMoveTestTarget(test);
    setSelectedMoveFolder(test.folder_id ?? "none");
    setIsMoveTestOpen(true);
  };

  const handleMoveTest = async () => {
    if (!moveTestTarget) return;
    const folder_id = selectedMoveFolder === "none" ? null : selectedMoveFolder;
    const { error } = await supabase
      .from("tests")
      .update({ folder_id })
      .eq("id", moveTestTarget.id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      const dest = folder_id
        ? folders.find((f) => f.id === folder_id)?.name
        : "No folder";
      toast({
        title: "Moved",
        description: `"${moveTestTarget.test_name}" moved to ${dest}`,
      });
      setIsMoveTestOpen(false);
      setMoveTestTarget(null);
      fetchTests();
    }
  };

  // ── Delete Test ───────────────────────────────────────────────────────────────
  const handleDeleteTest = async (id: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Test deleted" });
      fetchTests();
    }
    setDeleteTarget(null);
  };

  // ── Delete Folder ─────────────────────────────────────────────────────────────
  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase.from("test_folders").delete().eq("id", id);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Folder deleted. Tests moved to independent.",
      });
      if (openFolderId === id) setOpenFolderId(null);
      fetchFolders();
      fetchTests();
    }
    setDeleteFolderTarget(null);
  };

  const resetForm = () => {
    setFormData(defaultFormData);
    setSelectedQuestions([]);
    setCreateQPage(1);
  };

  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions((prev) =>
      prev.includes(questionId)
        ? prev.filter((id) => id !== questionId)
        : [...prev, questionId],
    );
  };

  // ── Helpers ───────────────────────────────────────────────────────────────────
  const formatAttempts = (val: number | null) =>
    val === null ? "Unlimited" : `${val} attempt${val !== 1 ? "s" : ""}`;

  const formatSchedule = (test: Test) => {
    if (!test.scheduled_start && !test.scheduled_end) return null;
    const start = test.scheduled_start
      ? new Date(test.scheduled_start).toLocaleString()
      : "—";
    const end = test.scheduled_end
      ? new Date(test.scheduled_end).toLocaleString()
      : "—";
    return `${start} → ${end}`;
  };

  const getStatusBadge = (test: Test) => {
    if (test.status === "published") {
      return (
        <span className="rounded-full px-2 py-1 text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          Published
        </span>
      );
    }
    return (
      <span className="rounded-full px-2 py-1 text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Draft
      </span>
    );
  };

  // ── Derived data ──────────────────────────────────────────────────────────────
  const independentTests = tests.filter((t) => t.folder_id === null);
  const openFolder = openFolderId
    ? folders.find((f) => f.id === openFolderId)
    : null;
  const folderTests = openFolderId
    ? tests.filter((t) => t.folder_id === openFolderId)
    : [];
  const testsInFolder = (folderId: string) =>
    tests.filter((t) => t.folder_id === folderId).length;

  // ── Shared test table renderer ────────────────────────────────────────────────
  const renderTestRows = (testList: Test[]) => {
    if (fetchLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}>
              <Skeleton className="h-4 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ));
    }

    if (testList.length === 0) {
      return (
        <TableRow>
          <TableCell colSpan={6} className="py-10 text-center">
            <div className="flex flex-col items-center gap-2 text-muted-foreground">
              <ClipboardList className="h-8 w-8 opacity-30" />
              <p className="text-sm">No tests here yet.</p>
            </div>
          </TableCell>
        </TableRow>
      );
    }

    return testList.map((test) => (
      <TableRow key={test.id}>
        <TableCell className="font-medium">
          <div>
            {test.test_name}
            {formatSchedule(test) && (
              <div className="flex items-center gap-1 mt-0.5 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {formatSchedule(test)}
              </div>
            )}
          </div>
        </TableCell>
        <TableCell>{test.timer} mins</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {test.attempts_allowed === null ? (
              <>
                <Infinity className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-xs">Unlimited</span>
              </>
            ) : (
              <span className="text-xs">{test.attempts_allowed}</span>
            )}
          </div>
        </TableCell>
        <TableCell>{getStatusBadge(test)}</TableCell>
        <TableCell>{new Date(test.created_at!).toLocaleDateString()}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant={test.status === "published" ? "outline" : "default"}
              size="sm"
              className="h-7 px-2 text-xs"
              onClick={() =>
                test.status === "published"
                  ? handleUnpublish(test)
                  : openPublishDialog(test)
              }
              title={
                test.status === "published" ? "Move to draft" : "Publish test"
              }
            >
              {test.status === "published" ? (
                <>
                  <FileText className="h-3 w-3 mr-1" />
                  Draft
                </>
              ) : (
                <>
                  <Send className="h-3 w-3 mr-1" />
                  Publish
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              title="Edit test"
              onClick={() => navigate(`/client-admin/tests/builder/${test.id}`)}
            >
              <Pencil className="h-4 w-4 text-muted-foreground" />
            </Button>
            <TestSharing test={test} onUpdate={fetchTests} />
            <Button
              variant="ghost"
              size="sm"
              title="Move to folder"
              onClick={() => openMoveDialog(test)}
            >
              <MoveRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setDeleteTarget(test.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-muted flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            {openFolderId ? (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setOpenFolderId(null)}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="text-muted-foreground text-sm">Tests</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-5 w-5 text-primary" />
                  <h1 className="text-2xl font-bold text-primary">
                    {openFolder?.name}
                  </h1>
                </div>
              </>
            ) : (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/client-admin")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <h1 className="text-2xl font-bold text-primary">
                  Manage Tests
                </h1>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {!openFolderId && (
              <Button
                variant="outline"
                onClick={() => setIsCreateFolderOpen(true)}
              >
                <FolderPlus className="mr-2 h-4 w-4" />
                New Folder
              </Button>
            )}
            <Button onClick={() => navigate("/client-admin/tests/builder")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Test
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto space-y-6 p-6">
        {openFolderId ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-primary" />
                {openFolder?.name}
                <Badge variant="secondary">{folderTests.length} tests</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Test Name</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Attempts</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>{renderTestRows(folderTests)}</TableBody>
              </Table>
            </CardContent>
          </Card>
        ) : (
          <>
            {(fetchLoading || folders.length > 0) && (
              <div>
                <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  Folders
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                  {fetchLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-20 rounded-lg" />
                      ))
                    : folders.map((folder) => (
                        <div
                          key={folder.id}
                          className="group relative flex cursor-pointer flex-col items-center gap-2 rounded-lg border bg-card p-4 shadow-sm transition-colors hover:border-primary hover:bg-accent"
                          onClick={() => setOpenFolderId(folder.id)}
                        >
                          <Folder className="h-8 w-8 text-primary" />
                          <span className="text-center text-sm font-medium leading-tight">
                            {folder.name}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {testsInFolder(folder.id)} test
                            {testsInFolder(folder.id) !== 1 ? "s" : ""}
                          </span>
                          <button
                            className="absolute right-1 top-1 hidden rounded p-0.5 text-muted-foreground hover:text-destructive group-hover:flex"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteFolderTarget(folder.id);
                            }}
                            title="Delete folder"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                </div>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardList className="h-5 w-5" />
                  Independent Tests
                  <Badge variant="secondary">{independentTests.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Test Name</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Attempts</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>{renderTestRows(independentTests)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* ── Create Test Dialog ── */}
      <Dialog open={isCreateTestOpen} onOpenChange={setIsCreateTestOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              Create New Test
              {openFolderId && openFolder && (
                <span className="ml-2 text-sm font-normal text-muted-foreground">
                  in{" "}
                  <span className="font-medium text-primary">
                    {openFolder.name}
                  </span>
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateTest} className="space-y-4">
            {/* Basic */}
            <div className="space-y-2">
              <Label htmlFor="test_name">Test Name *</Label>
              <Input
                id="test_name"
                value={formData.test_name}
                onChange={(e) =>
                  setFormData({ ...formData, test_name: e.target.value })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timer">Duration (minutes) *</Label>
                <Input
                  id="timer"
                  type="number"
                  min="1"
                  value={formData.timer}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      timer: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="attempts_allowed">Attempts Allowed</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Unlimited
                    </span>
                    <Switch
                      id="create_unlimited_toggle"
                      checked={formData.attempts_allowed === "unlimited"}
                      onCheckedChange={(checked) =>
                        setFormData({
                          ...formData,
                          attempts_allowed: checked ? "unlimited" : "1",
                        })
                      }
                    />
                  </div>
                </div>
                {formData.attempts_allowed === "unlimited" ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    <Infinity className="h-4 w-4" />
                    Unlimited attempts
                  </div>
                ) : (
                  <Input
                    id="attempts_allowed"
                    type="number"
                    min="1"
                    max="100"
                    value={formData.attempts_allowed}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        attempts_allowed: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            </div>
            {/* Settings */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Settings</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="shuffle"
                  checked={formData.shuffle}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, shuffle: v })
                  }
                />
                <Label htmlFor="shuffle">Shuffle Questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="allow_review"
                  checked={formData.allow_review}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, allow_review: v })
                  }
                />
                <Label htmlFor="allow_review">Allow Review After Test</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="negative_marking"
                  checked={formData.negative_marking}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, negative_marking: v })
                  }
                />
                <Label htmlFor="negative_marking">
                  Enable Negative Marking
                </Label>
              </div>
              {formData.negative_marking && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="negative_marks">
                    Negative Marks per Wrong Answer
                  </Label>
                  <Input
                    id="negative_marks"
                    type="number"
                    step="0.25"
                    min="0"
                    value={formData.negative_marks}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        negative_marks: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="restrict_navigation"
                  checked={formData.restrict_navigation}
                  onCheckedChange={(v) =>
                    setFormData({ ...formData, restrict_navigation: v })
                  }
                />
                <Label htmlFor="restrict_navigation">Restrict Navigation</Label>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Select Questions * ({selectedQuestions.length} selected)
                </Label>
                {questions.length > QUESTIONS_PER_PAGE && (
                  <span className="text-xs text-muted-foreground">
                    Page {createQPage} of{" "}
                    {Math.ceil(questions.length / QUESTIONS_PER_PAGE)}
                  </span>
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No questions available. Add questions first.
                  </p>
                ) : (
                  questions
                    .slice(
                      (createQPage - 1) * QUESTIONS_PER_PAGE,
                      createQPage * QUESTIONS_PER_PAGE,
                    )
                    .map((question) => (
                      <div
                        key={question.id}
                        className="flex items-start space-x-2"
                      >
                        <Checkbox
                          id={question.id}
                          checked={selectedQuestions.includes(question.id)}
                          onCheckedChange={() =>
                            toggleQuestionSelection(question.id)
                          }
                        />
                        <Label
                          htmlFor={question.id}
                          className="flex-1 cursor-pointer text-sm leading-snug"
                        >
                          {question.question_text}
                        </Label>
                      </div>
                    ))
                )}
              </div>
              {questions.length > QUESTIONS_PER_PAGE && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={createQPage === 1}
                    onClick={() => setCreateQPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {(createQPage - 1) * QUESTIONS_PER_PAGE + 1}–
                    {Math.min(
                      createQPage * QUESTIONS_PER_PAGE,
                      questions.length,
                    )}{" "}
                    of {questions.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      createQPage >=
                      Math.ceil(questions.length / QUESTIONS_PER_PAGE)
                    }
                    onClick={() => setCreateQPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3">
              <FileText className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300">
                Test will be saved as <strong>Draft</strong>. Use the{" "}
                <strong>Publish</strong> button in the list to make it visible
                to students.
              </p>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save as Draft"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Publish Dialog ── */}
      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Send className="h-4 w-4" />
              Publish "{publishTarget?.test_name}"
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule (optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Leave blank to make the test available immediately to students.
              </p>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="pub_start">Start Date &amp; Time</Label>
                  <Input
                    id="pub_start"
                    type="datetime-local"
                    value={publishSchedule.start}
                    onChange={(e) =>
                      setPublishSchedule({
                        ...publishSchedule,
                        start: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pub_end">End Date &amp; Time</Label>
                  <Input
                    id="pub_end"
                    type="datetime-local"
                    value={publishSchedule.end}
                    onChange={(e) =>
                      setPublishSchedule({
                        ...publishSchedule,
                        end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsPublishDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handlePublish}>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Edit Test Dialog ── */}
      <Dialog open={isEditTestOpen} onOpenChange={setIsEditTestOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Test</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleEditTest} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit_test_name">Test Name *</Label>
              <Input
                id="edit_test_name"
                value={editFormData.test_name}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    test_name: e.target.value,
                  })
                }
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit_timer">Duration (minutes) *</Label>
                <Input
                  id="edit_timer"
                  type="number"
                  min="1"
                  value={editFormData.timer}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      timer: parseInt(e.target.value),
                    })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="edit_attempts">Attempts Allowed</Label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      Unlimited
                    </span>
                    <Switch
                      id="edit_unlimited_toggle"
                      checked={editFormData.attempts_allowed === "unlimited"}
                      onCheckedChange={(checked) =>
                        setEditFormData({
                          ...editFormData,
                          attempts_allowed: checked ? "unlimited" : "1",
                        })
                      }
                    />
                  </div>
                </div>
                {editFormData.attempts_allowed === "unlimited" ? (
                  <div className="flex h-10 items-center gap-2 rounded-md border bg-muted px-3 text-sm text-muted-foreground">
                    <Infinity className="h-4 w-4" />
                    Unlimited attempts
                  </div>
                ) : (
                  <Input
                    id="edit_attempts"
                    type="number"
                    min="1"
                    max="100"
                    value={editFormData.attempts_allowed}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        attempts_allowed: e.target.value,
                      })
                    }
                  />
                )}
              </div>
            </div>

            {/* Schedule */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Schedule (optional)
              </h3>
              <p className="text-xs text-muted-foreground">
                Leave blank to make the test available immediately after
                publishing.
              </p>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="edit_scheduled_start">
                    Start Date &amp; Time
                  </Label>
                  <Input
                    id="edit_scheduled_start"
                    type="datetime-local"
                    value={editFormData.scheduled_start}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        scheduled_start: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit_scheduled_end">
                    End Date &amp; Time
                  </Label>
                  <Input
                    id="edit_scheduled_end"
                    type="datetime-local"
                    value={editFormData.scheduled_end}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        scheduled_end: e.target.value,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Settings */}
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold">Settings</h3>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_shuffle"
                  checked={editFormData.shuffle}
                  onCheckedChange={(v) =>
                    setEditFormData({ ...editFormData, shuffle: v })
                  }
                />
                <Label htmlFor="edit_shuffle">Shuffle Questions</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_allow_review"
                  checked={editFormData.allow_review}
                  onCheckedChange={(v) =>
                    setEditFormData({ ...editFormData, allow_review: v })
                  }
                />
                <Label htmlFor="edit_allow_review">
                  Allow Review After Test
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_negative_marking"
                  checked={editFormData.negative_marking}
                  onCheckedChange={(v) =>
                    setEditFormData({ ...editFormData, negative_marking: v })
                  }
                />
                <Label htmlFor="edit_negative_marking">
                  Enable Negative Marking
                </Label>
              </div>
              {editFormData.negative_marking && (
                <div className="ml-6 space-y-2">
                  <Label htmlFor="edit_negative_marks">
                    Negative Marks per Wrong Answer
                  </Label>
                  <Input
                    id="edit_negative_marks"
                    type="number"
                    step="0.25"
                    min="0"
                    value={editFormData.negative_marks}
                    onChange={(e) =>
                      setEditFormData({
                        ...editFormData,
                        negative_marks: parseFloat(e.target.value),
                      })
                    }
                  />
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Switch
                  id="edit_restrict_navigation"
                  checked={editFormData.restrict_navigation}
                  onCheckedChange={(v) =>
                    setEditFormData({ ...editFormData, restrict_navigation: v })
                  }
                />
                <Label htmlFor="edit_restrict_navigation">
                  Restrict Navigation
                </Label>
              </div>
            </div>

            {/* Questions */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>
                  Select Questions * ({editSelectedQuestions.length} selected)
                </Label>
                {questions.length > QUESTIONS_PER_PAGE && (
                  <span className="text-xs text-muted-foreground">
                    Page {editQPage} of{" "}
                    {Math.ceil(questions.length / QUESTIONS_PER_PAGE)}
                  </span>
                )}
              </div>
              <div className="rounded-lg border p-4 space-y-2">
                {questions.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No questions available.
                  </p>
                ) : (
                  questions
                    .slice(
                      (editQPage - 1) * QUESTIONS_PER_PAGE,
                      editQPage * QUESTIONS_PER_PAGE,
                    )
                    .map((question) => (
                      <div
                        key={question.id}
                        className="flex items-start space-x-2"
                      >
                        <Checkbox
                          id={`edit_${question.id}`}
                          checked={editSelectedQuestions.includes(question.id)}
                          onCheckedChange={() =>
                            setEditSelectedQuestions((prev) =>
                              prev.includes(question.id)
                                ? prev.filter((id) => id !== question.id)
                                : [...prev, question.id],
                            )
                          }
                        />
                        <Label
                          htmlFor={`edit_${question.id}`}
                          className="flex-1 cursor-pointer text-sm leading-snug"
                        >
                          {question.question_text}
                        </Label>
                      </div>
                    ))
                )}
              </div>
              {questions.length > QUESTIONS_PER_PAGE && (
                <div className="flex items-center justify-between pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={editQPage === 1}
                    onClick={() => setEditQPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    {(editQPage - 1) * QUESTIONS_PER_PAGE + 1}–
                    {Math.min(editQPage * QUESTIONS_PER_PAGE, questions.length)}{" "}
                    of {questions.length}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={
                      editQPage >=
                      Math.ceil(questions.length / QUESTIONS_PER_PAGE)
                    }
                    onClick={() => setEditQPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Create Folder Dialog ── */}
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="folder_name">Folder Name *</Label>
              <Input
                id="folder_name"
                placeholder="e.g. MCA, Python, Semester 1"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Creating..." : "Create Folder"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Move Test Dialog ── */}
      <Dialog open={isMoveTestOpen} onOpenChange={setIsMoveTestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Move Test to Folder</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Moving:{" "}
              <span className="font-medium text-foreground">
                {moveTestTarget?.test_name}
              </span>
            </p>
            <div className="space-y-2">
              <Label>Select Destination</Label>
              <Select
                value={selectedMoveFolder}
                onValueChange={setSelectedMoveFolder}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a folder..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">
                    <span className="flex items-center gap-2">
                      <ClipboardList className="h-4 w-4" />
                      No folder (independent)
                    </span>
                  </SelectItem>
                  {folders.map((folder) => (
                    <SelectItem key={folder.id} value={folder.id}>
                      <span className="flex items-center gap-2">
                        <Folder className="h-4 w-4" />
                        {folder.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setIsMoveTestOpen(false)}
              >
                Cancel
              </Button>
              <Button className="flex-1" onClick={handleMoveTest}>
                Move
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Delete Test Confirmation ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the test and all associated attempts.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteTarget && handleDeleteTest(deleteTarget)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Delete Folder Confirmation ── */}
      <AlertDialog
        open={!!deleteFolderTarget}
        onOpenChange={(open) => !open && setDeleteFolderTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              The folder will be deleted. Tests inside it will become
              independent (not deleted).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteFolderTarget && handleDeleteFolder(deleteFolderTarget)
              }
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <BrandFooter />
    </div>
  );
}
