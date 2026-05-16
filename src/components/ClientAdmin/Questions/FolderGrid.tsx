import React from "react";
import { Folder, FolderOpen, X } from "lucide-react";

interface FolderType {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Question {
  folder_id: string | null;
}

interface FolderGridProps {
  folders: FolderType[];
  questions: Question[];
  openFolderId: string | null;
  navigateToFolder: (folder: FolderType) => void;
  setOpenFolderId: (id: string | null) => void;
  setDeleteFolderTarget: (id: string) => void;
}

export function FolderGrid({
  folders,
  questions,
  openFolderId,
  navigateToFolder,
  setOpenFolderId,
  setDeleteFolderTarget,
}: FolderGridProps) {
  const currentParentId = openFolderId === "uncategorized" ? null : openFolderId;
  const filteredFolders = folders.filter((f) => f.parent_id === currentParentId);
  const uncategorizedCount = questions.filter((q) => q.folder_id === null).length;

  return (
    <section>
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <FolderOpen className="h-4 w-4 text-slate-400" />
        <h2 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">
          {openFolderId ? "Subfolders" : "Categories"}
        </h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {/* Uncategorized folder at root only */}
        {!openFolderId && uncategorizedCount > 0 && (
          <div
            className="group relative flex cursor-pointer flex-col p-5 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-none shadow-sm hover:border-slate-400 transition-all"
            onClick={() => setOpenFolderId("uncategorized")}
          >
            <Folder className="h-8 w-8 text-slate-400 mb-3" />
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">Uncategorized</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {uncategorizedCount} Items
            </span>
          </div>
        )}

        {filteredFolders.map((folder) => (
          <div
            key={folder.id}
            className="group relative flex cursor-pointer flex-col p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none shadow-sm hover:border-blue-500 transition-all"
            onClick={() => navigateToFolder(folder)}
          >
            <Folder className="h-8 w-8 text-blue-600 mb-3" />
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{folder.name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {questions.filter((q) => q.folder_id === folder.id).length} Items
            </span>
            <button
              className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-red-500 transition-all bg-white dark:bg-slate-900 shadow-sm border border-slate-100 dark:border-slate-800"
              onClick={(e) => {
                e.stopPropagation();
                setDeleteFolderTarget(folder.id);
              }}
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ))}

        {filteredFolders.length === 0 && (!openFolderId ? uncategorizedCount === 0 : true) && (
          <div className="col-span-full py-10 text-center border border-dashed rounded-none">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">No Sub-categories Available</p>
          </div>
        )}
      </div>
    </section>
  );
}
