import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";

interface ClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: any;
  clientForm: any;
  setClientForm: (form: any) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

const AVAILABLE_FEATURES = [
  { key: "camera_proctoring", label: "Camera Proctoring" },
  { key: "analytics", label: "Analytics Dashboard" },
  { key: "csv_import", label: "CSV Student Import" },
  { key: "xlsx_export", label: "XLSX Reports Export" },
  { key: "custom_branding", label: "Custom Branding" },
  { key: "advanced_reports", label: "Advanced AI Reports" },
  { key: "priority_support", label: "Priority Support" },
];

export function ClientDialog({
  isOpen,
  onOpenChange,
  editingClient,
  clientForm,
  setClientForm,
  loading,
  handleSubmit,
}: ClientDialogProps) {
  const toggleFeature = (featureKey: string, checked: boolean) => {
    const updatedFeatures = checked
      ? [...(clientForm.features || []), featureKey]
      : (clientForm.features || []).filter((f: string) => f !== featureKey);
    setClientForm({ ...clientForm, features: updatedFeatures });
  };

  const handleLimitChange = (field: string, val: string) => {
    const num = val === "" ? -1 : parseInt(val, 10);
    setClientForm({
      ...clientForm,
      limits: {
        ...(clientForm.limits || {}),
        [field]: isNaN(num) ? -1 : num,
      },
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-none border-t-4 border-t-blue-600 shadow-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {editingClient ? "Update Organization" : "Register New Client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Column 1: Organization Legal details */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-slate-100 dark:border-slate-800 pb-2">
                Legal & Identity
              </h3>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Legal Entity Name *</Label>
                <Input
                  id="name"
                  value={clientForm.name}
                  onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                  className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold focus:border-blue-500"
                  placeholder="e.g. GLOBAL TECH SOLUTIONS"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Headquarters Address</Label>
                <Input
                  id="address"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-medium"
                  placeholder="Full business address..."
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="logo_url" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branding Asset URL</Label>
                <Input
                  id="logo_url"
                  value={clientForm.logo_url}
                  onChange={(e) => setClientForm({ ...clientForm, logo_url: e.target.value })}
                  className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-mono text-xs"
                  placeholder="https://assets.domain.com/logo.png"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                <Label htmlFor="active" className="text-xs font-black uppercase tracking-widest">Operational Status</Label>
                <Switch
                  id="active"
                  checked={clientForm.active_status}
                  onCheckedChange={(checked) => setClientForm({ ...clientForm, active_status: checked })}
                />
              </div>
            </div>

            {/* Column 2: Licensing & Limits */}
            <div className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-slate-100 dark:border-slate-800 pb-2">
                Subscription & Quotas
              </h3>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor="max_exams" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Max Exams/Mo</Label>
                  <Input
                    id="max_exams"
                    type="number"
                    value={clientForm.limits?.max_exams_per_month ?? -1}
                    onChange={(e) => handleLimitChange("max_exams_per_month", e.target.value)}
                    className="h-9 rounded-none text-xs font-bold"
                    placeholder="-1 for unlimited"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor="max_students" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Max Candidates/Exam</Label>
                  <Input
                    id="max_students"
                    type="number"
                    value={clientForm.limits?.max_students_per_exam ?? -1}
                    onChange={(e) => handleLimitChange("max_students_per_exam", e.target.value)}
                    className="h-9 rounded-none text-xs font-bold"
                    placeholder="-1 for unlimited"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2 items-center">
                  <Label htmlFor="max_questions" className="text-[10px] font-black uppercase tracking-widest text-slate-400 leading-none">Max Questions/Exam</Label>
                  <Input
                    id="max_questions"
                    type="number"
                    value={clientForm.limits?.max_questions_per_exam ?? -1}
                    onChange={(e) => handleLimitChange("max_questions_per_exam", e.target.value)}
                    className="h-9 rounded-none text-xs font-bold"
                    placeholder="-1 for unlimited"
                  />
                </div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">* Set -1 for unlimited quotas.</p>
              </div>

              <h3 className="text-xs font-black uppercase tracking-widest text-blue-600 border-b border-slate-100 dark:border-slate-800 pt-2 pb-2">
                Feature Licensing Toggles
              </h3>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {AVAILABLE_FEATURES.map((feat) => {
                  const isChecked = (clientForm.features || []).includes(feat.key);
                  return (
                    <div key={feat.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`feat-${feat.key}`}
                        checked={isChecked}
                        onCheckedChange={(checked) => toggleFeature(feat.key, !!checked)}
                      />
                      <label
                        htmlFor={`feat-${feat.key}`}
                        className="text-xs font-bold uppercase tracking-wider cursor-pointer text-slate-600 dark:text-slate-400"
                      >
                        {feat.label}
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px]">
              {loading ? "SYNCHRONIZING..." : editingClient ? "UPDATE DIRECTORY" : "COMPLETE REGISTRATION"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
