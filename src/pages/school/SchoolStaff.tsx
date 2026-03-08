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
import { useToast } from "@/hooks/use-toast";
import { UserCheck, Plus, Pencil, ToggleLeft, ToggleRight } from "lucide-react";

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
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Form fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
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

  const openCreate = () => {
    setEditing(null);
    setFullName("");
    setEmail("");
    setPhone("");
    setRole("educator");
    setFormOpen(true);
  };

  const openEdit = (s: any) => {
    setEditing(s);
    setFullName(s.full_name);
    setEmail(s.email);
    setPhone(s.phone || "");
    setRole(s.role);
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
        role: role as any,
      }).eq("id", editing.id);
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Staff member updated" });
    } else {
      // Create auth user first, then school_users record
      // For now we create the school_users record with a placeholder user_id
      // In production, you'd use an edge function to create the auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email.trim(),
        password: crypto.randomUUID().slice(0, 16) + "Aa1!", // Temporary password
        options: { emailRedirectTo: `${window.location.origin}/portal/login` },
      });

      if (authError || !authData.user) {
        toast({ title: "Error", description: authError?.message || "Could not create user account.", variant: "destructive" });
        setIsSaving(false);
        return;
      }

      const { error } = await supabase.from("school_users").insert({
        user_id: authData.user.id,
        school_id: currentSchool.id,
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim() || null,
        role: role as any,
      });
      if (error) toast({ title: "Error", description: error.message, variant: "destructive" });
      else toast({ title: "Staff member added", description: "An invitation email has been sent." });
    }

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

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Staff</h1>
            <p className="text-muted-foreground">Staff directory & registration</p>
          </div>
          <Button onClick={openCreate}><Plus className="h-4 w-4 mr-2" /> Add Staff</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><UserCheck className="h-5 w-5" />All Staff</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : staff.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No staff registered. Click "Add Staff" to get started.</p>
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

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit Staff Member" : "Add Staff Member"}</DialogTitle>
            <DialogDescription>{editing ? "Update staff details." : "Add a new staff member. They will receive a login invitation."}</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input placeholder="Full name" value={fullName} onChange={e => setFullName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" placeholder="Email address" value={email} onChange={e => setEmail(e.target.value)} disabled={!!editing} />
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
            <Button onClick={handleSave} disabled={isSaving}>{isSaving ? "Saving..." : editing ? "Update" : "Add"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SchoolLayout>
  );
}
