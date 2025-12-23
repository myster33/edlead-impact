import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuditLog } from "@/hooks/use-audit-log";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { 
  ArrowLeft,
  LogOut, 
  Users, 
  UserPlus,
  Shield,
  Eye,
  Edit,
  Trash2,
  Loader2,
  RefreshCw,
  MapPin
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
  full_name: string | null;
  phone: string | null;
  position: string | null;
  country: string | null;
  province: string | null;
  profile_picture_url: string | null;
}

const countries = [
  { value: "South Africa", label: "South Africa" },
  { value: "Kenya", label: "Kenya" },
  { value: "Nigeria", label: "Nigeria" },
  { value: "Ghana", label: "Ghana" },
  { value: "Tanzania", label: "Tanzania" },
  { value: "Uganda", label: "Uganda" },
  { value: "Rwanda", label: "Rwanda" },
  { value: "Ethiopia", label: "Ethiopia" },
  { value: "Zimbabwe", label: "Zimbabwe" },
  { value: "Zambia", label: "Zambia" },
];

const provincesByCountry: Record<string, { value: string; label: string }[]> = {
  "South Africa": [
    { value: "Eastern Cape", label: "Eastern Cape" },
    { value: "Free State", label: "Free State" },
    { value: "Gauteng", label: "Gauteng" },
    { value: "KwaZulu-Natal", label: "KwaZulu-Natal" },
    { value: "Limpopo", label: "Limpopo" },
    { value: "Mpumalanga", label: "Mpumalanga" },
    { value: "Northern Cape", label: "Northern Cape" },
    { value: "North West", label: "North West" },
    { value: "Western Cape", label: "Western Cape" },
  ],
  "Kenya": [
    { value: "Nairobi", label: "Nairobi" },
    { value: "Mombasa", label: "Mombasa" },
    { value: "Kisumu", label: "Kisumu" },
    { value: "Central", label: "Central" },
    { value: "Coast", label: "Coast" },
  ],
  "Nigeria": [
    { value: "Lagos", label: "Lagos" },
    { value: "Abuja", label: "Abuja" },
    { value: "Kano", label: "Kano" },
    { value: "Rivers", label: "Rivers" },
  ],
};

