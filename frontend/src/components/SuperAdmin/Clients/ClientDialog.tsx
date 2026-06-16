import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

interface ClientDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  editingClient: any;
  clientForm: any;
  setClientForm: (form: any) => void;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
}

export function ClientDialog({
  isOpen,
  onOpenChange,
  editingClient,
  clientForm,
  setClientForm,
  loading,
  handleSubmit,
}: ClientDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-none border-t-4 border-t-blue-600 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase tracking-tight">
            {editingClient ? "Update Organization" : "Register New Client"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 pt-4">
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
          <div className="pt-2">
            <Button type="submit" disabled={loading} className="w-full h-11 rounded-none bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px]">
              {loading ? "SYNCHRONIZING..." : editingClient ? "UPDATE DIRECTORY" : "COMPLETE REGISTRATION"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
