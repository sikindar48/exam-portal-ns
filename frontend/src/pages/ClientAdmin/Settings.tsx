import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { clientsApi } from "@/services/api/client";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Toggle } from "@/components/Theme/Toggle";
import { Skeleton } from "@/components/ui/skeleton";
import { Footer } from "@/components/Brand/Footer";
import { ClientAdminSidebar } from "@/components/ClientAdmin/Sidebar";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { ArrowLeft, Save } from "lucide-react";

export default function ClientSettings() {
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    logo_url: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();
  const { clientId, loading: authLoading } = useAuth();

  useEffect(() => {
    if (clientId && !authLoading) {
      fetchClientInfo();
    }
  }, [clientId, authLoading]);

  const fetchClientInfo = async () => {
    setFetchLoading(true);
    const { data, error } = await clientsApi.get(clientId!);
    if (error) {
      toast({ title: "Error", description: "Failed to fetch organization details", variant: "destructive" });
    } else if (data) {
      const d = data as any;
      setFormData({ name: d.name || "", address: d.address || "", logo_url: d.logo_url || "" });
    }
    setFetchLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await clientsApi.update(clientId!, formData);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Success", description: "Organization details updated successfully" });
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <ClientAdminSidebar activeTab="System Settings" />
      
      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader 
          title="Identity Management" 
          subtitle="Configure your institute's public profile" 
          showBackButton={true} 
          backPath="/client-admin"
        />

        <main className="flex-1 overflow-y-auto">
          <div className="container max-w-7xl mx-auto p-8 space-y-10">

            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-none p-8 shadow-xl max-w-2xl mx-auto">
              {fetchLoading ? (
                <div className="space-y-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-11 w-full rounded-none" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-24 w-full rounded-none" />
                  </div>
                  <Skeleton className="h-11 w-full rounded-none" />
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Organization Legal Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Physical Address</Label>
                    <Textarea
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      className="rounded-none border-slate-200 dark:border-slate-800 min-h-[100px] font-medium"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="logo_url" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Branding Asset (Logo URL)</Label>
                    <Input
                      id="logo_url"
                      type="url"
                      value={formData.logo_url}
                      onChange={(e) => setFormData({ ...formData, logo_url: e.target.value })}
                      className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-medium"
                      placeholder="https://assets.example.com/logo.png"
                    />
                    {formData.logo_url && (
                      <div className="mt-4 p-4 border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50 flex items-center justify-center">
                        <img
                          src={formData.logo_url}
                          alt="Organization logo preview"
                          className="h-16 w-auto object-contain"
                          onError={(e) => { e.currentTarget.style.display = "none"; }}
                        />
                      </div>
                    )}
                  </div>

                  <div className="pt-4">
                    <Button 
                      type="submit" 
                      disabled={loading}
                      className="h-11 px-8 rounded-none bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] shadow-lg disabled:opacity-50"
                    >
                      <Save className="mr-2 h-3.5 w-3.5" />
                      {loading ? "Saving..." : "Save Settings"}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