export default function AdminManagement() {
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuth();
  const { toast } = useToast();
  const { logAction } = useAuditLog();
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add user dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  const [newUserCountry, setNewUserCountry] = useState("");
  const [newUserProvince, setNewUserProvince] = useState("");
  
  // Edit user dialog
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("viewer");
  const [editCountry, setEditCountry] = useState("");
  const [editProvince, setEditProvince] = useState("");
  
  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const isAdmin = adminUser?.role === "admin";

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

      // Non-admin users (reviewers/viewers) cannot see admin users
      // and can only see users in their assigned region
      if (!isAdmin) {
        query = query.neq("role", "admin");
        
        // Filter by region if user has one assigned
        if (adminUser?.country) {
          query = query.eq("country", adminUser.country);
        }
        if (adminUser?.province) {
          query = query.eq("province", adminUser.province);
        }
      }

      const { data, error } = await query;

      if (error) throw error;
      setAdminUsers(data || []);
    } catch (error) {
      console.error("Error fetching admin users:", error);
      toast({
        title: "Error",
        description: "Failed to load admin users.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const addAdminUser = async () => {
    if (!newUserEmail.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter an email address.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Check if already an admin
      const existing = adminUsers.find(a => a.email.toLowerCase() === newUserEmail.toLowerCase().trim());
      if (existing) {
        toast({
          title: "Already Admin",
          description: "This user is already an admin.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Try to insert - will fail if user_id doesn't exist
      // We need to use an edge function for this since we can't access auth.users directly
      const response = await supabase.functions.invoke("add-admin-user", {
        body: { 
          email: newUserEmail.toLowerCase().trim(), 
          role: newUserRole,
          country: newUserRole !== "admin" ? newUserCountry : null,
          province: newUserRole !== "admin" ? newUserProvince : null,
        },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        toast({
          title: "Error",
          description: response.data.error || "Failed to add admin user.",
          variant: "destructive",
        });
        return;
      }

      setAdminUsers([response.data.admin, ...adminUsers]);
      setIsAddDialogOpen(false);
      
      // Send region assignment notification if region is assigned
      if (newUserRole !== "admin" && (newUserCountry || newUserProvince)) {
        supabase.functions.invoke("notify-reviewer-assignment", {
          body: {
            reviewer_email: newUserEmail.toLowerCase().trim(),
            reviewer_name: null,
            country: newUserCountry || null,
            province: newUserProvince || null,
            role: newUserRole,
          },
        }).catch(err => console.error("Failed to send assignment notification:", err));
      }
      
      setNewUserEmail("");
      setNewUserRole("viewer");
      setNewUserCountry("");
      setNewUserProvince("");

      toast({
        title: "Admin Added",
        description: `${newUserEmail} has been added as a ${newUserRole}.`,
      });
    } catch (error: any) {
      console.error("Error adding admin:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add admin user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateAdminRole = async () => {
    if (!editingUser) return;

    const oldRole = editingUser.role;
    setIsSubmitting(true);
    try {
      const updateData: any = { role: editRole };
      
      // Only set country/province for non-admin roles
      if (editRole !== "admin") {
        updateData.country = editCountry || null;
        updateData.province = editProvince || null;
      }

      const { error } = await supabase
        .from("admin_users")
        .update(updateData)
        .eq("id", editingUser.id);

      if (error) throw error;

      setAdminUsers(adminUsers.map(u => 
        u.id === editingUser.id ? { 
          ...u, 
          role: editRole, 
          country: editRole !== "admin" ? editCountry : null,
          province: editRole !== "admin" ? editProvince : null 
        } : u
      ));

      // Log role change with critical alert
      await logAction(
        {
          action: "admin_role_changed",
          table_name: "admin_users",
          record_id: editingUser.id,
          old_values: { role: oldRole },
          new_values: { role: editRole }
        },
        {
          target_email: editingUser.email,
          details: { oldRole, newRole: editRole }
        }
      );

      // Send region assignment notification if region changed for non-admin roles
      const regionChanged = editRole !== "admin" && (
        editCountry !== editingUser.country || 
        editProvince !== editingUser.province
      );
      
      if (regionChanged && (editCountry || editProvince)) {
        supabase.functions.invoke("notify-reviewer-assignment", {
          body: {
            reviewer_email: editingUser.email,
            reviewer_name: editingUser.full_name || null,
            country: editCountry || null,
            province: editProvince || null,
            role: editRole,
          },
        }).catch(err => console.error("Failed to send assignment notification:", err));
      }

      setEditingUser(null);

      toast({
        title: "Updated",
        description: `${editingUser.email}'s role and region have been updated.`,
      });
    } catch (error) {
      console.error("Error updating role:", error);
      toast({
        title: "Error",
        description: "Failed to update role.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteAdminUser = async () => {
    if (!deletingUser) return;

    // Prevent self-deletion
    if (deletingUser.user_id === adminUser?.user_id) {
      toast({
        title: "Cannot Delete",
        description: "You cannot remove yourself as an admin.",
        variant: "destructive",
      });
      setDeletingUser(null);
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .delete()
        .eq("id", deletingUser.id);

      if (error) throw error;

      // Log deletion with critical alert
      await logAction(
        {
          action: "admin_user_deleted",
          table_name: "admin_users",
          record_id: deletingUser.id,
          old_values: { email: deletingUser.email, role: deletingUser.role }
        },
        {
          target_email: deletingUser.email,
          details: { role: deletingUser.role }
        }
      );

      setAdminUsers(adminUsers.filter(u => u.id !== deletingUser.id));
      setDeletingUser(null);

      toast({
        title: "Admin Removed",
        description: `${deletingUser.email} has been removed as an admin.`,
      });
    } catch (error) {
      console.error("Error deleting admin:", error);
      toast({
        title: "Error",
        description: "Failed to remove admin user.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleBadge = (role: AppRole) => {
    switch (role) {
      case "admin":
        return <Badge className="bg-primary/10 text-primary">Admin</Badge>;
      case "reviewer":
        return <Badge className="bg-blue-500/10 text-blue-600">Reviewer</Badge>;
      default:
        return <Badge variant="secondary">Viewer</Badge>;
    }
  };

  const getRoleDescription = (role: AppRole) => {
    switch (role) {
      case "admin":
        return "Full access: can manage admins, approve/reject applications, and delete data";
      case "reviewer":
        return "Can view and approve/reject applications";
      default:
        return "Can only view applications";
    }
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-muted-foreground">
              Manage admin users and their permissions
            </p>
          </div>
          {isAdmin && (
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Admin
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Admin User</DialogTitle>
                  <DialogDescription>
                    The user must have already signed up at /admin/login before they can be added as an admin.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="user@example.com"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                    />
                  </div>
                <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={newUserRole} onValueChange={(v) => {
                      setNewUserRole(v as AppRole);
                      if (v === "admin") {
                        setNewUserCountry("");
                        setNewUserProvince("");
                      }
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">
                          <div className="flex items-center gap-2">
                            <Eye className="h-4 w-4" />
                            Viewer
                          </div>
                        </SelectItem>
                        <SelectItem value="reviewer">
                          <div className="flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            Reviewer
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Admin
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      {getRoleDescription(newUserRole)}
                    </p>
                  </div>
                  
                  {newUserRole !== "admin" && (
                    <>
                      <div className="space-y-2">
                        <Label htmlFor="country">Assigned Country</Label>
                        <Select value={newUserCountry} onValueChange={(v) => {
                          setNewUserCountry(v);
                          setNewUserProvince("");
                        }}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select country (optional)" />
                          </SelectTrigger>
                          <SelectContent>
                            {countries.map(c => (
                              <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-muted-foreground">
                          Limit this user to applications from this country
                        </p>
                      </div>
                      
                      {newUserCountry && provincesByCountry[newUserCountry] && (
                        <div className="space-y-2">
                          <Label htmlFor="province">Assigned Province/Region</Label>
                          <Select value={newUserProvince} onValueChange={setNewUserProvince}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select province (optional)" />
                            </SelectTrigger>
                            <SelectContent>
                              {provincesByCountry[newUserCountry]?.map(p => (
                                <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            Further limit to a specific province/region
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={addAdminUser} disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Add Admin
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Role Legend */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="h-5 w-5 text-muted-foreground" />
                Viewer
              </CardTitle>
              <CardDescription>Can only view applications</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Edit className="h-5 w-5 text-blue-500" />
                Reviewer
              </CardTitle>
              <CardDescription>Can view and approve/reject applications</CardDescription>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Admin
              </CardTitle>
              <CardDescription>Full access including managing admins</CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Admin Users Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Admin Users ({adminUsers.length})
                </CardTitle>
                <CardDescription>
                  Users with administrative access to the dashboard
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchAdminUsers} disabled={isLoading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : adminUsers.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No admin users found</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden md:table-cell">Region</TableHead>
                    <TableHead className="hidden lg:table-cell">Contact</TableHead>
                    <TableHead className="hidden sm:table-cell">Added</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            {user.profile_picture_url && (
                              <AvatarImage src={user.profile_picture_url} alt={user.full_name || user.email} />
                            )}
                            <AvatarFallback className="text-xs">
                              {(user.full_name || user.email).slice(0, 2).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{user.full_name || user.email}</span>
                              {user.user_id === adminUser?.user_id && (
                                <Badge variant="outline" className="text-xs">You</Badge>
                              )}
                            </div>
                            {user.full_name && (
                              <p className="text-xs text-muted-foreground">{user.email}</p>
                            )}
                            {user.position && (
                              <p className="text-xs text-muted-foreground">{user.position}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        {user.role !== "admin" && (user.country || user.province) ? (
                          <div className="text-sm">
                            {user.province && <span>{user.province}</span>}
                            {user.province && user.country && <span>, </span>}
                            {user.country && <span className="text-muted-foreground">{user.country}</span>}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {user.phone ? (
                          <span className="text-sm">{user.phone}</span>
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {new Date(user.created_at).toLocaleDateString("en-ZA")}
                      </TableCell>
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingUser(user);
                                setEditRole(user.role);
                                setEditCountry(user.country || "");
                                setEditProvince(user.province || "");
                              }}
                              disabled={user.user_id === adminUser?.user_id}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setDeletingUser(user)}
                              disabled={user.user_id === adminUser?.user_id}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
      {/* Edit Role Dialog */}
      <Dialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Admin User</DialogTitle>
            <DialogDescription>
              Update role and region assignment for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-role">Role</Label>
              <Select value={editRole} onValueChange={(v) => {
                setEditRole(v as AppRole);
                if (v === "admin") {
                  setEditCountry("");
                  setEditProvince("");
                }
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="reviewer">Reviewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {getRoleDescription(editRole)}
              </p>
            </div>
            
            {editRole !== "admin" && (
              <>
                <div className="space-y-2">
                  <Label>Assigned Country</Label>
                  <Select value={editCountry} onValueChange={(v) => {
                    setEditCountry(v);
                    setEditProvince("");
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select country (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map(c => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {editCountry && provincesByCountry[editCountry] && (
                  <div className="space-y-2">
                    <Label>Assigned Province/Region</Label>
                    <Select value={editProvince} onValueChange={setEditProvince}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select province (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {provincesByCountry[editCountry]?.map(p => (
                          <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingUser(null)}>
              Cancel
            </Button>
            <Button onClick={updateAdminRole} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deletingUser} onOpenChange={() => setDeletingUser(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Admin Access</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {deletingUser?.email} as an admin? 
              They will no longer be able to access the admin dashboard.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteAdminUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Remove Admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
