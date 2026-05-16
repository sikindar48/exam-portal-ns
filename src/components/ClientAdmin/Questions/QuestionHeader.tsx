import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, FolderPlus } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";
import CSVImport from "@/components/QuestionImport/CSV";
import { DuplicateChecker } from "./DuplicateChecker";

interface QuestionHeaderProps {
  openFolderId: string | null;
  breadcrumbs: any[];
  navigateToBreadcrumb: (index: number) => void;
  navigate: (path: string) => void;
  setIsCreateFolderOpen: (open: boolean) => void;
  fetchQuestions: () => void;
}

export function QuestionHeader({
  openFolderId,
  breadcrumbs,
  navigateToBreadcrumb,
  navigate,
  setIsCreateFolderOpen,
  fetchQuestions,
}: QuestionHeaderProps) {
  return (
    <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (breadcrumbs.length > 0 ? navigateToBreadcrumb(breadcrumbs.length - 2) : navigate("/client-admin"))}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col">
            <div className="flex items-center gap-1 text-slate-500 text-[10px] font-bold uppercase tracking-widest">
              <span className="cursor-pointer hover:text-white" onClick={() => navigateToBreadcrumb(-1)}>Repository</span>
              {breadcrumbs.map((b, i) => (
                <React.Fragment key={b.id}>
                  <ChevronRight className="h-2.5 w-2.5" />
                  <span className="cursor-pointer hover:text-white" onClick={() => navigateToBreadcrumb(i)}>{b.name}</span>
                </React.Fragment>
              ))}
            </div>
            <h1 className="text-sm font-black uppercase tracking-[0.2em]">
              {openFolderId === "uncategorized" 
                ? "Uncategorized Inventory" 
                : openFolderId 
                  ? breadcrumbs[breadcrumbs.length - 1]?.name 
                  : "Question Repository"}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Toggle />
        <DuplicateChecker onComplete={fetchQuestions} />
        <Button
          variant="outline"
          onClick={() => setIsCreateFolderOpen(true)}
          className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest"
        >
          <FolderPlus className="mr-2 h-3.5 w-3.5" /> New Folder
        </Button>
        <CSVImport
          onImportSuccess={fetchQuestions}
          trigger={
            <Button className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all">
              Batch Import
            </Button>
          }
        />
      </div>
    </header>
  );
}
