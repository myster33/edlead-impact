import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { BookOpen } from "lucide-react";

export default function SchoolClasses() {
  const { currentSchool } = useSchoolAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentSchool?.id) return;
    const fetchClasses = async () => {
      const { data } = await supabase
        .from("classes")
        .select("*, school_users!classes_class_teacher_id_fkey(full_name)")
        .eq("school_id", currentSchool.id)
        .order("grade");
      setClasses(data || []);
      setIsLoading(false);
    };
    fetchClasses();
  }, [currentSchool?.id]);

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Classes</h1>
          <p className="text-muted-foreground">Manage school classes and assign teachers</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              All Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : classes.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No classes created yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Year</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map(cls => (
                    <TableRow key={cls.id}>
                      <TableCell className="font-medium">{cls.name}</TableCell>
                      <TableCell>{cls.grade}</TableCell>
                      <TableCell>{cls.school_users?.full_name || "Unassigned"}</TableCell>
                      <TableCell>{cls.academic_year}</TableCell>
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
