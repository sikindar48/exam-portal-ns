import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Copy, BookOpen } from "lucide-react";
import { Question, TestSection } from "@/types/test";

interface QuestionCardProps {
  question: Question;
  index: number;
  sections?: TestSection[];
  onUpdate: (id: string, field: keyof Question, value: any) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
}

export function QuestionCard({ question, index, sections, onUpdate, onDelete, onDuplicate }: QuestionCardProps) {
  const handleTypeChange = (type: string) => {
    onUpdate(question.id, "question_type", type);
    if (type === "true_false") {
      onUpdate(question.id, "option_a", "True");
      onUpdate(question.id, "option_b", "False");
      onUpdate(question.id, "option_c", "");
      onUpdate(question.id, "option_d", "");
      if (question.correct_answer === "C" || question.correct_answer === "D") {
        onUpdate(question.id, "correct_answer", "A");
      }
    }
  };

  return (
    <Card className="border bg-white dark:bg-slate-900 rounded-none overflow-hidden">
      <div className="h-1 bg-slate-900 dark:bg-slate-700" />
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center bg-slate-900 text-white text-sm font-black">
              {index + 1}
            </span>
            <h3 className="font-bold text-slate-900 dark:text-white uppercase tracking-tight">Question {index + 1}</h3>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDuplicate(question.id)}
              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(question.id)}
              className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Type</Label>
              <Select
                value={question.question_type || "mcq"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="rounded-none border-slate-200">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Content</Label>
            <Textarea
              value={question.question_text}
              onChange={(e) => onUpdate(question.id, "question_text", e.target.value)}
              placeholder="Enter your question here..."
              className="min-h-[100px] rounded-none border-slate-200 focus-visible:ring-slate-900"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["a", "b", "c", "d"].map((opt) => {
              if (question.question_type === "true_false" && (opt === "c" || opt === "d")) {
                return null;
              }
              return (
                <div key={opt} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Option {opt.toUpperCase()}</Label>
                    {question.correct_answer === opt.toUpperCase() && (
                      <span className="text-[9px] font-black uppercase text-green-600 bg-green-50 px-2 py-0.5 border border-green-100">Correct Answer</span>
                    )}
                  </div>
                  <Input
                    value={(question as any)[`option_${opt}`]}
                    onChange={(e) => onUpdate(question.id, `option_${opt}` as keyof Question, e.target.value)}
                    placeholder={`Enter option ${opt.toUpperCase()}...`}
                    disabled={question.question_type === "true_false"}
                    className={`rounded-none border-slate-200 focus-visible:ring-slate-900 ${
                      question.correct_answer === opt.toUpperCase() ? "border-green-200 bg-green-50/20" : ""
                    }`}
                  />
                </div>
              );
            })}
          </div>

          <div className="flex flex-col md:flex-row gap-6 pt-4 border-t">
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Correct Answer</Label>
              <Select
                value={question.correct_answer}
                onValueChange={(value) => onUpdate(question.id, "correct_answer", value)}
              >
                <SelectTrigger className="rounded-none border-slate-200">
                  <SelectValue placeholder="Select correct option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">Option A (True)</SelectItem>
                  <SelectItem value="B">Option B (False)</SelectItem>
                  {question.question_type !== "true_false" && (
                    <>
                      <SelectItem value="C">Option C</SelectItem>
                      <SelectItem value="D">Option D</SelectItem>
                    </>
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marks Assigned</Label>
              <Input
                type="number"
                value={question.marks}
                onChange={(e) => onUpdate(question.id, "marks", parseInt(e.target.value))}
                className="rounded-none border-slate-200"
              />
            </div>
            <div className="flex-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Section</Label>
              <Select
                value={question.section_id || "general"}
                onValueChange={(value) => onUpdate(question.id, "section_id", value === "general" ? null : value)}
              >
                <SelectTrigger className="rounded-none border-slate-200">
                  <SelectValue placeholder="General Section" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General Section (No Section)</SelectItem>
                  {sections?.map((sec) => (
                    <SelectItem key={sec.id} value={sec.id}>
                      {sec.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
