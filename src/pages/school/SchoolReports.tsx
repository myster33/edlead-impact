import { SchoolLayout } from "@/components/school/SchoolLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

export default function SchoolReports() {
  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Attendance and performance reports</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Reports</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-center py-8">Reports module coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
}
