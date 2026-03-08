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
import { UserCheck, Pencil, ToggleLeft, ToggleRight, UserMinus, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";

const staffRoles = [
  { value: "educator", label: "Educator" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "subject_teacher", label: "Subject Teacher" },
  { value: "hr", label: "HR" },
] as const;

export default function SchoolStaff() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<any | null>(null);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<string>("educator");

  const fetchStaff = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("*")
      .eq("school_id", currentSchool.id)
      .in("role", ["educator", "class_teacher", "subject_teacher", "school_admin", "hr"])
      .order("full_name");
    setStaff(data || []);
    setIsLoading(false);
  }, [currentSchool?.id]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  const openEdit = (s: any) => {
    setEditing(s);
    setFullName(s.full_name);
    setPhone(s.phone || "");
    setRole(s.role);
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
      role: role as any,
    }).eq("id", editing.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else toast({ title: "Staff member updated" });
    setIsSaving(false);
    setFormOpen(false);
    fetchStaff();
  };

  const toggleActive = async (s: any) => {
    const { error } = await supabase.from("school_users").update({ is_active: !s.is_active }).eq("id", s.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: s.is_active ? "Staff deactivated" : "Staff activated" });
      fetchStaff();
    }
  };

  const handleUnlink = async () => {
    if (!unlinkTarget) return;
    const { error } = await (supabase as any).from("school_users").update({ school_id: null, is_active: false }).eq("id", unlinkTarget.id);
    if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Staff member unlinked", description: `${unlinkTarget.full_name} has been removed from the school and can now link to another school.` });
      fetchStaff();
    }
    setUnlinkTarget(null);
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff</h1>
            <p className="text-muted-foreground">Staff directory — members join by submitting link requests</p>
          </div>
          <Button variant="outline" onClick={() => navigate("/school/requests")}>
            <UserPlus className="h-4 w-4 mr-2" /> View Requests
          </Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />All Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : staff.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No staff linked yet. Staff members register on the portal and request to join your school. Approve their requests from the Requests page.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {staff.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.full_name}</TableCell>
                      <TableCell><Badge variant="outline" className="capitalize">{s.role?.replace("_", " ")}</Badge></TableCell>
                      <TableCell>{s.email}</TableCell>
                      <TableCell>{s.phone || "—"}</TableCell>
                      <TableCell><Badge variant={s.is_active ? "default" : "secondary"}>{s.is_active ? "Active" : "Inactive"}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
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
            <DialogTitle>Edit Staff Member</DialogTitle>
            <DialogDescription>Update staff details.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input placeholder="Phone number (optional)" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {staffRoles.map(r => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
                </SelectContent>
              </Select>
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
            <AlertDialogTitle>Unlink staff member?</AlertDialogTitle>
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
    </SchoolLayout>
  );
}
