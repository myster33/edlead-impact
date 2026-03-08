import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Pencil, ToggleLeft, ToggleRight, Link2, UserMinus, UserPlus, Check, X, LinkIcon } from "lucide-react";

export default function SchoolStudents() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [allParents, setAllParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Edit form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Unlink
  const [unlinkTarget, setUnlinkTarget] = useState<any | null>(null);

  // Parent linking
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkingStudent, setLinkingStudent] = useState<any>(null);
  const [linkedParents, setLinkedParents] = useState<any[]>([]);
  const [selectedParentId, setSelectedParentId] = useState<string>("");
  const [relationship, setRelationship] = useState("guardian");
  const [loadingLinks, setLoadingLinks] = useState(false);

  // Registration requests (student & parent)
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);

  // Parent link requests
  const [parentLinkRequests, setParentLinkRequests] = useState<any[]>([]);
  const [approveOpen, setApproveOpen] = useState(false);
  const [approvingReq, setApprovingReq] = useState<any>(null);
  const [selectedStudentForLink, setSelectedStudentForLink] = useState("");

  const fetchStudents = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("*")
      .eq("school_id", currentSchool.id)
      .eq("role", "student")
      .order("full_name");
    setStudents(data || []);
    setIsLoading(false);
  }, [currentSchool?.id]);

  const fetchParents = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("id, full_name, email")
      .eq("school_id", currentSchool.id)
      .eq("role", "parent")
      .eq("is_active", true)
      .order("full_name");
    setAllParents(data || []);
  }, [currentSchool?.id]);

  const fetchRegRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("portal_registration_requests")
      .select("*")
      .eq("school_id", currentSchool.id)
      .in("role", ["student", "parent"])
      .order("created_at", { ascending: false });
    setRegRequests(data || []);
    setLoadingReqs(false);
  }, [currentSchool?.id]);

  const fetchParentLinkRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("parent_link_requests")
      .select("*, school_users!parent_link_requests_parent_user_id_fkey(full_name, email)")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    setParentLinkRequests(data || []);
  }, [currentSchool?.id]);

  useEffect(() => {
    fetchStudents(); fetchParents(); fetchRegRequests(); fetchParentLinkRequests();
  }, [fetchStudents, fetchParents, fetchRegRequests, fetchParentLinkRequests]);

  // --- Edit ---
  const openEdit = (s: any) => {
    setEditing(s);
    setFullName(s.full_name);
    setPhone(s.phone || "");
    setStudentIdNumber(s.student_id_number || "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!fullName.trim()) {
      toast({ title: "Validation", description: "Name is required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { error } = await supabase.from("school_users").update({
      full_name: fullName.trim(),
      phone: phone.trim() || null,
      student_id_number: studentIdNumber.trim() || null,
    }).eq("id", editing.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Student updated" });
    setIsSaving(false);
    setFormOpen(false);
    fetchStudents();
  };

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from("school_users").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: s.is_active ? "Student deactivated" : "Student activated" }); fetchStudents(); }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    const { error } = await (supabase as any).from("school_users").update({ school_id: null, is_active: false }).eq("id", unlinkTarget.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Student unlinked", description: `${unlinkTarget.full_name} has been removed from the school.` });
      fetchStudents();
    }
    setUnlinkTarget(null);
  };

  // --- Parent linking dialog ---
  const openLinkDialog = async (student: any) => {
    setLinkingStudent(student);
    setSelectedParentId(""); setRelationship("guardian");
    setLinkOpen(true);
    setLoadingLinks(true);
    const { data } = await supabase
      .from("student_parent_links")
      .select("*, school_users!student_parent_links_parent_user_id_fkey(id, full_name, email)")
      .eq("student_user_id", student.id);
    setLinkedParents(data || []);
    setLoadingLinks(false);
  };

  const handleLinkParent = async () => {
    if (!selectedParentId || !linkingStudent) return;
    const { error } = await supabase.from("student_parent_links").insert({
      parent_user_id: selectedParentId,
      student_user_id: linkingStudent.id,
      relationship,
    });
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: "Parent linked to student" }); openLinkDialog(linkingStudent); }
  };

  const handleUnlinkParent = async (linkId: string) => {
    const { error } = await supabase.from("student_parent_links").delete().eq("id", linkId);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else if (linkingStudent) { toast({ title: "Parent unlinked" }); openLinkDialog(linkingStudent); }
  };

  const linkedParentIds = linkedParents.map((lp: any) => lp.parent_user_id);
  const availableParents = allParents.filter(p => !linkedParentIds.includes(p.id));

  // --- Registration request handlers ---
  const handleApproveReg = async (req: any) => {
    if (!currentSchool || !schoolUser) return;
    if (req.auth_user_id) {
      const { error: updateError } = await supabase
        .from("school_users")
        .update({ school_id: currentSchool.id } as any)
        .eq("user_id", req.auth_user_id)
        .is("school_id", null);
      if (updateError) {
        toast({ title: "Error", description: updateError.message, variant: "destructive" });
        return;
      }
    }
    await (supabase as any).from("portal_registration_requests").update({
      status: "approved", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Request approved", description: `${req.full_name} is now linked to your school.` });
    fetchRegRequests();
    fetchStudents();
    fetchParents();
  };

  const handleRejectReg = async (req: any) => {
    if (!schoolUser) return;
    await (supabase as any).from("portal_registration_requests").update({
      status: "rejected", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Registration rejected" });
    fetchRegRequests();
  };

  // --- Parent link request handlers ---
  const openApproveLinkReq = (req: any) => {
    setApprovingReq(req);
    setSelectedStudentForLink("");
    setApproveOpen(true);
  };

  const handleApproveLinkReq = async () => {
    if (!approvingReq || !selectedStudentForLink || !schoolUser) return;
    const { error: linkError } = await supabase.from("student_parent_links").insert({
      parent_user_id: approvingReq.parent_user_id,
      student_user_id: selectedStudentForLink,
      relationship: approvingReq.relationship,
    });
    if (linkError) { toast({ title: "Error", description: linkError.message, variant: "destructive" }); return; }

    await (supabase as any).from("parent_link_requests").update({
      status: "approved", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
      matched_student_id: selectedStudentForLink, parent_approved: true, student_approved: true,
    }).eq("id", approvingReq.id);
    toast({ title: "Link request approved" });
    setApproveOpen(false);
    fetchParentLinkRequests();
  };

  const handleRejectLinkReq = async (req: any) => {
    if (!schoolUser) return;
    await (supabase as any).from("parent_link_requests").update({
      status: "rejected", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Link request rejected" });
    fetchParentLinkRequests();
  };

  const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  const pendingRegCount = regRequests.filter(r => r.status === "pending").length;
  const pendingLinkCount = parentLinkRequests.filter(r => r.status === "pending").length;
  const activeStudents = students.filter(s => s.is_active);

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Students</h1>
          <p className="text-muted-foreground">Student directory, registration and parent link requests</p>
        </div>

        <Tabs defaultValue="directory">
          <TabsList>
            <TabsTrigger value="directory" className="gap-2">
              <Users className="h-4 w-4" />Directory
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Registrations {pendingRegCount > 0 && <Badge variant="secondary" className="ml-1">{pendingRegCount}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="parent-links" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Parent links {pendingLinkCount > 0 && <Badge variant="secondary" className="ml-1">{pendingLinkCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          {/* Directory Tab */}
          <TabsContent value="directory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />All Students</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : students.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No students linked yet. Students register on the portal and request to join your school.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>ID Number</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map(s => (
                        <TableRow key={s.id}>
                          <TableCell className="font-medium">{s.full_name}</TableCell>
                          <TableCell>{s.email}</TableCell>
                          <TableCell>{s.student_id_number || "—"}</TableCell>
                          <TableCell>{s.phone || "—"}</TableCell>
                          <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button variant="ghost" size="icon" onClick={() => openLinkDialog(s)} title="Link Parents">
                                <Link2 className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => openEdit(s)} title="Edit">
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => toggleActive(s)} title={s.is_active ? "Deactivate" : "Activate"}>
                                {s.is_active ? <ToggleRight className="h-4 w-4 text-primary" /> : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => setUnlinkTarget(s)} title="Unlink from school">
                                <UserMinus className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Registration Requests Tab */}
          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Student & Parent Registration Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReqs ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : regRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No student or parent registration requests yet.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>ID/Passport</TableHead>
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
                          <TableCell>{r.id_passport_number || r.student_id_number || "—"}</TableCell>
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

          {/* Parent Link Requests Tab */}
          <TabsContent value="parent-links">
            <Card>
              <CardHeader>
                <CardTitle>Parent Link Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {parentLinkRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No parent link requests yet.</p>
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
                      {parentLinkRequests.map(r => (
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
                                <Button variant="ghost" size="icon" onClick={() => openApproveLinkReq(r)} title="Approve">
                                  <Check className="h-4 w-4 text-primary" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={() => handleRejectLinkReq(r)} title="Reject">
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

      {/* Edit Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Student</DialogTitle>
            <DialogDescription>Update student details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Student ID Number</Label>
              <Input placeholder="Optional" value={studentIdNumber} onChange={e => setStudentIdNumber(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="Optional" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : "Update"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Confirmation */}
      <AlertDialog open={!!unlinkTarget} onOpenChange={(open) => !open && setUnlinkTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unlink student?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <strong>{unlinkTarget?.full_name}</strong> from your school.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnlink}>Unlink</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Parent Linking Dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Parents of {linkingStudent?.full_name}</DialogTitle>
            <DialogDescription>Link or unlink parents/guardians to this student.</DialogDescription>
          </DialogHeader>
          {loadingLinks ? (
            <p className="text-muted-foreground text-center py-4">Loading...</p>
          ) : (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium mb-2">Linked Parents ({linkedParents.length})</h3>
                {linkedParents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No parents linked yet.</p>
                ) : (
                  <div className="space-y-1">
                    {linkedParents.map((lp: any) => (
                      <div key={lp.id} className="flex items-center justify-between rounded-md border p-2">
                        <div>
                          <span className="font-medium text-sm">{lp.school_users?.full_name}</span>
                          <span className="text-muted-foreground text-xs ml-2">{lp.school_users?.email}</span>
                          <Badge variant="outline" className="ml-2 text-xs capitalize">{lp.relationship}</Badge>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => handleUnlinkParent(lp.id)} title="Unlink">
                          <UserMinus className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Link a Parent</h3>
                {availableParents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No available parents to link.</p>
                ) : (
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Parent</Label>
                      <Select value={selectedParentId} onValueChange={setSelectedParentId}>
                        <SelectTrigger><SelectValue placeholder="Select parent" /></SelectTrigger>
                        <SelectContent>
                          {availableParents.map(p => <SelectItem key={p.id} value={p.id}>{p.full_name} ({p.email})</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="w-36 space-y-1">
                      <Label className="text-xs">Relationship</Label>
                      <Select value={relationship} onValueChange={setRelationship}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="mother">Mother</SelectItem>
                          <SelectItem value="father">Father</SelectItem>
                          <SelectItem value="guardian">Guardian</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleLinkParent} disabled={!selectedParentId}>Link</Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Approve Parent Link Request Dialog */}
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
              <Select value={selectedStudentForLink} onValueChange={setSelectedStudentForLink}>
                <SelectTrigger><SelectValue placeholder="Choose a student" /></SelectTrigger>
                <SelectContent>
                  {activeStudents.map(s => (
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
            <Button onClick={handleApproveLinkReq} disabled={!selectedStudentForLink}>Approve & Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}
