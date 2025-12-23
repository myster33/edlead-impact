import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
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
  RefreshCw
} from "lucide-react";
import { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface AdminUser {
  id: string;
  user_id: string;
  email: string;
  role: AppRole;
  created_at: string;
}

export default function AdminManagement() {
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuth();
  const { toast } = useToast();
  
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Add user dialog
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserRole, setNewUserRole] = useState<AppRole>("viewer");
  
  // Edit user dialog
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState<AppRole>("viewer");
  
  // Delete confirmation
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);

  const isAdmin = adminUser?.role === "admin";

  useEffect(() => {
    fetchAdminUsers();
  }, []);

  const fetchAdminUsers = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("*")
        .order("created_at", { ascending: false });

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
        body: { email: newUserEmail.toLowerCase().trim(), role: newUserRole },
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
      setNewUserEmail("");
      setNewUserRole("viewer");

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

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("admin_users")
        .update({ role: editRole })
        .eq("id", editingUser.id);

      if (error) throw error;

      setAdminUsers(adminUsers.map(u => 
        u.id === editingUser.id ? { ...u, role: editRole } : u
      ));
      setEditingUser(null);

      toast({
        title: "Role Updated",
        description: `${editingUser.email}'s role has been updated to ${editRole}.`,
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
                    <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as AppRole)}>
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
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead className="hidden sm:table-cell">Added</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {adminUsers.map((user) => (
                    <TableRow key={user.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{user.email}</span>
                          {user.user_id === adminUser?.user_id && (
                            <Badge variant="outline" className="text-xs">You</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{getRoleBadge(user.role)}</TableCell>
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
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              Change the role for {editingUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="edit-role">Role</Label>
            <Select value={editRole} onValueChange={(v) => setEditRole(v as AppRole)}>
              <SelectTrigger className="mt-2">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="reviewer">Reviewer</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              {getRoleDescription(editRole)}
            </p>
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
