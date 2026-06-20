import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Pencil, MoveRight, Trash2, FileQuestion, Trash, FolderInput } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

interface Question {
  id: string;
  question_text: string;
  correct_answer: string;
  difficulty: string;
  marks: number;
  folder_id: string | null;
}

interface QuestionTableProps {
  questions: Question[];
  fetchLoading: boolean;
  openFolderId: string | null;
  handleEdit: (question: Question) => void;
  openMoveDialog: (question: Question) => void;
  setDeleteTarget: (id: string) => void;
  selectedIds: string[];
  setSelectedIds: (ids: string[]) => void;
  onBulkMove: () => void;
  onBulkDelete: () => void;
}

export function QuestionTable({
  questions,
  fetchLoading,
  openFolderId,
  handleEdit,
  openMoveDialog,
  setDeleteTarget,
  selectedIds,
  setSelectedIds,
  onBulkMove,
  onBulkDelete,
}: QuestionTableProps) {
  const [searchQuery, setSearchQuery] = React.useState("");
  const [difficultyFilter, setDifficultyFilter] = React.useState("all");

  const folderQuestions = questions.filter(
    (q) => q.folder_id === (openFolderId === "uncategorized" ? null : openFolderId)
  );

  const filteredQuestions = folderQuestions.filter((q) => {
    const matchesSearch = q.question_text.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDifficulty = difficultyFilter === "all" || q.difficulty?.toLowerCase() === difficultyFilter.toLowerCase();
    return matchesSearch && matchesDifficulty;
  });

  const toggleAll = () => {
    if (selectedIds.length === filteredQuestions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredQuestions.map((q) => q.id));
    }
  };

  const toggleOne = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search questions by text..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500 placeholder-slate-400"
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 text-xs font-bold text-slate-700 dark:text-slate-200 rounded-none focus:outline-none focus:border-blue-500"
          >
            <option value="all">All Difficulties</option>
            <option value="easy">Easy</option>
            <option value="medium">Medium</option>
            <option value="hard">Hard</option>
          </select>
        </div>
      </div>
      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-none shadow-lg animate-in slide-in-from-top-2">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">{selectedIds.length} Items Selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBulkMove}
              className="h-8 px-4 rounded-none border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest"
            >
              <FolderInput className="h-3.5 w-3.5 mr-2" /> Move
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onBulkDelete}
              className="h-8 px-4 rounded-none border border-red-900 text-red-400 hover:text-white hover:bg-red-900 text-[10px] font-black uppercase tracking-widest"
            >
              <Trash className="h-3.5 w-3.5 mr-2" /> Delete
            </Button>
          </div>
        </div>
      )}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none overflow-hidden shadow-xl">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50 dark:bg-slate-950/50 border-b-2 border-slate-200 dark:border-slate-800">
              <TableHead className="w-[50px] py-4 px-4">
                <Checkbox 
                  checked={selectedIds.length === filteredQuestions.length && filteredQuestions.length > 0}
                  onCheckedChange={toggleAll}
                  className="border-slate-400"
                />
              </TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Question Content</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Key</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Complexity</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Weightage</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {fetchLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell />
                  <TableCell><Skeleton className="h-4 w-64" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-6 w-16 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16" /></TableCell>
                </TableRow>
              ))
            ) : filteredQuestions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-400">
                    <FileQuestion className="h-12 w-12 opacity-20" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">No Questions Found</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Get started by adding questions manually or via CSV.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredQuestions.map((question) => (
                <TableRow 
                  key={question.id} 
                  className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800 ${selectedIds.includes(question.id) ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''}`}
                >
                  <TableCell className="py-4 px-4">
                    <Checkbox 
                      checked={selectedIds.includes(question.id)}
                      onCheckedChange={() => toggleOne(question.id)}
                      className="border-slate-300"
                    />
                  </TableCell>
                  <TableCell className="max-w-md truncate text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-tight py-4">
                    {question.question_text}
                  </TableCell>
                  <TableCell className="text-xs font-black text-blue-600 py-4">{question.correct_answer}</TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                        question.difficulty === "easy"
                          ? "bg-green-50 text-green-600 border-green-100"
                          : question.difficulty === "hard"
                            ? "bg-red-50 text-red-600 border-red-100"
                            : "bg-amber-50 text-amber-600 border-amber-100"
                      }`}
                    >
                      {question.difficulty || "medium"}
                    </span>
                  </TableCell>
                  <TableCell className="text-xs font-black text-slate-900 dark:text-white tabular-nums py-4">{question.marks || 1} PT</TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(question)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all p-0"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openMoveDialog(question)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-amber-600 hover:border-amber-200 transition-all p-0"
                      >
                        <MoveRight className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(question.id)}
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
    </div>
  );
}
