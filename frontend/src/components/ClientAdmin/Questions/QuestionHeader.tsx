import React from "react";
import { Button } from "@/components/ui/button";
import { ChevronRight, FolderPlus } from "lucide-react";
import CSVImport from "@/components/QuestionImport/CSV";
import { DuplicateChecker } from "./DuplicateChecker";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";

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
  const onBack = () => (breadcrumbs.length > 0 ? navigateToBreadcrumb(breadcrumbs.length - 2) : navigate("/client-admin"));

  const subtitle = (
    <div className="flex items-center gap-1 text-slate-500 text-[9px] font-bold uppercase tracking-widest">
      <span className="cursor-pointer hover:text-white" onClick={() => navigateToBreadcrumb(-1)}>Question Bank</span>
      {breadcrumbs.map((b, i) => (
        <React.Fragment key={b.id}>
          <ChevronRight className="h-2.5 w-2.5" />
          <span className="cursor-pointer hover:text-white" onClick={() => navigateToBreadcrumb(i)}>{b.name}</span>
        </React.Fragment>
      ))}
    </div>
  );

  const title = openFolderId === "uncategorized" 
    ? "All Questions" 
    : openFolderId 
      ? breadcrumbs[breadcrumbs.length - 1]?.name 
      : "Question Bank";

  return (
    <ClientAdminHeader
      title={title}
      subtitle={subtitle}
      showBackButton={true}
      onBack={onBack}
      actions={
        <>
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
        </>
      }
    />
  );
}
