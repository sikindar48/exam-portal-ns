import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Footer } from "@/components/Brand/Footer";
import { CreditCard, ShieldCheck, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { clientsApi } from "@/services/api/client";

const PLAN_DETAILS: Record<string, { name: string; price: string; features: string[] }> = {
  free: {
    name: "Free Plan",
    price: "₹0",
    features: [
      "Up to 3 Exams per Month",
      "Up to 50 Questions per Exam",
      "Up to 20 Students per Exam",
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
      "Everything in Starter, Advanced Analytics",
    ]
  },
  enterprise: {
    name: "Enterprise Plan",
    price: "Custom Pricing",
    features: [
      "Unlimited Exams & Student Enrollment",
      "Unlimited Questions per Exam",
      "Camera Proctoring Lite & Custom Branding",
      "Everything in Growth",
    ]
  }
};

export default function Subscription() {
  const { clientId } = useAuth();
  const [features, setFeatures] = useState<string[]>([]);
  const [client, setClient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFeatures() {
      if (!clientId) return;
      try {
        const { data, error } = await clientsApi.get(clientId);
        if (!error && data) {
          setClient(data);
          if (data.features) {
            setFeatures(data.features);
          }
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    fetchFeatures();
  }, [clientId]);

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
                
                <div className="pb-6 border-b border-slate-100 dark:border-slate-800">
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

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Supported Features</h4>
                  <ul className="space-y-3">
                    {activePlan.features.map((feat, index) => (
                      <li key={index} className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-350">
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                        {feat}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

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

                      <div className="p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/50 rounded-none flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-[10px] leading-relaxed text-amber-700 dark:text-amber-400 font-bold uppercase tracking-wide">
                          Additional modular capabilities are administered globally by your platform provider.
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </div>
  );
}
