import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Footer } from "@/components/Brand/Footer";

// Extracted Components
import { QuestionHeader } from "@/components/ClientAdmin/Questions/QuestionHeader";
import { FolderGrid } from "@/components/ClientAdmin/Questions/FolderGrid";
import { QuestionTable } from "@/components/ClientAdmin/Questions/QuestionTable";
import { QuestionDialog } from "@/components/ClientAdmin/Questions/QuestionDialog";
import { FolderDialogs } from "@/components/ClientAdmin/Questions/FolderDialogs";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  difficulty: string;
  marks: number;
  folder_id: string | null;
  client_id: string;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
  client_id: string;
}

export default function QuestionsManagement() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
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
  const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [isMoveQuestionOpen, setIsMoveQuestionOpen] = useState(false);
  const [moveQuestionTarget, setMoveQuestionTarget] = useState<Question | null>(null);
  const [selectedMoveFolder, setSelectedMoveFolder] = useState<string>("none");
  const [newFolderName, setNewFolderName] = useState("");
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBulkMoveOpen, setIsBulkMoveOpen] = useState(false);

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
  const { clientId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (clientId) {
      fetchQuestions();
      fetchFolders();
    }
  }, [clientId]);

  const fetchFolders = async () => {
    const { data, error } = await supabase
      .from("question_folders")
      .select("*")
      .eq("client_id", clientId)
      .order("name");
    if (!error && data) setFolders(data);
  };

  const fetchQuestions = async () => {
    setFetchLoading(true);
    const { data, error } = await supabase
      .from("questions")
      .select("*")
      .eq("client_id", clientId)
      .order("created_at", { ascending: false });

    if (error) {
      toast({ title: "Error", description: "Failed to fetch questions", variant: "destructive" });
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
        .update({ ...formData })
        .eq("id", editingQuestion.id);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Question updated successfully" });
        setIsDialogOpen(false);
        fetchQuestions();
        resetForm();
      }
    } else {
      const { error } = await supabase
        .from("questions")
        .insert([{ 
          ...formData, 
          client_id: clientId,
          folder_id: openFolderId === "uncategorized" ? null : openFolderId 
        }]);

      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Question added successfully" });
        setIsDialogOpen(false);
        fetchQuestions();
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
      .from("question_folders")
      .insert([{ 
        name: newFolderName.trim(), 
        client_id: clientId,
        parent_id: openFolderId === "uncategorized" ? null : openFolderId 
      }]);
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

  const handleMoveQuestion = async () => {
    if (!moveQuestionTarget) return;
    const folderId = selectedMoveFolder === "none" ? null : selectedMoveFolder;
    const { error } = await supabase
      .from("questions")
      .update({ folder_id: folderId })
      .eq("id", moveQuestionTarget.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Relocation complete" });
      setIsMoveQuestionOpen(false);
      fetchQuestions();
    }
  };

  const handleDeleteFolder = async (id: string) => {
    const { error } = await supabase.from("question_folders").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Category dissolved" });
      fetchFolders();
      fetchQuestions();
      if (openFolderId === id) setOpenFolderId(null);
    }
    setDeleteFolderTarget(null);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("questions").delete().eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Question removed" });
      fetchQuestions();
    }
    setDeleteTarget(null);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setLoading(true);
    const { error } = await supabase.from("questions").delete().in("id", selectedIds);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.length} questions removed` });
      setSelectedIds([]);
      fetchQuestions();
    }
    setLoading(false);
  };

  const handleBulkMove = async () => {
    if (selectedIds.length === 0) return;
    const folderId = selectedMoveFolder === "none" ? null : selectedMoveFolder;
    setLoading(true);
    const { error } = await supabase
      .from("questions")
      .update({ folder_id: folderId })
      .in("id", selectedIds);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: `${selectedIds.length} questions relocated` });
      setIsBulkMoveOpen(false);
      setSelectedIds([]);
      fetchQuestions();
    }
    setLoading(false);
  };

  const handleEdit = (question: Question) => {
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

  const navigateToFolder = (folder: Folder) => {
    setOpenFolderId(folder.id);
  };

  const navigateToBreadcrumb = (index: number) => {
    if (index === -1) {
      setOpenFolderId(null);
    } else {
      setOpenFolderId(breadcrumbs[index].id);
    }
  };

  useEffect(() => {
    if (folders.length > 0) {
      if (openFolderId && openFolderId !== "uncategorized") {
        const chain: Folder[] = [];
        let current = folders.find(f => f.id === openFolderId);
        while (current) {
          chain.unshift(current);
          current = folders.find(f => f.id === current?.parent_id);
        }
        setBreadcrumbs(chain);
      } else {
        setBreadcrumbs([]);
      }
    }
  }, [openFolderId, folders]);

  const openMoveDialog = (question: Question) => {
    setMoveQuestionTarget(question);
    setSelectedMoveFolder(question.folder_id ?? "none");
    setIsMoveQuestionOpen(true);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col font-sans">
      <QuestionHeader 
        openFolderId={openFolderId}
        breadcrumbs={breadcrumbs}
        navigateToBreadcrumb={navigateToBreadcrumb}
        navigate={navigate}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        fetchQuestions={fetchQuestions}
      />

      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-10">
          <FolderGrid 
            folders={folders}
            questions={questions}
            openFolderId={openFolderId}
            navigateToFolder={navigateToFolder}
            setOpenFolderId={setOpenFolderId}
            setDeleteFolderTarget={setDeleteFolderTarget}
          />

          {openFolderId && (
            <QuestionTable 
              questions={questions}
              fetchLoading={fetchLoading}
              openFolderId={openFolderId}
              handleEdit={handleEdit}
              openMoveDialog={openMoveDialog}
              setDeleteTarget={setDeleteTarget}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              onBulkMove={() => setIsBulkMoveOpen(true)}
              onBulkDelete={handleBulkDelete}
            />
          )}
        </div>
      </main>

      <QuestionDialog 
        isOpen={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        editingQuestion={editingQuestion}
        formData={formData}
        setFormData={setFormData}
        loading={loading}
        handleSubmit={handleSubmit}
      />

      <FolderDialogs 
        isCreateFolderOpen={isCreateFolderOpen}
        setIsCreateFolderOpen={setIsCreateFolderOpen}
        newFolderName={newFolderName}
        setNewFolderName={setNewFolderName}
        handleCreateFolder={handleCreateFolder}
        loading={loading}
        isMoveQuestionOpen={isMoveQuestionOpen}
        setIsMoveQuestionOpen={setIsMoveQuestionOpen}
        selectedMoveFolder={selectedMoveFolder}
        setSelectedMoveFolder={setSelectedMoveFolder}
        folders={folders}
        handleMoveQuestion={handleMoveQuestion}
        deleteTarget={deleteTarget}
        setDeleteTarget={setDeleteTarget}
        handleDelete={handleDelete}
        deleteFolderTarget={deleteFolderTarget}
        setDeleteFolderTarget={setDeleteFolderTarget}
        handleDeleteFolder={handleDeleteFolder}
        isBulkMoveOpen={isBulkMoveOpen}
        setIsBulkMoveOpen={setIsBulkMoveOpen}
        handleBulkMove={handleBulkMove}
      />
      
      <Footer />
    </div>
  );
}
