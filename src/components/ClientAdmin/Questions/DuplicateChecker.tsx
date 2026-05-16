import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Copy, Trash2, AlertTriangle, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

interface DuplicateGroup {
  text: string;
  ids: string[];
}

export function DuplicateChecker({ onComplete }: { onComplete: () => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateGroup[]>([]);
  const { clientId } = useAuth();
  const { toast } = useToast();

  const scanDuplicates = async () => {
    setScanning(true);
    const { data, error } = await supabase
      .from("questions")
      .select("id, question_text")
      .eq("client_id", clientId);

    if (error) {
      toast({ title: "Error", description: "Failed to scan repository", variant: "destructive" });
    } else if (data) {
      const groups: Record<string, string[]> = {};
      data.forEach((q) => {
        const text = q.question_text.trim();
        if (!groups[text]) groups[text] = [];
        groups[text].push(q.id);
      });

      const duplicateGroups = Object.entries(groups)
        .filter(([_, ids]) => ids.length > 1)
        .map(([text, ids]) => ({ text, ids }));

      setDuplicates(duplicateGroups);
    }
    setScanning(false);
  };

  const deleteDuplicates = async () => {
    setDeleting(true);
    let totalDeleted = 0;

    for (const group of duplicates) {
      // Keep the first one, delete the rest
      const idsToDelete = group.ids.slice(1);
      const { error } = await supabase
        .from("questions")
        .delete()
        .in("id", idsToDelete);

      if (!error) totalDeleted += idsToDelete.length;
    }

    toast({
      title: "Cleanup Complete",
      description: `Removed ${totalDeleted} duplicate items from your repository.`,
    });

    setDuplicates([]);
    setDeleting(false);
    onComplete();
    setIsOpen(false);
  };

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setIsOpen(true);
          scanDuplicates();
        }}
        className="h-9 px-4 rounded-none border border-slate-700 text-slate-400 hover:text-amber-500 hover:border-amber-500 text-[10px] font-black uppercase tracking-widest"
      >
        <Copy className="mr-2 h-3.5 w-3.5" /> Scan Duplicates
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl rounded-none border-t-4 border-t-amber-500 max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Repository Integrity Scan
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6 pt-4">
            {scanning ? (
              <div className="py-20 text-center space-y-4">
                <div className="animate-spin h-8 w-8 border-4 border-amber-500 border-t-transparent rounded-full mx-auto" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Analyzing knowledge units for redundancy...</p>
              </div>
            ) : duplicates.length === 0 ? (
              <div className="py-20 text-center space-y-4">
                <CheckCircle2 className="h-12 w-12 text-green-500 opacity-20 mx-auto" />
                <div>
                  <p className="text-xs font-black uppercase tracking-widest">Repository is Clean</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">No redundant knowledge units detected.</p>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900 p-4 rounded-none">
                  <p className="text-xs font-bold text-amber-800 dark:text-amber-400">
                    Detected {duplicates.length} groups of redundant questions. 
                    A total of {duplicates.reduce((acc, g) => acc + g.ids.length - 1, 0)} items can be safely removed.
                  </p>
                </div>

                <div className="space-y-3">
                  {duplicates.slice(0, 5).map((group, i) => (
                    <div key={i} className="p-3 border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                      <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 line-clamp-2 uppercase leading-relaxed">{group.text}</p>
                      <p className="text-[9px] font-black text-amber-600 mt-2 uppercase tracking-widest">{group.ids.length} OCCURRENCES FOUND</p>
                    </div>
                  ))}
                  {duplicates.length > 5 && (
                    <p className="text-[9px] font-black text-slate-400 text-center uppercase tracking-widest pt-2">...and {duplicates.length - 5} more redundant groups</p>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1 h-11 rounded-none font-bold uppercase text-[10px] tracking-widest"
                    onClick={() => setIsOpen(false)}
                  >
                    Abort Scan
                  </Button>
                  <Button
                    disabled={deleting}
                    className="flex-1 h-11 rounded-none bg-red-600 hover:bg-red-700 text-white font-black uppercase text-[10px] tracking-widest"
                    onClick={deleteDuplicates}
                  >
                    {deleting ? "PURGING DATA..." : "EXECUTE REPOSITORY CLEANUP"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
