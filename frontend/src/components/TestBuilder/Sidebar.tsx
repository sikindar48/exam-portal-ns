import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Clock, Target, ShieldAlert, RotateCcw, Shuffle, MinusCircle, Users } from "lucide-react";
import { TestData } from "@/types/test";

interface SidebarProps {
  testData: TestData;
  setTestData: (data: TestData | ((prev: TestData) => TestData)) => void;
  totalMarks: number;
}

export function Sidebar({ testData, setTestData, totalMarks }: SidebarProps) {
  const updateField = (field: keyof TestData, value: any) => {
    setTestData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="sticky top-8">
      <Card className="border bg-white dark:bg-slate-900 overflow-hidden flex flex-col rounded-none">
        <CardHeader className="pb-4 border-b bg-slate-50/50 dark:bg-slate-800/50">
          <CardTitle className="flex items-center gap-2 text-lg uppercase tracking-tighter font-black">
            <Settings className="h-5 w-5 text-blue-600" />
            Test Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Test Name</Label>
              <Input
                value={testData.test_name}
                onChange={(e) => updateField("test_name", e.target.value)}
                placeholder="Internal Exam - Phase 1"
                className="rounded-none border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Duration (Min)</Label>
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
                <Label className="text-xs font-bold uppercase tracking-widest text-slate-500">Total Marks</Label>
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

          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Security & Rules</h3>
            
            <div className="space-y-4">
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
                <div className="pl-12 pt-2 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Number of Attempts</Label>
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
                    <span className="text-[10px] text-slate-400 font-bold uppercase whitespace-nowrap">
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
                <div className="pl-12 pt-2 animate-in slide-in-from-top-2 duration-200">
                  <Label className="text-[10px] font-bold uppercase text-slate-500 mb-1 block">Penalty Per Wrong Answer</Label>
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
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
