import React from "react";
import { Button } from "@/components/ui/button";
import { FolderPlus, Plus } from "lucide-react";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";

interface TestHeaderProps {
  openFolderId: string | null;
  setOpenFolderId: (id: string | null) => void;
  navigate: (path: string) => void;
  setIsCreateFolderOpen: (open: boolean) => void;
  setIsDialogOpen: (open: boolean) => void;
  resetForm: () => void;
  folders: any[];
}

export function TestHeader({
  openFolderId,
  setOpenFolderId,
  navigate,
  setIsCreateFolderOpen,
  setIsDialogOpen,
  resetForm,
  folders,
}: TestHeaderProps) {
  const title = openFolderId 
    ? (openFolderId === "uncategorized" ? "Uncategorized Items" : folders.find(f => f.id === openFolderId)?.name || "Folder View")
    : "Exam Management";

  const subtitle = openFolderId ? "Exams / Folder View" : "Exams / Dashboard";
  const onBack = openFolderId ? () => setOpenFolderId(null) : () => navigate("/client-admin");

  return (
    <ClientAdminHeader
      title={title}
      subtitle={subtitle}
      showBackButton={true}
      onBack={onBack}
      actions={
        <>
          {!openFolderId && (
            <Button
              variant="outline"
              onClick={() => setIsCreateFolderOpen(true)}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest"
            >
              <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Category
            </Button>
          )}
          <Button
            onClick={() => {
              resetForm();
              setIsDialogOpen(true);
            }}
            className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
          >
            <Plus className="mr-2 h-3.5 w-3.5" /> Create Exam
          </Button>
        </>
      }
    />
  );
}
