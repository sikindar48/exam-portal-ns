import React, { useEffect, useRef, useState } from "react";
import { SuperAdminSidebar } from "@/components/SuperAdmin/Sidebar";
import { Footer } from "@/components/Brand/Footer";
import { useToast } from "@/hooks/use-toast";
import { ClientAdminHeader } from "@/components/ClientAdmin/Header";
import { Settings, Save, AlertTriangle, Key, Info, Upload, X, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { apiClient } from "@/services/api/client";
import { useAuth } from "@/contexts/AuthContext";

export default function SuperAdminSettings() {
  const { toast } = useToast();
  const { token } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Settings state
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [announcementBanner, setAnnouncementBanner] = useState("");
  const [registrationEnabled, setRegistrationEnabled] = useState(true);
  const [platformLogo, setPlatformLogo] = useState(""); // base64 or URL of newly selected file
  const [savedLogo, setSavedLogo] = useState(""); // base64 or URL of what's currently saved
  const [logoPreview, setLogoPreview] = useState("");
  const [loading, setLoading] = useState(false);
  const [logoLoading, setLogoLoading] = useState(false);

  // Password reset state
  const [resetEmail, setResetEmail] = useState("");
  const [resetPassword, setResetPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await apiClient("/settings", { token: token || undefined });
      if (res) {
        setMaintenanceMode(res.maintenance_mode);
        setAnnouncementBanner(res.announcement_banner);
        setRegistrationEnabled(res.registration_enabled);
        if (res.platform_logo) {
          setPlatformLogo(res.platform_logo);
          setSavedLogo(res.platform_logo);
          setLogoPreview(res.platform_logo);
        }
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to load settings", variant: "destructive" });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await apiClient("/settings", {
        method: "POST",
        token: token || undefined,
        body: {
          maintenance_mode: maintenanceMode,
          announcement_banner: announcementBanner,
          registration_enabled: registrationEnabled,
        },
      });
      toast({ title: "Success", description: "Global configuration updated successfully." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to update settings", variant: "destructive" });
    }
    setLoading(false);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please upload an image file (PNG, JPG, SVG, etc.)", variant: "destructive" });
      return;
    }

    // Validate file size (max 500KB for base64 storage)
    if (file.size > 500 * 1024) {
      toast({ title: "File too large", description: "Logo must be under 500KB. Use a compressed PNG or SVG.", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      setLogoPreview(base64);  // for display
      setPlatformLogo(base64); // mark as pending save (different from savedLogo)
    };
    reader.readAsDataURL(file);
  };

  const handleSaveLogo = async () => {
    if (!platformLogo) return;
    setLogoLoading(true);
    try {
      await apiClient("/settings", {
        method: "POST",
        token: token || undefined,
        body: { platform_logo: platformLogo },
      });
      // Mark as saved
      setSavedLogo(platformLogo);
      // Persist to localStorage so sidebar picks it up immediately
      localStorage.setItem("platform_logo", platformLogo);
      window.dispatchEvent(new Event("platform_logo_updated"));
      toast({ title: "Logo Saved", description: "Platform logo updated and reflected in the sidebar." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to save logo", variant: "destructive" });
    }
    setLogoLoading(false);
  };

  const handleRemoveLogo = async () => {
    setLogoLoading(true);
    try {
      await apiClient("/settings", {
        method: "POST",
        token: token || undefined,
        body: { platform_logo: "" },
      });
      setPlatformLogo("");
      setSavedLogo("");
      setLogoPreview("");
      localStorage.removeItem("platform_logo");
      window.dispatchEvent(new Event("platform_logo_updated"));
      toast({ title: "Logo Removed", description: "Platform logo has been cleared." });
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to remove logo", variant: "destructive" });
    }
    setLogoLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail || !resetPassword) {
      toast({ title: "Validation Error", description: "Email and password are required.", variant: "destructive" });
      return;
    }
    if (resetPassword.length < 6) {
      toast({ title: "Validation Error", description: "Password must be at least 6 characters.", variant: "destructive" });
      return;
    }
    setResetLoading(true);
    try {
      await apiClient("/settings/reset-password", {
        method: "POST",
        token: token || undefined,
        body: { email: resetEmail, password: resetPassword },
      });
      toast({ title: "Success", description: `Password reset successfully for ${resetEmail}.` });
      setResetEmail("");
      setResetPassword("");
    } catch (err: any) {
      toast({ title: "Error", description: err.message || "Failed to reset password", variant: "destructive" });
    }
    setResetLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex font-sans">
      <SuperAdminSidebar activeTab="Settings" />

      <div className="flex-1 flex flex-col min-h-screen">
        <ClientAdminHeader
          title="Settings"
          subtitle="Global configuration & security"
          showBackButton={true}
          backPath="/superadmin"
        />

        {/* Content */}
        <main className="container max-w-4xl mx-auto p-8 flex-1 space-y-8">

          {/* ── Section 1: Platform Logo Branding ── */}
          <Card className="rounded-none border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Image className="h-4 w-4 text-blue-600" />
                Platform Branding
              </CardTitle>
              <CardDescription className="text-xs">
                Upload a logo for the sidebar. Max 500KB.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row items-start gap-6">
                {/* Logo Preview */}
                <div className="w-32 h-32 border-2 border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center shrink-0 bg-slate-50 dark:bg-slate-900 overflow-hidden relative group">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Platform Logo" className="max-w-full max-h-full object-contain p-2" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[9px] font-black text-white uppercase tracking-widest">Preview</span>
                      </div>
                    </>
                  ) : (
                    <div className="text-center">
                      <Image className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-1" />
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">No Logo</p>
                    </div>
                  )}
                </div>

                {/* Upload / URL Controls */}
                <div className="flex-1 space-y-3">
                  <div>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 block">
                      Organization Logo
                    </Label>

                    <div className="space-y-4">
                      <div className="max-w-md space-y-2">
                        <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          Image URL
                        </Label>
                        <Input
                          type="url"
                          placeholder="https://example.com/logo.png"
                          value={platformLogo && !platformLogo.startsWith("data:") ? platformLogo : ""}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPlatformLogo(val);
                            setLogoPreview(val);
                          }}
                          className="rounded-none border-slate-200 dark:border-slate-800 h-10 text-xs font-medium focus-visible:ring-1 focus-visible:ring-blue-600"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">
                          Or Upload Local File
                        </Label>
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="h-10 px-4 rounded-none border border-slate-200 dark:border-slate-800 bg-transparent text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                          variant="outline"
                        >
                          <Upload className="h-3.5 w-3.5" />
                          {logoPreview && logoPreview.startsWith("data:") ? "Change Local File" : "Choose File"}
                        </Button>
                      </div>

                      <div className="flex gap-2 flex-wrap pt-2">
                        {logoPreview && (
                          <>
                            <Button
                              type="button"
                              onClick={handleSaveLogo}
                              disabled={logoLoading || !platformLogo || platformLogo === savedLogo}
                              className="h-10 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              <Save className="h-3.5 w-3.5" />
                              {logoLoading ? "Saving..." : "Save Logo"}
                            </Button>
                            <Button
                              type="button"
                              onClick={handleRemoveLogo}
                              disabled={logoLoading}
                              variant="outline"
                              className="h-10 px-4 rounded-none border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 text-[10px] font-black uppercase tracking-widest flex items-center gap-2"
                            >
                              <X className="h-3.5 w-3.5" />
                              Remove
                            </Button>
                          </>
                        )}
                      </div>
                    </div>

                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-2 flex items-center gap-1">
                      <Info className="h-3 w-3 shrink-0" />
                      Shown in sidebar. Stored as base64 or loaded from URL.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Section 2: Maintenance & Banner ── */}
          <Card className="rounded-none border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-black uppercase tracking-widest">Platform Controls</CardTitle>
              <CardDescription className="text-xs">Maintenance & announcement settings.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveSettings} className="space-y-6">

                {/* Maintenance Mode */}
                <div className="flex items-center justify-between p-4 border border-red-100 dark:border-red-950/50 bg-red-50/20 dark:bg-red-950/10">
                  <div className="space-y-1 pr-4">
                    <Label htmlFor="maint-mode" className="text-xs font-black uppercase tracking-widest text-red-600 dark:text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5" />
                      Maintenance Mode
                    </Label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider leading-relaxed">
                      Blocks student attempts. Admin panels stay active.
                    </p>
                  </div>
                  <Switch
                    id="maint-mode"
                    checked={maintenanceMode}
                    onCheckedChange={setMaintenanceMode}
                  />
                </div>

                {/* Announcement Banner */}
                <div className="space-y-2">
                  <Label htmlFor="banner" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Announcement Banner Text</Label>
                  <Input
                    id="banner"
                    value={announcementBanner}
                    onChange={(e) => setAnnouncementBanner(e.target.value)}
                    placeholder="e.g. System Maintenance Scheduled: Tonight from 11:00 PM to 12:00 AM UTC"
                    className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                  />
                  <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1 mt-1">
                    <Info className="h-3 w-3 shrink-0" />
                    Leave empty to hide. Visible platform-wide to all users.
                  </p>
                </div>

                {/* Registration Switch */}
                <div className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30">
                  <div className="space-y-1">
                    <Label htmlFor="reg-mode" className="text-xs font-black uppercase tracking-widest">Registration</Label>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                      Allow users to self-register.
                    </p>
                  </div>
                  <Switch
                    id="reg-mode"
                    checked={registrationEnabled}
                    onCheckedChange={setRegistrationEnabled}
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={loading}
                    className="h-11 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-none"
                  >
                    <Save className="mr-2 h-4 w-4" />
                    {loading ? "SAVING..." : "SAVE SETTINGS"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* ── Section 3: Password Reset ── */}
          <Card className="rounded-none border-slate-200 dark:border-slate-800 shadow-md">
            <CardHeader className="border-b border-slate-100 dark:border-slate-900 bg-slate-50/50 dark:bg-slate-900/50">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                <Key className="h-4 w-4 text-blue-600" />
                Password Reset
              </CardTitle>
              <CardDescription className="text-xs">Reset password for any user account.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reset-email" className="text-[10px] font-black uppercase tracking-widest text-slate-400">Target User Email</Label>
                    <Input
                      id="reset-email"
                      type="email"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      placeholder="admin@organization.com"
                      className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reset-pass" className="text-[10px] font-black uppercase tracking-widest text-slate-400">New Password</Label>
                    <Input
                      id="reset-pass"
                      type="password"
                      value={resetPassword}
                      onChange={(e) => setResetPassword(e.target.value)}
                      placeholder="Minimum 6 characters"
                      className="h-11 rounded-none border-slate-200 dark:border-slate-800 font-bold"
                      required
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <Button
                    type="submit"
                    disabled={resetLoading}
                    className="h-11 px-6 bg-slate-900 dark:bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[11px] rounded-none"
                  >
                    {resetLoading ? "RESETTING..." : "RESET PASSWORD"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </main>

        <Footer />
      </div>
    </div>
  );
}
