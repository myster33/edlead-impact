import { Navigate, useLocation } from "react-router-dom";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { PortalLoadingScreen } from "@/components/shared/PortalLoadingScreen";

export function PortalProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, portalUser, isLoading } = usePortalAuth();
  const location = useLocation();

  if (isLoading) {
    return <PortalLoadingScreen portalName="User Portal" />;
  }

  if (!user) {
    return <Navigate to="/portal/login" state={{ from: location }} replace />;
  }

  if (!portalUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have portal access. Please contact your school administrator.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
