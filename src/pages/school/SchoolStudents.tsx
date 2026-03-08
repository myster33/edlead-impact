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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Users, Plus, Pencil, ToggleLeft, ToggleRight, Link2, UserMinus } from "lucide-react";

export default function SchoolStudents() {
  const { currentSchool } = useSchoolAuth();
  const { toast } = useToast();
  const [students, setStudents] = useState<any[]>([]);
  const [parents, setParents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Student form
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [studentIdNumber, setStudentIdNumber] = useState("");
  const [isSaving, setIsSaving] = useState(false);

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

  const openCreate = () => {
    setEditing(null);
    setFullName(""); setEmail(""); setPhone(""); setStudentIdNumber("");
    setFormOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setFullName(s.full_name); setEmail(s.email); setPhone(s.phone || ""); setStudentIdNumber(s.student_id_number || "");
    setFormOpen(true);
  };

  const handleSave = async () => {
    if (!currentSchool?.id || !fullName.trim() || !email.trim()) {
      toast({ title: "Validation", description: "Name and email are required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);

    if (editing) {
      const { error } = await supabase.from("school_users").update({
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        student_id_number: studentIdNumber.trim() || null,
      }).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Student updated" });
    } else {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: crypto.randomUUID().slice(0, 16) + "Aa1!",
        options: { emailRedirectTo: `${window.location.origin}/portal/login` },
      });
      if (authError || !authData.user) {
        toast({ title: "Error", description: authError?.message || "Could not create user.", variant: "destructive" });
        setIsSaving(false); return;
      }
      const { error } = await supabase.from("school_users").insert({
        user_id: authData.user.id,
        school_id: currentSchool.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        student_id_number: studentIdNumber.trim() || null,
        role: "student" as any,
      });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Student added", description: "A login invitation has been sent." });
    }
    setIsSaving(false);
    setFormOpen(false);
    fetchStudents();
  };

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from("school_users").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else { toast({ title: s.is_active ? "Student deactivated" : "Student activated" }); fetchStudents(); }
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
            <p className="text-muted-foreground">Student directory, registration & parent linking</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Users className="h-5 w-5" />All Students</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : students.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No students registered. Click "Add Student" to get started.</p>
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

      {/* Student Form Dialog */}
      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Student" : "Add Student"}</DialogTitle>
            <DialogDescription>{editing ? "Update student details." : "Register a new student. They will receive a login invitation."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} disabled={!!editing} />
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
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              {/* Current links */}
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

              {/* Add new link */}
              <div>
                <h3 className="text-sm font-medium mb-2">Link a Parent</h3>
                {availableParents.length === 0 ? (
                  <p className="text-muted-foreground text-sm">No available parents to link. Register a parent first.</p>
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
