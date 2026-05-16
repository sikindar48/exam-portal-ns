import React from "react";
import { Folder, FolderOpen, X, FileText } from "lucide-react";

interface FolderType {
  id: string;
  name: string;
}

interface Test {
  id: string;
  test_name: string;
  folder_id: string | null;
  question_count?: number;
}

interface TestFolderGridProps {
  folders: FolderType[];
  tests: Test[];
  openFolderId: string | null;
  setOpenFolderId: (id: string | null) => void;
  setDeleteFolderTarget: (id: string) => void;
  navigate: (path: string) => void;
}

export function TestFolderGrid({
  folders,
  tests,
  openFolderId,
  setOpenFolderId,
  setDeleteFolderTarget,
  navigate,
}: TestFolderGridProps) {
  const uncategorizedTests = tests.filter((t) => t.folder_id === null);
  if (folders.length === 0 && uncategorizedTests.length === 0) return null;

  return (
    <section>
      <div className="flex items-center gap-2 mb-6 pb-2 border-b border-slate-200 dark:border-slate-800">
        <FolderOpen className="h-4 w-4 text-slate-400" />
        <h2 className="text-[10px] font-black text-slate-900 dark:text-white uppercase tracking-[0.2em]">Categorized Inventories</h2>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {/* Folders List */}
        {folders.map((folder) => (
          <div
            key={folder.id}
            className={`group relative flex cursor-pointer flex-col p-5 bg-white dark:bg-slate-900 border ${openFolderId === folder.id ? 'border-blue-600' : 'border-slate-200 dark:border-slate-800'} rounded-none shadow-sm hover:border-blue-500 transition-all`}
            onClick={() => setOpenFolderId(folder.id)}
          >
            <Folder className="h-8 w-8 text-blue-600 mb-3" />
            <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate">{folder.name}</span>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
              {tests.filter((t) => t.folder_id === folder.id).length} Tests
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

      </div>
    </section>
  );
}
