import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface QuestionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingQuestion: any;
  formData: any;
  setFormData: (data: any) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function QuestionDialog({
  isOpen,
  onOpenChange,
  editingQuestion,
  formData,
  setFormData,
  loading,
  handleSubmit,
}: QuestionDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border-t-4 border-t-blue-600 dark:border-t-blue-500 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {editingQuestion ? "Edit Question" : "Add New Question"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Type</Label>
              <Select
                value={formData.question_type || "mcq"}
                onValueChange={(val) => {
                  const update: any = { question_type: val };
                  if (val === "true_false") {
                    update.option_a = "True";
                    update.option_b = "False";
                    update.option_c = "";
                    update.option_d = "";
                    if (formData.correct_answer === "C" || formData.correct_answer === "D") {
                      update.correct_answer = "A";
                    }
                  }
                  setFormData({ ...formData, ...update });
                }}
              >
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="mcq" className="font-bold">MCQ</SelectItem>
                  <SelectItem value="true_false" className="font-bold">TRUE / FALSE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="question_text" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Content</Label>
            <Textarea
              id="question_text"
              value={formData.question_text}
              onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
              className="min-h-[100px] rounded-none border-slate-200 dark:border-slate-800 font-medium text-sm focus:border-blue-500 transition-all"
              placeholder="Enter the comprehensive question text here..."
              required
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(["a", "b", "c", "d"] as const).map((opt) => {
              if (formData.question_type === "true_false" && (opt === "c" || opt === "d")) {
                return null;
              }
              return (
                <div key={opt} className="space-y-2 group">
                  <Label htmlFor={`option_${opt}`} className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option {opt.toUpperCase()}</Label>
                  <Input
                    id={`option_${opt}`}
                    value={formData[`option_${opt}`]}
                    onChange={(e) => setFormData({ ...formData, [`option_${opt}`]: e.target.value })}
                    disabled={formData.question_type === "true_false"}
                    className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold group-hover:border-blue-400 transition-all"
                    required
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correct Key</Label>
              <Select
                value={formData.correct_answer}
                onValueChange={(val) => setFormData({ ...formData, correct_answer: val })}
              >
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="A" className="font-black">A {formData.question_type === "true_false" && "(True)"}</SelectItem>
                  <SelectItem value="B" className="font-black">B {formData.question_type === "true_false" && "(False)"}</SelectItem>
                  {formData.question_type !== "true_false" && (
                    <>
                      <SelectItem value="C" className="font-black">C</SelectItem>
                      <SelectItem value="D" className="font-black">D</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complexity</Label>
              <Select
                value={formData.difficulty}
                onValueChange={(val) => setFormData({ ...formData, difficulty: val })}
              >
                <SelectTrigger className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-black">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-none">
                  <SelectItem value="easy" className="font-bold text-green-600">EASY</SelectItem>
                  <SelectItem value="medium" className="font-bold text-amber-600">MEDIUM</SelectItem>
                  <SelectItem value="hard" className="font-bold text-red-600">HARD</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="marks" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Weightage (Marks)</Label>
              <Input
                id="marks"
                type="number"
                min="1"
                value={formData.marks}
                onChange={(e) => setFormData({ ...formData, marks: parseInt(e.target.value) })}
                className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="explanation" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explanation (Optional)</Label>
            <Textarea
              id="explanation"
              value={formData.explanation || ""}
              onChange={(e) => setFormData({ ...formData, explanation: e.target.value })}
              className="min-h-[70px] rounded-none border-slate-200 dark:border-slate-800 font-medium text-xs focus:border-blue-500 transition-all"
              placeholder="Enter optional solution explanation..."
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px]"
            >
              {loading ? "Processing..." : editingQuestion ? "Update Question" : "Add Question"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
