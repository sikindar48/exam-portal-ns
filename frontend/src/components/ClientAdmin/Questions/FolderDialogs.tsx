import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface FolderDialogsProps {
  isCreateFolderOpen: boolean;
  setIsCreateFolderOpen: (open: boolean) => void;
  newFolderName: string;
  setNewFolderName: (name: string) => void;
  handleCreateFolder: (e: React.FormEvent) => void;
  loading: boolean;
  
  isMoveQuestionOpen: boolean;
  setIsMoveQuestionOpen: (open: boolean) => void;
  selectedMoveFolder: string;
  setSelectedMoveFolder: (id: string) => void;
  folders: any[];
  handleMoveQuestion: () => void;
  
  deleteTarget: string | null;
  setDeleteTarget: (id: string | null) => void;
  handleDelete: (id: string) => void;
  
  deleteFolderTarget: string | null;
  setDeleteFolderTarget: (id: string | null) => void;
  handleDeleteFolder: (id: string) => void;

  isBulkMoveOpen?: boolean;
  setIsBulkMoveOpen?: (open: boolean) => void;
  handleBulkMove?: () => void;
}

export function FolderDialogs({
  isCreateFolderOpen,
  setIsCreateFolderOpen,
  newFolderName,
  setNewFolderName,
  handleCreateFolder,
  loading,
  isMoveQuestionOpen,
  setIsMoveQuestionOpen,
  selectedMoveFolder,
  setSelectedMoveFolder,
  folders,
  handleMoveQuestion,
  deleteTarget,
  setDeleteTarget,
  handleDelete,
  deleteFolderTarget,
  setDeleteFolderTarget,
  handleDeleteFolder,
  isBulkMoveOpen,
  setIsBulkMoveOpen,
  handleBulkMove,
}: FolderDialogsProps) {
  return (
    <>
      <Dialog open={isCreateFolderOpen} onOpenChange={setIsCreateFolderOpen}>
        <DialogContent className="max-w-sm rounded-none border-t-4 border-t-slate-900 dark:border-t-blue-600">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Create Folder</DialogTitle></DialogHeader>
          <form onSubmit={handleCreateFolder} className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Folder Name</Label>
              <Input placeholder="e.g. SEMESTER-1, PYTHON-CORE" value={newFolderName} onChange={(e) => setNewFolderName(e.target.value)} className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold" required />
            </div>
             <Button type="submit" disabled={loading} className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 text-white font-black uppercase tracking-widest text-[11px]">{loading ? "Creating..." : "Create Folder"}</Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isMoveQuestionOpen} onOpenChange={setIsMoveQuestionOpen}>
        <DialogContent className="max-w-sm rounded-none border-t-4 border-t-blue-600">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Move Question</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Destination Folder</Label>
              <Select value={selectedMoveFolder} onValueChange={setSelectedMoveFolder}>
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black"><SelectValue placeholder="Choose a folder..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                   <SelectItem value="none">NO FOLDER (GENERAL)</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id} className="uppercase font-bold">{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-none font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsMoveQuestionOpen(false)}>Cancel</Button>
              <Button className="flex-1 h-11 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleMoveQuestion}>Confirm Relocation</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Delete Question ?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              You are about to permanently delete this question. This action is irreversible and may affect existing examination papers.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest"
              onClick={() => deleteTarget && handleDelete(deleteTarget)}
            >
              Confirm Deletion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!deleteFolderTarget} onOpenChange={(open) => !open && setDeleteFolderTarget(null)}>
        <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Delete Folder?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              Deleting this folder will not delete the questions inside; they will be moved to the general folder.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest" 
              onClick={() => deleteFolderTarget && handleDeleteFolder(deleteFolderTarget)}
            >
              Confirm Dissolution
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog open={isBulkMoveOpen} onOpenChange={setIsBulkMoveOpen}>
        <DialogContent className="max-w-sm rounded-none border-t-4 border-t-slate-900 dark:border-t-blue-600">
          <DialogHeader><DialogTitle className="text-xl font-black uppercase tracking-tight">Bulk Relocation</DialogTitle></DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Move to Folder</Label>
              <Select value={selectedMoveFolder} onValueChange={setSelectedMoveFolder}>
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black"><SelectValue placeholder="Choose destination..." /></SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="none">NO FOLDER (GENERAL)</SelectItem>
                  {folders.map((f) => <SelectItem key={f.id} value={f.id} className="uppercase font-bold">{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1 h-11 rounded-none font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsBulkMoveOpen?.(false)}>Cancel</Button>
              <Button className="flex-1 h-11 rounded-none bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest" onClick={handleBulkMove}>Move All Items</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
