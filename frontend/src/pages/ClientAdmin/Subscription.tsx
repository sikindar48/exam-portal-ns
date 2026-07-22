import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle, Ticket, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { clientsApi, packagesApi } from "@/services/api/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: "Free Plan",
    price: "₹0",
    features: [
      "Up to 3 Exams per Month",
      "Up to 50 Questions per Exam",
      "Up to 20 Students per Exam",
      "25 MB Storage Limit",
      "Question Shuffle & Basic Analytics",
    ]
  },
  starter: {
    name: "Starter Plan",
    price: "₹1,999",
    features: [
      "Up to 25 Exams per Month",
      "Up to 100 Questions per Exam",
      "Up to 100 Students per Exam",
      "250 MB Storage Limit",
      "Custom Brand Logo, CSV Import, XLSX Export",
      "Advanced Analytics & Basic Proctoring",
    ]
  },
  growth: {
    name: "Growth Plan",
    price: "₹3,999",
    features: [
      "Up to 50 Exams per Month",
      "Up to 200 Questions per Exam",
      "Up to 250 Students per Exam",
      "1 GB Storage Limit",
      "Everything in Starter, Advanced Analytics",
    ]
  },
  enterprise: {
    name: "Enterprise Plan",
    price: "Custom Pricing",
    features: [
      "Unlimited Exams & Student Enrollment",
      "Unlimited Questions per Exam",
      "5 GB Storage Limit",
      "Camera Proctoring Lite & Custom Branding",
      "Everything in Growth",
    ]
  }
};

