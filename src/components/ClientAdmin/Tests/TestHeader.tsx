import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, FolderPlus, Plus } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

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
  return (
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
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">
                {openFolderId === "uncategorized" ? "Uncategorized Items" : folders.find(f => f.id === openFolderId)?.name}
              </h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Test Repository / Category View</p>
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
              <h1 className="text-sm font-black uppercase tracking-[0.2em]">Test Management</h1>
              <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">Examination Portal / Control Center</p>
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center gap-3">
        <Toggle />
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
          <Plus className="mr-2 h-3.5 w-3.5" /> Initialize Test
        </Button>
      </div>
    </header>
  );
}
