import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Plus } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

interface ClientHeaderProps {
  navigate: (path: string) => void;
  setIsClientDialogOpen: (open: boolean) => void;
  resetClientForm: () => void;
}

export function ClientHeader({
  navigate,
  setIsClientDialogOpen,
  resetClientForm,
}: ClientHeaderProps) {
  return (
    <header className="h-16 bg-slate-900 text-white flex items-center justify-between px-8 shrink-0 shadow-md z-10">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/superadmin")}
          className="h-8 w-8 rounded-none border border-slate-700 text-slate-400 hover:text-white p-0"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col">
          <h1 className="text-sm font-black uppercase tracking-[0.2em]">Organization Management</h1>
          <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">SuperAdmin / Global Control</p>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Toggle />
        <Button
          onClick={() => {
            resetClientForm();
            setIsClientDialogOpen(true);
          }}
          className="h-9 px-4 rounded-none bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest transition-all"
        >
          <Plus className="mr-2 h-3.5 w-3.5" /> Onboard Client
        </Button>
      </div>
    </header>
  );
}
