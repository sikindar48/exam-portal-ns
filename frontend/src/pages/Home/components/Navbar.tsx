import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Menu, X } from "lucide-react";
import { Toggle } from "@/components/Theme/Toggle";

const ROLE_ROUTES = {
  superadmin: "/superadmin",
  clientadmin: "/client-admin",
  student: "/student",
} as const;

export function Navbar() {
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 dark:border-slate-900 bg-white/70 dark:bg-slate-950/70 backdrop-blur-xl transition-colors">
      <div className="container mx-auto px-4 md:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src="/logo.png" alt="NS Exam Portal Logo" className="h-9 w-9 rounded-xl object-contain bg-slate-50 dark:bg-slate-900 border border-slate-200/50 dark:border-slate-800/50" />
          <div>
            <h1 className="text-sm md:text-base font-black uppercase tracking-wider text-slate-900 dark:text-white leading-none">
              Exam Portal
            </h1>
            <p className="hidden sm:block text-[9px] text-slate-500 tracking-widest uppercase mt-1">
              by NS Software Solutions
            </p>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">Pricing</a>
          <a href="#why-choose" className="hover:text-slate-900 dark:hover:text-white transition-colors">Why Choose Us</a>
          <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">FAQ</a>
        </nav>

        <div className="flex items-center gap-3">
          <Toggle />
          {user && !user.isAnonymous && role ? (
            <Button
              onClick={() => navigate(ROLE_ROUTES[role])}
              className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-none px-5 py-2 shadow-lg shadow-blue-600/25 transition-all duration-300"
            >
              Go to Dashboard
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <>
              <Button
                variant="ghost"
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex text-xs font-black uppercase tracking-wider text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-900 rounded-none px-4 py-2"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate("/auth")}
                className="hidden sm:inline-flex bg-blue-600 hover:bg-blue-500 text-white text-xs font-black uppercase tracking-wider rounded-none px-5 py-2 shadow-lg shadow-blue-600/25 transition-all duration-300"
              >
                Get Started Free
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </>
          )}

          {/* Mobile Menu Toggle */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 md:hidden text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="h-4.5 w-4.5" /> : <Menu className="h-4.5 w-4.5" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav className="md:hidden border-t border-slate-200 dark:border-slate-900 bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl px-6 py-6 flex flex-col gap-4 text-xs font-black uppercase tracking-wider shadow-2xl animate-in slide-in-from-top duration-300">
          <a href="#features" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-slate-900/50">Features</a>
          <a href="#pricing" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-slate-900/50">Pricing</a>
          <a href="#why-choose" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-slate-900/50">Why Choose Us</a>
          <a href="#faq" onClick={() => setMobileMenuOpen(false)} className="py-2 hover:text-slate-900 dark:hover:text-white border-b border-slate-100 dark:border-slate-900/50">FAQ</a>
          {user && !user.isAnonymous && role ? (
            <button
              onClick={() => { setMobileMenuOpen(false); navigate(ROLE_ROUTES[role]); }}
              className="py-2.5 text-left text-blue-600 dark:text-blue-400 hover:text-blue-500"
            >
              Go to Dashboard
            </button>
          ) : (
            <div className="flex flex-col gap-2.5 pt-2">
              <Button
                variant="outline"
                onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                className="rounded-none font-black text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-800"
              >
                Sign In
              </Button>
              <Button
                onClick={() => { setMobileMenuOpen(false); navigate("/auth"); }}
                className="bg-blue-600 hover:bg-blue-500 rounded-none font-black text-white"
              >
                Get Started Free
              </Button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}
