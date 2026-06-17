import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Calendar, Infinity as InfinityIcon } from "lucide-react";

interface TestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingTest: any;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function TestDialog({
  isOpen,
  onOpenChange,
  editingTest,
  formData,
  setFormData,
  loading,
  handleSubmit,
}: TestDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border-t-4 border-t-blue-600 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {editingTest ? "Edit Test" : "Create New Test"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="space-y-2">
            <Label htmlFor="test_name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Test Name</Label>
            <Input
              id="test_name"
              value={formData.test_name}
              onChange={(e) => setFormData({ ...formData, test_name: e.target.value })}
              className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold focus:border-blue-500 transition-all"
              placeholder="e.g. CORE JAVA FINAL ASSESSMENT"
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="timer" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Duration (Minutes)</Label>
              <Input
                id="timer"
                type="number"
                value={formData.timer}
                onChange={(e) => setFormData({ ...formData, timer: parseInt(e.target.value) })}
                className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black"
                required
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Publication Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="draft" className="font-bold">DRAFT MODE</SelectItem>
                  <SelectItem value="published" className="font-bold text-blue-600">PUBLISHED / LIVE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-y border-slate-100 dark:border-slate-800 py-6">
            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2">Test Settings</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="shuffle" className="text-xs font-bold uppercase tracking-tight">Shuffle Questions</Label>
                <Switch id="shuffle" checked={formData.shuffle} onCheckedChange={(checked) => setFormData({ ...formData, shuffle: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="allow_review" className="text-xs font-bold uppercase tracking-tight">Enable Post-Review</Label>
                <Switch id="allow_review" checked={formData.allow_review} onCheckedChange={(checked) => setFormData({ ...formData, allow_review: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="restrict_navigation" className="text-xs font-bold uppercase tracking-tight">Restrict Navigation</Label>
                <Switch id="restrict_navigation" checked={formData.restrict_navigation} onCheckedChange={(checked) => setFormData({ ...formData, restrict_navigation: checked })} />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="public_link_enabled" className="text-xs font-bold uppercase tracking-tight">Public Access Link</Label>
                <Switch id="public_link_enabled" checked={formData.public_link_enabled} onCheckedChange={(checked) => setFormData({ ...formData, public_link_enabled: checked })} />
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-2">Grading Logic</h3>
              <div className="flex items-center justify-between">
                <Label htmlFor="negative_marking" className="text-xs font-bold uppercase tracking-tight">Negative Marking</Label>
                <Switch id="negative_marking" checked={formData.negative_marking} onCheckedChange={(checked) => setFormData({ ...formData, negative_marking: checked })} />
              </div>
              {formData.negative_marking && (
                <div className="space-y-2 pt-2 animate-in slide-in-from-top-2 duration-200">
                  <Label htmlFor="negative_marks" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Deduction Per Error</Label>
                  <Input
                    id="negative_marks"
                    type="number"
                    step="0.01"
                    value={formData.negative_marks}
                    onChange={(e) => setFormData({ ...formData, negative_marks: parseFloat(e.target.value) })}
                    className="h-9 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                  />
                </div>
              )}
              <div className="space-y-2 pt-2">
                <Label htmlFor="attempts" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total Attempts Allowed</Label>
                <div className="relative">
                  <Input
                    id="attempts"
                    type="number"
                    value={formData.attempts_allowed}
                    onChange={(e) => setFormData({ ...formData, attempts_allowed: parseInt(e.target.value) })}
                    className="h-9 rounded-none border-slate-200 dark:border-slate-800 font-bold pr-8"
                  />
                  {formData.attempts_allowed === 0 && <InfinityIcon className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-900/50 p-4 border border-slate-100 dark:border-slate-800">
            <div className="space-y-2">
              <Label htmlFor="start" className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Activation Window</Label>
              <Input id="start" type="datetime-local" value={formData.scheduled_start} onChange={(e) => setFormData({ ...formData, scheduled_start: e.target.value })} className="h-9 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end" className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1"><Calendar className="h-3 w-3" /> Termination Window</Label>
              <Input id="end" type="datetime-local" value={formData.scheduled_end} onChange={(e) => setFormData({ ...formData, scheduled_end: e.target.value })} className="h-9 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs" />
            </div>
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-none bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg shadow-blue-900/20"
            >
              {loading ? "SAVING..." : editingTest ? "UPDATE TEST" : "CREATE TEST"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
