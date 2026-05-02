import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Plus,
  Pencil,
  Trash2,
  UserCog,
  UserPlus,
  Eye,
  EyeOff,
  Copy,
  Check,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Switch } from "@/components/ui/switch";

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
    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to fetch clients",
        variant: "destructive",
      });
    } else {
      setClients(data || []);
    }
  };

  const fetchClientAdmins = async (clientId: string) => {
    setAdminLoading(true);
    const { data: roleData } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("client_id", clientId)
      .eq("role", "clientadmin");

    if (!roleData || roleData.length === 0) {
      setClientAdmins([]);
      setAdminLoading(false);
      return;
    }

    const ids = roleData.map((r) => r.user_id);
    const { data } = await supabase
      .from("profiles")
      .select("id, name, email, created_at")
      .in("id", ids);

    setClientAdmins(data || []);
    setAdminLoading(false);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (editingClient) {
      const { error } = await supabase
        .from("clients")
        .update(clientForm)
        .eq("id", editingClient.id);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({ title: "Success", description: "Client updated successfully" });
        setIsClientDialogOpen(false);
        fetchClients();
        resetClientForm();
      }
    } else {
      const { error } = await supabase.from("clients").insert([clientForm]);

      if (error) {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
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

    const {
      data: { session },
    } = await supabase.auth.getSession();

    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-user`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: JSON.stringify({
          email: adminForm.email.trim(),
          password: adminForm.password,
          name: adminForm.name.trim(),
          client_id: selectedClient.id,
          role: "clientadmin",
        }),
      },
    );

    const result = await res.json();

    if (!res.ok) {
      toast({
        title: "Error",
        description: result.error,
        variant: "destructive",
      });
    } else {
      // Store credentials to show in dialog
      setCreatedCredentials({
        email: adminForm.email.trim(),
        password: adminForm.password,
        name: adminForm.name.trim(),
      });
      setIsCredentialsDialogOpen(true);
      setAdminForm({ name: "", email: "", password: "" });
      fetchClientAdmins(selectedClient.id);
    }

    setAdminLoading(false);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to remove this admin?")) return;

    // Remove role first, then profile cascade handles the rest
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("user_id", adminId)
      .eq("role", "clientadmin");

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Admin removed" });
      fetchClientAdmins(selectedClient.id);
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this client? All associated data will be deleted.",
      )
    )
      return;

    const { error } = await supabase.from("clients").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({ title: "Success", description: "Client deleted successfully" });
      fetchClients();
    }
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
    <div className="min-h-screen bg-muted">
      <header className="border-b bg-card">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/superadmin")}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-2xl font-bold text-primary">Manage Clients</h1>
          </div>

          {/* Add Client Dialog */}
          <Dialog
            open={isClientDialogOpen}
            onOpenChange={setIsClientDialogOpen}
          >
            <DialogTrigger asChild>
              <Button onClick={resetClientForm}>
                <Plus className="mr-2 h-4 w-4" />
                Add Client
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClient ? "Edit Client" : "Add New Client"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleClientSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={clientForm.name}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, name: e.target.value })
                    }
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={clientForm.address}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="logo_url">Logo URL</Label>
                  <Input
                    id="logo_url"
                    value={clientForm.logo_url}
                    onChange={(e) =>
                      setClientForm({ ...clientForm, logo_url: e.target.value })
                    }
                  />
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="active"
                    checked={clientForm.active_status}
                    onCheckedChange={(checked) =>
                      setClientForm({ ...clientForm, active_status: checked })
                    }
                  />
                  <Label htmlFor="active">Active</Label>
                </div>
                <Button type="submit" disabled={loading}>
                  {loading ? "Saving..." : editingClient ? "Update" : "Add"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {/* Manage Admins Dialog */}
      <Dialog open={isAdminDialogOpen} onOpenChange={setIsAdminDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              <span className="flex items-center gap-2">
                <UserCog className="h-5 w-5" />
                Admins — {selectedClient?.name}
              </span>
            </DialogTitle>
          </DialogHeader>

          {/* Add Admin Form */}
          <div className="rounded-lg border p-4 space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Add New Admin
            </h3>
            <form onSubmit={handleAdminSubmit} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="admin-name">Full Name *</Label>
                  <Input
                    id="admin-name"
                    value={adminForm.name}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, name: e.target.value })
                    }
                    placeholder="John Doe"
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="admin-email">Email *</Label>
                  <Input
                    id="admin-email"
                    type="email"
                    value={adminForm.email}
                    onChange={(e) =>
                      setAdminForm({ ...adminForm, email: e.target.value })
                    }
                    placeholder="admin@example.com"
                    required
                  />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="admin-password">Password *</Label>
                <Input
                  id="admin-password"
                  type="password"
                  value={adminForm.password}
                  onChange={(e) =>
                    setAdminForm({ ...adminForm, password: e.target.value })
                  }
                  placeholder="Min 6 characters"
                  minLength={6}
                  required
                />
              </div>
              <Button type="submit" disabled={adminLoading} size="sm">
                {adminLoading ? "Creating..." : "Create Admin"}
              </Button>
            </form>
          </div>

          {/* Existing Admins List */}
          <div className="space-y-2">
            <h3 className="font-semibold">
              Existing Admins ({clientAdmins.length})
            </h3>
            {adminLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : clientAdmins.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No admins yet. Add one above.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Joined</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clientAdmins.map((admin) => (
                    <TableRow key={admin.id}>
                      <TableCell className="font-medium">
                        {admin.name}
                      </TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>
                        {new Date(admin.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteAdmin(admin.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Credentials Display Dialog */}
      <Dialog
        open={isCredentialsDialogOpen}
        onOpenChange={setIsCredentialsDialogOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-success">
              <Check className="h-5 w-5" />
              Admin Created Successfully
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Save these credentials now. The password cannot be retrieved
                later.
              </p>
              <div className="space-y-3 rounded-lg border p-4 bg-muted/50">
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Name</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdCredentials.name}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.name);
                        toast({
                          title: "Copied",
                          description: "Name copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Email</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      value={createdCredentials.email}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(createdCredentials.email);
                        toast({
                          title: "Copied",
                          description: "Email copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">
                    Password
                  </Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type={showPassword ? "text" : "password"}
                      value={createdCredentials.password}
                      readOnly
                      className="font-mono"
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        navigator.clipboard.writeText(
                          createdCredentials.password,
                        );
                        toast({
                          title: "Copied",
                          description: "Password copied to clipboard",
                        });
                      }}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsCredentialsDialogOpen(false);
                  setCreatedCredentials(null);
                  setShowPassword(false);
                }}
                className="w-full"
              >
                Done
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <main className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>All Clients ({clients.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell className="font-medium">{client.name}</TableCell>
                    <TableCell>{client.address || "-"}</TableCell>
                    <TableCell>
                      <span
                        className={`rounded-full px-2 py-1 text-xs ${client.active_status ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}
                      >
                        {client.active_status ? "Active" : "Inactive"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleManageAdmins(client)}
                          title="Manage Admins"
                        >
                          <UserCog className="h-4 w-4 text-primary" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditClient(client)}
                          title="Edit Client"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteClient(client.id)}
                          title="Delete Client"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
