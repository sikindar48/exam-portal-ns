import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserCog, UserPlus, Trash2 } from "lucide-react";

interface AdminManagementDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  selectedClient: any;
  adminForm: any;
  setAdminForm: (form: any) => void;
  adminLoading: boolean;
  handleAdminSubmit: (e: React.FormEvent) => void;
  clientAdmins: any[];
  setDeleteAdminTarget: (id: string) => void;
}

export function AdminManagementDialog({
  isOpen,
  onOpenChange,
  selectedClient,
  adminForm,
  setAdminForm,
  adminLoading,
  handleAdminSubmit,
  clientAdmins,
  setDeleteAdminTarget,
}: AdminManagementDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-none border-t-4 border-t-blue-600">
        <DialogHeader>
          <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
             Administrators — {selectedClient?.name}
          </DialogTitle>
        </DialogHeader>

        <div className="rounded-none border-2 border-dashed border-slate-200 dark:border-slate-800 p-6 space-y-4 bg-slate-50/50 dark:bg-slate-900/50">
          <h3 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-500">
            <UserPlus className="h-3 w-3" /> Add New Admin
          </h3>
          <form onSubmit={handleAdminSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="admin-name" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Full Name *</Label>
                <Input
                  id="admin-name"
                  value={adminForm.name}
                  onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                  placeholder="Official Name"
                  className="h-10 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold"
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-email" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Secure Email *</Label>
                <Input
                  id="admin-email"
                  type="email"
                  value={adminForm.email}
                  onChange={(e) => setAdminForm({ ...adminForm, email: e.target.value })}
                  placeholder="admin@org.com"
                  className="h-10 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold"
                  required
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="admin-password" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Password *</Label>
              <Input
                id="admin-password"
                type="password"
                value={adminForm.password}
                onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                placeholder="Secure character string"
                minLength={6}
                className="h-10 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold"
                required
              />
            </div>
            <Button type="submit" disabled={adminLoading} className="h-10 px-6 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[10px]">
              {adminLoading ? "GRANTING PRIVILEGES..." : "CONFIRM ADMINISTRATIVE ACCESS"}
            </Button>
          </form>
        </div>

        <div className="space-y-4 mt-8">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-2">
            Administrators ({clientAdmins.length})
          </h3>
          <div className="border border-slate-100 dark:border-slate-800">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 dark:bg-slate-950/50">
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Name</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest">Email</TableHead>
                  <TableHead className="text-[9px] font-black uppercase tracking-widest text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientAdmins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="py-10 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      No Admins Found
                    </TableCell>
                  </TableRow>
                ) : (
                  clientAdmins.map((admin) => (
                    <TableRow key={admin.id} className="border-b border-slate-100 dark:border-slate-800">
                      <TableCell className="font-black text-xs text-slate-700 dark:text-slate-300 uppercase tracking-tight">{admin.name}</TableCell>
                      <TableCell className="text-xs font-medium text-slate-500 font-mono">{admin.email}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteAdminTarget(admin.id)}
                          className="h-8 w-8 p-0 text-slate-300 hover:text-red-600 transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
