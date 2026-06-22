import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building, Pencil, Trash2, UserCog, ShieldCheck, Database, HardDrive, FileText, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Client {
  id: string;
  name: string;
  address: string | null;
  active_status: boolean;
  totalStudents?: number;
  totalAttempts?: number;
  storageUsedMb?: number;
  limits?: {
    max_exams_per_month: number;
    max_students_per_exam: number;
    max_questions_per_exam: number;
  };
  features?: string[];
}

interface ClientTableProps {
  clients: Client[];
  loading?: boolean;
  handleManageAdmins: (client: Client) => void;
  handleEditClient: (client: Client) => void;
  setDeleteClientTarget: (id: string) => void;
}

export function ClientTable({
  clients,
  loading,
  handleManageAdmins,
  handleEditClient,
  setDeleteClientTarget,
}: ClientTableProps) {
  return (
    <Card className="rounded-none border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Client Directory ({loading ? "..." : clients.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Organization Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Operational Status</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Subscription Limits</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Active Licenses</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Usage Stats</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <TableRow key={idx} className="border-b border-slate-100 dark:border-slate-800 animate-pulse">
                  <TableCell className="py-4">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-none mb-2" />
                    <div className="h-3 w-48 bg-slate-100 dark:bg-slate-900/55 rounded-none" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-4 w-16 bg-slate-200 dark:bg-slate-800 rounded-none" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="h-3 w-20 bg-slate-100 dark:bg-slate-900/55 rounded-none" />
                      <div className="h-3 w-24 bg-slate-100 dark:bg-slate-900/55 rounded-none" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded-none" />
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1">
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-900/55 rounded-none" />
                      <div className="h-3 w-16 bg-slate-100 dark:bg-slate-900/55 rounded-none" />
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-none" />
                      <div className="h-8 w-8 bg-slate-200 dark:bg-slate-800 rounded-none" />
                    </div>
                  </TableCell>
                </TableRow>
              ))
            ) : clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="py-20 text-center">
                  <div className="flex flex-col items-center gap-4 text-slate-400">
                    <Building className="h-12 w-12 opacity-20" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest">No Clients Registered</p>
                      <p className="text-[10px] font-bold uppercase tracking-widest mt-1">Initiate system expansion by onboarding your first client organization.</p>
                    </div>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              clients.map((client) => (
                <TableRow key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all border-b border-slate-100 dark:border-slate-800">
                  <TableCell className="py-4">
                    <div className="font-black text-slate-900 dark:text-white uppercase tracking-tight">
                      {client.name}
                    </div>
                    <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mt-0.5">
                      {client.address || "NO PHYSICAL ADDRESS"}
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                        client.active_status 
                          ? "bg-green-50 text-green-600 border-green-100 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50" 
                          : "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50"
                      }`}
                    >
                      {client.active_status ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      <div>
                        Exams/Mo: <span className="font-black text-slate-900 dark:text-white">{client.limits?.max_exams_per_month === -1 ? "∞" : client.limits?.max_exams_per_month}</span>
                      </div>
                      <div>
                        Candidates/Exam: <span className="font-black text-slate-900 dark:text-white">{client.limits?.max_students_per_exam === -1 ? "∞" : client.limits?.max_students_per_exam}</span>
                      </div>
                      <div>
                        Questions/Exam: <span className="font-black text-slate-900 dark:text-white">{client.limits?.max_questions_per_exam === -1 ? "∞" : client.limits?.max_questions_per_exam}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4">
                    {client.features && client.features.length > 0 ? (
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {client.features.map((feat) => (
                          <span key={feat} className="text-[8px] font-black px-1.5 py-0.5 bg-slate-100 dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 uppercase tracking-widest">
                            {feat.replace("_", " ")}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase">NO LICENSES</span>
                    )}
                  </TableCell>
                  <TableCell className="py-4">
                    <div className="space-y-1 text-[10px] font-bold uppercase tracking-wide text-slate-600 dark:text-slate-400">
                      <div className="flex items-center gap-1.5">
                        <Database className="h-3 w-3 text-slate-400" />
                        Students: <span className="font-black text-slate-900 dark:text-white">{client.totalStudents || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <FileText className="h-3 w-3 text-slate-400" />
                        Attempts: <span className="font-black text-slate-900 dark:text-white">{client.totalAttempts || 0}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <HardDrive className="h-3 w-3 text-slate-400" />
                        Storage: <span className="font-black text-slate-900 dark:text-white">{client.storageUsedMb || 0} MB</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManageAdmins(client)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 dark:hover:border-blue-900 transition-all p-0"
                        title="Manage Organization Admins"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-900 hover:border-slate-300 dark:hover:border-slate-100 transition-all p-0"
                        title="Modify Organization Details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteClientTarget(client.id)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:border-red-200 dark:hover:border-red-900 transition-all p-0"
                        title="Delete Organization"
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
      </CardContent>
    </Card>
  );
}
