import { ExternalLink, Mail } from "lucide-react";

export function BrandFooter() {
  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container mx-auto flex flex-col items-center justify-center gap-1 px-4 py-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <p className="text-xs text-muted-foreground">
          Powered by{" "}
          <a
            href="https://www.nssoftwaresolutions.in"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-0.5 font-medium text-primary hover:underline"
          >
            NS Software Solutions
            <ExternalLink className="h-3 w-3" />
          </a>
        </p>
        <a
          href="mailto:info.nssoftwaresolutions@gmail.com"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          <Mail className="h-3 w-3" />
          info.nssoftwaresolutions@gmail.com
        </a>
      </div>
    </footer>
  );
}
