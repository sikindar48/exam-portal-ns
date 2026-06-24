import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Ticket, RefreshCcw, Check, X, ShieldAlert, Edit2 } from "lucide-react";
import { packagesApi, clientsApi } from "@/services/api/client";

export default function PackagesRequests() {
  const [clients, setClients] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const clientRes = await clientsApi.listActive();
      
      if (!clientRes.error && clientRes.data) {
        setClients(clientRes.data as any[]);
        const clientsList = clientRes.data as any[];
        
        // Fetch all purchases (using client_id to list purchases for each and merge)
        const purchasePromises = clientsList.map(async (c) => {
          const res = await packagesApi.listPurchases(c.id);
          if (!res.error && res.data) {
            return (res.data as any[]).map(p => ({ ...p, client_name: c.name }));
          }
          return [];
        });
        const allPurchasesResults = await Promise.all(purchasePromises);
        setPurchases(allPurchasesResults.flat());
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load requests data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (purchaseId: string) => {
    setActioningId(purchaseId);
    try {
      const res = await packagesApi.updatePurchase(purchaseId, null, null, "available");
      if (!res.error) {
        toast({ title: "Approved", description: "Package request has been approved and is now available." });
        fetchData();
      } else {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Operation failed", variant: "destructive" });
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (purchaseId: string) => {
    setActioningId(purchaseId);
    try {
      const res = await packagesApi.deletePurchase(purchaseId);
      if (!res.error) {
        toast({ title: "Rejected", description: "Package request has been rejected and deleted." });
        fetchData();
      } else {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Operation failed", variant: "destructive" });
    } finally {
      setActioningId(null);
    }
  };

  const pendingRequests = purchases.filter(p => p.status === "requested");
  const inventoryHistory = purchases.filter(p => p.status !== "requested");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Pay Per Test" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Pay Per Test Requests & Inventory"
          subtitle="Approve purchase requests and monitor client credits"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <Button
              onClick={fetchData}
              disabled={loading}
              className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-350 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all"
            >
              <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
          }
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-10">
          {/* Pending Requests */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <ShieldAlert className="h-5 w-5 text-amber-500" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Pending Requests</h3>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Client Organization</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Package Tier</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Requested At</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-amber-500" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Loading Requests...</p>
                        </td>
                      </tr>
                    ) : pendingRequests.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-12 text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No pending package requests</p>
                        </td>
                      </tr>
                    ) : (
                      pendingRequests.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all text-xs">
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{p.client_name}</td>
                          <td className="py-4 px-6 font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {p.package_name}
                            {(p.custom_max_candidates !== null || p.custom_max_questions !== null) && (
                              <span className="block text-[9px] text-indigo-500 dark:text-indigo-400 font-bold lowercase tracking-normal mt-0.5">
                                override: {p.custom_max_questions !== null ? `${p.custom_max_questions} Qs` : "default"}, {p.custom_max_candidates !== null ? `${p.custom_max_candidates} students` : "default"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{new Date(p.purchased_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <Button
                              size="sm"
                              disabled={actioningId !== null}
                              onClick={() => handleApprove(p.id)}
                              className="h-8 px-3 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actioningId !== null}
                              onClick={() => handleReject(p.id)}
                              className="h-8 px-3 rounded-none bg-red-600 hover:bg-red-700 text-white text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
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

          {/* Credit Inventory */}
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Ticket className="h-5 w-5 text-emerald-600" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Credit Inventory</h3>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Client Organization</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Package Tier</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Credit Token</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Purchased At</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Assigned Test</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Loading Credit Logs...</p>
                        </td>
                      </tr>
                    ) : inventoryHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <Ticket className="h-10 w-10 text-slate-300 mx-auto" />
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">No package credits provisioned yet</p>
                        </td>
                      </tr>
                    ) : (
                      inventoryHistory.map((p) => (
                        <tr key={p.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all text-xs">
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{p.client_name}</td>
                          <td className="py-4 px-6 font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {p.package_name}
                            {(p.custom_max_candidates !== null || p.custom_max_questions !== null) && (
                              <span className="block text-[9px] text-indigo-500 dark:text-indigo-400 font-bold lowercase tracking-normal mt-0.5">
                                override: {p.custom_max_questions !== null ? `${p.custom_max_questions} Qs` : "default"}, {p.custom_max_candidates !== null ? `${p.custom_max_candidates} students` : "default"}
                              </span>
                            )}
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-500">{p.id.slice(0, 8)}...</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{new Date(p.purchased_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black px-2 py-0.5 border rounded-sm uppercase tracking-widest ${p.status === "used" ? "bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-900 dark:border-slate-800" : "bg-emerald-50 text-emerald-700 border-emerald-205 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"}`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-mono text-slate-400">{p.assigned_test_id || "Unassigned"}</td>
                          <td className="py-4 px-6 text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => navigate(`/superadmin/clients/setting?id=${p.client_id}&tab=packages`)}
                              className="h-7 px-2.5 rounded-none text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-900 inline-flex items-center gap-1 transition-all"
                            >
                              <Edit2 className="h-3 w-3" />
                              Edit
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
        </main>

        <Footer />
      </div>
    </div>
  );
}
