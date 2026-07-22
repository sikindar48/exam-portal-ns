import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CreditCard, Edit, Calendar, CheckCircle2, RefreshCcw, ShieldAlert, DollarSign } from "lucide-react";
import { apiClient } from "@/services/api/client";

export default function SuperAdminSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [analytics, setAnalytics] = useState<any>({
    freeCount: 0,
    starterCount: 0,
    growthCount: 0,
    enterpriseCount: 0,
    expiringSoonCount: 0,
    suspendedCount: 0,
  });
  const [loading, setLoading] = useState(false);
  const [editSub, setEditSub] = useState<any | null>(null);
  const [showPriceDialog, setShowPriceDialog] = useState(false);
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [updating, setUpdating] = useState(false);
  const { toast } = useToast();

  // Dialog form state
  const [planId, setPlanId] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [status, setStatus] = useState("");
  const [renewalStatus, setRenewalStatus] = useState("");

  useEffect(() => {
    fetchSubscriptions();
    fetchPlans();
  }, []);

  const fetchSubscriptions = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/api/superadmin/subscriptions");
      if (res && res.subscriptions) {
        setSubscriptions(res.subscriptions);
        setAnalytics(res.analytics);
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to load subscriptions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchPlans = async () => {
    try {
      const res = await apiClient("/superadmin/subscriptions/plans");
      if (res && Array.isArray(res)) {
        setPlans(res);
        const pricesMap: Record<string, number> = {};
        res.forEach((p: any) => {
          pricesMap[p.id] = p.price_inr ?? 0;
        });
        setEditingPrices(pricesMap);
      }
    } catch (err) {
      console.error("Failed to load plan prices:", err);
    }
  };

  const handleEditClick = (sub: any) => {
    setEditSub(sub);
    setPlanId(sub.plan_id);
    setExpiryDate(sub.expiry_date);
    
    let initialStatus = sub.status;
    if (sub.plan_id === "free" && (initialStatus === "trial" || initialStatus === "expired")) {
      initialStatus = "active";
    }
    setStatus(initialStatus);
    setRenewalStatus(sub.renewal_status);
  };

  const handleUpdateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editSub) return;
    setUpdating(true);

    try {
      const res = await apiClient(`/api/superadmin/subscriptions/${editSub.client_id}`, {
        method: "PUT",
        body: {
          plan_id: planId,
          expiry_date: expiryDate,
          status,
          renewal_status: "manual",
        },
      });

      if (res && res.success) {
        toast({
          title: "Success",
          description: "Subscription plan updated successfully",
        });
        setEditSub(null);
        fetchSubscriptions();
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to update subscription",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const handleSavePrices = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpdating(true);
    try {
      for (const pId of Object.keys(editingPrices)) {
        await apiClient(`/superadmin/subscriptions/plans/${pId}`, {
          method: "PATCH",
          body: { price_inr: editingPrices[pId] },
        });
      }
      toast({
        title: "Prices Updated! 🎉",
        description: "Subscription plan pricing updated successfully for all organizations.",
      });
      setShowPriceDialog(false);
      fetchPlans();
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save plan prices",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getPriceFor = (id: string, fallback: number) => {
    const p = plans.find((x) => x.id === id);
    return p ? (p.price_inr ?? fallback) : fallback;
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Subscriptions" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Billing Command"
          subtitle="Subscription & Licensing Control"
          showBackButton={true}
          backPath="/superadmin"
          actions={
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPriceDialog(true)}
                className="h-9 px-4 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5"
              >
                <DollarSign className="h-3.5 w-3.5" />
                Edit Plan Prices
              </Button>
              <Button
                onClick={fetchSubscriptions}
                disabled={loading}
                className="h-9 px-4 rounded-none border-slate-700 bg-transparent text-slate-300 hover:text-white hover:bg-slate-800 text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:border-slate-600 transition-all"
              >
                <RefreshCcw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
                Refresh Plans
              </Button>
            </div>
          }
        />

        <main className="container max-w-7xl mx-auto p-8 flex-1 space-y-8">
          
          {/* Subscription Analytics Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Free Clients</span>
              <h4 className="text-xl font-black mt-2 text-slate-700 dark:text-slate-300">{analytics.freeCount}</h4>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Starter Clients</span>
              <h4 className="text-xl font-black mt-2 text-blue-500">{analytics.starterCount}</h4>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Growth Clients</span>
              <h4 className="text-xl font-black mt-2 text-emerald-500">{analytics.growthCount}</h4>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Enterprise Clients</span>
              <h4 className="text-xl font-black mt-2 text-purple-500">{analytics.enterpriseCount}</h4>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between border-l-amber-500 dark:border-l-amber-500 border-l-2">
              <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest flex items-center gap-1"><Calendar className="h-3 w-3" /> Expiring 7 Days</span>
              <h4 className="text-xl font-black mt-2 text-amber-600 dark:text-amber-500">{analytics.expiringSoonCount}</h4>
            </div>
            <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-4 rounded-none shadow-sm flex flex-col justify-between border-l-red-500 dark:border-l-red-500 border-l-2">
              <span className="text-[9px] font-black text-red-500 uppercase tracking-widest flex items-center gap-1"><ShieldAlert className="h-3 w-3" /> Suspended Orgs</span>
              <h4 className="text-xl font-black mt-2 text-red-600">{analytics.suspendedCount}</h4>
            </div>
          </div>

          {/* Plan Reference Matrix */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 rounded-none shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-900 pb-3">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Plan Reference & Capabilities Matrix</h3>
                <p className="text-[10px] text-slate-500 font-bold mt-1 uppercase tracking-wider">Review limit allocations, pricing, and licensed feature permissions for each subscription tier.</p>
              </div>
              <Button
                onClick={() => setShowPriceDialog(true)}
                size="sm"
                variant="outline"
                className="h-8 rounded-none text-[9px] font-black uppercase tracking-widest border-indigo-500 text-indigo-600 dark:text-indigo-400"
              >
                Set Plan Pricing
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
              {/* Free Plan Card */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-3">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 block">Free Tier</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <h4 className="text-sm font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">Free Plan</h4>
                    <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">₹0 / Forever</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Quotas & Limits</span>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Exams</span>
                      <span>3/Mo</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Cand.</span>
                      <span>20</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Qs</span>
                      <span>50</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Starter Plan Card */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-3">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-blue-500 block">Mid-Range</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <h4 className="text-sm font-black uppercase tracking-tight text-blue-600 dark:text-blue-400">Starter Plan</h4>
                    <span className="text-[10px] font-black text-blue-600/80 dark:text-blue-400/80 uppercase tracking-wider">
                      ₹{getPriceFor("starter", 1999).toLocaleString()} / Yr
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Quotas & Limits</span>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Exams</span>
                      <span>25/Mo</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Cand.</span>
                      <span>100</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Qs</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Growth Plan Card */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-3">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500 block">Scaling</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <h4 className="text-sm font-black uppercase tracking-tight text-emerald-600 dark:text-emerald-400">Growth Plan</h4>
                    <span className="text-[10px] font-black text-emerald-600/80 dark:text-emerald-400/80 uppercase tracking-wider">
                      ₹{getPriceFor("growth", 3999).toLocaleString()} / Yr
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Quotas & Limits</span>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Exams</span>
                      <span>50/Mo</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Cand.</span>
                      <span>250</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Qs</span>
                      <span>200</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Enterprise Plan Card */}
              <div className="border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 p-4 space-y-3">
                <div className="border-b border-slate-200 dark:border-slate-800 pb-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-purple-500 block">Unrestricted</span>
                  <div className="flex items-center justify-between mt-0.5">
                    <h4 className="text-sm font-black uppercase tracking-tight text-purple-600 dark:text-purple-400">Enterprise Plan</h4>
                    <span className="text-[10px] font-black text-purple-600/80 dark:text-purple-400/80 uppercase tracking-wider">
                      ₹{getPriceFor("enterprise", 9999).toLocaleString()} / Yr
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 block">Quotas & Limits</span>
                  <div className="grid grid-cols-3 gap-1 text-[10px] font-bold text-center">
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Exams</span>
                      <span>100/Mo</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Cand.</span>
                      <span>500</span>
                    </div>
                    <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-1">
                      <span className="text-[7px] font-black text-slate-400 block uppercase">Qs</span>
                      <span>300</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Subscriptions Table */}
          <div className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 rounded-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Organization</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Plan Name</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Start Date</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Expiry Date</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest">Status</th>
                    <th className="py-4 px-6 text-[10px] font-black uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-red-600" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-2">Loading Tenant Plans...</p>
                      </td>
                    </tr>
                  ) : subscriptions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <CreditCard className="h-10 w-10 text-slate-300 mx-auto" />
                        <p className="text-xs font-black uppercase tracking-widest text-slate-400 mt-3">No subscriptions found</p>
                      </td>
                    </tr>
                  ) : (
                    subscriptions.map((sub) => {
                      let statusBadge = "bg-slate-100 text-slate-800 border-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800";
                      if (sub.status === "active") statusBadge = "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/20 dark:text-green-400 dark:border-green-900/50";
                      if (sub.status === "trial") statusBadge = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/50";
                      if (sub.status === "expired") statusBadge = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/50";
                      if (sub.status === "suspended") statusBadge = "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/20 dark:text-red-400 dark:border-red-900/50";

                      return (
                        <tr key={sub.client_id} className="border-b border-slate-100 dark:border-slate-900 hover:bg-slate-50 dark:hover:bg-slate-900/30 transition-all">
                          <td className="py-4 px-6">
                            <span className="font-bold text-slate-900 dark:text-white text-xs">{sub.client_name}</span>
                          </td>
                          <td className="py-4 px-6 text-xs font-black uppercase tracking-tight text-slate-700 dark:text-slate-300">
                            {sub.plan_name}
                          </td>
                          <td className="py-4 px-6 text-xs text-slate-500 font-medium">
                            {sub.start_date}
                          </td>
                          <td className="py-4 px-6">
                            {sub.expiry_date ? (() => {
                              const expiry = new Date(sub.expiry_date);
                              const now = new Date();
                              const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / 86400000);
                              const isExpired = diffDays < 0;
                              const isExpiringSoon = !isExpired && diffDays <= 7;
                              return (
                                <span className={`text-xs font-bold flex items-center gap-1 ${
                                  isExpired
                                    ? "text-red-600 dark:text-red-400"
                                    : isExpiringSoon
                                      ? "text-amber-600 dark:text-amber-400"
                                      : "text-slate-500 dark:text-slate-400"
                                }`}>
                                  {isExpired && <span title="Expired" className="text-[10px]">🔴</span>}
                                  <span className={isExpired ? "line-through opacity-70" : ""}>{sub.expiry_date}</span>
                                  {isExpiringSoon && <span className="text-[9px] font-black uppercase tracking-widest">({diffDays} Days)</span>}
                                </span>
                              );
                            })() : (
                              <span className="text-xs text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-4 px-6">
                            <span className={`text-[9px] font-black px-2 py-0.5 border rounded-sm uppercase tracking-widest ${statusBadge}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-right">
                            <button
                              onClick={() => handleEditClick(sub)}
                              className="h-8 px-3 border border-slate-200 dark:border-slate-800 hover:border-red-400 dark:hover:border-red-900 text-slate-600 dark:text-slate-400 hover:text-red-600 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ml-auto transition-all rounded-none"
                            >
                              <Edit className="h-3.5 w-3.5" />
                              Edit Plan
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        <Footer />
      </div>

      {/* Edit Plan Prices Dialog */}
      <Dialog open={showPriceDialog} onOpenChange={setShowPriceDialog}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-6 text-slate-900 dark:text-white">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-indigo-500" />
              Configure Subscription Plan Prices (INR)
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSavePrices} className="space-y-4">
            <p className="text-xs text-slate-500">
              Set the price for each subscription tier. Client Admins will pay this exact amount online via Razorpay.
            </p>

            <div className="space-y-3">
              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Free Plan (₹)</label>
                <input
                  type="number"
                  disabled
                  value={0}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 text-slate-500 text-xs font-bold px-3 outline-none rounded-none"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-blue-500">Starter Plan Price (₹)</label>
                <input
                  type="number"
                  value={editingPrices["starter"] ?? 1999}
                  onChange={(e) => setEditingPrices({ ...editingPrices, starter: Number(e.target.value) || 0 })}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold px-3 outline-none rounded-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Growth Plan Price (₹)</label>
                <input
                  type="number"
                  value={editingPrices["growth"] ?? 3999}
                  onChange={(e) => setEditingPrices({ ...editingPrices, growth: Number(e.target.value) || 0 })}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold px-3 outline-none rounded-none focus:border-indigo-500"
                  required
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[9px] font-black uppercase tracking-widest text-purple-500">Enterprise Plan Price (₹)</label>
                <input
                  type="number"
                  value={editingPrices["enterprise"] ?? 9999}
                  onChange={(e) => setEditingPrices({ ...editingPrices, enterprise: Number(e.target.value) || 0 })}
                  className="w-full h-9 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-900 dark:text-white text-xs font-bold px-3 outline-none rounded-none focus:border-indigo-500"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowPriceDialog(false)}
                className="h-9 px-4 rounded-none text-[10px] font-black uppercase tracking-widest"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating}
                className="h-9 px-6 bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
              >
                {updating ? "Saving..." : "Save Prices"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Subscription Plan Dialog */}
      <Dialog open={editSub !== null} onOpenChange={(open) => !open && setEditSub(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-6 text-slate-900 dark:text-white">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-red-500" />
              Edit Client Plan: {editSub?.client_name}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleUpdateSubmit} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Select Subscription Plan</label>
              <select
                value={planId}
                onChange={(e) => {
                  const newPlanId = e.target.value;
                  setPlanId(newPlanId);
                  if (newPlanId === "free" && (status === "trial" || status === "expired")) {
                    setStatus("active");
                  }
                }}
                className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
              >
                <option value="free">Free Plan (₹0 - 3 Exams, 20 Students, 50 Qs)</option>
                <option value="starter">Starter Plan (₹{getPriceFor("starter", 1999).toLocaleString()} - 25 Exams, 100 Students, 100 Qs)</option>
                <option value="growth">Growth Plan (₹{getPriceFor("growth", 3999).toLocaleString()} - 50 Exams, 250 Students, 200 Qs)</option>
                <option value="enterprise">Enterprise Plan (₹{getPriceFor("enterprise", 9999).toLocaleString()} - Unlimited Limits)</option>
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Plan Expiry Date</label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold px-3 outline-none rounded-none focus:border-red-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Subscription Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full h-10 border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs font-bold uppercase tracking-wider px-3 outline-none rounded-none focus:border-red-500"
              >
                <option value="active">Active</option>
                {planId !== "free" && <option value="trial">Trial</option>}
                {planId !== "free" && <option value="expired">Expired</option>}
                <option value="suspended">Suspended</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-900">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setEditSub(null)}
                className="h-9 px-4 rounded-none border border-slate-200 dark:border-slate-800 text-[10px] font-black uppercase tracking-widest hover:bg-slate-50 dark:hover:bg-slate-900"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={updating}
                className="h-9 px-6 bg-slate-900 dark:bg-red-600 hover:bg-red-700 text-white text-[10px] font-black uppercase tracking-widest transition-all rounded-none"
              >
                {updating ? "Saving changes..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
