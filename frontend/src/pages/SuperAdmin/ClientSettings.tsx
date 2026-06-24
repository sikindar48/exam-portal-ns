import React, { useEffect, useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { clientsApi, userRolesApi, profilesApi, createUser, packagesApi } from "@/services/api/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Footer } from "@/components/Brand/Footer";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, Gauge, CheckSquare, Save, ShieldAlert, Globe, FileSpreadsheet, Layers, Video, BarChart4, UserCog, UserPlus, Trash2, Eye, EyeOff, Key, Plus, Ticket, Edit2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

export default function ClientSettings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const clientId = searchParams.get("id");
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  
  // Top Tabs control state — driven by URL ?tab= param
  const initialTab = (searchParams.get("tab") as "settings" | "admins" | "packages") || "settings";
  const [activeTab, setActiveTab] = useState<"settings" | "admins" | "packages">(initialTab);

  const switchTab = (tab: "settings" | "admins" | "packages") => {
    setActiveTab(tab);
    setSearchParams({ id: clientId || "", tab });
  };

  // Packages tab states
  const [purchases, setPurchases] = useState<any[]>([]);
  const [packages, setPackages] = useState<any[]>([]);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [customMaxCandidates, setCustomMaxCandidates] = useState("default");
  const [customMaxQuestions, setCustomMaxQuestions] = useState("default");

  const [editingPurchase, setEditingPurchase] = useState<any | null>(null);
  const [editMaxCandidates, setEditMaxCandidates] = useState("default");
  const [editMaxQuestions, setEditMaxQuestions] = useState("default");
  const [deletingPurchaseTarget, setDeletingPurchaseTarget] = useState<string | null>(null);
  const [updatingPurchaseLoading, setUpdatingPurchaseLoading] = useState(false);

  const [clientForm, setClientForm] = useState<any>({
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

  // Admin management state
  const [clientAdmins, setClientAdmins] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminForm, setAdminForm] = useState({ name: "", email: "", password: "" });
  const [createdCredentials, setCreatedCredentials] = useState<any | null>(null);
  const [isCredentialsDialogOpen, setIsCredentialsDialogOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminFormPassword, setShowAdminFormPassword] = useState(false);
  const [deleteAdminTarget, setDeleteAdminTarget] = useState<string | null>(null);
  
  // Password updating states for existing admins
  const [updatingPasswordAdmin, setUpdatingPasswordAdmin] = useState<any | null>(null);
  const [newPasswordForm, setNewPasswordForm] = useState({ password: "" });
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [updatingPasswordLoading, setUpdatingPasswordLoading] = useState(false);

  useEffect(() => {
    if (clientId) {
      fetchClientDetail(clientId);
      fetchClientAdmins(clientId);
      fetchClientPurchases(clientId);
    } else {
      toast({
        title: "Error",
        description: "No client ID provided in URL parameters",
        variant: "destructive",
      });
      navigate("/superadmin/clients");
    }
  }, [clientId]);

  const fetchClientDetail = async (id: string) => {
    setFetching(true);
    const { data, error } = await clientsApi.get(id);
    if (error) {
      toast({
        title: "Error",
        description: error.message || "Failed to load client details",
        variant: "destructive",
      });
      navigate("/superadmin/clients");
    } else if (data) {
      setEditingClient(data);
      setClientForm({
        name: data.name,
        address: data.address || "",
        logo_url: data.logo_url || "",
        active_status: data.active_status,
        limits: data.limits || {
          max_exams_per_month: -1,
          max_students_per_exam: -1,
          max_questions_per_exam: -1,
        },
        features: data.features || [],
      });
    }
    setFetching(false);
  };

  const fetchClientAdmins = async (id: string) => {
    const { data: roleData } = await userRolesApi.list({ client_id: id, role: "clientadmin" });
    if (!roleData || (roleData as any[]).length === 0) {
      setClientAdmins([]);
      return;
    }
    const ids = (roleData as any[]).map((r: any) => r.user_id);
    const { data } = await profilesApi.getByIds(ids);
    setClientAdmins((data as any[]) || []);
  };

  const fetchClientPurchases = async (id: string) => {
    setPackagesLoading(true);
    const [purchRes, availRes] = await Promise.all([
      packagesApi.listPurchases(id),
      packagesApi.listAvailable()
    ]);
    if (!purchRes.error && purchRes.data) {
      setPurchases(purchRes.data);
    }
    if (!availRes.error && availRes.data) {
      setPackages(availRes.data);
      if (availRes.data.length > 0) {
        setSelectedPackageId(availRes.data[0].id);
      }
    }
    setPackagesLoading(false);
  };

  const handleClientSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setLoading(true);

    const { error } = await clientsApi.update(clientId, clientForm);
    if (error) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Client updated successfully",
      });
      navigate("/superadmin/clients");
    }
    setLoading(false);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) return;
    setAdminLoading(true);

    const { data: result, error } = await createUser({
      email: adminForm.email.trim(),
      password: adminForm.password,
      name: adminForm.name.trim(),
      client_id: clientId,
      role: "clientadmin",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setCreatedCredentials({ email: adminForm.email.trim(), password: adminForm.password, name: adminForm.name.trim() });
      setIsCredentialsDialogOpen(true);
      setAdminForm({ name: "", email: "", password: "" });
      fetchClientAdmins(clientId);
    }
    setAdminLoading(false);
  };

  const handleDeleteAdmin = async (adminId: string) => {
    if (!clientId) return;
    const { error } = await userRolesApi.delete(adminId, "clientadmin");
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Admin removed successfully" });
      fetchClientAdmins(clientId);
    }
    setDeleteAdminTarget(null);
  };

  const handleUpdatePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !updatingPasswordAdmin) return;
    setUpdatingPasswordLoading(true);

    const { error } = await createUser({
      email: updatingPasswordAdmin.email,
      password: newPasswordForm.password,
      name: updatingPasswordAdmin.name,
      client_id: clientId,
      role: "clientadmin",
    });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Password updated successfully" });
      setUpdatingPasswordAdmin(null);
    }
    setUpdatingPasswordLoading(false);
  };

  const handleUpdatePurchaseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId || !editingPurchase) return;
    setUpdatingPurchaseLoading(true);

    const candidatesOverride = editMaxCandidates === "default" ? null : parseInt(editMaxCandidates);
    const questionsOverride = editMaxQuestions === "default" ? null : parseInt(editMaxQuestions);

    const res = await packagesApi.updatePurchase(editingPurchase.id, candidatesOverride, questionsOverride);
    if (!res.error) {
      toast({ title: "Success", description: "Package overrides updated successfully" });
      fetchClientPurchases(clientId);
      setEditingPurchase(null);
    } else {
      toast({ title: "Error", description: res.error.message, variant: "destructive" });
    }
    setUpdatingPurchaseLoading(false);
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!clientId) return;
    const res = await packagesApi.deletePurchase(purchaseId);
    if (!res.error) {
      toast({ title: "Success", description: "Package credit deleted successfully" });
      fetchClientPurchases(clientId);
    } else {
      toast({ title: "Error", description: res.error.message, variant: "destructive" });
    }
    setDeletingPurchaseTarget(null);
  };

  const handleApprovePurchase = async (purchaseId: string) => {
    if (!clientId) return;
    const res = await packagesApi.updatePurchase(purchaseId, null, null, "available");
    if (!res.error) {
      toast({ title: "Success", description: "Package request approved successfully" });
      fetchClientPurchases(clientId);
    } else {
      toast({ title: "Error", description: res.error.message, variant: "destructive" });
    }
  };

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

  if (fetching) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
        <SuperAdminSidebar activeTab="Organizations" />
        <div className="flex-1 flex flex-col min-h-screen">
          <ClientAdminHeader
            title="Configure Organization Settings"
            subtitle="Fetching configurations..."
            showBackButton={true}
            backPath="/superadmin/clients"
          />
          <main className="container max-w-7xl mx-auto p-8 flex-1 flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Configuration Suite...</p>
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Organizations" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Organization Configuration"
          subtitle={`Licensing and quota controls for ${editingClient?.name || "Client"}`}
          showBackButton={true}
          backPath="/superadmin/clients"
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-8">

          {/* Top Horizontal Tabs & Client ID */}
          <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
            <div className="flex">
              <button
                type="button"
                onClick={() => switchTab("settings")}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-none border-b-2 -mb-px ${
                  activeTab === "settings"
                    ? "border-b-red-500 text-slate-900 dark:text-white font-black"
                    : "border-b-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                }`}
              >
                Organization Settings
              </button>
              <button
                type="button"
                onClick={() => switchTab("admins")}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-none border-b-2 -mb-px ${
                  activeTab === "admins"
                    ? "border-b-red-500 text-slate-900 dark:text-white font-black"
                    : "border-b-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                }`}
              >
                Client Administrators
              </button>
              <button
                type="button"
                onClick={() => switchTab("packages")}
                className={`px-6 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-none border-b-2 -mb-px ${
                  activeTab === "packages"
                    ? "border-b-red-500 text-slate-900 dark:text-white font-black"
                    : "border-b-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 font-bold"
                }`}
              >
                Pay Per Test Credits
              </button>
            </div>
            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest pr-2">
              CLIENT ID: <span className="font-mono text-slate-600 dark:text-slate-300 select-all">{clientId}</span>
            </div>
          </div>

          {activeTab === "settings" && (
            <form onSubmit={handleClientSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Box 1: Identity & Branding */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <Building2 className="h-4 w-4 text-blue-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Identity & Branding</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-name" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Legal Entity Name *</Label>
                      <Input
                        id="edit-name"
                        value={clientForm.name}
                        onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                        className="h-9 rounded-none border-slate-200 dark:border-slate-800 font-bold focus:border-red-500 text-xs"
                        placeholder="e.g. ACME GLOBAL INC"
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-logo" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Branding Asset URL</Label>
                      <Input
                        id="edit-logo"
                        value={clientForm.logo_url}
                        onChange={(e) => setClientForm({ ...clientForm, logo_url: e.target.value })}
                        className="h-9 rounded-none border-slate-200 dark:border-slate-800 font-mono text-xs focus:border-red-500"
                        placeholder="https://domain.com/logo.png"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-address" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Headquarters Address</Label>
                      <Input
                        id="edit-address"
                        value={clientForm.address}
                        onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                        className="h-9 rounded-none border-slate-200 dark:border-slate-800 font-medium text-xs focus:border-red-500"
                        placeholder="HQ Location..."
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 2: Subscription Quotas */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <Gauge className="h-4 w-4 text-amber-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Subscription Quotas</h3>
                  </div>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-max-exams" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Max Exams / Month</Label>
                      <Input
                        id="edit-max-exams"
                        type="number"
                        value={clientForm.limits?.max_exams_per_month ?? -1}
                        onChange={(e) => handleLimitChange("max_exams_per_month", e.target.value)}
                        className="h-9 rounded-none text-xs font-bold border-slate-200 dark:border-slate-800 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-max-students" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Candidates / Exam</Label>
                      <Input
                        id="edit-max-students"
                        type="number"
                        value={clientForm.limits?.max_students_per_exam ?? -1}
                        onChange={(e) => handleLimitChange("max_students_per_exam", e.target.value)}
                        className="h-9 rounded-none text-xs font-bold border-slate-200 dark:border-slate-800 focus:border-red-500"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="edit-max-questions" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Questions / Exam</Label>
                      <Input
                        id="edit-max-questions"
                        type="number"
                        value={clientForm.limits?.max_questions_per_exam ?? -1}
                        onChange={(e) => handleLimitChange("max_questions_per_exam", e.target.value)}
                        className="h-9 rounded-none text-xs font-bold border-slate-200 dark:border-slate-800 focus:border-red-500"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Box 3: Module Licensing */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <CheckSquare className="h-4 w-4 text-emerald-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Module Licensing</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {[
                      { key: "camera_proctoring", label: "Camera Proctoring Lite", desc: "Camera feed & logs.", icon: <Video className="h-3.5 w-3.5 text-slate-400" /> },
                      { key: "analytics", label: "Advanced Analytics", desc: "Metrics & filter overlays.", icon: <BarChart4 className="h-3.5 w-3.5 text-slate-400" /> },
                      { key: "csv_import", label: "CSV Student Import", desc: "Bulk candidate uploading.", icon: <Globe className="h-3.5 w-3.5 text-slate-400" /> },
                      { key: "xlsx_export", label: "XLSX Reports Export", desc: "Spreadsheet results.", icon: <FileSpreadsheet className="h-3.5 w-3.5 text-slate-400" /> },
                      { key: "custom_branding", label: "Custom Branding", desc: "White-label portal.", icon: <Layers className="h-3.5 w-3.5 text-slate-400" /> },
                    ].map((feat) => {
                      const isChecked = (clientForm.features || []).includes(feat.key);
                      return (
                        <div key={feat.key} className="flex items-start justify-between p-2 border border-slate-100 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-900/10 hover:bg-slate-50/40 dark:hover:bg-slate-900/20 transition-all rounded-none">
                          <div className="flex items-start gap-2">
                            <div className="mt-0.5">{feat.icon}</div>
                            <div className="flex flex-col">
                              <label
                                htmlFor={`edit-feat-${feat.key}`}
                                className="text-[9px] font-black uppercase tracking-widest cursor-pointer text-slate-700 dark:text-slate-300"
                              >
                                {feat.label}
                              </label>
                              <span className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">{feat.desc}</span>
                            </div>
                          </div>
                          <Checkbox
                            id={`edit-feat-${feat.key}`}
                            checked={isChecked}
                            onCheckedChange={(checked) => toggleFeature(feat.key, !!checked)}
                            className="mt-0.5"
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Box 4: Control & Operations */}
              <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <ShieldAlert className="h-4 w-4 text-red-500" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Status & Actions</h3>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 border border-slate-200 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-900/10">
                    <div className="space-y-0.5">
                      <Label htmlFor="edit-active" className="text-[9px] font-black uppercase tracking-widest cursor-pointer">Operational Status</Label>
                      <p className="text-[7.5px] text-slate-400 font-bold uppercase tracking-wider">Toggle active status.</p>
                    </div>
                    <Switch
                      id="edit-active"
                      checked={clientForm.active_status}
                      onCheckedChange={(checked) => setClientForm({ ...clientForm, active_status: checked })}
                    />
                  </div>
                </div>

                <div className="flex gap-2.5 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => navigate("/superadmin/clients")}
                    className="flex-1 h-9 rounded-none border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading}
                    className="flex-1 h-9 bg-slate-900 dark:bg-red-600 hover:bg-red-700 text-white font-black uppercase tracking-widest text-[9px] rounded-none flex items-center justify-center gap-1.5 shadow-sm"
                  >
                    <Save className="h-3.5 w-3.5" />
                    {loading ? "Saving..." : "Save Settings"}
                  </Button>
                </div>
              </div>

            </form>
          )}

          {activeTab === "admins" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Add Admin Form Card */}
              <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between min-h-[380px] h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <UserPlus className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Add New Admin</h3>
                  </div>
                  <form onSubmit={handleAdminSubmit} className="space-y-3" autoComplete="off">
                    <div className="space-y-1">
                      <Label htmlFor="admin-name" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Full Name *</Label>
                      <Input
                        id="admin-name"
                        value={adminForm.name}
                        onChange={(e) => setAdminForm({ ...adminForm, name: e.target.value })}
                        placeholder="Official Name"
                        className="h-9 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs"
                        autoComplete="off"
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
                        className="h-9 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs"
                        autoComplete="off"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="admin-password" className="text-[9px] font-black uppercase tracking-widest text-slate-400">Password *</Label>
                      <div className="relative">
                        <Input
                          id="admin-password"
                          type={showAdminFormPassword ? "text" : "password"}
                          value={adminForm.password}
                          onChange={(e) => setAdminForm({ ...adminForm, password: e.target.value })}
                          placeholder="••••••"
                          minLength={6}
                          className="h-9 pr-10 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs"
                          autoComplete="new-password"
                          required
                        />
                        <button
                          type="button"
                          onClick={() => setShowAdminFormPassword(!showAdminFormPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                          {showAdminFormPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </button>
                      </div>
                    </div>
                    <Button type="submit" disabled={adminLoading} className="h-9 w-full rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] mt-2">
                      {adminLoading ? "GRANTING..." : "CONFIRM ACCESS"}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Admin List Card */}
              <div className="md:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between min-h-[380px] h-full space-y-4">
                <div className="space-y-4 w-full">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <UserCog className="h-4 w-4 text-slate-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Administrators ({clientAdmins.length})
                    </h3>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 max-h-[260px] overflow-y-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Name</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Email</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {clientAdmins.length === 0 ? (
                          <tr>
                            <td colSpan={3} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              No Admins Onboarded
                            </td>
                          </tr>
                        ) : (
                          clientAdmins.map((admin) => (
                            <tr key={admin.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                              <td className="py-2.5 px-3 font-black text-xs text-slate-700 dark:text-slate-350 uppercase tracking-tight">{admin.name}</td>
                              <td className="py-2.5 px-3 text-xs font-medium text-slate-500 font-mono">{admin.email}</td>
                              <td className="py-2.5 px-3 text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    setUpdatingPasswordAdmin(admin);
                                    setNewPasswordForm({ password: "" });
                                  }}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-blue-600 transition-all rounded-none mr-1.5"
                                  title="Reset Password"
                                >
                                  <Key className="h-3.5 w-3.5" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteAdminTarget(admin.id)}
                                  className="h-7 w-7 p-0 text-slate-400 hover:text-red-600 transition-all rounded-none"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </Button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "packages" && (
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
              {/* Provision Form */}
              <div className="md:col-span-2 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between min-h-[380px] h-full space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <Plus className="h-4 w-4 text-blue-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Provision Package Credit</h3>
                  </div>
                  <form onSubmit={async (e) => {
                    e.preventDefault();
                    if (!selectedPackageId) return;
                    setProvisioning(true);
                    const candidatesOverride = customMaxCandidates === "default" ? null : parseInt(customMaxCandidates);
                    const questionsOverride = customMaxQuestions === "default" ? null : parseInt(customMaxQuestions);
                    const res = await packagesApi.purchase(clientId!, selectedPackageId, candidatesOverride, questionsOverride);
                    if (!res.error) {
                      toast({ title: "Success", description: "Package provisioned successfully to client organization" });
                      fetchClientPurchases(clientId!);
                    } else {
                      toast({ title: "Error", description: res.error.message, variant: "destructive" });
                    }
                    setProvisioning(false);
                  }} className="space-y-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Package Tier</label>
                      <select
                        value={selectedPackageId}
                        onChange={(e) => setSelectedPackageId(e.target.value)}
                        className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                        required
                      >
                        <option value="">Select Package...</option>
                        {packages.map((pkg) => (
                          <option key={pkg.id} value={pkg.id}>{pkg.name} (₹{pkg.price})</option>
                        ))}
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custom Candidate Capacity (Override)</label>
                      <select
                        value={customMaxCandidates}
                        onChange={(e) => setCustomMaxCandidates(e.target.value)}
                        className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                      >
                        <option value="default">Use Package Default Limit</option>
                        <option value="50">Up to 50 Candidates</option>
                        <option value="100">Up to 100 Candidates</option>
                        <option value="150">Up to 150 Candidates</option>
                        <option value="200">Up to 200 Candidates</option>
                        <option value="250">Up to 250 Candidates</option>
                        <option value="300">Up to 300 Candidates</option>
                        <option value="400">Up to 400 Candidates</option>
                        <option value="500">Up to 500 Candidates</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custom Question Count (Override)</label>
                      <select
                        value={customMaxQuestions}
                        onChange={(e) => setCustomMaxQuestions(e.target.value)}
                        className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                      >
                        <option value="default">Use Package Default Limit</option>
                        <option value="50">Up to 50 Questions</option>
                        <option value="100">Up to 100 Questions</option>
                        <option value="150">Up to 150 Questions</option>
                        <option value="200">Up to 200 Questions</option>
                        <option value="250">Up to 250 Questions</option>
                        <option value="300">Up to 300 Questions</option>
                      </select>
                    </div>

                    <Button type="submit" disabled={provisioning} className="h-9 w-full rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] mt-2">
                      {provisioning ? "PROVISIONING..." : "ASSIGN CREDIT"}
                    </Button>
                  </form>
                </div>
              </div>

              {/* Credit List Table */}
              <div className="md:col-span-3 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm rounded-none flex flex-col justify-between min-h-[380px] h-full space-y-4">
                <div className="space-y-4 w-full">
                  <div className="flex items-center gap-2 border-b border-slate-100 dark:border-slate-900 pb-2">
                    <Ticket className="h-4 w-4 text-slate-600" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                      Credit Inventory ({purchases.length})
                    </h3>
                  </div>
                  <div className="border border-slate-200 dark:border-slate-800 max-h-[260px] overflow-y-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Package Tier</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Credit Token</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Purchased At</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Status</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Test</th>
                          <th className="py-2 px-3 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {packagesLoading ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              Loading Credits...
                            </td>
                          </tr>
                        ) : purchases.length === 0 ? (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                              No Packages Provisioned
                            </td>
                          </tr>
                        ) : (
                          purchases.map((p) => (
                            <tr key={p.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                              <td className="py-2 px-3 font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight">
                                {p.package_name}
                                {(p.custom_max_candidates !== null || p.custom_max_questions !== null) && (
                                  <span className="block text-[8px] text-indigo-500 dark:text-indigo-400 font-bold lowercase tracking-normal mt-0.5">
                                    override: {p.custom_max_questions !== null ? `${p.custom_max_questions} Qs` : "default"}, {p.custom_max_candidates !== null ? `${p.custom_max_candidates} students` : "default"}
                                  </span>
                                )}
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-500">{p.id.slice(0, 8)}...</td>
                              <td className="py-2 px-3 text-slate-500 font-medium">{new Date(p.purchased_at).toLocaleDateString()}</td>
                              <td className="py-2 px-3">
                                <span className={`text-[8px] font-black px-1.5 py-0.5 border rounded-sm uppercase tracking-widest ${
                                  p.status === "used"
                                    ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800"
                                    : p.status === "requested"
                                      ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900"
                                      : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                }`}>
                                  {p.status === "requested" ? "pending" : p.status}
                                </span>
                              </td>
                              <td className="py-2 px-3 font-mono text-slate-400">{p.assigned_test_id || "Unassigned"}</td>
                              <td className="py-2 px-3 text-right">
                                {p.status === "available" ? (
                                  <div className="flex justify-end gap-1.5">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setEditingPurchase(p);
                                        setEditMaxCandidates(p.custom_max_candidates !== null ? String(p.custom_max_candidates) : "default");
                                        setEditMaxQuestions(p.custom_max_questions !== null ? String(p.custom_max_questions) : "default");
                                      }}
                                      className="h-7 w-7 p-0 text-slate-450 hover:text-blue-600 transition-all rounded-none"
                                      title="Edit Overrides"
                                    >
                                      <Edit2 className="h-3.5 w-3.5" />
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingPurchaseTarget(p.id)}
                                      className="h-7 w-7 p-0 text-slate-450 hover:text-red-650 transition-all rounded-none"
                                      title="Delete Credit"
                                    >
                                      <Trash2 className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                ) : p.status === "requested" ? (
                                  <div className="flex justify-end gap-2 items-center">
                                    <Button
                                      size="sm"
                                      onClick={() => handleApprovePurchase(p.id)}
                                      className="h-6 px-2 bg-blue-600 hover:bg-blue-700 text-white text-[9px] font-black uppercase tracking-wider rounded-none"
                                    >
                                      Approve
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => setDeletingPurchaseTarget(p.id)}
                                      className="h-6 px-2 text-slate-450 hover:text-red-600 text-[9px] font-black uppercase tracking-wider rounded-none border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
                                      title="Reject Request"
                                    >
                                      Reject
                                    </Button>
                                  </div>
                                ) : (
                                  <span className="text-[8.5px] font-black text-slate-400 uppercase tracking-widest pr-2">Locked</span>
                                )}
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

        </main>
        
        <Footer />
      </div>

      {/* Generated Credentials Popup Dialog */}
      <Dialog open={isCredentialsDialogOpen} onOpenChange={setIsCredentialsDialogOpen}>
        <DialogContent className="max-w-md rounded-none border-t-4 border-t-blue-600 p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-500" />
              Credentials Configured
            </DialogTitle>
          </DialogHeader>
          {createdCredentials && (
            <div className="space-y-4 pt-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide leading-relaxed">
                Administrative profile successfully provisioned. Record the credentials below before closing:
              </p>
              <div className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 uppercase text-[9px] font-sans font-bold">Email:</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{createdCredentials.email}</span>
                </div>
                <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800 pt-2">
                  <span className="text-slate-400 uppercase text-[9px] font-sans font-bold">Password:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 dark:text-slate-200">
                      {showPassword ? createdCredentials.password : "••••••"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <Button
                onClick={() => {
                  setIsCredentialsDialogOpen(false);
                  setCreatedCredentials(null);
                  setShowPassword(false);
                }}
                className="w-full h-10 bg-slate-900 dark:bg-slate-800 text-white font-black uppercase tracking-widest text-[9px] rounded-none hover:bg-slate-800 transition-all"
              >
                Close Inspector
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Update Admin Password Dialog */}
      <Dialog open={updatingPasswordAdmin !== null} onOpenChange={(open) => !open && setUpdatingPasswordAdmin(null)}>
        <DialogContent className="max-w-md rounded-none border-t-4 border-t-blue-600 p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Key className="h-4 w-4 text-blue-500" />
              Update Password
            </DialogTitle>
          </DialogHeader>
          {updatingPasswordAdmin && (
            <form onSubmit={handleUpdatePasswordSubmit} className="space-y-4 pt-2" autoComplete="off">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                Set a new password for administrator <span className="text-slate-900 dark:text-white font-black">{updatingPasswordAdmin.name}</span> ({updatingPasswordAdmin.email}):
              </p>
              <div className="space-y-1">
                <Label htmlFor="update-password" className="text-[9px] font-black uppercase tracking-widest text-slate-400">New Password *</Label>
                <div className="relative">
                  <Input
                    id="update-password"
                    type={showNewPassword ? "text" : "password"}
                    value={newPasswordForm.password}
                    onChange={(e) => setNewPasswordForm({ password: e.target.value })}
                    placeholder="••••••"
                    minLength={6}
                    className="h-9 pr-10 rounded-none bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 font-bold text-xs"
                    autoComplete="new-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setUpdatingPasswordAdmin(null)}
                  className="flex-1 h-9 rounded-none border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingPasswordLoading}
                  className="flex-1 h-9 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] rounded-none flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {updatingPasswordLoading ? "Updating..." : "Update Password"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Admin Confirmation Dialog */}
      <AlertDialog open={!!deleteAdminTarget} onOpenChange={(open) => !open && setDeleteAdminTarget(null)}>
        <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Revoke Administrative Access?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              This will strip the administrative capabilities from this user for this organization. They will no longer be able to log in to the Client Admin panel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[9px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[9px] tracking-widest" onClick={() => deleteAdminTarget && handleDeleteAdmin(deleteAdminTarget)}>Confirm Revocation</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Purchase Overrides Dialog */}
      <Dialog open={editingPurchase !== null} onOpenChange={(open) => !open && setEditingPurchase(null)}>
        <DialogContent className="max-w-md rounded-none border-t-4 border-t-blue-600 p-6">
          <DialogHeader>
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-blue-500" />
              Edit Package Credit Overrides
            </DialogTitle>
          </DialogHeader>
          {editingPurchase && (
            <form onSubmit={handleUpdatePurchaseSubmit} className="space-y-4 pt-2">
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wide">
                Modify overrides for this <span className="text-slate-900 dark:text-white font-black">{editingPurchase.package_name}</span> credit:
              </p>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custom Candidate Capacity (Override)</label>
                <select
                  value={editMaxCandidates}
                  onChange={(e) => setEditMaxCandidates(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                >
                  <option value="default">Use Package Default Limit</option>
                  <option value="50">Up to 50 Candidates</option>
                  <option value="100">Up to 100 Candidates</option>
                  <option value="150">Up to 150 Candidates</option>
                  <option value="200">Up to 200 Candidates</option>
                  <option value="250">Up to 250 Candidates</option>
                  <option value="300">Up to 300 Candidates</option>
                  <option value="400">Up to 400 Candidates</option>
                  <option value="500">Up to 500 Candidates</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custom Question Count (Override)</label>
                <select
                  value={editMaxQuestions}
                  onChange={(e) => setEditMaxQuestions(e.target.value)}
                  className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                >
                  <option value="default">Use Package Default Limit</option>
                  <option value="50">Up to 50 Questions</option>
                  <option value="100">Up to 100 Questions</option>
                  <option value="150">Up to 150 Questions</option>
                  <option value="200">Up to 200 Questions</option>
                  <option value="250">Up to 250 Questions</option>
                  <option value="300">Up to 300 Questions</option>
                </select>
              </div>

              <div className="flex gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setEditingPurchase(null)}
                  className="flex-1 h-9 rounded-none border-slate-200 dark:border-slate-800 text-[9px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updatingPurchaseLoading}
                  className="flex-1 h-9 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] rounded-none flex items-center justify-center gap-1.5 shadow-sm"
                >
                  {updatingPurchaseLoading ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Purchase Confirmation Dialog */}
      <AlertDialog open={deletingPurchaseTarget !== null} onOpenChange={(open) => !open && setDeletingPurchaseTarget(null)}>
        <AlertDialogContent className="rounded-none border-t-4 border-t-red-600">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight">Delete Package Credit?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium leading-relaxed">
              This will permanently delete this package credit from the client's inventory. This action is irreversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="pt-4">
            <AlertDialogCancel className="rounded-none border-slate-200 font-bold uppercase text-[9px] tracking-widest">Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700 text-white rounded-none font-black uppercase text-[9px] tracking-widest" onClick={() => deletingPurchaseTarget && handleDeletePurchase(deletingPurchaseTarget)}>Confirm Deletion</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

// Keep icons for licensing list
function Video(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="m16 13 5.223 3.482a.5.5 0 0 0 .777-.416V7.934a.5.5 0 0 0-.777-.416L16 11" /><rect x="2" y="6" width="14" height="12" rx="2" /></svg>
  );
}

function BarChart4(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M3 3v18h18" /><path d="M13 17V9" /><path d="M18 17V5" /><path d="M8 17v-3" /></svg>
  );
}
