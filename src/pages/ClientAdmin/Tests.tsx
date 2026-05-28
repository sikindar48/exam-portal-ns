import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Brand/Footer";

// Extracted Components
import { TestHeader } from "@/components/ClientAdmin/Tests/TestHeader";
import { TestFolderGrid } from "@/components/ClientAdmin/Tests/TestFolderGrid";
import { TestTable } from "@/components/ClientAdmin/Tests/TestTable";
import { TestDialog } from "@/components/ClientAdmin/Tests/TestDialog";
import { TestFolderDialogs } from "@/components/ClientAdmin/Tests/TestFolderDialogs";

export interface Test {
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
}

export interface TestFolder {
  id: string;
  name: string;
  client_id: string;
}

export default function TestsManagement() {
  const [tests, setTests] = useState<Test[]>([]);
  const [folders, setFolders] = useState<TestFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  
  const [searchParams, setSearchParams] = useSearchParams();
  const openFolderId = searchParams.get("folder");
  const setOpenFolderId = (id: string | null) => {
    if (id) {
      setSearchParams({ folder: id });
    } else {
      setSearchParams({});
    }
  };

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveTestOpen, setIsMoveTestOpen] = useState(false);
  const [moveTestTarget, setMoveTestTarget] = useState<Test | null>(null);
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>("none");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    test_name: "",
    timer: 60,
    status: "draft",
    shuffle: true,
    allow_review: true,
    negative_marking: false,
    negative_marks: 0.25,
    restrict_navigation: false,
    attempts_allowed: 1,
    scheduled_start: "",
    scheduled_end: "",
    public_link_enabled: true,
  });

  const { toast } = useToast();
  const { clientId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (clientId) {
      fetchTests();
      fetchFolders();
    }
  }, [clientId]);

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from("test_folders")
      .select("*")
      .eq("client_id", clientId)
      .order("name");
    if (!error && data) setFolders(data);
  };

  const fetchTests = async () => {
    setFetchLoading(true);
    // Fetch tests with question counts
    const { data, error } = await supabase
      .from("tests")
      .select(`
        *,
        test_questions(count)
      `)
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch tests", variant: "destructive" });
    } else {
      const formattedTests = data?.map(t => ({
        ...t,
        question_count: t.test_questions?.[0]?.count || 0
      })) || [];
      setTests(formattedTests);
    }
    setFetchLoading(false);
  };

  const toLocalDateTimeLocal = (dateStr: string | null) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    const offset = d.getTimezoneOffset();
    const localDate = new Date(d.getTime() - offset * 60 * 1000);
    return localDate.toISOString().slice(0, 16);
  };

  const toUTCISOString = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    return isNaN(d.getTime()) ? null : d.toISOString();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const payload = {
      ...formData,
      scheduled_start: toUTCISOString(formData.scheduled_start),
      scheduled_end: toUTCISOString(formData.scheduled_end),
      client_id: clientId,
      folder_id: openFolderId === "uncategorized" ? null : openFolderId,
    };

    if (editingTest) {
      const { error } = await supabase
        .from("tests")
        .update(payload)
        .eq("id", editingTest.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Assessment updated" });
        setIsDialogOpen(false);
        fetchTests();
        resetForm();
      }
    } else {
      const { error } = await supabase.from("tests").insert([payload]);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Assessment created" });
        setIsDialogOpen(false);
        fetchTests();
        resetForm();
      }
    }
    setLoading(false);
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
      toast({ title: "Success", description: "Category created" });
      setIsCreateFolderOpen(false);
      setNewFolderName("");
      fetchFolders();
    }
    setLoading(false);
  };

  const handleMoveTest = async () => {
    if (!moveTestTarget) return;
    const folderId = selectedMoveFolder === "none" ? null : selectedMoveFolder;
    const { error } = await supabase
      .from("tests")
      .update({ folder_id: folderId })
      .eq("id", moveTestTarget.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Test relocated" });
      setIsMoveTestOpen(false);
      fetchTests();
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase.from("test_folders").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Category deleted" });
      fetchFolders();
      fetchTests();
      if (openFolderId === id) setOpenFolderId(null);
    }
    setDeleteFolderTarget(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("tests").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Assessment purged" });
      fetchTests();
    }
    setDeleteTarget(null);
  };

  const handleClone = async (id: string) => {
    setFetchLoading(true);
    try {
      const { data, error } = await supabase.rpc("clone_test", {
        _source_test_id: id,
      });

      if (error) {
        toast({ title: "Error Cloning Test", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Assessment duplicated successfully" });
        fetchTests();
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "An error occurred while cloning", variant: "destructive" });
    } finally {
      setFetchLoading(false);
    }
  };

  const handleEdit = (test: Test) => {
    setEditingTest(test);
    setFormData({
      test_name: test.test_name,
      timer: test.timer,
      status: test.status || "draft",
      shuffle: test.shuffle ?? true,
      allow_review: test.allow_review ?? true,
      negative_marking: test.negative_marking ?? false,
      negative_marks: test.negative_marks ?? 0.25,
      restrict_navigation: test.restrict_navigation ?? false,
      attempts_allowed: test.attempts_allowed ?? 1,
      scheduled_start: toLocalDateTimeLocal(test.scheduled_start),
      scheduled_end: toLocalDateTimeLocal(test.scheduled_end),
      public_link_enabled: test.public_link_enabled ?? true,
    });
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      test_name: "",
      timer: 60,
      status: "draft",
      shuffle: true,
      allow_review: true,
      negative_marking: false,
      negative_marks: 0.25,
      restrict_navigation: false,
      attempts_allowed: 1,
      scheduled_start: "",
      scheduled_end: "",
      public_link_enabled: true,
    });
    setEditingTest(null);
  };

  const openMoveDialog = (test: Test) => {
    setMoveTestTarget(test);
    setSelectedMoveFolder(test.folder_id ?? "none");
    setIsMoveTestOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <TestHeader 
        openFolderId={openFolderId}
        setOpenFolderId={setOpenFolderId}
        navigate={navigate}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        setIsDialogOpen={setIsDialogOpen}
        resetForm={resetForm}
        folders={folders}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          {!openFolderId || openFolderId === "uncategorized" || folders.some(f => f.id === openFolderId) ? (
            <TestFolderGrid 
              folders={folders}
              tests={tests}
              openFolderId={openFolderId}
              setOpenFolderId={setOpenFolderId}
              setDeleteFolderTarget={setDeleteFolderTarget}
              navigate={navigate}
            />
          ) : null}

          <TestTable 
            tests={tests}
            fetchLoading={fetchLoading}
            openFolderId={openFolderId === "uncategorized" ? null : openFolderId}
            handleEdit={handleEdit}
            openMoveDialog={openMoveDialog}
            setDeleteTarget={setDeleteTarget}
            navigate={navigate}
            onUpdate={fetchTests}
            onClone={handleClone}
          />
        </div>
      </main>

      <TestDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingTest={editingTest}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        handleSubmit={handleSubmit}
      />

      <TestFolderDialogs 
        isCreateFolderOpen={isCreateFolderOpen}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        loading={loading}
        isMoveTestOpen={isMoveTestOpen}
        setIsMoveTestOpen={setIsMoveTestOpen}
        selectedMoveFolder={selectedMoveFolder}
        setSelectedMoveFolder={setSelectedMoveFolder}
        folders={folders}
        handleMoveTest={handleMoveTest}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleDelete={handleDelete}
        deleteFolderTarget={deleteFolderTarget}
        setDeleteFolderTarget={setDeleteFolderTarget}
        handleDeleteFolder={handleDeleteFolder}
      />
      
      <Footer />
    </div>
  );
}
