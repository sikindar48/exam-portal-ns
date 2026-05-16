import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, MoveRight, Trash2, ClipboardList, Send, FileText } from "lucide-react";
import Sharing from "@/components/Test/Sharing";

interface Test {
  id: string;
  test_name: string;
  timer: number;
  active: boolean | null;
  status: string | null;
  folder_id: string | null;
  share_code: string | null;
  public_link_enabled?: boolean | null;
}

interface TestTableProps {
  tests: Test[];
  fetchLoading: boolean;
  openFolderId: string | null;
  handleEdit: (test: Test) => void;
  openMoveDialog: (test: Test) => void;
  setDeleteTarget: (id: string) => void;
  navigate: (path: string) => void;
  onUpdate: () => void;
}

export function TestTable({
  tests,
  fetchLoading,
  openFolderId,
  handleEdit,
  openMoveDialog,
  setDeleteTarget,
  navigate,
  onUpdate,
}: TestTableProps) {
  const filteredTests = tests.filter((t) => {
    if (openFolderId) {
      return t.folder_id === openFolderId;
    }
    // At root level, show tests with no folder OR any test that is currently LIVE
    return t.folder_id === null || t.active === true || t.status === "published";
  });

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
      <Table>
        <TableHeader>
          <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Assessment Name</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Duration</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Status</TableHead>
            <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Access Code</TableHead>
            <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Operations</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {fetchLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <TableRow key={i}>
                <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell><Skeleton className="h-8 w-32" /></TableCell>
              </TableRow>
            ))
          ) : filteredTests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="py-20 text-center">
                <div className="flex flex-col items-center gap-4 text-slate-400">
                  <ClipboardList className="h-12 w-12 opacity-20" />
                  <div>
                    <p className="text-xs font-black uppercase tracking-widest">No Assessment Records</p>
                    <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Create your first examination to begin assessment cycles.</p>
                  </div>
                </div>
              </TableCell>
            </TableRow>
          ) : (
            filteredTests.map((test) => (
              <TableRow key={test.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                <TableCell className="max-w-md truncate text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight py-4">
                  {test.test_name}
                </TableCell>
                <TableCell className="text-xs font-black text-slate-500 py-4 uppercase">{test.timer} MIN</TableCell>
                <TableCell className="py-4">
                  <span
                    className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                      test.active
                        ? "bg-green-50 text-green-600 border-green-100"
                        : "bg-slate-50 text-slate-400 border-slate-100"
                    }`}
                  >
                    {test.active ? "LIVE" : "DRAFT"}
                  </span>
                </TableCell>
                <TableCell className="py-4">
                  {test.share_code ? (
                    <Sharing 
                      test={{
                        id: test.id,
                        test_name: test.test_name,
                        share_code: test.share_code,
                        public_link_enabled: (test as any).public_link_enabled ?? true
                      }} 
                      onUpdate={onUpdate} 
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-slate-300">UNPUBLISHED</span>
                  )}
                </TableCell>
                <TableCell className="py-4 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/client-admin/tests/builder/${test.id}`)}
                      className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all p-0"
                      title="Test Blueprint"
                    >
                      <FileText className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/client-admin/tests/${test.id}/results`)}
                      className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-green-600 hover:border-green-200 transition-all p-0"
                      title="Performance Analytics"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(test)}
                      className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all p-0"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openMoveDialog(test)}
                      className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all p-0"
                    >
                      <MoveRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(test.id)}
                      className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:border-red-200 transition-all p-0"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
