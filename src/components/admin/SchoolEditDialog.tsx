import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Users, Pencil, Save, X } from "lucide-react";

interface SchoolRecord {
  id: string;
  name: string;
  address: string | null;
  province: string | null;
  country: string;
  school_code: string;
  emis_number: string | null;
  email: string | null;
  phone: string | null;
  is_verified: boolean;
  created_at: string;
}

interface SchoolUser {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  role: string;
  is_active: boolean;
  created_at: string;
}

const ROLE_OPTIONS = [
  { value: "school_admin", label: "School Admin" },
  { value: "hr", label: "HR" },
  { value: "educator", label: "Educator" },
  { value: "class_teacher", label: "Class Teacher" },
  { value: "subject_teacher", label: "Subject Teacher" },
  { value: "parent", label: "Parent" },
  { value: "student", label: "Student" },
];

interface SchoolEditDialogProps {
  school: SchoolRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

export function SchoolEditDialog({ school, open, onOpenChange, onSaved }: SchoolEditDialogProps) {
  const [name, setName] = useState("");
  const [emisNumber, setEmisNumber] = useState("");
  const [address, setAddress] = useState("");
  const [province, setProvince] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editActive, setEditActive] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (school) {
      setName(school.name);
      setEmisNumber(school.emis_number || "");
      setAddress(school.address || "");
      setProvince(school.province || "");
      setEmail(school.email || "");
      setPhone(school.phone || "");
    }
  }, [school]);

  const fetchUsers = async () => {
    if (!school) return;
    setUsersLoading(true);
    const { data, error } = await supabase
      .from("school_users")
      .select("id, full_name, email, phone, role, is_active, created_at")
      .eq("school_id", school.id)
      .order("created_at", { ascending: true });

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      setUsers((data || []) as SchoolUser[]);
    }
    setUsersLoading(false);
  };

  useEffect(() => {
    if (open && school) {
      fetchUsers();
    }
    if (!open) {
      setEditingUserId(null);
    }
  }, [open, school]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({ title: "Validation Error", description: "School name is required.", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    const { error } = await supabase
      .from("schools")
      .update({
        name: name.trim(),
        emis_number: emisNumber.trim() || null,
        address: address.trim() || null,
        province: province.trim() || null,
        email: email.trim() || null,
        phone: phone.trim() || null,
      })
      .eq("id", school!.id);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "School updated successfully" });
      onOpenChange(false);
      onSaved();
    }
    setIsSaving(false);
  };

  const startEditUser = (user: SchoolUser) => {
    setEditingUserId(user.id);
    setEditRole(user.role);
    setEditActive(user.is_active);
  };

  const cancelEditUser = () => {
    setEditingUserId(null);
  };

  const saveUserChanges = async (userId: string) => {
    const { error } = await supabase
      .from("school_users")
      .update({ role: editRole as any, is_active: editActive })
      .eq("id", userId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "User updated" });
      setEditingUserId(null);
      fetchUsers();
      onSaved();
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    if (role === "school_admin") return "default" as const;
    if (role === "hr") return "secondary" as const;
    return "outline" as const;
  };

  const formatRole = (role: string) => {
    return ROLE_OPTIONS.find(r => r.value === role)?.label || role;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit School{school ? `: ${school.name}` : ""}</DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="details" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="details">School Details</TabsTrigger>
            <TabsTrigger value="users" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" />Users ({users.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="school-name">School Name *</Label>
              <Input id="school-name" value={name} onChange={e => setName(e.target.value)} placeholder="School name" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="emis-number">EMIS Number</Label>
              <Input id="emis-number" value={emisNumber} onChange={e => setEmisNumber(e.target.value)} placeholder="e.g. 400100001" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-address">Address</Label>
              <Input id="school-address" value={address} onChange={e => setAddress(e.target.value)} placeholder="School address" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school-province">Province</Label>
              <Input id="school-province" value={province} onChange={e => setProvince(e.target.value)} placeholder="e.g. Gauteng" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="school-email">Email</Label>
                <Input id="school-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="school@email.com" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="school-phone">Phone</Label>
                <Input id="school-phone" value={phone} onChange={e => setPhone(e.target.value)} placeholder="Phone number" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>Cancel</Button>
              <Button onClick={handleSave} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </TabsContent>

          <TabsContent value="users" className="py-2">
            {usersLoading ? (
              <p className="text-muted-foreground text-center py-6">Loading users...</p>
            ) : users.length === 0 ? (
              <p className="text-muted-foreground text-center py-6">No users registered under this school.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Active</TableHead>
                    <TableHead className="w-[80px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map(user => (
                    <TableRow key={user.id}>
                      <TableCell className="font-medium text-sm">{user.full_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <Select value={editRole} onValueChange={setEditRole}>
                            <SelectTrigger className="h-8 w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_OPTIONS.map(r => (
                                <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant={getRoleBadgeVariant(user.role)}>{formatRole(user.role)}</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <Switch checked={editActive} onCheckedChange={setEditActive} />
                        ) : (
                          <Badge variant={user.is_active ? "default" : "secondary"}>
                            {user.is_active ? "Yes" : "No"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {editingUserId === user.id ? (
                          <div className="flex items-center gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => saveUserChanges(user.id)}>
                              <Save className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={cancelEditUser}>
                              <X className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        ) : (
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => startEditUser(user)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
