import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardCheck, Calendar, Users } from "lucide-react";

export default function PortalDashboard() {
  const { portalUser, currentSchool } = usePortalAuth();
  const role = portalUser?.role || "student";

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">
            Welcome, {portalUser?.full_name || "User"} — {currentSchool?.name || ""}
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
              <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>
          {role === "parent" && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">My Children</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">—</div>
                <p className="text-xs text-muted-foreground">Linked learners</p>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days Present</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">—</div>
              <p className="text-xs text-muted-foreground">This term</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </PortalLayout>
  );
}
