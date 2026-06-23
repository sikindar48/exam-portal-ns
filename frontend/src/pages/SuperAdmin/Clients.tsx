import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clientsApi, userRolesApi, profilesApi, createUser } from "@/services/api/client";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Brand/Footer";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Button } from "@/components/ui/button";

// Extracted Components
import { ClientHeader } from "@/components/SuperAdmin/Clients/ClientHeader";
import { ClientTable } from "@/components/SuperAdmin/Clients/ClientTable";
import { ClientDialog } from "@/components/SuperAdmin/Clients/ClientDialog";
import { AdminManagementDialog } from "@/components/SuperAdmin/Clients/AdminManagementDialog";
import { CredentialsDialog } from "@/components/SuperAdmin/Clients/CredentialsDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ClientsManagement() {
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isClientDialogOpen, setIsClientDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [deleteClientTarget, setDeleteClientTarget] = useState<string | null>(null);

  const [clientForm, setClientForm] = useState({
    name: "",
    address: "",
    logo_url: "",
    active_status: true,
    limits: {
      max_exams_per_month: -1,
      max_students_per_exam: -1,
      max_questions_per_exam: -1,
    },
    features: [] as string[],
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    setLoading(true);
    const { data, error } = await clientsApi.list();
    if (error) {
      toast({ title: "Error", description: "Failed to fetch clients", variant: "destructive" });
    } else {
      setClients((data as any[]) || []);
    }
    setLoading(false);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await clientsApi.create(clientForm);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Client added successfully" });
      setIsClientDialogOpen(false);
      fetchClients();
      resetClientForm();
    }
    setLoading(false);
  };

  const handleDeleteClient = async (id: string) => {
    const { error } = await clientsApi.delete(id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Client deleted successfully" });
      fetchClients();
    }
    setDeleteClientTarget(null);
  };

  const handleEditClient = (client: any) => {
    navigate(`/superadmin/clients/setting?id=${client.id}`);
  };

  const handleManageAdmins = (client: any) => {
    navigate(`/superadmin/clients/setting?id=${client.id}`);
  };

  const resetClientForm = () => {
    setClientForm({
      name: "",
      address: "",
      logo_url: "",
      active_status: true,
      limits: {
        max_exams_per_month: -1,
        max_students_per_exam: -1,
        max_questions_per_exam: -1,
      },
      features: [],
    });
    setEditingClient(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Organizations" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientHeader 
          navigate={navigate}
          setIsClientDialogOpen={setIsClientDialogOpen}
          resetClientForm={resetClientForm}
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1">
          <ClientTable 
            clients={clients}
            loading={loading}
            handleManageAdmins={handleManageAdmins}
            handleEditClient={handleEditClient}
            setDeleteClientTarget={setDeleteClientTarget}
          />
        </main>

        <ClientDialog 
          isOpen={isClientDialogOpen}
          onOpenChange={setIsClientDialogOpen}
          editingClient={editingClient}
          clientForm={clientForm}
          setClientForm={setClientForm}
          loading={loading}
          handleSubmit={handleClientSubmit}
        />

        {/* Delete Client Confirmation */}
        <AlertDialog open={!!deleteClientTarget} onOpenChange={(open) => !open && setDeleteClientTarget(null)}>
          <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Erase Organization Data?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                This will permanently delete the client and all associated data including students, questions, and tests. This action is irreversible.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest" onClick={() => deleteClientTarget && handleDeleteClient(deleteClientTarget)}>Confirm Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Footer />
      </div>
    </div>
  );
}
