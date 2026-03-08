import { PortalLayout } from "@/components/portal/PortalLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users } from "lucide-react";

export default function PortalMyChildren() {
  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Children</h1>
          <p className="text-muted-foreground">View your linked learners</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />Linked Learners</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">No linked learners yet. Contact your school to set up the link.</p>
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
