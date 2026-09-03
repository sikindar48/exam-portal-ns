import React, { useEffect, useState } from "react";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { clientsApi, subscriptionRequestsApi, apiClient } from "@/services/api/client";
import { initiateRazorpayPayment } from "@/services/razorpay";
import { CheckCircle2, CreditCard, Send } from "lucide-react";
import { Button } from "@/components/ui/button";

const DEFAULT_PLANS = [
  {
    id: "free",
    name: "Free Plan",
    price_inr: 0,
    priceLabel: "₹0",
    billing: "Forever free",
    features: [
      "Up to 3 Exams per Month",
      "Up to 50 Questions per Exam",
      "Up to 20 Students per Exam",
      "25 MB Storage Limit",
      "Question Shuffle & Basic Analytics",
    ]
  },
  {
    id: "starter",
    name: "Starter Plan",
    price_inr: 1999,
    priceLabel: "₹1,999",
    billing: "Per month",
    features: [
      "Up to 25 Exams per Month",
      "Up to 100 Questions per Exam",
      "Up to 100 Students per Exam",
      "250 MB Storage Limit",
      "Custom Brand Logo, CSV Import, XLSX Export",
      "Advanced Analytics & Basic Proctoring",
    ]
  },
  {
    id: "growth",
    name: "Growth Plan",
    price_inr: 3999,
    priceLabel: "₹3,999",
    billing: "Per month",
    features: [
      "Up to 50 Exams per Month",
      "Up to 200 Questions per Exam",
      "Up to 250 Students per Exam",
      "1 GB Storage Limit",
      "Custom Brand Logo, CSV Import, XLSX Export",
      "Advanced Analytics & Basic Proctoring",
    ]
  },
  {
    id: "enterprise",
    name: "Enterprise Plan",
    price_inr: 9999,
    priceLabel: "₹9,999",
    billing: "Per month",
    features: [
      "Up to 100 Exams per Month",
      "Up to 300 Questions per Exam",
      "Up to 500 Students per Exam",
      "5 GB Storage Limit",
      "Camera Proctoring Lite & Custom Branding",
      "Custom Brand Logo, CSV Import, XLSX Export",
      "Advanced Analytics & Dedicated Support",
    ]
  }
];

