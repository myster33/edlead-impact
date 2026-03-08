import { Navigate, useLocation } from "react-router-dom";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { Loader2 } from "lucide-react";

export function SchoolProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, schoolUser, currentSchool, isLoading } = useSchoolAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/school/login" state={{ from: location }} replace />;
  }

  if (!schoolUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-destructive">Access Denied</h1>
          <p className="text-muted-foreground">You don't have school admin access.</p>
        </div>
      </div>
    );
  }

  if (currentSchool && !currentSchool.is_verified) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-8">
          <h1 className="text-2xl font-bold text-foreground">Pending Verification</h1>
          <p className="text-muted-foreground">Your school is awaiting verification by edLEAD administration.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
