import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Footer } from "@/components/Brand/Footer";
import Lightfall from "@/components/reactbits/Lightfall";
import { Navbar } from "./components/Navbar";
import { HeroSection } from "./components/HeroSection";
import { PreviewSection } from "./components/PreviewSection";
import { PricingSection } from "./components/PricingSection";
import { FeaturesSection } from "./components/FeaturesSection";
import { WhyChooseSection } from "./components/WhyChooseSection";
import { FaqSection } from "./components/FaqSection";

import { useTheme } from "@/components/Theme/Provider";
import { useEffect, useState } from "react";

export default function Page() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    const checkIsDark = () => {
      setIsDark(window.document.documentElement.classList.contains("dark"));
    };
    checkIsDark();

    const observer = new MutationObserver(checkIsDark);
    observer.observe(window.document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-blue-600/30 selection:text-blue-900 dark:selection:text-blue-200 transition-colors duration-300">
      
      {/* Dynamic Background — Lightfall WebGL Streaks (Dark Mode Only) */}
      {isDark && (
        <div className="absolute top-0 left-0 right-0 h-[790px] pointer-events-none overflow-hidden z-0 opacity-50">
          <Lightfall
            className="absolute inset-0"
            colors={['#6366f1', '#3b82f6', '#8b5cf6']}
            backgroundColor="#020617"
            speed={0.5}
            streakCount={4}
            streakWidth={1}
            streakLength={1.2}
            glow={0.8}
            density={0.6}
            twinkle={0.5}
            zoom={3}
            backgroundGlow={0.3}
            opacity={1}
            mouseInteraction={true}
            mouseStrength={0.3}
            mouseRadius={0.8}
            mouseDampening={0.15}
          />
        </div>
      )}

      <Navbar />
      <HeroSection />
      <PreviewSection />
      <PricingSection />
      <FeaturesSection />
      <WhyChooseSection />
      <FaqSection />

      {/* Ready to Conduct / CTA */}
      <section className="py-24 px-4 md:px-8 bg-slate-950 text-white relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-blue-955/20 blur-[150px] pointer-events-none" />
        
        <div className="container mx-auto max-w-3xl text-center relative z-10">
          <Badge className="bg-blue-900/40 text-blue-400 border border-blue-900/35 mb-4 font-black uppercase tracking-widest text-[9px] rounded-none px-2.5 py-1">
            Secure Platform
          </Badge>
          <h2 className="text-3xl sm:text-5xl font-black uppercase tracking-tight mb-4 leading-tight">
            Ready to Conduct Your Next Examination?
          </h2>
          <p className="text-slate-400 mb-10 max-w-xl mx-auto text-xs md:text-sm font-semibold leading-relaxed">
            Start with the Free Plan, choose a Subscription, or purchase a Pay Per Test package.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <Button
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-white hover:bg-slate-100 text-slate-950 font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto shadow-xl transition-all"
            >
              Start Free
              <ArrowRight className="ml-2 h-4 w-4 text-blue-600" />
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => window.open("mailto:info.nssoftwaresolutions@gmail.com")}
              className="bg-slate-900 hover:bg-slate-800 border border-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-none px-8 py-6 w-full sm:w-auto"
            >
              Contact Sales
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
