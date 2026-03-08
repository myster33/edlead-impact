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
import { UserCheck, Pencil, ToggleLeft, ToggleRight, UserMinus, UserPlus, Check, X } from "lucide-react";

const staffRoles = [
  { value: "educator", label: "Educator" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "subject_teacher", label: "Subject Teacher" },
  { value: "hr", label: "HR" },
] as const;

export default function SchoolStaff() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [unlinkTarget, setUnlinkTarget] = useState<any | null>(null);

  // Registration requests
  const [regRequests, setRegRequests] = useState<any[]>([]);
  const [loadingReqs, setLoadingReqs] = useState(true);

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

  const fetchRegRequests = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { data } = await (supabase as any)
      .from("portal_registration_requests")
      .select("*")
      .eq("school_id", currentSchool.id)
      .in("role", ["educator", "class_teacher", "subject_teacher", "hr"])
      .order("created_at", { ascending: false });
    setRegRequests(data || []);
    setLoadingReqs(false);
  }, [currentSchool?.id]);

  useEffect(() => { fetchStaff(); fetchRegRequests(); }, [fetchStaff, fetchRegRequests]);

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

  // Registration handlers
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
    toast({ title: "Staff request approved", description: `${req.full_name} is now linked to your school.` });
    fetchRegRequests();
    fetchStaff();
  };

  const handleRejectReg = async (req: any) => {
    if (!schoolUser) return;
    await (supabase as any).from("portal_registration_requests").update({
      status: "rejected", reviewed_by: schoolUser.id, reviewed_at: new Date().toISOString(),
    }).eq("id", req.id);
    toast({ title: "Registration rejected" });
    fetchRegRequests();
  };

  const statusColor = (s: string) => s === "approved" ? "default" : s === "rejected" ? "destructive" : "secondary";
  const pendingRegCount = regRequests.filter(r => r.status === "pending").length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Staff</h1>
          <p className="text-muted-foreground">Staff directory and registration requests</p>
        </div>

        <Tabs defaultValue="directory">
          <TabsList>
            <TabsTrigger value="directory" className="gap-2">
              <UserCheck className="h-4 w-4" />Directory
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-2">
              <UserPlus className="h-4 w-4" />
              Requests {pendingRegCount > 0 && <Badge variant="secondary" className="ml-1">{pendingRegCount}</Badge>}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="directory">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />All Staff</CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : staff.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No staff linked yet. Staff members register on the portal and request to join your school.</p>
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
          </TabsContent>

          <TabsContent value="requests">
            <Card>
              <CardHeader>
                <CardTitle>Staff Registration Requests</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReqs ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : regRequests.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No staff registration requests yet.</p>
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
                          <TableCell className="capitalize">{r.role?.replace("_", " ")}</TableCell>
                          <TableCell>{r.id_passport_number || "—"}</TableCell>
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
        </Tabs>
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
