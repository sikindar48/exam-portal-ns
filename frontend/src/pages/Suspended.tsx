import React from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ShieldAlert, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Suspended() {
  const { signOut } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-red-500">
      <div className="max-w-md w-full border border-red-900 bg-slate-900 p-8 rounded-none shadow-2xl flex flex-col items-center text-center space-y-6">
        <div className="bg-red-950 border border-red-700 p-4 rounded-none text-red-500">
          <ShieldAlert className="h-12 w-12 animate-pulse" />
        </div>
        
        <div className="space-y-2">
          <h1 className="text-xl font-black uppercase tracking-widest text-red-500">
            Account Suspended
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider leading-relaxed">
            Your organization account has been suspended. Please contact platform administration to reactivate your services.
          </p>
        </div>

        <div className="w-full pt-4 border-t border-slate-800">
          <Button
            onClick={signOut}
            className="w-full h-11 bg-transparent border border-slate-700 hover:border-red-500 hover:text-red-500 hover:bg-slate-950 text-slate-300 text-xs font-black uppercase tracking-widest transition-all rounded-none flex items-center justify-center gap-2"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>
    </div>
  );
}
