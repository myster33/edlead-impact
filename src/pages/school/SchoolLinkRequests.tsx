import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { LinkIcon, Check, X, UserPlus } from "lucide-react";

export default function SchoolLinkRequests() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();

  // Parent link requests
  const [linkRequests, setLinkRequests] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvingReq, setApprovingReq] = useState<any>(null);
  const [selectedStudentId, setSelectedStudentId] = useState("");

  // Registration requests
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLinkRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("parent_link_requests")
      .select("*, school_users!parent_link_requests_parent_user_id_fkey(full_name, email)")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    setLinkRequests(data || []);
  }, [currentSchool?.id]);

  const fetchRegRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("portal_registration_requests")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    setRegRequests(data || []);
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

  useEffect(() => {
    Promise.all([fetchLinkRequests(), fetchRegRequests(), fetchStudents()]).then(() => setIsLoading(false));
  }, [fetchLinkRequests, fetchRegRequests, fetchStudents]);

  // --- Parent Link Handlers ---
  const openApprove = (req: any) => {
    setApprovingReq(req);
    setSelectedStudentId("");
    setApproveOpen(true);
  };

  const handleApproveLink = async () => {
    if (!approvingReq || !selectedStudentId || !schoolUser) return;
    const { error: linkError } = await supabase.from("student_parent_links").insert({
      parent_user_id: approvingReq.parent_user_id,
      student_user_id: selectedStudentId,
      relationship: approvingReq.relationship,
    });
    if (linkError) { toast({ title: "Error", description: linkError.message, variant: "destructive" }); return; }

    await (supabase as any).from("parent_link_requests").update({
      status: "approved",
      reviewed_by: schoolUser.id,
      reviewed_at: new Date().toISOString(),
      matched_student_id: selectedStudentId,
    }).eq("id", approvingReq.id);

    toast({ title: "Link request approved" });
    setApproveOpen(false);
    fetchLinkRequests();
  };

  const handleRejectLink = async (req: any) => {
    if (!schoolUser) return;
    await (supabase as any).from("parent_link_requests").update({
      status: "rejected", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Link request rejected" });
    fetchLinkRequests();
  };

  // --- Registration Handlers ---
  const handleApproveReg = async (req: any) => {
    if (!currentSchool || !schoolUser) return;

    // Map signup role to school_user_role
    const roleMap: Record<string, string> = {
      student: "student",
      parent: "parent",
      educator: "educator",
    };
    const schoolRole = roleMap[req.role] || "student";

    // Create the school_user entry
    const { error: insertError } = await supabase.from("school_users").insert({
      user_id: req.auth_user_id,
      school_id: currentSchool.id,
      role: schoolRole as any,
      full_name: req.full_name,
      email: req.email,
      phone: req.phone || null,
      student_id_number: req.student_id_number || null,
      is_active: true,
    });

    if (insertError) {
      toast({ title: "Error", description: insertError.message, variant: "destructive" });
      return;
    }

    // Update request status
    await (supabase as any).from("portal_registration_requests").update({
      status: "approved",
      reviewed_by: schoolUser.id,
      reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);

    toast({ title: "Registration approved", description: `${req.full_name} can now access the portal.` });
    fetchRegRequests();
  };

  const handleRejectReg = async (req: any) => {
    if (!schoolUser) return;
    await (supabase as any).from("portal_registration_requests").update({
      status: "rejected", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Registration rejected" });
    fetchRegRequests();
  };

  const statusColor = (s: string) => {
    if (s === "approved") return "default";
    if (s === "rejected") return "destructive";
    return "secondary";
  };

  const pendingLinkCount = linkRequests.filter(r => r.status === "pending").length;
  const pendingRegCount = regRequests.filter(r => r.status === "pending").length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Requests</h1>
          <p className="text-muted-foreground">Review registration and parent link requests</p>
        </div>

        <Tabs defaultValue="registrations">
          <TabsList>
            <TabsTrigger value="registrations" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Registrations {pendingRegCount > 0 && <Badge variant="secondary" className="ml-1">{pendingRegCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Parent Links {pendingLinkCount > 0 && <Badge variant="secondary" className="ml-1">{pendingLinkCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="registrations">
            <Card>
              <CardHeader>
                <CardTitle>Registration Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : regRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No registration requests yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Student ID</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {regRequests.map(r => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.full_name}</TableCell>
                          <TableCell>{r.email}</TableCell>
                          <TableCell className="capitalize">{r.role}</TableCell>
                          <TableCell>{r.student_id_number || "—"}</TableCell>
                          <TableCell><Badge variant={statusColor(r.status) as any} className="capitalize">{r.status}</Badge></TableCell>
                          <TableCell>{new Date(r.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {r.status === "pending" && (
                              <div className="flex items-center justify-end gap-1">
                                <Button variant="ghost" size="icon" onClick={() => handleApproveReg(r)} title="Approve">
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRejectReg(r)} title="Reject">
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
          </TabsContent>

          <TabsContent value="links">
            <Card>
              <CardHeader>
                <CardTitle>Parent Link Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : linkRequests.length === 0 ? (
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
                      {linkRequests.map(r => (
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
                                <Button variant="ghost" size="icon" onClick={() => handleRejectLink(r)} title="Reject">
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
          </TabsContent>
        </Tabs>
      </div>

      {/* Approve Link Dialog */}
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
            <Button onClick={handleApproveLink} disabled={!selectedStudentId}>Approve & Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}