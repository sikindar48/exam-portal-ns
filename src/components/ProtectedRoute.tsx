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

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: AppRole[];
}

export function ProtectedRoute({
  children,
  allowedRoles,
}: ProtectedRouteProps) {
  const { user, loading, role } = useAuth();

  // Still initializing auth
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) return <Navigate to="/auth" replace />;

  // Logged in but role not yet loaded — wait briefly
  if (allowedRoles && !role) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Logged in with wrong role — redirect to their dashboard
  if (allowedRoles && role && !allowedRoles.includes(role)) {
    return <Navigate to={ROLE_ROUTES[role] ?? "/auth"} replace />;
  }

  return <>{children}</>;
}