export default function Plans() {
  const { clientId, user } = useAuth();
  const { toast } = useToast();
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [requestingPlanId, setRequestingPlanId] = useState<string | null>(null);
  const [payingPlanId, setPayingPlanId] = useState<string | null>(null);
  const [planList, setPlanList] = useState<any[]>(DEFAULT_PLANS);

  useEffect(() => {
    if (clientId) {
      fetchClientData();
    }
  }, [clientId]);

  const fetchClientData = async () => {
    setLoading(true);
    try {
      const [clientRes, plansRes] = await Promise.all([
        clientsApi.get(clientId!),
        apiClient("/subscription-plans").catch(() => null)
      ]);

      if (!clientRes.error && clientRes.data) {
        setClient(clientRes.data);
      }

      if (plansRes && Array.isArray(plansRes) && plansRes.length > 0) {
        // Merge DB prices with feature descriptions
        const updatedPlans = DEFAULT_PLANS.map((dp) => {
          const dbP = plansRes.find((p: any) => p.id === dp.id);
          if (dbP) {
            return {
              ...dp,
              price_inr: dbP.price_inr ?? dp.price_inr,
              priceLabel: `₹${(dbP.price_inr ?? dp.price_inr).toLocaleString()}`,
            };
          }
          return dp;
        });
        setPlanList(updatedPlans);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestUpgrade = async (planId: string) => {
    if (requestingPlanId !== null || payingPlanId !== null) return;
    setRequestingPlanId(planId);
    try {
      const res = await subscriptionRequestsApi.requestUpgrade(planId);
      if (!res.error) {
        toast({
          title: "Upgrade Requested",
          description: `A request to upgrade to the ${planId} plan has been sent to the superadmin.`
        });
      } else {
        toast({
          title: "Request Failed",
          description: res.error.message || "Failed to submit request",
          variant: "destructive"
        });
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setRequestingPlanId(null);
    }
  };

  const handlePayRazorpay = async (plan: any) => {
    if (payingPlanId !== null || requestingPlanId !== null) return;
    setPayingPlanId(plan.id);

    try {
      await initiateRazorpayPayment({
        type: "plan",
        plan_id: plan.id,
        customerName: user?.email || "Client Admin",
        customerEmail: user?.email || "",
        onSuccess: () => {
          toast({
            title: "Payment Successful! 🎉",
            description: `Your organization has been upgraded to ${plan.name}.`,
          });
          fetchClientData();
          setPayingPlanId(null);
        },
        onFailure: (errMsg) => {
          toast({
            title: "Payment Failed / Cancelled",
            description: errMsg,
            variant: "destructive",
          });
          setPayingPlanId(null);
        },
      });
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "Failed to launch payment",
        variant: "destructive",
      });
      setPayingPlanId(null);
    }
  };

  const activePlanId = client?.plan_id || "free";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Subscription" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Subscription Plans"
          subtitle="Explore subscription options, pay instantly with Razorpay, or request manual upgrade"
          showBackButton={true}
          backPath="/client-admin/subscription"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            {loading ? (
              <p className="text-xs font-bold text-slate-450 uppercase tracking-widest">Loading plan options...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {planList.map((plan) => {
                  const isCurrent = activePlanId === plan.id;
                  const isProcessing = payingPlanId === plan.id || requestingPlanId === plan.id;

                  return (
                    <div
                      key={plan.id}
                      className={`bg-white dark:bg-slate-900 border p-6 flex flex-col justify-between shadow-md relative overflow-hidden group transition-all duration-300 ${
                        isCurrent
                          ? "border-blue-500 ring-2 ring-blue-500/20"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-400"
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute top-0 right-0 bg-blue-500 text-white text-[8px] font-black uppercase tracking-widest px-3 py-1">
                          Current
                        </div>
                      )}

                      <div className="space-y-4">
                        <div>
                          <span className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest">
                            {plan.name}
                          </span>
                          <p className="text-2xl font-black text-slate-900 dark:text-white mt-2">
                            {plan.priceLabel}
                          </p>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                            {plan.billing}
                          </span>
                        </div>

                        <ul className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                          {plan.features.map((feat: string, idx: number) => (
                            <li key={idx} className="flex items-start gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                              <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0 mt-0.5" />
                              <span>{feat}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="pt-6 space-y-2">
                        {isCurrent ? (
                          <Button
                            disabled
                            className="w-full h-9 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest"
                          >
                            Active Plan
                          </Button>
                        ) : plan.id === "free" ? (
                          <Button
                            disabled
                            className="w-full h-9 rounded-none bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest"
                          >
                            Downgrade Unavailable
                          </Button>
                        ) : (
                          <>
                            {/* Online Instant Payment Button */}
                            <Button
                              onClick={() => handlePayRazorpay(plan)}
                              disabled={isProcessing}
                              className="w-full h-9 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-[9px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-1.5"
                            >
                              <CreditCard className="h-3.5 w-3.5" />
                              {payingPlanId === plan.id ? "Opening..." : `Pay Online (${plan.priceLabel})`}
                            </Button>

                            {/* Manual Request Upgrade Button */}
                            <button
                              type="button"
                              onClick={() => handleRequestUpgrade(plan.id)}
                              disabled={isProcessing}
                              className="w-full h-8 rounded-none border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 text-[8px] font-black uppercase tracking-widest hover:bg-slate-900 hover:text-white dark:hover:bg-slate-100 dark:hover:text-slate-900 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <Send className="h-3 w-3" />
                              {requestingPlanId === plan.id ? "Requesting..." : "Request Manual Upgrade"}
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>

        <Footer />
      </div>
    </div>
  );
}
