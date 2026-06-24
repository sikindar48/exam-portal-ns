import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { CreditCard, RefreshCcw, Check, X, ShieldAlert } from "lucide-react";
import { subscriptionRequestsApi } from "@/services/api/client";

export default function SubscriptionRequests() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await subscriptionRequestsApi.list();
      if (!res.error && res.data) {
        setRequests(res.data);
      } else if (res.error) {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Failed to load subscription requests", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (requestId: string, action: "approve" | "reject") => {
    setActioningId(requestId);
    try {
      const res = await subscriptionRequestsApi.action(requestId, action);
      if (!res.error) {
        toast({
          title: action === "approve" ? "Approved" : "Rejected",
          description: `Subscription upgrade request has been successfully ${action}d.`
        });
        fetchRequests();
      } else {
        toast({ title: "Error", description: res.error.message, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "Error", description: "Operation failed", variant: "destructive" });
    } finally {
      setActioningId(null);
    }
  };

  const pendingRequests = requests.filter(r => r.status === "requested");
  const requestHistory = requests.filter(r => r.status !== "requested");

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Subscriptions" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Subscription Requests & Upgrades"
          subtitle="Review and process organization tier upgrade requests"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <Button
              onClick={fetchRequests}
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
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Pending Upgrade Requests</h3>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Client Organization</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Target Plan Tier</th>
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
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No pending upgrade requests</p>
                        </td>
                      </tr>
                    ) : (
                      pendingRequests.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all text-xs">
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{r.client_name}</td>
                          <td className="py-4 px-6 font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {r.plan_name || r.plan_id}
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{new Date(r.requested_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6 text-right space-x-2">
                            <Button
                              size="sm"
                              disabled={actioningId !== null}
                              onClick={() => handleAction(r.id, "approve")}
                              className="h-8 px-3 rounded-none bg-emerald-600 hover:bg-emerald-700 text-white text-[9px] font-black uppercase tracking-widest inline-flex items-center gap-1.5 transition-all"
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={actioningId !== null}
                              onClick={() => handleAction(r.id, "reject")}
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

          {/* Request History */}
          <div className="space-y-4 pt-6 border-t border-slate-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-blue-600" />
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Upgrade Request History</h3>
            </div>

            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Client Organization</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Plan Tier</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Requested At</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Actioned At</th>
                      <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Loading logs...</p>
                        </td>
                      </tr>
                    ) : requestHistory.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          <p className="text-xs font-black uppercase tracking-widest text-slate-400">No past request history found</p>
                        </td>
                      </tr>
                    ) : (
                      requestHistory.map((r) => (
                        <tr key={r.id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all text-xs">
                          <td className="py-4 px-6 font-bold text-slate-900 dark:text-white">{r.client_name}</td>
                          <td className="py-4 px-6 font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {r.plan_name || r.plan_id}
                          </td>
                          <td className="py-4 px-6 text-slate-500 font-medium">{new Date(r.requested_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6 text-slate-500 font-medium">
                            {r.actioned_at ? new Date(r.actioned_at).toLocaleDateString() : "-"}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[8px] font-black px-2 py-0.5 border rounded-sm uppercase tracking-widest ${
                              r.status === "approved"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900"
                                : "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900"
                            }`}>
                              {r.status}
                            </span>
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
