import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CreditCard } from "lucide-react";
import { usePortalAuth } from "@/contexts/PortalAuthContext";

export default function PortalECard() {
  const { portalUser, currentSchool } = usePortalAuth();

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">E-Card</h1>
          <p className="text-muted-foreground">Your digital student card</p>
        </div>
        <div className="flex justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center bg-primary/5 rounded-t-lg">
              <CardTitle className="flex flex-col items-center gap-2">
                <CreditCard className="h-8 w-8 text-primary" />
                <span className="text-lg">{currentSchool?.name || "School"}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-6 text-center space-y-4">
              <div className="w-24 h-24 mx-auto rounded-full bg-muted flex items-center justify-center text-3xl font-bold text-muted-foreground">
                {portalUser?.full_name?.charAt(0) || "?"}
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">{portalUser?.full_name}</h3>
                <p className="text-sm text-muted-foreground capitalize">{portalUser?.role?.replace("_", " ")}</p>
                <p className="text-xs text-muted-foreground mt-1">{portalUser?.email}</p>
              </div>
              {portalUser?.student_id_number && (
                <p className="text-sm font-mono text-muted-foreground">ID: {portalUser.student_id_number}</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}
