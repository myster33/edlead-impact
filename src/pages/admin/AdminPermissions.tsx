import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Shield, Save, RefreshCw, Info } from "lucide-react";
import { toast } from "sonner";
import { useAuditLog } from "@/hooks/use-audit-log";
import type { ModulePermission } from "@/hooks/use-module-permissions";

const ROLES = ["viewer", "reviewer", "admin"] as const;

const ROLE_COLORS: Record<string, string> = {
  viewer: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  reviewer: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  admin: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  super_admin: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
};

export default function AdminPermissions() {
  const queryClient = useQueryClient();
  const { adminUser } = useAdminAuth();
  const { logAction } = useAuditLog();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string[]>>({});

  const isSuperAdmin = adminUser?.role === "super_admin";

  const { data: permissions, isLoading } = useQuery({
    queryKey: ["module-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .order("module_name");

      if (error) throw error;
      return data as unknown as ModulePermission[];
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, allowed_roles }: { id: string; allowed_roles: string[] }) => {
      const { error } = await supabase
        .from("module_permissions")
        .update({ allowed_roles } as any)
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["module-permissions"] });
    },
  });

  const handleRoleToggle = (moduleKey: string, moduleId: string, role: string, currentRoles: string[]) => {
    const newRoles = currentRoles.includes(role)
      ? currentRoles.filter((r) => r !== role)
      : [...currentRoles, role];

    // Only super_admin can toggle admin off; admin role users can't remove their own access
    if (!isSuperAdmin && !newRoles.includes("admin")) {
      newRoles.push("admin");
    }

    setPendingChanges((prev) => ({
      ...prev,
      [moduleId]: newRoles,
    }));
  };

  const getRolesForModule = (permission: ModulePermission) => {
    return pendingChanges[permission.id] || (permission.allowed_roles as string[]);
  };

  const hasChanges = Object.keys(pendingChanges).length > 0;

  const handleSaveAll = async () => {
    try {
      for (const [id, allowed_roles] of Object.entries(pendingChanges)) {
        const permission = permissions?.find((p) => p.id === id);
        await updateMutation.mutateAsync({ id, allowed_roles });
        
        if (permission) {
          await logAction({
            action: "admin_user_updated" as const,
            table_name: "module_permissions",
            record_id: id,
            old_values: { allowed_roles: permission.allowed_roles },
            new_values: { allowed_roles },
          });
        }
      }
      setPendingChanges({});
      toast.success("Permissions updated successfully");
    } catch (error) {
      toast.error("Failed to update permissions");
    }
  };

  const handleReset = () => {
    setPendingChanges({});
  };

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="h-6 w-6" />
              Permissions
            </h1>
            <p className="text-muted-foreground mt-1">
              {isSuperAdmin 
                ? "Manage which roles can access each admin module — including restricting admin access"
                : "Manage which roles can access each admin module"
              }
            </p>
          </div>
          <div className="flex gap-2">
            {hasChanges && (
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            )}
            <Button
              onClick={handleSaveAll}
              disabled={!hasChanges || updateMutation.isPending}
            >
              {updateMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        {isSuperAdmin && (
          <div className="flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3">
            <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
            <p className="text-sm text-muted-foreground">
              As Super Admin, you have unrestricted access to all modules regardless of these settings. 
              You can also restrict admin access to specific modules by unchecking the Admin column.
            </p>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Module Access Control</CardTitle>
            <CardDescription>
              {isSuperAdmin
                ? "Configure which user roles have access to each module. Super Admin always has full access."
                : "Configure which user roles have access to each module. Admin role always has access."
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Header */}
              <div className="grid grid-cols-4 gap-4 pb-2 border-b font-medium text-sm text-muted-foreground">
                <div>Module</div>
                {ROLES.map((role) => (
                  <div key={role} className="text-center capitalize">
                    {role}
                  </div>
                ))}
              </div>

              {/* Rows */}
              {permissions?.map((permission) => {
                const currentRoles = getRolesForModule(permission);
                const hasLocalChanges = !!pendingChanges[permission.id];

                return (
                  <div
                    key={permission.id}
                    className={`grid grid-cols-4 gap-4 py-3 items-center rounded-lg px-2 ${
                      hasLocalChanges ? "bg-primary/5 border border-primary/20" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{permission.module_name}</span>
                      {hasLocalChanges && (
                        <Badge variant="outline" className="text-xs">
                          Modified
                        </Badge>
                      )}
                    </div>
                    {ROLES.map((role) => {
                      const isChecked = currentRoles.includes(role);
                      // Admin checkbox is only toggleable by super_admin
                      const isDisabled = role === "admin" && !isSuperAdmin;

                      return (
                        <div key={role} className="flex justify-center">
                          <Checkbox
                            checked={isChecked}
                            disabled={isDisabled}
                            onCheckedChange={() =>
                              handleRoleToggle(
                                permission.module_key,
                                permission.id,
                                role,
                                currentRoles
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Role Legend */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Role Descriptions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Badge className={ROLE_COLORS.viewer}>Viewer</Badge>
                <p className="text-sm text-muted-foreground">
                  Can view data but cannot make changes. Suitable for read-only access.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className={ROLE_COLORS.reviewer}>Reviewer</Badge>
                <p className="text-sm text-muted-foreground">
                  Can review and approve content like applications and blog posts.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className={ROLE_COLORS.admin}>Admin</Badge>
                <p className="text-sm text-muted-foreground">
                  Full access to features including user management and settings.
                </p>
              </div>
              <div className="flex items-start gap-3">
                <Badge className={ROLE_COLORS.super_admin}>Super Admin</Badge>
                <p className="text-sm text-muted-foreground">
                  Unrestricted access to all modules. Can manage admin permissions.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
}
