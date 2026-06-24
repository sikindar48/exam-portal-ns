import React, { useEffect, useState } from "react";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { packagesApi } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";
import { Ticket, BadgePercent, CheckCircle2, ShoppingBag, Eye, Lock, Globe, Info } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function PackageSelection() {
  const { clientId } = useAuth();
  const { toast } = useToast();
  const [purchases, setPurchases] = useState<any[]>([]);
  const [availablePkgs, setAvailablePkgs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingPurchaseDetails, setViewingPurchaseDetails] = useState<any | null>(null);
  const [requestingPackageId, setRequestingPackageId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchPackagesData();
    }
  }, [clientId]);

  const fetchPackagesData = async () => {
    setLoading(true);
    const [purchRes, availRes] = await Promise.all([
      packagesApi.listPurchases(clientId!),
      packagesApi.listAvailable()
    ]);

    if (purchRes.error) {
      toast({ title: "Error", description: "Failed to fetch purchases", variant: "destructive" });
    } else {
      setPurchases(purchRes.data || []);
    }

    if (availRes.error) {
      toast({ title: "Error", description: "Failed to fetch packages catalog", variant: "destructive" });
    } else {
      setAvailablePkgs(availRes.data || []);
    }
    setLoading(false);
  };

  const handleRequestPackage = async (packageId: string) => {
    if (!clientId || requestingPackageId !== null) return;
    try {
      setRequestingPackageId(packageId);
      const res = await packagesApi.purchase(clientId, packageId);
      if (res.error) {
        toast({
          title: "Request Failed",
          description: res.error.message || "Failed to request package",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Request Submitted Successfully",
          description: "A purchase request has been sent to the superadmin for review."
        });
        await fetchPackagesData();
      }
    } catch (e: any) {
      toast({
        title: "Error",
        description: e.message || "An unexpected error occurred",
        variant: "destructive"
      });
    } finally {
      setRequestingPackageId(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="Subscription" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Pay Per Test Purchases"
          subtitle="View and manage single-use test packages"
          showBackButton={true}
          backPath="/client-admin/subscription"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">
            {/* Packages Catalog */}
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Assessment Packages Catalog</h3>
              </div>
              <p className="text-xs font-bold text-slate-500 max-w-2xl leading-relaxed uppercase tracking-wide">
                Purchase single-use assessment credits for one-off tests outside active plan limits.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {availablePkgs.map((pkg) => (
                  <div key={pkg.id} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 flex flex-col justify-between shadow-md relative overflow-hidden group hover:border-blue-500 transition-all duration-300">
                    <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-2xl group-hover:bg-blue-500/10 transition-all duration-300"></div>
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[9px] font-black uppercase tracking-widest px-2 py-1">
                          Assessment Type
                        </span>
                        <span className="text-xl font-black text-slate-900 dark:text-white">
                          ₹{pkg.price}
                        </span>
                      </div>
                      <div>
                        <h4 className="text-md font-black uppercase tracking-tight text-slate-900 dark:text-white">{pkg.name}</h4>
                      </div>
                      
                      <ul className="space-y-2.5 pt-2">
                        <li className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>Max Questions: {pkg.max_questions}</span>
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>Max Candidates: {pkg.max_candidates}</span>
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>Proctoring: {pkg.camera_proctoring ? "Camera Proctoring Lite" : (pkg.basic_proctoring ? "Basic Proctoring" : "None")}</span>
                        </li>
                        <li className="flex items-center gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
                          <CheckCircle2 className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                          <span>Brand Customization: {pkg.custom_branding ? "Included" : "None"}</span>
                        </li>
                      </ul>
                    </div>

                    <div className="pt-6">
                      <Button
                        onClick={() => handleRequestPackage(pkg.id)}
                        disabled={requestingPackageId !== null}
                        className="w-full h-9 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {requestingPackageId === pkg.id ? "Requesting..." : "Request Package"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Inventory */}
            <div className="space-y-6 pt-6 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-3">
                <Ticket className="h-5 w-5 text-emerald-600" />
                <h3 className="text-sm font-black uppercase tracking-[0.2em] text-slate-900 dark:text-white">Your Purchased Credits</h3>
              </div>

              {loading ? (
                <p className="text-xs font-bold text-slate-400">Loading purchase credits inventory...</p>
              ) : purchases.length === 0 ? (
                <div className="bg-slate-100/50 dark:bg-slate-900/50 border border-dashed border-slate-200 dark:border-slate-800 p-8 text-center">
                  <p className="text-xs font-black uppercase tracking-wider text-slate-400">No Pay Per Test credits found in organization inventory</p>
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
                          className="h-6 w-28 px-2 text-[9px] font-black uppercase tracking-widest rounded-none border border-slate-900 bg-slate-950 text-slate-350 hover:bg-slate-900 hover:text-white dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white transition-colors"
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
