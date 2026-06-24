import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Ticket, ShoppingBag, Plus, RefreshCcw, Eye, ShieldAlert, CheckCircle2, Edit2 } from "lucide-react";
import { packagesApi, clientsApi } from "@/services/api/client";

export default function SuperAdminPackages() {
  const [packages, setPackages] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isProvisionOpen, setIsProvisionOpen] = useState(false);
  const [provisioning, setProvisioning] = useState(false);
  
  // Provision form state
  const [selectedClientId, setSelectedClientId] = useState("");
  const [selectedPackageId, setSelectedPackageId] = useState("");
  const [customMaxCandidates, setCustomMaxCandidates] = useState("default");
  const [customMaxQuestions, setCustomMaxQuestions] = useState("default");

  const [editingPackage, setEditingPackage] = useState<any | null>(null);
  const [savingPackage, setSavingPackage] = useState(false);
  const [editForm, setEditForm] = useState<any>({
    id: "",
    name: "",
    price: 0,
    max_questions: 0,
    max_candidates: 0,
    csv_import: false,
    xlsx_export: false,
    analytics: false,
    custom_branding: false,
    basic_proctoring: false,
    camera_proctoring: false,
    priority_support: false,
    active: true
  });

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm.id) return;
    setSavingPackage(true);
    try {
      const res = await packagesApi.updatePackage(editForm);
      if (!res.error) {
        toast({ title: "Success", description: "Package catalog updated successfully" });
        setEditingPackage(null);
        fetchData();
      } else {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to update package details", variant: "destructive" });
    } finally {
      setSavingPackage(false);
    }
  };

  const { toast } = useToast();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [pkgRes, clientRes] = await Promise.all([
        packagesApi.listAvailable(),
        clientsApi.listActive()
      ]);
      
      if (!pkgRes.error && pkgRes.data) setPackages(pkgRes.data);
      if (!clientRes.error && clientRes.data) {
        setClients(clientRes.data as any[]);
        if ((clientRes.data as any[]).length > 0) {
          setSelectedClientId((clientRes.data as any[])[0].id);
        }
      }

    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load packages data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleProvisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientId || !selectedPackageId) return;
    setProvisioning(true);

    try {
      const candidatesOverride = customMaxCandidates === "default" ? null : parseInt(customMaxCandidates);
      const questionsOverride = customMaxQuestions === "default" ? null : parseInt(customMaxQuestions);
      const res = await packagesApi.purchase(selectedClientId, selectedPackageId, candidatesOverride, questionsOverride);
      if (!res.error) {
        toast({ title: "Success", description: "Package provisioned successfully to client organization" });
        setIsProvisionOpen(false);
        fetchData();
      } else {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Provisioning failed", variant: "destructive" });
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Pay Per Test" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Pay Per Test"
          subtitle="Provision and audit credit packages"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <div className="flex gap-2">
              <Button
                onClick={fetchData}
                disabled={loading}
                className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-350 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all"
              >
                <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button
                onClick={() => {
                  if (packages.length > 0) {
                    setSelectedPackageId(packages[0].id);
                  }
                  setCustomMaxCandidates("default");
                  setCustomMaxQuestions("default");
                  setIsProvisionOpen(true);
                }}
                className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all"
              >
                <Plus className="h-3.5 w-3.5" />
                Provision
              </Button>
            </div>
          }
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-10">
          {/* Packages Catalog */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShoppingBag className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Package Catalog</h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {packages.map((pkg) => (
                <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-sm">
                  <div className="space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[9px] font-black uppercase tracking-widest px-2 py-0.5">
                          Tier Credit
                        </span>
                        <span className="text-md font-black text-slate-950 dark:text-white">₹{pkg.price}</span>
                      </div>
                      <div className="mt-3">
                        <h4 className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{pkg.name}</h4>
                      </div>
                      <ul className="space-y-1.5 pt-2 text-[11px] font-bold text-slate-600 dark:text-slate-350">
                        <li>• Candidates: {pkg.max_candidates}</li>
                        <li>• Questions: {pkg.max_questions}</li>
                        <li>• Proctoring: {pkg.camera_proctoring ? "Camera Proctoring Lite" : (pkg.basic_proctoring ? "Basic Proctoring" : "None")}</li>
                        <li>• Branding: {pkg.custom_branding ? "Included" : "None"}</li>
                      </ul>
                    </div>

                    <div className="pt-4 border-t border-slate-100 dark:border-slate-800/60 mt-4 flex justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingPackage(pkg);
                          setEditForm({
                            id: pkg.id,
                            name: pkg.name,
                            price: pkg.price,
                            max_questions: pkg.max_questions,
                            max_candidates: pkg.max_candidates,
                            csv_import: !!pkg.csv_import,
                            xlsx_export: !!pkg.xlsx_export,
                            analytics: !!pkg.analytics,
                            custom_branding: !!pkg.custom_branding,
                            basic_proctoring: !!pkg.basic_proctoring,
                            camera_proctoring: !!pkg.camera_proctoring,
                            priority_support: !!pkg.priority_support,
                            active: !!pkg.active,
                          });
                        }}
                        className="h-8 px-2 rounded-none text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 flex items-center gap-1.5 hover:bg-slate-100 dark:hover:bg-slate-850 transition-all"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        Edit Tier
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Provision Package Dialog */}
      <Dialog open={isProvisionOpen} onOpenChange={(open) => !open && setIsProvisionOpen(false)}>
        <DialogContent className="max-w-xs bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-5 text-slate-900 dark:text-white">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-3 mb-3">
            <DialogTitle className="text-xs font-black uppercase tracking-widest flex items-center gap-2">
              <Plus className="h-3.5 w-3.5 text-blue-500" />
              Assign Credit
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleProvisionSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Client Organization</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                required
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Package Tier</label>
              <select
                value={selectedPackageId}
                onChange={(e) => setSelectedPackageId(e.target.value)}
                className="h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-blue-500"
                required
              >
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

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsProvisionOpen(false)}
                className="h-9 px-4 rounded-none border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={provisioning}
                className="h-9 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
              >
                {provisioning ? "Provisioning..." : "Assign Credit"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Package Dialog */}
      <Dialog open={editingPackage !== null} onOpenChange={(open) => !open && setEditingPackage(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-6 text-slate-900 dark:text-white max-h-[85vh] overflow-y-auto">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Edit2 className="h-4 w-4 text-blue-500" />
              Edit Package Tier Definition
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Package Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="h-10 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-350 text-xs font-bold px-3 outline-none rounded-none focus:border-blue-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Price (₹)</label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) => setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })}
                  className="h-10 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-blue-500"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Default Candidates Limit</label>
                <input
                  type="number"
                  value={editForm.max_candidates}
                  onChange={(e) => setEditForm({ ...editForm, max_candidates: parseInt(e.target.value) || 0 })}
                  className="h-10 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-blue-500"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Default Questions Limit</label>
              <input
                type="number"
                value={editForm.max_questions}
                onChange={(e) => setEditForm({ ...editForm, max_questions: parseInt(e.target.value) || 0 })}
                className="h-10 w-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-blue-500"
                required
              />
            </div>

            <div className="space-y-3 pt-2">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Licensed Features</label>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {[
                  { key: "csv_import", label: "CSV Import" },
                  { key: "xlsx_export", label: "XLSX Export" },
                  { key: "analytics", label: "Analytics" },
                  { key: "custom_branding", label: "Custom Branding" },
                  { key: "basic_proctoring", label: "Basic Proctoring" },
                  { key: "camera_proctoring", label: "Camera Proctoring" },
                  { key: "priority_support", label: "Priority Support" }
                ].map((item) => (
                  <label key={item.key} className="flex items-center gap-2 border border-slate-100 dark:border-slate-900 bg-slate-50/20 dark:bg-slate-900/10 p-2 cursor-pointer hover:bg-slate-50/40 dark:hover:bg-slate-900/25 transition-all">
                    <input
                      type="checkbox"
                      checked={!!editForm[item.key]}
                      onChange={(e) => setEditForm({ ...editForm, [item.key]: e.target.checked })}
                      className="rounded-sm border-slate-300 dark:border-slate-800 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-900 mt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditingPackage(null)}
                className="h-9 px-4 rounded-none border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={savingPackage}
                className="h-9 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
              >
                {savingPackage ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
