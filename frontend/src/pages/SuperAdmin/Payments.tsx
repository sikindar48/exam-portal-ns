import React, { useEffect, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { apiClient } from "@/services/api/client";
import { CreditCard, DollarSign, CheckCircle2, Clock, AlertCircle, ShoppingBag, Layers, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function SuperAdminPayments() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{ payments: any[]; stats: any }>({
    payments: [],
    stats: {
      totalOrders: 0,
      paidCount: 0,
      pendingCount: 0,
      failedCount: 0,
      totalRevenueInr: 0,
      planRevenueInr: 0,
      packageRevenueInr: 0,
    },
  });

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await apiClient("/payments");
      if (res && res.payments) {
        setData(res);
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to fetch payments data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const { payments, stats } = data;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Subscriptions" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Payment Transactions"
          subtitle="Real-time Razorpay payments, revenue metrics & client transaction details"
          showBackButton={false}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-8">
            {/* Header Action */}
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-indigo-500" />
                  Razorpay Revenue Dashboard
                </h2>
                <p className="text-xs text-slate-500 font-medium">All online transactions processed across all organizations</p>
              </div>
              <Button
                onClick={fetchPayments}
                disabled={loading}
                variant="outline"
                className="h-9 rounded-none text-xs font-black uppercase tracking-widest border-slate-300 dark:border-slate-800"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-2 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>

            {/* Stat Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Total Revenue */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total Revenue</span>
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 p-2 text-emerald-600 rounded-sm">
                    <DollarSign className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                  ₹{stats.totalRevenueInr.toLocaleString()}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Plans: ₹{stats.planRevenueInr.toLocaleString()}</span>
                  <span>Packages: ₹{stats.packageRevenueInr.toLocaleString()}</span>
                </div>
              </div>

              {/* Successful Payments */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Paid Orders</span>
                  <div className="bg-emerald-100 dark:bg-emerald-950/40 p-2 text-emerald-600 rounded-sm">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-2">
                  {stats.paidCount}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Out of {stats.totalOrders} total payment attempts
                </p>
              </div>

              {/* Pending / Initiated */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pending / Abandoned</span>
                  <div className="bg-amber-100 dark:bg-amber-950/40 p-2 text-amber-600 rounded-sm">
                    <Clock className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-2">
                  {stats.pendingCount}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Orders created but checkout not completed
                </p>
              </div>

              {/* Failed */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Failed Payments</span>
                  <div className="bg-rose-100 dark:bg-rose-950/40 p-2 text-rose-600 rounded-sm">
                    <AlertCircle className="h-4 w-4" />
                  </div>
                </div>
                <p className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-2">
                  {stats.failedCount}
                </p>
                <p className="text-[10px] text-slate-400 font-bold mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  Rejected or cancelled by gateway
                </p>
              </div>
            </div>

            {/* Transactions Table */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
                <h3 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">
                  All Client Transactions ({payments.length})
                </h3>
              </div>

              {loading ? (
                <div className="p-8 text-center text-xs font-bold text-slate-400">Loading payments log...</div>
              ) : payments.length === 0 ? (
                <div className="p-12 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                  No payment records found yet
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-sans">
                    <thead className="bg-slate-50 dark:bg-slate-950 text-[9px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-slate-800">
                      <tr>
                        <th className="p-3.5">Organization</th>
                        <th className="p-3.5">Type</th>
                        <th className="p-3.5">Plan / Package</th>
                        <th className="p-3.5">Amount</th>
                        <th className="p-3.5">Status</th>
                        <th className="p-3.5">Razorpay Payment ID</th>
                        <th className="p-3.5">Order ID</th>
                        <th className="p-3.5">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {payments.map((p) => {
                        const amountInr = (p.amount / 100).toLocaleString();
                        const isPaid = p.status === "paid";
                        const isCreated = p.status === "created";

                        return (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-850/50 transition-colors">
                            <td className="p-3.5 font-bold text-slate-900 dark:text-white">
                              {p.client_name || "Unknown Org"}
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                                p.type === "plan"
                                  ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:border-indigo-800"
                                  : "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:border-amber-800"
                              }`}>
                                {p.type}
                              </span>
                            </td>
                            <td className="p-3.5 font-bold text-slate-700 dark:text-slate-300 uppercase text-[10px]">
                              {p.type === "plan" ? (p.plan_name || p.plan_id) : (p.package_id || "Package")}
                            </td>
                            <td className="p-3.5 font-black text-slate-900 dark:text-white">
                              ₹{amountInr}
                            </td>
                            <td className="p-3.5">
                              <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                                isPaid
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:border-emerald-800"
                                  : isCreated
                                    ? "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:border-slate-700"
                                    : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:border-rose-800"
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-3.5 font-mono text-[10px] text-slate-600 dark:text-slate-400 select-all">
                              {p.razorpay_payment_id || "—"}
                            </td>
                            <td className="p-3.5 font-mono text-[10px] text-slate-500 dark:text-slate-500 select-all">
                              {p.razorpay_order_id}
                            </td>
                            <td className="p-3.5 text-[10px] text-slate-500 font-medium whitespace-nowrap">
                              {new Date(p.created_at).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
