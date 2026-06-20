import { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Toggle } from "@/components/Theme/Toggle";

interface ClientAdminHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  showBackButton?: boolean;
  backPath?: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function ClientAdminHeader({
  title,
  subtitle,
  showBackButton = false,
  backPath = "/client-admin",
  onBack,
  actions,
}: ClientAdminHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10 font-sans">
      <div className="flex items-center gap-4">
        {showBackButton && (
          <Button
            variant="ghost"
            onClick={onBack || (() => navigate(backPath))}
            className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        <div className="flex flex-col">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">{title}</h1>
          {subtitle && (
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <Toggle />
        {actions}
      </div>
    </header>
  );
}
