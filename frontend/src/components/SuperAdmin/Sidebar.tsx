import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Toggle } from "@/components/Theme/Toggle";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Building,
  LogOut,
  ShieldAlert,
} from "lucide-react";

interface SuperAdminSidebarProps {
  activeTab?: string;
}

export function SuperAdminSidebar({ activeTab }: SuperAdminSidebarProps) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    {
      label: "Platform Overview",
      path: "/superadmin",
      icon: LayoutDashboard,
      id: "super-nav-btn-dashboard"
    },
    {
      label: "Manage Organizations",
      path: "/superadmin/clients",
      icon: Building,
      id: "super-nav-btn-clients"
    },
  ];

  return (
    <aside className="w-64 bg-slate-950 text-white flex flex-col h-screen shrink-0 border-r border-slate-900 font-sans select-none z-20">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-900 flex items-center gap-3">
        <div className="bg-red-600 p-1.5 rounded-sm">
          <ShieldAlert className="h-4 w-4 text-white" />
        </div>
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-[0.15em] text-red-500">
            SuperAdmin Control
          </h2>
          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest leading-none mt-1">
            Global Infrastructure
          </p>
        </div>
      </div>

      {/* Navigation Group */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        <div>
          <p className="px-3 text-[9px] font-black uppercase tracking-[0.2em] text-slate-600 mb-3">
            System Administration
          </p>
          <nav className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.label || location.pathname === item.path || (item.path !== "/superadmin" && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.label}
                  id={item.id}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 text-xs font-black uppercase tracking-wider rounded-none transition-all border-l-2 ${
                    isActive
                      ? "bg-slate-900 text-red-400 border-red-500"
                      : "text-slate-400 border-transparent hover:text-slate-100 hover:bg-slate-900/30"
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 transition-colors ${isActive ? "text-red-400" : "text-slate-600"}`} />
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
