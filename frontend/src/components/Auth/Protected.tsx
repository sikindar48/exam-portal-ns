import { ReactNode, useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { clientsApi } from "@/services/api/client";
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
  const { user, loading, role, clientId } = useAuth();
  const [isSuspended, setIsSuspended] = useState<boolean | null>(null);
  const location = useLocation();

  useEffect(() => {
    async function checkSuspension() {
      if (!clientId || role === "superadmin") {
        setIsSuspended(false);
        return;
      }
      try {
        const { data } = await clientsApi.get(clientId);
        if (data && (data as any).active_status === 0) {
          setIsSuspended(true);
        } else {
          setIsSuspended(false);
        }
      } catch (err) {
        console.error("Failed to check organization status:", err);
        setIsSuspended(false);
      }
    }
    checkSuspension();
  }, [clientId, role]);

  // Only shown on first-ever visit (no cache) while we fetch role from Supabase or check suspension
  if (loading || isSuspended === null) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect non-superadmin users of suspended clients to the suspension page
  if (isSuspended && location.pathname !== "/suspended") {
    return <Navigate to="/suspended" replace />;
  }

  // Allow guest access for tests if specified in URL
  const isGuestTest = window.location.search.includes("guest=true");
  if (isGuestTest) return <>{children}</>;

  // Redirect anonymous guests away from dashboard, history, or review pages
  if (user?.isAnonymous) {
    const isAllowedGuestRoute = window.location.pathname.startsWith("/student/test/") || 
                               window.location.pathname === "/student/submit-success";
    if (!isAllowedGuestRoute) {
      return <Navigate to="/auth" replace />;
    }
  }

  // No session and no cached role → go to login
  if (!user && !role) return <Navigate to="/auth" replace />;

  // Wrong or missing role → redirect to their own dashboard or login page
  if (allowedRoles && (!role || !allowedRoles.includes(role))) {
    return <Navigate to={role ? (ROLE_ROUTES[role] ?? "/auth") : "/auth"} replace />;
  }

  return <>{children}</>;
}
