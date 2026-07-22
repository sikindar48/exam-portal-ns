import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Trash2, CopyPlus, BookOpen, ImagePlus, Upload, Link as LinkIcon, Edit3, Image as ImageIcon } from "lucide-react";
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
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"file" | "url">("file");
  const [tempUrl, setTempUrl] = useState("");

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
              title="Clone Question"
              onClick={() => onDuplicate(question.id)}
              className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
            >
              <CopyPlus className="h-4 w-4" />
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
          <div className="flex flex-wrap items-center gap-4">
            <div className="w-full sm:w-48 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Type</Label>
              <Select
                value={question.question_type || "mcq"}
                onValueChange={handleTypeChange}
              >
                <SelectTrigger className="rounded-none border-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mcq">Multiple Choice (MCQ)</SelectItem>
                  <SelectItem value="true_false">True / False</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full sm:w-20 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Marks</Label>
              <Input
                type="number"
                value={question.marks}
                onChange={(e) => onUpdate(question.id, "marks", parseInt(e.target.value))}
                className="rounded-none border-slate-200 text-center font-bold h-9 text-xs"
              />
            </div>

            <div className="w-full sm:w-56 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Section</Label>
              <Select
                value={question.section_id || "general"}
                onValueChange={(value) => onUpdate(question.id, "section_id", value === "general" ? null : value)}
              >
                <SelectTrigger className="rounded-none border-slate-200 h-9 text-xs">
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

            <div className="w-full sm:w-36 space-y-1.5">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Difficulty</Label>
              <Select
                value={question.difficulty || "medium"}
                onValueChange={(value) => onUpdate(question.id, "difficulty", value)}
              >
                <SelectTrigger className="rounded-none border-slate-200 h-9 text-xs">
                  <SelectValue placeholder="Medium" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="easy">Easy</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="hard">Hard</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Question Content & Image Box side-by-side */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-start">
            <div className="lg:col-span-3 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Content</Label>
              <Textarea
                value={question.question_text}
                onChange={(e) => onUpdate(question.id, "question_text", e.target.value)}
                placeholder="Enter your question here..."
                className="min-h-[100px] rounded-none border-slate-200 focus-visible:ring-slate-900 text-xs"
              />
            </div>

            <div className="lg:col-span-1 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Question Image</Label>
              {question.image_url ? (
                <div className="relative group border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 p-2 text-center rounded-none">
                  <img
                    src={question.image_url}
                    alt="Question Diagram Preview"
                    className="max-h-20 max-w-full mx-auto object-contain mb-1.5"
                  />
                  <div className="flex gap-1 justify-center">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setTempUrl(question.image_url || "");
                        setImageDialogOpen(true);
                      }}
                      className="h-6 text-[9px] font-bold uppercase rounded-none px-2 border-slate-300"
                    >
                      <Edit3 className="h-3 w-3 mr-1 text-blue-600" /> Edit
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="destructive"
                      onClick={() => onUpdate(question.id, "image_url", "")}
                      className="h-6 text-[9px] font-bold uppercase rounded-none px-2"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setTempUrl("");
                    setImageDialogOpen(true);
                  }}
                  className="w-full h-[100px] border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-blue-50/50 dark:hover:bg-blue-950/30 flex flex-col items-center justify-center gap-1.5 rounded-none text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all group select-none"
                >
                  <ImagePlus className="h-5 w-5 text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors" />
                  <span className="text-[10px] font-black uppercase tracking-wider">Add Image</span>
                </button>
              )}
            </div>
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

          <div className="pt-4 border-t grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            <div className="space-y-2">
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

            <div className="md:col-span-2 space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Explanation (Optional)</Label>
              <Textarea
                value={question.explanation || ""}
                onChange={(e) => onUpdate(question.id, "explanation", e.target.value)}
                placeholder="Enter explanation or solution details for candidates after submission..."
                className="min-h-[42px] rounded-none border-slate-200 focus-visible:ring-slate-900 text-xs"
              />
            </div>
          </div>
        </div>
      </CardContent>

      {/* Attach Image Dialog */}
      <Dialog open={imageDialogOpen} onOpenChange={setImageDialogOpen}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-6">
          <DialogHeader className="pb-3 border-b mb-4">
            <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-blue-600" /> Attach Question Image
            </DialogTitle>
          </DialogHeader>

          {/* Selector Tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded mb-4">
            <button
              type="button"
              onClick={() => setUploadMode("file")}
              className={`py-1.5 text-xs font-black uppercase tracking-wider rounded transition-all ${
                uploadMode === "file"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              From Device
            </button>
            <button
              type="button"
              onClick={() => setUploadMode("url")}
              className={`py-1.5 text-xs font-black uppercase tracking-wider rounded transition-all ${
                uploadMode === "url"
                  ? "bg-white dark:bg-slate-900 text-blue-600 shadow-sm"
                  : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
              }`}
            >
              Image URL
            </button>
          </div>

          {uploadMode === "file" ? (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 text-center bg-slate-50/50 dark:bg-slate-950">
                <Upload className="h-8 w-8 mx-auto text-slate-400 mb-2" />
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose Image File</p>
                <p className="text-[10px] text-slate-400 mt-1 mb-3">PNG, JPG, WEBP formats supported</p>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = (evt) => {
                        const result = evt.target?.result as string;
                        if (result) {
                          onUpdate(question.id, "image_url", result);
                          setImageDialogOpen(false);
                        }
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-none file:border-0 file:text-[10px] file:font-black file:uppercase file:bg-slate-900 file:text-white hover:file:bg-black cursor-pointer"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Image Web Address</Label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <Input
                    value={tempUrl}
                    onChange={(e) => setTempUrl(e.target.value)}
                    placeholder="https://example.com/diagram.png"
                    className="pl-9 rounded-none border-slate-200 text-xs"
                  />
                </div>
              </div>
              <Button
                type="button"
                onClick={() => {
                  onUpdate(question.id, "image_url", tempUrl);
                  setImageDialogOpen(false);
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs rounded-none h-10"
              >
                Apply Image URL
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
