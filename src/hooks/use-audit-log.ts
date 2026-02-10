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
  | "blog_archived"
  | "blog_restored"
  | "admin_user_added"
  | "admin_user_updated"
  | "admin_user_deleted"
  | "admin_role_changed"
  | "profile_updated"
  | "password_changed"
  | "mfa_enabled"
  | "mfa_disabled"
  | "parent_emails_enabled"
  | "parent_emails_disabled"
  | "sms_notifications_enabled"
  | "sms_notifications_disabled"
  | "whatsapp_notifications_enabled"
  | "whatsapp_notifications_disabled"
  | "support_whatsapp_number_updated";

// Actions that trigger instant critical alerts
const criticalActions: AuditAction[] = [
  "admin_user_deleted",
  "password_changed",
  "mfa_disabled",
  "admin_role_changed"
];

export interface AuditLogEntry {
  action: AuditAction;
  table_name: string;
  record_id?: string;
  old_values?: Record<string, unknown>;
  new_values?: Record<string, unknown>;
}

export interface CriticalAlertDetails {
  target_email?: string;
  target_name?: string;
  details?: Record<string, unknown>;
}

export const useAuditLog = () => {
  const { adminUser, user } = useAdminAuth();

  const sendCriticalAlert = useCallback(async (
    action: AuditAction,
    alertDetails?: CriticalAlertDetails
  ) => {
    if (!criticalActions.includes(action)) return;

    try {
      await supabase.functions.invoke("send-critical-alert", {
        body: {
          action,
          performed_by_email: adminUser?.email || user?.email || "Unknown",
          performed_by_name: (adminUser as any)?.full_name,
          target_email: alertDetails?.target_email,
          target_name: alertDetails?.target_name,
          details: alertDetails?.details
        },
      });
    } catch (err) {
      console.error("Failed to send critical alert:", err);
    }
  }, [adminUser?.email, user?.email]);

  const logAction = useCallback(async (
    entry: AuditLogEntry,
    alertDetails?: CriticalAlertDetails
  ) => {
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

      // Send critical alert for specific actions
      await sendCriticalAlert(entry.action, alertDetails);
    } catch (err) {
      console.error("Error logging audit action:", err);
    }
  }, [adminUser?.id, sendCriticalAlert]);

  return { logAction, sendCriticalAlert };
};
