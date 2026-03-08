import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Inbox, Check, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SchoolAbsenceRequests() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const [requests, setRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const fetchRequests = async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("absence_requests")
      .select("*, student:school_users!absence_requests_student_id_fkey(full_name), parent:school_users!absence_requests_parent_id_fkey(full_name)")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setIsLoading(false);
  };

  useEffect(() => { fetchRequests(); }, [currentSchool?.id]);

  const handleAction = async (id: string, status: "approved" | "rejected") => {
    const { error } = await supabase
      .from("absence_requests")
      .update({ status, reviewed_by: schoolUser?.id, reviewed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `Request ${status}` });
      fetchRequests();
    }
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Absence Requests</h1>
          <p className="text-muted-foreground">Review parent-submitted absence reasons</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Inbox className="h-5 w-5" />All Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No absence requests.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Parent</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.student?.full_name}</TableCell>
                      <TableCell>{r.parent?.full_name}</TableCell>
                      <TableCell>{r.start_date} — {r.end_date}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{r.reason}</TableCell>
                      <TableCell><Badge variant={r.status === "approved" ? "default" : r.status === "rejected" ? "destructive" : "secondary"}>{r.status}</Badge></TableCell>
                      <TableCell>
                        {r.status === "pending" && (
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "approved")}><Check className="h-3 w-3" /></Button>
                            <Button size="sm" variant="outline" onClick={() => handleAction(r.id, "rejected")}><X className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </TableCell>
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
