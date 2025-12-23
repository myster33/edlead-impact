import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

export type AuditAction = 
  | "application_approved"
  | "application_rejected"
  | "application_deleted"
  | "blog_approved"
  | "blog_rejected"
  | "blog_deleted"
  | "blog_featured"
  | "admin_user_added"
  | "admin_user_updated"
  | "admin_user_deleted"
  | "profile_updated"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled";

export interface AuditLogEntry {
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { adminUser } = useAdminAuth();

  const logAction = useCallback(async (entry: AuditLogEntry) => {
    if (!adminUser?.id) {
      console.warn("Cannot log action: No admin user");
      return;
    }

    try {
      const { error } = await supabase.from("admin_audit_log").insert({
        admin_user_id: adminUser.id,
        action: entry.action,
        table_name: entry.table_name,
        record_id: entry.record_id || null,
        old_values: entry.old_values as any || null,
        new_values: entry.new_values as any || null,
      } as any);

      if (error) {
        console.error("Failed to log audit action:", error);
      }
    } catch (err) {
      console.error("Error logging audit action:", err);
    }
  }, [adminUser?.id]);

  return { logAction };
};
