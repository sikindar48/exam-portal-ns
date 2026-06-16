import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clientsApi, userRolesApi, profilesApi, createUser } from "@/integrations/turso/client";
import { useNavigate } from "react-router-dom";
import { Footer } from "@/components/Brand/Footer";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";

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
  const [isAdminDialogOpen, setIsAdminDialogOpen] = useState(false);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [clientAdmins, setClientAdmins] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [deleteClientTarget, setDeleteClientTarget] = useState<string | null>(null);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<string | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{
    email: string;
    password: string;
    name: string;
  } | null>(null);

  const [clientForm, setClientForm] = useState({
    name: "",
    address: "",
    logo_url: "",
    active_status: true,
  });
  const [adminForm, setAdminForm] = useState({
    name: "",
    email: "",
    password: "",
  });

  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    const { data, error } = await clientsApi.list();
    if (error) {
      toast({ title: "Error", description: "Failed to fetch clients", variant: "destructive" });
    } else {
      setClients((data as any[]) || []);
    }
  };

  const fetchClientAdmins = async (clientId: string) => {
    setAdminLoading(true);
    const { data: roleData } = await userRolesApi.list({ client_id: clientId, role: "clientadmin" });
    if (!roleData || (roleData as any[]).length === 0) {
      setClientAdmins([]);
      setAdminLoading(false);
      return;
    }
    const ids = (roleData as any[]).map((r: any) => r.user_id);
    const { data } = await profilesApi.getByIds(ids);
    setClientAdmins((data as any[]) || []);
    setAdminLoading(false);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    if (editingClient) {
      const { error } = await clientsApi.update(editingClient.id, clientForm);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Client updated successfully" });
        setIsClientDialogOpen(false);
        fetchClients();
        resetClientForm();
      }
    } else {
      const { error } = await clientsApi.create(clientForm);
      if (error) {
        toast({ title: "Error", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Success", description: "Client added successfully" });
        setIsClientDialogOpen(false);
        fetchClients();
        resetClientForm();
      }
    }
    setLoading(false);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminLoading(true);
    const { data: result, error } = await createUser({
      email: adminForm.email.trim(),
      password: adminForm.password,
      name: adminForm.name.trim(),
      client_id: selectedClient.id,
      role: "clientadmin",
    });
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCreatedCredentials({ email: adminForm.email.trim(), password: adminForm.password, name: adminForm.name.trim() });
      setIsCredentialsDialogOpen(true);
      setAdminForm({ name: "", email: "", password: "" });
      fetchClientAdmins(selectedClient.id);
    }
    setAdminLoading(false);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    const { error } = await userRolesApi.delete(adminId, "clientadmin");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Admin removed" });
      fetchClientAdmins(selectedClient.id);
    }
    setDeleteAdminTarget(null);
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
    setEditingClient(client);
    setClientForm({
      name: client.name,
      address: client.address || "",
      logo_url: client.logo_url || "",
      active_status: client.active_status,
    });
    setIsClientDialogOpen(true);
  };

  const handleManageAdmins = (client: any) => {
    setSelectedClient(client);
    fetchClientAdmins(client.id);
    setIsAdminDialogOpen(true);
  };

  const resetClientForm = () => {
    setClientForm({ name: "", address: "", logo_url: "", active_status: true });
    setEditingClient(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Manage Organizations" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientHeader 
          navigate={navigate}
          setIsClientDialogOpen={setIsClientDialogOpen}
          resetClientForm={resetClientForm}
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1">
          <ClientTable 
            clients={clients}
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

        <AdminManagementDialog 
          isOpen={isAdminDialogOpen}
          onOpenChange={setIsAdminDialogOpen}
          selectedClient={selectedClient}
          adminForm={adminForm}
          setAdminForm={setAdminForm}
          adminLoading={adminLoading}
          handleAdminSubmit={handleAdminSubmit}
          clientAdmins={clientAdmins}
          setDeleteAdminTarget={setDeleteAdminTarget}
        />

        <CredentialsDialog 
          isOpen={isCredentialsDialogOpen}
          onOpenChange={setIsCredentialsDialogOpen}
          createdCredentials={createdCredentials}
          showPassword={showPassword}
          setShowPassword={setShowPassword}
          setCreatedCredentials={setCreatedCredentials}
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

        {/* Delete Admin Confirmation */}
        <AlertDialog open={!!deleteAdminTarget} onOpenChange={(open) => !open && setDeleteAdminTarget(null)}>
          <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
            <AlertDialogHeader>
              <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Delete Admin Account?</AlertDialogTitle>
              <AlertDialogDescription className="text-sm font-medium leading-relaxed">
                This will revoke the administrator's access to this organization. Their profile data will be retained but their role will be stripped.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="pt-4">
              <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[10px] tracking-widest">Cancel</AlertDialogCancel>
              <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[10px] tracking-widest" onClick={() => deleteAdminTarget && handleDeleteAdmin(deleteAdminTarget)}>Confirm Revocation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Footer />
      </div>
    </div>
  );
}
