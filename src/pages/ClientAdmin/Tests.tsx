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
  Pencil,
} from "lucide-react";
import Sharing from "@/components/Test/Sharing";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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
import { Footer } from "@/components/Brand/Footer";

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
  attempts_allowed: number | null;
  scheduled_start: string | null;
  scheduled_end: string | null;
  client_id: string;
};

export default function TestsManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [openFolderId, setOpenFolderId] = useState<string | null>(null);

  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveTestOpen, setIsMoveTestOpen] = useState(false);
  const [moveTestTarget, setMoveTestTarget] = useState<Test | null>(null);
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>("none");

  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [newFolderName, setNewFolderName] = useState("");

  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishTarget, setPublishTarget] = useState<Test | null>(null);
  const [publishSchedule, setPublishSchedule] = useState({
    start: "",
    end: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId } = useAuth();

  useEffect(() => {
    if (clientId) fetchAll();
  }, [clientId]);

  const fetchAll = async () => {
    setFetchLoading(true);
    await Promise.all([fetchTests(), fetchFolders()]);
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

  const toISO = (val: string): string | null => {
    if (!val) return null;
    return new Date(val).toISOString();
  };

  const toLocalInput = (iso: string | null): string => {
    if (!iso) return "";
    const d = new Date(iso);
    return d.toISOString().slice(0, 16);
  };

  const handleStatusChange = async (test: Test, newStatus: string) => {
    setLoading(true);
    try {
      const updates: any = { 
        active: newStatus === "published",
        status: newStatus 
      };

      if (newStatus !== "scheduled") {
        updates.scheduled_start = null;
        updates.scheduled_end = null;
      }

      const { error } = await supabase
        .from("tests")
        .update(updates)
        .eq("id", test.id);
      
      if (error) throw error;

      toast({ 
        title: "Status Updated", 
        description: `Test is now ${newStatus}.` 
      });
      fetchTests();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

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
        status: "scheduled",
        active: false, // Keep false for scheduled tests until they reach the start time
        scheduled_start: toISO(publishSchedule.start),
        scheduled_end: toISO(publishSchedule.end),
      } as any)
      .eq("id", publishTarget.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Test Scheduled", description: "Test will be active during the scheduled window." });
      setIsPublishDialogOpen(false);
      setPublishTarget(null);
      fetchTests();
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setLoading(true);
    const { error } = await supabase
      .from("test_folders")
      .insert([{ name: newFolderName.trim(), client_id: clientId }]);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Folder created" });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      fetchFolders();
    }
    setLoading(false);
  };

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
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Moved", description: "Test moved successfully" });
      setIsMoveTestOpen(false);
      setMoveTestTarget(null);
      fetchTests();
    }
  };

  const handleDeleteTest = async (id: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test deleted" });
      fetchTests();
    }
    setDeleteTarget(null);
  };

  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase.from("test_folders").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Folder deleted" });
      if (openFolderId === id) setOpenFolderId(null);
      fetchFolders();
      fetchTests();
    }
    setDeleteFolderTarget(null);
  };

  const formatSchedule = (test: Test) => {
    if (!test.scheduled_start && !test.scheduled_end) return null;
    const start = test.scheduled_start ? new Date(test.scheduled_start).toLocaleString() : "—";
    const end = test.scheduled_end ? new Date(test.scheduled_end).toLocaleString() : "—";
    return `${start} → ${end}`;
  };

  const getStatusBadge = (test: Test) => {
    const isActive = test.active === true;
    if (isActive) {
      return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 font-bold uppercase text-[10px]">Published</Badge>;
    }
    if (test.scheduled_start) {
      return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 font-bold uppercase text-[10px]">Scheduled</Badge>;
    }
    return <Badge variant="secondary" className="bg-slate-100 text-slate-700 hover:bg-slate-100 font-bold uppercase text-[10px]">Draft</Badge>;
  };

  const independentTests = tests.filter((t) => t.folder_id === null);
  const openFolder = openFolderId ? folders.find((f) => f.id === openFolderId) : null;
  const folderTests = openFolderId ? tests.filter((t) => t.folder_id === openFolderId) : [];
  const testsInFolder = (folderId: string) => tests.filter((t) => t.folder_id === folderId).length;

  const renderTestRows = (testList: Test[]) => {
    if (fetchLoading) {
      return Array.from({ length: 3 }).map((_, i) => (
        <TableRow key={i}>
          {Array.from({ length: 6 }).map((_, j) => (
            <TableCell key={j}><Skeleton className="h-4 w-full" /></TableCell>
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
              <Infinity className="h-3.5 w-3.5 text-muted-foreground" />
            ) : (
              <span className="text-xs">{test.attempts_allowed}</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          <Select 
            defaultValue={test.active ? "published" : (test.scheduled_start ? "scheduled" : "draft")} 
            onValueChange={(val) => {
              if (val === "scheduled") {
                openPublishDialog(test);
              } else {
                handleStatusChange(test, val);
              }
            }}
          >
            <SelectTrigger className="h-7 w-[110px] text-[10px] font-bold uppercase">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="published">Publish</SelectItem>
              <SelectItem value="scheduled">Schedule</SelectItem>
            </SelectContent>
          </Select>
        </TableCell>
        <TableCell>{new Date(test.created_at!).toLocaleDateString()}</TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => navigate(`/client-admin/tests/builder/${test.id}`)}
            >
              <Pencil className="h-4 w-4 text-slate-500" />
            </Button>
            <Sharing test={test} onUpdate={fetchTests} />
            <Button variant="ghost" size="sm" onClick={() => openMoveDialog(test)}>
              <MoveRight className="h-4 w-4 text-muted-foreground" />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setDeleteTarget(test.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    ));
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
        <div className="flex items-center gap-4">
          {openFolderId ? (
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setOpenFolderId(null)}
                className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-sm font-black uppercase tracking-[0.2em]">{openFolder?.name}</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Test Repository / Folder View</p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate("/client-admin")}
                className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-sm font-black uppercase tracking-[0.2em]">Tests Management</h1>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Examination & Assessment Controls</p>
              </div>
            </div>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          {!openFolderId && (
            <Button 
              variant="outline" 
              onClick={() => setIsCreateFolderOpen(true)}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest"
            >
              <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Folder
            </Button>
          )}
          <Button 
            onClick={() => navigate("/client-admin/tests/builder")}
            className="h-9 px-6 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest shadow-lg"
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> Create Test
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          
          {!openFolderId && folders.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
                <FolderOpen className="h-4 w-4 text-slate-400" />
                <h2 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Categorized Repositories</h2>
              </div>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="group relative flex cursor-pointer flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm hover:border-blue-500 transition-all"
                    onClick={() => setOpenFolderId(folder.id)}
                  >
                    <Folder className="h-8 w-8 text-blue-600 mb-3" />
                    <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{folder.name}</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">{testsInFolder(folder.id)} Papers</span>
                    <button
                      className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800"
                      onClick={(e) => { e.stopPropagation(); setDeleteFolderTarget(folder.id); }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section>
            <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-slate-900 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <ClipboardList className="h-5 w-5 text-slate-400" />
                <h2 className="text-lg font-black text-slate-900 dark:text-white uppercase tracking-tight">
                  {openFolderId ? openFolder?.name : "General Examination Papers"}
                </h2>
                <span className="bg-slate-100 dark:bg-slate-800 text-slate-500 px-2 py-0.5 text-[10px] font-black uppercase tracking-widest">
                  {openFolderId ? folderTests.length : independentTests.length} Records
                </span>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Examination Title</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Duration</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Attempts</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Status & Visibility</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Created On</TableHead>
                    <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Control Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {renderTestRows(openFolderId ? folderTests : independentTests)}
                </TableBody>
              </Table>
            </div>
          </section>
        </div>
      </main>

      <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader><DialogTitle>Publish "{publishTarget?.test_name}"</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-3 rounded-lg border p-4">
              <h3 className="font-semibold flex items-center gap-2"><Calendar className="h-4 w-4" /> Schedule (optional)</h3>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label>Start Date & Time</Label>
                  <Input type="datetime-local" value={publishSchedule.start} onChange={(e) => setPublishSchedule({...publishSchedule, start: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>End Date & Time</Label>
                  <Input type="datetime-local" value={publishSchedule.end} onChange={(e) => setPublishSchedule({...publishSchedule, end: e.target.value})} />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsPublishDialogOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handlePublish}><Send className="h-4 w-4 mr-2" /> Publish Now</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Create New Folder</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-4">
            <div className="space-y-2">
              <Label>Folder Name *</Label>
              <Input placeholder="e.g. MCA, Python" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} required />
            </div>
            <Button type="submit" disabled={loading} className="w-full">{loading ? "Creating..." : "Create Folder"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveTestOpen} onOpenChange={setIsMoveTestOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle>Move Test to Folder</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Select Destination</Label>
              <Select value={selectedMoveFolder} onValueChange={setSelectedMoveFolder}>
                <SelectTrigger><SelectValue placeholder="Choose a folder..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No folder (independent)</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsMoveTestOpen(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleMoveTest}>Move</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Test?</AlertDialogTitle><AlertDialogDescription>This will permanently delete the test. This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteTarget && handleDeleteTest(deleteTarget)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Folder?</AlertDialogTitle><AlertDialogDescription>Tests inside will become independent (not deleted).</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-white hover:bg-destructive/90" onClick={() => deleteFolderTarget && handleDeleteFolder(deleteFolderTarget)}>Delete Folder</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Footer />
    </div>
  );
}
