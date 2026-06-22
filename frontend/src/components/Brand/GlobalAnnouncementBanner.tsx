import React, { useEffect, useState } from "react";
import { Info } from "lucide-react";

export function GlobalAnnouncementBanner() {
  const [bannerText, setBannerText] = useState("");

  useEffect(() => {
    // Fetch settings publicly
    const fetchBanner = async () => {
      try {
        const apiBase = import.meta.env.VITE_API_URL || "";
        const cleanBase = apiBase.replace(/\/$/, "");
        const res = await fetch(`${cleanBase}/api/settings`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.announcement_banner) {
            setBannerText(data.announcement_banner);
          } else {
            setBannerText("");
          }
        }
      } catch (err) {
        console.error("Failed to load banner settings:", err);
      }
    };

    fetchBanner();
    
    // Poll settings every 60 seconds
    const interval = setInterval(fetchBanner, 60000);
    return () => clearInterval(interval);
  }, []);

  if (!bannerText) return null;

  return (
    <div className="bg-amber-500 text-black px-4 py-2 text-center text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2 border-b border-amber-600 select-none z-50 relative">
      <Info className="h-3.5 w-3.5 shrink-0" />
      <span>{bannerText}</span>
    </div>
  );
}
