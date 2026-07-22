import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Settings,
  Clock,
  Target,
  ShieldAlert,
  RotateCcw,
  Shuffle,
  MinusCircle,
  Users,
  Plus,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Settings2,
  HelpCircle,
  ShieldCheck,
  FileText
} from "lucide-react";
import { TestData, TestSection } from "@/types/test";

interface SidebarProps {
  testData: TestData;
  setTestData: (data: TestData | ((prev: TestData) => TestData)) => void;
  totalMarks: number;
  deletedSectionIds: string[];
  setDeletedSectionIds: React.Dispatch<React.SetStateAction<string[]>>;
  features?: string[];
}

export function Sidebar({
  testData,
  setTestData,
  totalMarks,
  deletedSectionIds,
  setDeletedSectionIds,
  features = []
}: SidebarProps) {
  const [expandedSectionId, setExpandedSectionId] = useState<string | null>(null);

  const updateField = (field: keyof TestData, value: any) => {
    setTestData((prev) => ({ ...prev, [field]: value }));
  };

  const sections = testData.sections || [];

  const addSection = () => {
    const newSec: TestSection = {
      id: `temp_${Date.now()}`,
      test_id: testData.id || "",
      name: `Section ${sections.length + 1}`,
      position: sections.length,
      duration_minutes: null,
      negative_marks: 0,
      shuffle_questions: false,
      shuffle_options: false,
      navigation_locked: false,
    };
    setTestData((prev) => ({
      ...prev,
      sections: [...(prev.sections || []), newSec],
    }));
    setExpandedSectionId(newSec.id);
  };

  const updateSection = (id: string, field: keyof TestSection, value: any) => {
    setTestData((prev) => ({
      ...prev,
      sections: (prev.sections || []).map((sec) =>
        sec.id === id ? { ...sec, [field]: value } : sec
      ),
    }));
  };

  const deleteSection = (id: string) => {
    setDeletedSectionIds((prev) => [...prev, id]);
    setTestData((prev) => ({
      ...prev,
      sections: (prev.sections || []).filter((sec) => sec.id !== id),
      questions: prev.questions.map((q) =>
        q.section_id === id ? { ...q, section_id: null } : q
      ),
    }));
    if (expandedSectionId === id) {
      setExpandedSectionId(null);
    }
  };

  const moveSection = (index: number, direction: "up" | "down") => {
    const newSections = [...sections];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    const updated = newSections.map((sec, idx) => ({ ...sec, position: idx }));
    setTestData((prev) => ({
      ...prev,
      sections: updated,
    }));
  };

  const [activeTab, setActiveTab] = useState<"basics" | "security" | "sections">("basics");

  return (
    <div className="sticky top-8 space-y-4 max-h-[calc(100vh-4rem)] overflow-y-auto pr-2">
      {/* Navigation Tabs */}
      <div className="flex border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 p-1">
        <button
          onClick={() => setActiveTab("basics")}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-all rounded-none ${
            activeTab === "basics"
              ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Basics
        </button>
        <button
          onClick={() => setActiveTab("security")}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-all rounded-none ${
            activeTab === "security"
              ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Security
        </button>
        <button
          onClick={() => setActiveTab("sections")}
          className={`flex-1 py-2 text-center text-[10px] font-black uppercase tracking-wider transition-all rounded-none ${
            activeTab === "sections"
              ? "bg-white dark:bg-slate-800 text-blue-600 shadow-sm border border-slate-200 dark:border-slate-700"
              : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
          }`}
        >
          Sections
        </button>
      </div>

      {/* 1. BASICS TAB */}
      {activeTab === "basics" && (
        <>
          <Card className="border bg-white dark:bg-slate-900 overflow-hidden flex flex-col rounded-none animate-in fade-in duration-200">
            <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-800/50">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tighter font-black">
                <Settings className="h-4.5 w-4.5 text-blue-600" />
                General Info
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Test Name</Label>
                  <Input
                    value={testData.test_name}
                    onChange={(e) => updateField("test_name", e.target.value)}
                    placeholder="Internal Exam - Phase 1"
                    className="rounded-none border-slate-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Duration (Min)</Label>
                    <div className="relative">
                      <Clock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        type="number"
                        value={testData.timer}
                        onChange={(e) => updateField("timer", parseInt(e.target.value))}
                        className="pl-9 rounded-none border-slate-200"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total Marks</Label>
                    <div className="relative">
                      <Target className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        value={totalMarks}
                        disabled
                        className="pl-9 bg-slate-50 rounded-none border-slate-200 font-bold"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Questions Overview Preview */}
          <Card className="border bg-white dark:bg-slate-900 overflow-hidden flex flex-col rounded-none mt-4 animate-in fade-in duration-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-xs uppercase tracking-wider font-black">
                <FileText className="h-4 w-4 text-blue-600" />
                Preview ({testData.questions.length})
              </CardTitle>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-none">
                {totalMarks} Marks
              </span>
            </CardHeader>
            <CardContent className="p-3">
              {testData.questions.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium border border-dashed border-slate-200">
                  No questions added yet.
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {testData.questions.map((q, idx) => (
                    <div
                      key={q.id || idx}
                      onClick={() => {
                        const el = document.getElementById(`question-card-${q.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: "smooth", block: "center" });
                        }
                      }}
                      className="p-2.5 border border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 bg-slate-50/50 dark:bg-slate-950/50 cursor-pointer transition-all flex items-start justify-between gap-3 group"
                    >
                      <div className="flex items-start gap-2.5 min-w-0">
                        <span className="flex h-5 w-5 shrink-0 items-center justify-center bg-slate-900 text-white text-[10px] font-bold rounded-none group-hover:bg-blue-600 transition-colors">
                          {idx + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate leading-snug">
                            {q.question_text || `Question ${idx + 1}`}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                              {q.question_type === "true_false" ? "True/False" : "MCQ"}
                            </span>
                            {q.difficulty && (
                              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                                • {q.difficulty}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] font-black text-blue-600 shrink-0 bg-blue-50 dark:bg-blue-950/50 px-1.5 py-0.5 border border-blue-100 dark:border-blue-900">
                        +{q.marks}m
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}

      {/* 2. SECURITY & RULES TAB */}
      {activeTab === "security" && (
        <Card className="border bg-white dark:bg-slate-900 overflow-hidden flex flex-col rounded-none animate-in fade-in duration-200">
          <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-800/50">
            <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tighter font-black">
              <ShieldAlert className="h-4.5 w-4.5 text-blue-600" />
              Security Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            <div className="space-y-5">
              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 text-blue-600 rounded">
                    <RotateCcw className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Multiple Attempts</Label>
                    <p className="text-[10px] text-slate-500">Allow retaking the test</p>
                  </div>
                </div>
                <Switch
                  checked={testData.attempts_allowed !== 1}
                  onCheckedChange={(checked) => updateField("attempts_allowed", checked ? null : 1)}
                />
              </div>

              {testData.attempts_allowed !== 1 && (
                <div className="pl-12 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Number of Attempts</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      min="2"
                      placeholder="Unlimited (Leave empty)"
                      value={testData.attempts_allowed === null ? "" : testData.attempts_allowed}
                      onChange={(e) => {
                        const val = e.target.value ? parseInt(e.target.value) : null;
                        updateField("attempts_allowed", val);
                      }}
                      className="h-8 text-sm rounded-none border-slate-200"
                    />
                    <span className="text-[9px] text-slate-400 font-bold uppercase whitespace-nowrap">
                      {testData.attempts_allowed === null ? "Unlimited" : "Limit"}
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded">
                    <Shuffle className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Shuffle Questions</Label>
                    <p className="text-[10px] text-slate-500">Randomize order for each student</p>
                  </div>
                </div>
                <Switch
                  checked={testData.shuffle}
                  onCheckedChange={(checked) => updateField("shuffle", checked)}
                />
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-50 text-red-600 rounded">
                    <ShieldAlert className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Secure Browsing</Label>
                    <p className="text-[10px] text-slate-500">Restrict tab switching</p>
                  </div>
                </div>
                <Switch
                  checked={testData.restrict_navigation}
                  onCheckedChange={(checked) => updateField("restrict_navigation", checked)}
                />
              </div>

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-50 text-purple-600 rounded">
                    <MinusCircle className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Negative Marking</Label>
                    <p className="text-[10px] text-slate-500">Deduct marks for wrong answers</p>
                  </div>
                </div>
                <Switch
                  checked={testData.negative_marking}
                  onCheckedChange={(checked) => updateField("negative_marking", checked)}
                />
              </div>

              {testData.negative_marking && (
                <div className="pl-12 pt-1 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[9px] font-bold uppercase text-slate-500 mb-1 block">Penalty Per Wrong Answer</Label>
                  <Input
                    type="number"
                    step="0.25"
                    value={testData.negative_marks}
                    onChange={(e) => updateField("negative_marks", parseFloat(e.target.value))}
                    className="h-8 text-sm rounded-none border-slate-200"
                  />
                </div>
              )}

              <div className="flex items-center justify-between group">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-green-50 text-green-600 rounded">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <Label className="text-sm font-bold">Allow Guest Access</Label>
                    <p className="text-[10px] text-slate-500">Non-registered users can take this test</p>
                  </div>
                </div>
                <Switch
                  checked={testData.allow_guests ?? false}
                  onCheckedChange={(checked) => updateField("allow_guests", checked)}
                />
              </div>

              {features.includes("camera_proctoring") && (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded">
                      <ShieldCheck className="h-4 w-4" />
                    </div>
                    <div>
                      <Label className="text-sm font-bold text-blue-600 dark:text-blue-400">Camera Proctoring</Label>
                      <p className="text-[10px] text-slate-500">Require webcam feed during test</p>
                    </div>
                  </div>
                  <Switch
                    checked={testData.camera_required ?? false}
                    onCheckedChange={(checked) => updateField("camera_required", checked)}
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* 3. SECTIONS TAB */}
      {activeTab === "sections" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <Card className="border bg-white dark:bg-slate-900 overflow-hidden flex flex-col rounded-none">
            <CardHeader className="pb-3 border-b bg-slate-50/50 dark:bg-slate-800/50 flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base uppercase tracking-tighter font-black">
                <Layers className="h-4.5 w-4.5 text-blue-600" />
                Sections
              </CardTitle>
              <Button
                size="sm"
                onClick={addSection}
                className="h-7 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest text-[9px] rounded-none px-2"
              >
                <Plus className="h-3 w-3 mr-1" /> Add Section
              </Button>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              {sections.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs font-medium border border-dashed border-slate-200 p-4">
                  No sections created yet. Questions default to the General Section.
                </div>
              ) : (
                <div className="space-y-3">
                  {sections.map((sec, idx) => {
                    const secQuestions = testData.questions.filter((q) => q.section_id === sec.id);
                    const secMarks = secQuestions.reduce((tot, q) => tot + q.marks, 0);
                    const isExpanded = expandedSectionId === sec.id;

                    return (
                      <div
                        key={sec.id}
                        className="border border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20"
                      >
                        <div className="flex items-center justify-between p-2.5 border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
                          <div className="min-w-0 flex-1">
                            <span className="text-xs font-black uppercase text-slate-800 dark:text-slate-200 truncate block">
                              {sec.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-bold uppercase">
                              {secQuestions.length} Qs • {secMarks} Marks
                            </span>
                          </div>
                          <div className="flex items-center gap-0.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, "up")}
                              className="h-6 w-6 text-slate-400 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              disabled={idx === sections.length - 1}
                              onClick={() => moveSection(idx, "down")}
                              className="h-6 w-6 text-slate-400 hover:text-slate-900 disabled:opacity-30"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setExpandedSectionId(isExpanded ? null : sec.id)}
                              className={`h-6 w-6 hover:text-blue-600 ${
                                isExpanded ? "text-blue-600 bg-blue-50 dark:bg-blue-900/30" : "text-slate-400"
                              }`}
                            >
                              <Settings2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deleteSection(sec.id)}
                              className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>

                        {isExpanded && (
                          <div className="p-3 space-y-4 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-950 animate-in slide-in-from-top-1 duration-150">
                            {/* Section Name */}
                            <div className="space-y-1">
                              <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Section Name</Label>
                              <Input
                                value={sec.name}
                                onChange={(e) => updateSection(sec.id, "name", e.target.value)}
                                className="h-7 text-xs rounded-none border-slate-200"
                              />
                            </div>

                            {/* Section Timer */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold">Custom Timer</Label>
                                <Switch
                                  checked={sec.duration_minutes !== null}
                                  onCheckedChange={(checked) =>
                                    updateSection(sec.id, "duration_minutes", checked ? 15 : null)
                                  }
                                />
                              </div>
                              {sec.duration_minutes !== null && (
                                <div className="flex items-center gap-2 pt-1">
                                  <Input
                                    type="number"
                                    value={sec.duration_minutes}
                                    onChange={(e) =>
                                      updateSection(sec.id, "duration_minutes", parseInt(e.target.value) || 0)
                                    }
                                    className="h-7 text-xs rounded-none border-slate-200 w-20"
                                  />
                                  <span className="text-[10px] text-slate-400 font-bold uppercase">Minutes</span>
                                </div>
                              )}
                            </div>

                            {/* Negative marking override */}
                            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div className="flex items-center justify-between">
                                <div>
                                  <Label className="text-xs font-bold block">Negative Marks</Label>
                                  <span className="text-[8px] text-slate-400 font-bold uppercase">Penalty per wrong answer</span>
                                </div>
                                <Input
                                  type="number"
                                  step="0.25"
                                  value={sec.negative_marks}
                                  onChange={(e) =>
                                    updateSection(sec.id, "negative_marks", parseFloat(e.target.value) || 0)
                                  }
                                  className="h-7 text-xs rounded-none border-slate-200 w-20"
                                />
                              </div>
                            </div>

                            {/* Shuffling questions */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <Label className="text-xs font-bold">Shuffle Questions</Label>
                              <Switch
                                  checked={sec.shuffle_questions}
                                  onCheckedChange={(checked) => updateSection(sec.id, "shuffle_questions", checked)}
                              />
                            </div>

                            {/* Navigation Lock */}
                            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                              <div>
                                <Label className="text-xs font-bold block">Navigation Lock</Label>
                                <span className="text-[8px] text-slate-400 font-bold uppercase">Block returning to this section</span>
                              </div>
                              <Switch
                                checked={sec.navigation_locked}
                                onCheckedChange={(checked) => updateSection(sec.id, "navigation_locked", checked)}
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Section Summary Stats */}
          {sections.length > 0 && (
            <Card className="border bg-slate-900 text-white rounded-none overflow-hidden">
              <CardHeader className="pb-2 border-b border-slate-800">
                <CardTitle className="text-xs uppercase tracking-widest font-black text-slate-400">
                  Section Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                {sections.map((sec) => {
                  const secQuestions = testData.questions.filter((q) => q.section_id === sec.id);
                  const secMarks = secQuestions.reduce((tot, q) => tot + q.marks, 0);
                  return (
                    <div key={sec.id} className="flex justify-between border-b border-slate-800 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-bold text-slate-300 truncate max-w-[150px]">{sec.name}</span>
                      <span className="font-black text-slate-400">
                        {secQuestions.length} Qs • {secMarks} Marks
                      </span>
                    </div>
                  );
                })}
                {testData.questions.filter((q) => !q.section_id).length > 0 && (
                  <div className="flex justify-between border-t border-slate-800 pt-1.5 mt-1 text-slate-500">
                    <span className="font-bold italic">Unassigned (General)</span>
                    <span className="font-black">
                      {testData.questions.filter((q) => !q.section_id).length} Qs •{" "}
                      {testData.questions.filter((q) => !q.section_id).reduce((tot, q) => tot + q.marks, 0)} Marks
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
