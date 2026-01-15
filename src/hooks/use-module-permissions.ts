import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ModulePermission = {
  id: string;
  module_key: string;
  module_name: string;
  allowed_roles: ("viewer" | "reviewer" | "admin")[];
  created_at: string;
  updated_at: string;
};

export function useModulePermissions() {
  return useQuery({
    queryKey: ["module-permissions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .order("module_name");

      if (error) throw error;
      return data as ModulePermission[];
    },
  });
}

export function useModulePermission(moduleKey: string) {
  return useQuery({
    queryKey: ["module-permission", moduleKey],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("module_permissions")
        .select("*")
        .eq("module_key", moduleKey)
        .single();

      if (error) throw error;
      return data as ModulePermission;
    },
  });
}

export async function checkModuleAccess(
  moduleKey: string,
  userRole: "viewer" | "reviewer" | "admin"
): Promise<boolean> {
  const { data, error } = await supabase
    .from("module_permissions")
    .select("allowed_roles")
    .eq("module_key", moduleKey)
    .single();

  if (error || !data) {
    // Default to admin-only if permission not found
    return userRole === "admin";
  }

  return (data.allowed_roles as string[]).includes(userRole);
}
