import { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";

type AppRole = "superadmin" | "clientadmin" | "student";

const ROLE_ROUTES: Record<AppRole, string> = {
  superadmin: "/superadmin",
  clientadmin: "/client-admin",
  student: "/student",
};

interface ProtectedProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function Protected({
  children,
  allowedRoles,
}: ProtectedProps) {
  const { user, loading, role } = useAuth();

  // Only shown on first-ever visit (no cache) while we fetch role from Supabase
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Allow guest access for tests if specified in URL
  const isGuestTest = window.location.search.includes("guest=true");
  if (isGuestTest) return <>{children}</>;

  // Redirect anonymous guests away from dashboard, history, or review pages
  if (user?.isAnonymous) {
    const isAllowedGuestRoute = window.location.pathname.startsWith("/student/test/") || 
                               window.location.pathname === "/student/submit-success";
    if (!isAllowedGuestRoute) {
      return <Navigate to="/join" replace />;
    }
  }

  // No session and no cached role → go to login
  if (!user && !role) return <Navigate to="/auth" replace />;

  // Wrong role → redirect to their own dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_ROUTES[role] ?? "/auth"} replace />;
  }

  return <>{children}</>;
}
