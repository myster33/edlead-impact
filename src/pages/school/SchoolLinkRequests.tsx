import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LinkIcon, Check, X } from "lucide-react";

export default function SchoolLinkRequests() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [requests, setRequests] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Approve dialog
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvingReq, setApprovingReq] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  const fetchRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("parent_link_requests")
      .select("*, school_users!parent_link_requests_parent_user_id_fkey(full_name, email)")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    setRequests(data || []);
    setIsLoading(false);
  }, [currentSchool?.id]);

  const fetchStudents = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("id, full_name, student_id_number")
      .eq("school_id", currentSchool.id)
      .eq("role", "student")
      .eq("is_active", true)
      .order("full_name");
    setStudents(data || []);
  }, [currentSchool?.id]);

  useEffect(() => { fetchRequests(); fetchStudents(); }, [fetchRequests, fetchStudents]);

  const openApprove = (req: any) => {
    setApprovingReq(req);
    setSelectedStudentId("");
    setApproveOpen(true);
  };

  const handleApprove = async () => {
    if (!approvingReq || !selectedStudentId || !schoolUser) return;

    // Create the parent-student link
    const { error: linkError } = await supabase.from("student_parent_links").insert({
      parent_user_id: approvingReq.parent_user_id,
      student_user_id: selectedStudentId,
      relationship: approvingReq.relationship,
    });

    if (linkError) {
      toast({ title: "Error", description: linkError.message, variant: "destructive" });
      return;
    }

    // Update request status
    const { error } = await supabase.from("parent_link_requests").update({
      status: "approved",
      reviewed_by: schoolUser.id,
      reviewed_at: new Date().toISOString(),
      linked_student_id: selectedStudentId,
    }).eq("id", approvingReq.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Link request approved", description: "Parent has been linked to the student." });

    setApproveOpen(false);
    fetchRequests();
  };

  const handleReject = async (req: any) => {
    if (!schoolUser) return;
    const { error } = await supabase.from("parent_link_requests").update({
      status: "rejected",
      reviewed_by: schoolUser.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);

    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Link request rejected" });
    fetchRequests();
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  const pendingCount = requests.filter(r => r.status === "pending").length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Parent Link Requests</h1>
          <p className="text-muted-foreground">Review requests from parents to link to students</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LinkIcon className="h-5 w-5" />
              All Requests
              {pendingCount > 0 && <Badge>{pendingCount} pending</Badge>}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : requests.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No link requests yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Parent</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Student ID</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map(r => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{r.school_users?.full_name || "—"}</TableCell>
                      <TableCell>{r.student_name}</TableCell>
                      <TableCell>{r.student_id_number || "—"}</TableCell>
                      <TableCell className="capitalize">{r.relationship}</TableCell>
                      <TableCell><Badge variant={statusColor(r.status) as any} className="capitalize">{r.status}</Badge></TableCell>
                      <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        {r.status === "pending" && (
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon" onClick={() => openApprove(r)} title="Approve">
                              <Check className="h-4 w-4 text-primary" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleReject(r)} title="Reject">
                              <X className="h-4 w-4 text-destructive" />
                            </Button>
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

      {/* Approve Dialog — match student */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Link Request</DialogTitle>
            <DialogDescription>
              Match parent <strong>{approvingReq?.school_users?.full_name}</strong>'s request for student "<strong>{approvingReq?.student_name}</strong>" to a registered student.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Select Student</Label>
              <Select value={selectedStudentId} onValueChange={setSelectedStudentId}>
                <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                <SelectContent>
                  {students.map(s => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.full_name}{s.student_id_number ? ` (${s.student_id_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveOpen(false)}>Cancel</Button>
            <Button onClick={handleApprove} disabled={!selectedStudentId}>Approve & Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}
