import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";

export default function SchoolStudents() {
  const { currentSchool } = useSchoolAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentSchool?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("school_users")
        .select("*")
        .eq("school_id", currentSchool.id)
        .eq("role", "student")
        .order("full_name");
      setStudents(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [currentSchool?.id]);

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Student directory</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />All Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students registered.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
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
