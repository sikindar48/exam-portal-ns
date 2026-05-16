import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Folder, FolderOpen, ArrowLeft, FileQuestion, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";

interface Question {
  id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_answer: string;
  marks: number;
  difficulty: string;
  folder_id: string | null;
}

interface Folder {
  id: string;
  name: string;
  parent_id: string | null;
}

interface Props {
  onSelect: (questions: Question[]) => void;
  onCancel: () => void;
  existingIds: string[];
}

export function QuestionRepositoryPicker({ onSelect, onCancel, existingIds }: Props) {
  const { clientId } = useAuth();
  const [folders, setFolders] = useState<Folder[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [foldersRes, questionsRes] = await Promise.all([
      supabase.from("question_folders").select("*").eq("client_id", clientId),
      supabase.from("questions").select("*").eq("client_id", clientId),
    ]);
    
    if (foldersRes.data) setFolders(foldersRes.data);
    if (questionsRes.data) setQuestions(questionsRes.data as unknown as Question[]);
    setLoading(false);
  };

  const filteredFolders = folders.filter(f => f.parent_id === currentFolderId && f.name.toLowerCase().includes(search.toLowerCase()));
  const filteredQuestions = questions.filter(q => q.folder_id === currentFolderId && q.question_text.toLowerCase().includes(search.toLowerCase()));

  const toggleSelection = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(i => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const handleConfirm = () => {
    const selectedQuestions = questions.filter(q => selectedIds.includes(q.id));
    onSelect(selectedQuestions);
  };

  const breadcrumbs = [];
  let tempId = currentFolderId;
  while (tempId) {
    const f = folders.find(folder => folder.id === tempId);
    if (f) {
      breadcrumbs.unshift(f);
      tempId = f.parent_id;
    } else {
      tempId = null;
    }
  }

  return (
    <div className="flex flex-col h-[600px]">
      <div className="p-4 border-b space-y-4">
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <button onClick={() => setCurrentFolderId(null)} className="hover:text-blue-600 transition-colors">Root</button>
          {breadcrumbs.map((b, i) => (
            <React.Fragment key={b.id}>
              <span>/</span>
              <button onClick={() => setCurrentFolderId(b.id)} className="hover:text-blue-600 transition-colors">{b.name}</button>
            </React.Fragment>
          ))}
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Search questions or folders..." 
            className="pl-10 h-10 rounded-none border-slate-200"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Repository...</div>
        ) : (
          <div className="space-y-6">
            {filteredFolders.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {filteredFolders.map(folder => (
                  <div 
                    key={folder.id}
                    onClick={() => setCurrentFolderId(folder.id)}
                    className="flex items-center gap-3 p-3 border border-slate-100 hover:border-blue-500 cursor-pointer transition-all bg-slate-50/50"
                  >
                    <Folder className="h-4 w-4 text-blue-600" />
                    <span className="text-[10px] font-black uppercase tracking-tight truncate">{folder.name}</span>
                  </div>
                ))}
              </div>
            )}

            <div className="space-y-2">
              {filteredQuestions.map(question => {
                const isAlreadyInTest = existingIds.includes(question.id);
                return (
                  <div 
                    key={question.id}
                    className={`flex items-start gap-4 p-4 border transition-all ${selectedIds.includes(question.id) ? 'border-blue-600 bg-blue-50/30' : 'border-slate-100 hover:border-slate-300'} ${isAlreadyInTest ? 'opacity-50 grayscale pointer-events-none' : 'cursor-pointer'}`}
                    onClick={() => !isAlreadyInTest && toggleSelection(question.id)}
                  >
                    <Checkbox checked={selectedIds.includes(question.id) || isAlreadyInTest} className="mt-1" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 leading-relaxed uppercase tracking-tight">{question.question_text}</p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[9px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-1.5 py-0.5 border border-blue-100">KEY: {question.correct_answer}</span>
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{question.marks} POINTS</span>
                        {isAlreadyInTest && <span className="text-[9px] font-black text-amber-600 uppercase tracking-widest ml-auto">Already in Test</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredFolders.length === 0 && filteredQuestions.length === 0 && (
                <div className="py-20 text-center text-slate-400">
                  <FileQuestion className="h-12 w-12 mx-auto opacity-20 mb-4" />
                  <p className="text-[10px] font-black uppercase tracking-widest">No items found in this category</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="p-4 border-t flex justify-between items-center bg-slate-50">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">{selectedIds.length} Items Ready for Import</span>
        <div className="flex gap-2">
          <Button variant="ghost" onClick={onCancel} className="h-10 rounded-none font-bold uppercase text-[10px] tracking-widest">Cancel</Button>
          <Button 
            disabled={selectedIds.length === 0}
            onClick={handleConfirm}
            className="h-10 rounded-none bg-slate-900 dark:bg-blue-600 text-white font-black uppercase text-[10px] tracking-widest px-8"
          >
            Import Selected
          </Button>
        </div>
      </div>
    </div>
  );
}
