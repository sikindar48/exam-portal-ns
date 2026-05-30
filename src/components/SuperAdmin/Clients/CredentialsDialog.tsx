import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Check, Copy, Eye, EyeOff } from "lucide-react";

interface CredentialsDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  createdCredentials: { email: string; password: string; name: string } | null;
  showPassword: boolean;
  setShowPassword: (show: boolean) => void;
  setCreatedCredentials: (creds: any) => void;
}

export function CredentialsDialog({
  isOpen,
  onOpenChange,
  createdCredentials,
  showPassword,
  setShowPassword,
  setCreatedCredentials,
}: CredentialsDialogProps) {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied", description: `${label} copied to clipboard` });
  };

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) {
          setCreatedCredentials(null);
          setShowPassword(false);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="max-w-md rounded-none border-t-4 border-t-green-600 shadow-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-green-600 font-black uppercase tracking-tight">
            <Check className="h-6 w-6" />
            Organization Created Successfully
          </DialogTitle>
        </DialogHeader>
        {createdCredentials && (
          <div className="space-y-6">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
              Security Notice: Record these credentials immediately. They will not be displayed again.
            </p>
            <div className="space-y-4 rounded-none border border-slate-100 dark:border-slate-800 p-4 bg-slate-50/50 dark:bg-slate-900/50">
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Organization Name</Label>
                <div className="flex items-center gap-2">
                  <Input value={createdCredentials.name} readOnly className="font-bold rounded-none h-9 bg-white dark:bg-slate-950" />
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-none" onClick={() => copyToClipboard(createdCredentials.name, "Name")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Primary Email</Label>
                <div className="flex items-center gap-2">
                  <Input value={createdCredentials.email} readOnly className="font-mono text-xs rounded-none h-9 bg-white dark:bg-slate-950" />
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-none" onClick={() => copyToClipboard(createdCredentials.email, "Email")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Security String</Label>
                <div className="flex items-center gap-2">
                  <Input type={showPassword ? "text" : "password"} value={createdCredentials.password} readOnly className="font-mono text-xs rounded-none h-9 bg-white dark:bg-slate-950" />
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-none" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button size="sm" variant="outline" className="h-9 w-9 p-0 rounded-none" onClick={() => copyToClipboard(createdCredentials.password, "Password")}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
            <Button onClick={() => onOpenChange(false)} className="w-full h-11 rounded-none bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-widest text-[11px]">
              CONFIRM RECEIPT & CLOSE
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
