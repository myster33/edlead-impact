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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, Pencil, ToggleLeft, ToggleRight, Link2, UserMinus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function SchoolStudents() {
  const { currentSchool } = useSchoolAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
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
    setParents(data || []);
  }, [currentSchool?.id]);

  useEffect(() => { fetchStudents(); fetchParents(); }, [fetchStudents, fetchParents]);

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
      toast({ title: "Student unlinked", description: `${unlinkTarget.full_name} has been removed from the school and can now link to another school.` });
      fetchStudents();
    }
    setUnlinkTarget(null);
  };

  // Parent linking
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
  const availableParents = parents.filter(p => !linkedParentIds.includes(p.id));

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground">Student directory — members join by submitting link requests</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/school/requests")}>
            <UserPlus className="h-4 w-4 mr-2" /> View Requests
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />All Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students linked yet. Students register on the portal and request to join your school. Approve their requests from the Requests page.</p>
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
              This will remove <strong>{unlinkTarget?.full_name}</strong> from your school. They will be able to link to another school after this.
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
    </SchoolLayout>
  );
}
