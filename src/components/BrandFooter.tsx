import { Mail } from "lucide-react";

export function BrandFooter() {
  return (
    <footer className="w-full border-t bg-card mt-auto shrink-0">
      <div className="w-full px-6 py-3">
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-muted-foreground max-w-7xl mx-auto">
          {/* Brand Info */}
          <span>
            Powered by{" "}
            <a
              href="https://www.nssoftwaresolutions.in"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold text-primary hover:underline transition-colors"
            >
              NS Software Solutions
            </a>
          </span>

          <span className="text-muted-foreground/40">|</span>

          <span>© {new Date().getFullYear()} All rights reserved</span>

          <span className="text-muted-foreground/40">|</span>

          {/* Contact Info */}
          <a
            href="mailto:info.nssoftwaresolutions@gmail.com"
            className="inline-flex items-center gap-1.5 hover:text-primary transition-colors"
          >
            <Mail className="h-3.5 w-3.5" />
            info.nssoftwaresolutions@gmail.com
          </a>
        </div>
      </div>
    </footer>
  );
}
