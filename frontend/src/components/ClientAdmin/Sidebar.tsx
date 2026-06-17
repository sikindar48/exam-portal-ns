import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clientsApi } from "@/services/api/client";
import { Toggle } from "@/components/Theme/Toggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Users,
  FileQuestion,
  ClipboardList,
  Settings,
  LogOut,
  Building,
} from "lucide-react";

interface ClientAdminSidebarProps {
  activeTab?: string;
}

// Module-level cache to persist organization branding across sidebar mounts (preventing re-fetch layout flash)
let cachedBranding: { clientId: string; name: string; logoUrl: string | null } | null = null;

export function ClientAdminSidebar({ activeTab }: ClientAdminSidebarProps) {
  const { signOut, clientId } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [orgName, setOrgName] = useState(() => {
    if (cachedBranding && cachedBranding.clientId === clientId) return cachedBranding.name;
    if (clientId) {
      const sessionData = sessionStorage.getItem(`org_branding_${clientId}`);
      if (sessionData) {
        try {
          return JSON.parse(sessionData).name;
        } catch {
          // ignore invalid session cache
        }
      }
    }
    return "";
  });

  const [logoUrl, setLogoUrl] = useState<string | null>(() => {
    if (cachedBranding && cachedBranding.clientId === clientId) return cachedBranding.logoUrl;
    if (clientId) {
      const sessionData = sessionStorage.getItem(`org_branding_${clientId}`);
      if (sessionData) {
        try {
          return JSON.parse(sessionData).logoUrl;
        } catch {
          // ignore invalid session cache
        }
      }
    }
    return null;
  });

  useEffect(() => {
    async function fetchOrgBranding() {
      if (!clientId) return;
      
      // Return early if memory cache matches current clientId
      if (cachedBranding && cachedBranding.clientId === clientId) {
        return;
      }
      
      const sessionKey = `org_branding_${clientId}`;
      const sessionData = sessionStorage.getItem(sessionKey);
      if (sessionData) {
        try {
          const parsed = JSON.parse(sessionData);
          cachedBranding = { clientId, name: parsed.name, logoUrl: parsed.logoUrl };
          setOrgName(parsed.name);
          setLogoUrl(parsed.logoUrl);
          return;
        } catch {
          // ignore invalid session cache, will re-fetch from API
        }
      }

      try {
        const { data, error } = await clientsApi.get(clientId);
        if (!error && data) {
          const name = (data as any).name;
          const logoUrl = (data as any).logo_url;
          cachedBranding = { clientId, name, logoUrl };
          sessionStorage.setItem(sessionKey, JSON.stringify({ name, logoUrl }));
          setOrgName(name);
          setLogoUrl(logoUrl);
        }
      } catch (err) {
        console.error("Error fetching client branding:", err);
      }
    }
    fetchOrgBranding();
  }, [clientId]);

  const navItems = [
    {
      label: "Dashboard",
      path: "/client-admin",
      icon: LayoutDashboard,
      id: "nav-btn-dashboard"
    },
    {
      label: "Manage Students",
      path: "/client-admin/students",
      icon: Users,
      id: "nav-btn-students"
    },
    {
      label: "Question Bank",
      path: "/client-admin/questions",
      icon: FileQuestion,
      id: "nav-btn-questions"
    },
    {
      label: "Examination Papers",
      path: "/client-admin/tests",
      icon: ClipboardList,
      id: "nav-btn-tests"
    },
    {
      label: "System Settings",
      path: "/client-admin/settings",
      icon: Settings,
      id: "nav-btn-settings"
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-screen shrink-0 border-r border-slate-900 font-sans select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-900 flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded bg-slate-900 border border-slate-800 overflow-hidden shrink-0">
          {logoUrl ? (
            <img src={logoUrl} alt={orgName} className="h-full w-full object-cover" />
          ) : (
            <Building className="h-4.5 w-4.5 text-slate-400" />
          )}
        </div>
        <div className="overflow-hidden">
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-slate-200 truncate">
            {orgName || "Admin Portal"}
          </h2>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mt-1">
            Secure Command Center
          </p>
        </div>
      </div>

      {/* Navigation Group */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">
            Administrative Control Panel
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.label || location.pathname === item.path || (item.path !== "/client-admin" && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  id={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-wider rounded-none transition-all border-l-2 ${
                    isActive
                      ? "bg-slate-900 text-blue-400 border-blue-500"
                      : "text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-900/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-blue-400" : "text-slate-600"}`} />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Settings/Signout */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dark Interface</span>
          <Toggle />
        </div>
        <Button
          id="sidebar-signout-btn"
          variant="ghost"
          onClick={signOut}
          className="w-full h-9 rounded-none border border-slate-900 hover:border-slate-800 hover:bg-slate-900/40 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
