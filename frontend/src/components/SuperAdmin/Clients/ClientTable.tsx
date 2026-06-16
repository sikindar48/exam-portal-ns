import React from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Building, Pencil, Trash2, UserCog } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface Client {
  id: string;
  name: string;
  address: string | null;
  active_status: boolean;
}

interface ClientTableProps {
  clients: Client[];
  handleManageAdmins: (client: Client) => void;
  handleEditClient: (client: Client) => void;
  setDeleteClientTarget: (id: string) => void;
}

export function ClientTable({
  clients,
  handleManageAdmins,
  handleEditClient,
  setDeleteClientTarget,
}: ClientTableProps) {
  return (
    <Card className="rounded-none border-slate-200 dark:border-slate-800 shadow-xl">
      <CardHeader className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
        <CardTitle className="text-lg font-black uppercase tracking-tight">Active Client Directory ({clients.length})</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent border-b border-slate-200 dark:border-slate-800">
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Organization Name</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Physical Address</TableHead>
              <TableHead className="text-[10px] font-black uppercase tracking-widest py-4">Operational Status</TableHead>
              <TableHead className="text-right text-[10px] font-black uppercase tracking-widest py-4">Management</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-20 text-center">
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
                  <TableCell className="font-black text-slate-900 dark:text-white uppercase tracking-tight py-4">
                    {client.name}
                  </TableCell>
                  <TableCell className="text-xs font-bold text-slate-500 py-4 uppercase">{client.address || "NO ADDRESS LOGGED"}</TableCell>
                  <TableCell className="py-4">
                    <span
                      className={`text-[9px] font-black px-2 py-0.5 border uppercase tracking-widest ${
                        client.active_status 
                          ? "bg-green-50 text-green-600 border-green-100" 
                          : "bg-red-50 text-red-600 border-red-100"
                      }`}
                    >
                      {client.active_status ? "ACTIVE" : "SUSPENDED"}
                    </span>
                  </TableCell>
                  <TableCell className="py-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleManageAdmins(client)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-blue-600 hover:border-blue-200 transition-all p-0"
                        title="Manage Organization Admins"
                      >
                        <UserCog className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClient(client)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-slate-900 hover:border-slate-300 transition-all p-0"
                        title="Modify Organization Details"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteClientTarget(client.id)}
                        className="h-8 w-8 rounded-none border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-red-600 hover:border-red-200 transition-all p-0"
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