export default function Subscription() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [features, setFeatures] = useState<string[]>([]);
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [purchasesLoading, setPurchasesLoading] = useState(true);
  const [viewingPurchaseDetails, setViewingPurchaseDetails] = useState<any | null>(null);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchSubscriptionData() {
      if (!clientId) return;
      try {
        setLoading(true);
        setPurchasesLoading(true);
        const [clientRes, purchRes] = await Promise.all([
          clientsApi.get(clientId),
          packagesApi.listPurchases(clientId)
        ]);

        if (!clientRes.error && clientRes.data) {
          setClient(clientRes.data);
          if (clientRes.data.features) {
            setFeatures(clientRes.data.features);
          }
        }

        if (!purchRes.error && purchRes.data) {
          setPurchases(purchRes.data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
        setPurchasesLoading(false);
      }
    }
    fetchSubscriptionData();
  }, [clientId]);

  const navigate = useNavigate();
  const activePlan = client?.plan_id ? PLAN_DETAILS[client.plan_id] : PLAN_DETAILS.free;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Subscription" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Subscription & Licenses"
          subtitle="Manage active plan features & limits"
          showBackButton={true}
          backPath="/client-admin"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            <div className="grid md:grid-cols-3 gap-8">
              {/* Plan Card */}
              <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-5 w-5 text-blue-600" />
                  <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Active Plan</h3>
                </div>
                
                <div className="pb-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-2.5 py-1">
                      {activePlan.name}
                    </span>
                    <p className="text-3xl font-black tracking-tight text-slate-900 dark:text-white mt-4">
                      {activePlan.price}
                      {client?.plan_id !== "enterprise" && (
                        <span className="text-xs text-slate-400 font-bold uppercase tracking-wider"> / month</span>
                      )}
                    </p>
                  </div>
                  {client?.plan_id !== "enterprise" && (
                    <Button
                      onClick={() => navigate("/client-admin/subscription/plans")}
                      className="bg-blue-650 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none h-9 px-4 shrink-0 transition-colors"
                    >
                      Upgrade Plan
                    </Button>
                  )}
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supported Features</h4>
                  <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                    {activePlan.features.map((feat, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-emerald-600" />
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white">Your Purchased Credits</h4>
                  </div>
                  {purchasesLoading ? (
                    <p className="text-xs font-bold text-slate-400">Loading purchase credits inventory...</p>
                  ) : purchases.length === 0 ? (
                    <div className="bg-slate-50 dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 p-6 text-center">
                      <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">No Pay Per Test credits found in organization inventory</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {purchases.map((p) => (
                        <div
                          key={p.id}
                          className={`border p-3.5 flex flex-row items-center justify-between gap-4 transition-all bg-white dark:bg-slate-900 ${p.status === "used" ? "border-slate-100 dark:border-slate-800 opacity-65" : "border-emerald-500 dark:border-emerald-600/50"}`}
                        >
                          <div className="flex items-center gap-4 flex-wrap sm:flex-nowrap flex-1">
                            <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border shrink-0 ${
                              p.status === "used"
                                ? "text-slate-400 bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850"
                                : p.status === "requested"
                                  ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900"
                                  : "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900"
                            }`}>
                              {p.status === "used" ? "USED" : p.status === "requested" ? "PENDING APPROVAL" : "AVAILABLE / UNUSED"}
                            </span>
                            
                            <div className="min-w-[120px] shrink-0">
                              <h4 className="text-xs font-black uppercase tracking-tight text-slate-900 dark:text-white leading-none">{p.package_name}</h4>
                            </div>

                            <div className="text-[9px] text-slate-400 font-bold uppercase tracking-wider shrink-0">
                              Purchased: {new Date(p.purchased_at).toLocaleDateString()}
                            </div>

                            {p.status === "used" && (
                              <div className="bg-slate-50 dark:bg-slate-950 px-2 py-1 border border-slate-100 dark:border-slate-850 flex items-center gap-1.5 text-[9px] shrink-0">
                                <span className="text-slate-400 font-black uppercase tracking-widest">Test ID:</span>
                                <span className="font-mono text-slate-700 dark:text-slate-350">{p.assigned_test_id ? `${p.assigned_test_id.slice(0, 8)}...` : ""}</span>
                              </div>
                            )}
                          </div>

                          <div className="shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setViewingPurchaseDetails(p)}
                              className="h-6 w-28 px-2 text-[9px] font-black uppercase tracking-widest rounded-none border border-slate-300 bg-transparent text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-transparent dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
                            >
                              View Details
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Sidebar with License & PPT Info */}
              <div className="space-y-6">
                {/* License list */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Gated Features</h3>
                  </div>

                  <div className="space-y-3 pt-2">
                    {loading ? (
                      <p className="text-xs font-bold text-slate-400">Loading license data...</p>
                    ) : (
                      <>
                        <div className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350">Camera Proctoring</span>
                          {features.includes("camera_proctoring") ? (
                            <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 border border-green-100 px-2 py-0.5">Active</span>
                          ) : (
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 bg-slate-100 border border-slate-200 px-2 py-0.5">Inactive</span>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Pay Per Test Credits info */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 shadow-xl space-y-6">
                  <div className="flex items-center gap-3">
                    <Ticket className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Pay Per Test</h3>
                  </div>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wide leading-relaxed">
                    Run custom tests outside active plan limits.
                  </p>
                  <Button
                    onClick={() => navigate("/client-admin/subscription/packages")}
                    className="w-full h-10 rounded-none bg-indigo-600 hover:bg-indigo-700 text-white text-[10px] font-black uppercase tracking-widest"
                  >
                    View Inventory
                  </Button>
                </div>
              </div>
            </div>

          </div>
        </main>
        
        <Footer />
      </div>

      {/* Detail Dialog */}
      <Dialog open={viewingPurchaseDetails !== null} onOpenChange={(open) => !open && setViewingPurchaseDetails(null)}>
        <DialogContent className="max-w-md bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-none font-sans p-6 text-slate-900 dark:text-white">
          <DialogHeader className="border-b border-slate-100 dark:border-slate-900 pb-4 mb-4">
            <DialogTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
              <Info className="h-4 w-4 text-blue-500" />
              Credit Token Details
            </DialogTitle>
          </DialogHeader>

          {viewingPurchaseDetails && (
            <div className="space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-900">
                <span className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Status:</span>
                <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 border ${
                  viewingPurchaseDetails.status === "used"
                    ? "text-slate-400 bg-slate-50 border-slate-200 dark:bg-slate-950 dark:border-slate-850"
                    : viewingPurchaseDetails.status === "requested"
                      ? "text-amber-600 bg-amber-50 border-amber-100 dark:bg-amber-950/20 dark:border-amber-900"
                      : "text-emerald-600 bg-emerald-50 border-emerald-100 dark:bg-emerald-950/20 dark:border-emerald-900"
                }`}>
                  {viewingPurchaseDetails.status === "used" ? "USED" : viewingPurchaseDetails.status === "requested" ? "PENDING APPROVAL" : "AVAILABLE / UNUSED"}
                </span>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Package Tier</span>
                <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">{viewingPurchaseDetails.package_name}</p>
              </div>

              <div className="space-y-1">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Credit Token (UUID)</span>
                <p className="text-xs font-mono bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800 select-all break-all">{viewingPurchaseDetails.id}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Purchased On</span>
                  <p className="text-xs font-bold text-slate-750 dark:text-slate-300">{new Date(viewingPurchaseDetails.purchased_at).toLocaleDateString()}</p>
                </div>
                {viewingPurchaseDetails.used_at && (
                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Used On</span>
                    <p className="text-xs font-bold text-slate-755 dark:text-slate-300">{new Date(viewingPurchaseDetails.used_at).toLocaleDateString()}</p>
                  </div>
                )}
              </div>

              {viewingPurchaseDetails.assigned_test_id && (
                <div className="space-y-1">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Assigned Test (UUID)</span>
                  <p className="text-xs font-mono bg-slate-50 dark:bg-slate-950 p-2 border border-slate-100 dark:border-slate-800 select-all break-all">{viewingPurchaseDetails.assigned_test_id}</p>
                </div>
              )}

              <div className="pt-2 border-t border-slate-100 dark:border-slate-900 space-y-2">
                <h5 className="text-[9px] font-black uppercase tracking-widest text-slate-400">Limits & Features Configured</h5>
                <ul className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs font-bold text-slate-700 dark:text-slate-300">
                  <li>• Max Candidates: {viewingPurchaseDetails.custom_max_candidates !== null ? viewingPurchaseDetails.custom_max_candidates : viewingPurchaseDetails.default_max_candidates}</li>
                  <li>• Max Questions: {viewingPurchaseDetails.custom_max_questions !== null ? viewingPurchaseDetails.custom_max_questions : viewingPurchaseDetails.default_max_questions}</li>
                  <li>• Camera Proctoring: {viewingPurchaseDetails.camera_proctoring ? "Yes" : "No"}</li>
                  <li>• Basic Proctoring: {viewingPurchaseDetails.basic_proctoring ? "Yes" : "No"}</li>
                  <li>• Custom Branding: {viewingPurchaseDetails.custom_branding ? "Yes" : "No"}</li>
                  <li>• CSV Student Import: {viewingPurchaseDetails.csv_import ? "Yes" : "No"}</li>
                  <li>• XLSX Export: {viewingPurchaseDetails.xlsx_export ? "Yes" : "No"}</li>
                </ul>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-900 flex justify-end">
                <Button
                  onClick={() => setViewingPurchaseDetails(null)}
                  className="h-9 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-none"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
