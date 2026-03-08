import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { UserCheck } from "lucide-react";

export default function SchoolStaff() {
  const { currentSchool } = useSchoolAuth();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentSchool?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("school_users")
        .select("*")
        .eq("school_id", currentSchool.id)
        .in("role", ["educator", "class_teacher", "subject_teacher", "school_admin", "hr"])
        .order("full_name");
      setStaff(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [currentSchool?.id]);

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground">Staff directory</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />All Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : staff.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No staff registered.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{s.role?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </SchoolLayout>
  );
}
