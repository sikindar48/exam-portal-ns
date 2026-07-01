import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Toggle } from "@/components/Theme/Toggle";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { apiClient } from "@/services/api/client";
import {
  LayoutDashboard,
  Building,
  LogOut,
  ShieldAlert,
  Settings,
  CreditCard,
  FileText,
  Ticket,
  MessageSquare,
} from "lucide-react";

interface SuperAdminSidebarProps {
  activeTab?: string;
}

export function SuperAdminSidebar({ activeTab }: SuperAdminSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [platformLogo, setPlatformLogo] = useState<string>(() => {
    return localStorage.getItem("platform_logo") || "";
  });

  // Listen for logo updates dispatched from Settings page
  useEffect(() => {
    const handleLogoUpdate = () => {
      const logo = localStorage.getItem("platform_logo") || "";
      setPlatformLogo(logo);
    };

    window.addEventListener("platform_logo_updated", handleLogoUpdate);
    return () => window.removeEventListener("platform_logo_updated", handleLogoUpdate);
  }, []);

  // Also fetch from API on mount to hydrate (in case localStorage is stale)
  useEffect(() => {
    apiClient("/settings")
      .then((data) => {
        const logo = data?.platform_logo || "";
        setPlatformLogo(logo);
        if (logo) {
          localStorage.setItem("platform_logo", logo);
        } else {
          localStorage.removeItem("platform_logo");
        }
      })
      .catch(() => {/* Ignore: settings may not be available */});
  }, []);

  const navItems = [
    {
      label: "Dashboard",
      path: "/superadmin",
      icon: LayoutDashboard,
      id: "super-nav-btn-dashboard"
    },
    {
      label: "Organizations",
      path: "/superadmin/clients",
      icon: Building,
      id: "super-nav-btn-clients"
    },
    {
      label: "Security",
      path: "/superadmin/security",
      icon: ShieldAlert,
      id: "super-nav-btn-security"
    },
    {
      label: "Subscriptions",
      path: "/superadmin/subscriptions",
      icon: CreditCard,
      id: "super-nav-btn-subscriptions",
      subTabs: [
        { label: "Active Plans", path: "/superadmin/subscriptions", id: "super-nav-btn-subscriptions-plans" },
        { label: "Requests", path: "/superadmin/subscription-requests", id: "super-nav-btn-subscriptions-requests" },
      ]
    },
    {
      label: "Pay Per Test",
      path: "/superadmin/packages",
      icon: Ticket,
      id: "super-nav-btn-packages",
      subTabs: [
        { label: "Catalog", path: "/superadmin/packages", id: "super-nav-btn-packages-catalog" },
        { label: "Requests", path: "/superadmin/packages-requests", id: "super-nav-btn-packages-requests" },
      ]
    },
    {
      label: "Feedback",
      path: "/superadmin/feedbacks",
      icon: MessageSquare,
      id: "super-nav-btn-feedbacks"
    },
    {
      label: "Audit Logs",
      path: "/superadmin/audit-logs",
      icon: FileText,
      id: "super-nav-btn-audit-logs"
    },
    {
      label: "Settings",
      path: "/superadmin/settings",
      icon: Settings,
      id: "super-nav-btn-settings"
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-screen sticky top-0 shrink-0 border-r border-slate-900 font-sans select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-4 border-b border-slate-900 flex items-center gap-3">
        {platformLogo ? (
          /* Show uploaded logo */
          <div className="flex items-center gap-3 w-full">
            <div className="w-8 h-8 shrink-0 flex items-center justify-center overflow-hidden border border-slate-800 bg-slate-900 rounded-sm">
              <img
                src={platformLogo}
                alt="Platform Logo"
                className="max-w-full max-h-full object-contain"
              />
            </div>
            <div className="min-w-0">
              <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500 truncate">
                SUPER ADMIN
              </h2>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mt-0.5">
                Control Panel
              </p>
            </div>
          </div>
        ) : (
          /* Default icon brand */
          <>
            <div className="bg-red-600 p-1.5 rounded-sm shrink-0">
              <ShieldAlert className="h-4 w-4 text-white" />
            </div>
            <div>
              <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500">
                SUPER ADMIN
              </h2>
              <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mt-1">
                Control Panel
              </p>
            </div>
          </>
        )}
      </div>

      {/* Navigation Group */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">
            Navigation
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isGroupActive = activeTab === item.label
                || location.pathname === item.path
                || (item.path !== "/superadmin" && location.pathname.startsWith(item.path))
                || (item.subTabs && item.subTabs.some(st => location.pathname === st.path));
              return (
                <div key={item.label}>
                  <button
                    id={item.id}
                    onClick={() => navigate(item.path)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-wider rounded-none transition-all border-l-2 ${
                      isGroupActive
                        ? "bg-slate-900 text-red-400 border-red-500"
                        : "text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-900/30"
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 transition-colors ${isGroupActive ? "text-red-400" : "text-slate-600"}`} />
                    {item.label}
                  </button>
                  {/* Sub-tabs */}
                  {item.subTabs && isGroupActive && (
                    <div className="ml-7 mt-0.5 space-y-0.5 border-l border-slate-800 pl-3">
                      {item.subTabs.map((sub) => {
                        const isSubActive = location.pathname === sub.path;
                        return (
                          <button
                            key={sub.path}
                            id={sub.id}
                            onClick={() => navigate(sub.path)}
                            className={`w-full text-left px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-none transition-all ${
                              isSubActive
                                ? "text-red-400 bg-slate-900/50"
                                : "text-slate-500 hover:text-slate-200 hover:bg-slate-900/20"
                            }`}
                          >
                            {sub.label}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Footer Settings/Signout */}
      <div className="p-4 border-t border-slate-900 bg-slate-950 flex flex-col gap-3">
        <div className="flex items-center justify-between px-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Dark Mode</span>
          <Toggle />
        </div>
        <Button
          id="super-sidebar-signout-btn"
          variant="ghost"
          onClick={signOut}
          className="w-full h-9 rounded-none border border-slate-900 hover:border-slate-800 hover:bg-slate-950 text-slate-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest"
        >
          <LogOut className="mr-2 h-3.5 w-3.5" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
