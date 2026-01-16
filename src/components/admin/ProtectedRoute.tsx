import { Navigate, useLocation } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: React.ReactNode;
  moduleKey?: string;
}

export function ProtectedRoute({ children, moduleKey }: ProtectedRouteProps) {
  const { user, adminUser, isLoading, isAdmin, isMfaVerified, requiresMfa } = useAdminAuth();
  const location = useLocation();

  // Fetch module permission if moduleKey is provided - enabled for all admin users (viewer, reviewer, admin)
  const { data: modulePermission, isLoading: permissionLoading } = useQuery({
    queryKey: ["module-permission", moduleKey],
    queryFn: async () => {
      if (!moduleKey) return null;
      const { data, error } = await supabase
        .from("module_permissions")
        .select("allowed_roles")
        .eq("module_key", moduleKey)
        .single();

      if (error) return null;
      return data;
    },
    enabled: !!moduleKey && !!user && isAdmin, // isAdmin checks if user exists in admin_users table (any role)
  });

  if (isLoading || (moduleKey && permissionLoading && user && isAdmin)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Not logged in
  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  // User has MFA enabled but hasn't verified yet - redirect to login for MFA
  if (requiresMfa && !isMfaVerified) {
    return <Navigate to="/admin/login" state={{ from: location, pendingMfa: true }} replace />;
  }

  // Logged in but not an admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">
            You don't have permission to access the admin dashboard.
          </p>
          <p className="text-sm text-muted-foreground">
            Please contact an administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  // Check module permission if moduleKey is provided
  if (moduleKey && adminUser) {
    const userRole = adminUser.role;
    const allowedRoles = modulePermission?.allowed_roles as string[] | undefined;

    // If no permission found, default to admin-only
    if (!allowedRoles) {
      if (userRole !== "admin") {
        return (
          <div className="min-h-screen flex items-center justify-center bg-background">
            <div className="text-center space-y-4 p-8">
              <h1 className="text-2xl font-bold text-destructive">Insufficient Permissions</h1>
              <p className="text-muted-foreground">
                You don't have permission to access this module.
              </p>
            </div>
          </div>
        );
      }
    } else if (!allowedRoles.includes(userRole)) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center space-y-4 p-8">
            <h1 className="text-2xl font-bold text-destructive">Insufficient Permissions</h1>
            <p className="text-muted-foreground">
              You don't have permission to access this module.
            </p>
          </div>
        </div>
      );
    }
  }

  return <>{children}</>;
}
