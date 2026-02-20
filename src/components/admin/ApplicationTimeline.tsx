import { useState, useEffect } from "react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Loader2, Mail, MessageSquare, Phone, ArrowRightLeft, Clock } from "lucide-react";

interface TimelineEvent {
  id: string;
  timestamp: string;
  type: "email" | "sms" | "whatsapp" | "status_change" | "audit";
  title: string;
  description: string;
  meta?: string;
}

interface ApplicationTimelineProps {
  applicationId: string;
}

const eventIcon = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "email": return <Mail className="h-3.5 w-3.5" />;
    case "sms": return <Phone className="h-3.5 w-3.5" />;
    case "whatsapp": return <MessageSquare className="h-3.5 w-3.5" />;
    case "status_change": return <ArrowRightLeft className="h-3.5 w-3.5" />;
    default: return <Clock className="h-3.5 w-3.5" />;
  }
};

const eventColor = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "email": return "bg-blue-500";
    case "sms": return "bg-emerald-500";
    case "whatsapp": return "bg-green-500";
    case "status_change": return "bg-primary";
    default: return "bg-muted-foreground";
  }
};

const eventBadge = (type: TimelineEvent["type"]) => {
  switch (type) {
    case "email": return "Email";
    case "sms": return "SMS";
    case "whatsapp": return "WhatsApp";
    case "status_change": return "Status";
    default: return "Activity";
  }
};

export function ApplicationTimeline({ applicationId }: ApplicationTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      setLoading(true);
      try {
        const [messagesRes, auditRes] = await Promise.all([
          supabase
            .from("message_logs")
            .select("id, channel, recipient_phone, recipient_type, message_content, status, created_at, template_key")
            .eq("application_id", applicationId)
            .order("created_at", { ascending: false })
            .limit(50),
          supabase
            .from("admin_audit_log")
            .select("id, action, old_values, new_values, created_at")
            .eq("table_name", "applications")
            .eq("record_id", applicationId)
            .order("created_at", { ascending: false })
            .limit(50),
        ]);

        const timelineEvents: TimelineEvent[] = [];

        // Map message logs
        if (messagesRes.data) {
          for (const msg of messagesRes.data) {
            const channelType = msg.channel === "whatsapp" ? "whatsapp" : msg.channel === "sms" ? "sms" : "email";
            timelineEvents.push({
              id: `msg-${msg.id}`,
              timestamp: msg.created_at,
              type: channelType,
              title: `${channelType === "email" ? "Email" : channelType === "sms" ? "SMS" : "WhatsApp"} sent to ${msg.recipient_type}`,
              description: msg.message_content.length > 120 ? msg.message_content.slice(0, 120) + "…" : msg.message_content,
              meta: msg.status === "failed" ? "Failed" : msg.status === "sent" ? "Delivered" : "Pending",
            });
          }
        }

        // Map audit log entries
        if (auditRes.data) {
          for (const log of auditRes.data) {
            const oldVals = log.old_values as Record<string, any> | null;
            const newVals = log.new_values as Record<string, any> | null;

            if (log.action.includes("approved") || log.action.includes("rejected") || log.action.includes("pending") || log.action.includes("cancelled") || log.action.includes("status")) {
              const oldStatus = oldVals?.status || "unknown";
              const newStatus = newVals?.status || log.action.replace("application_", "");
              timelineEvents.push({
                id: `audit-${log.id}`,
                timestamp: log.created_at!,
                type: "status_change",
                title: `Status changed: ${oldStatus} → ${newStatus}`,
                description: newVals?.full_name ? `Application by ${newVals.full_name}` : "Application status updated",
              });
            } else {
              timelineEvents.push({
                id: `audit-${log.id}`,
                timestamp: log.created_at!,
                type: "audit",
                title: log.action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                description: newVals ? JSON.stringify(newVals).slice(0, 100) : "No details",
              });
            }
          }
        }

        // Sort by timestamp descending
        timelineEvents.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setEvents(timelineEvents);
      } catch (err) {
        console.error("Error fetching timeline:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTimeline();
  }, [applicationId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        <span className="ml-2 text-sm text-muted-foreground">Loading timeline…</span>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <Clock className="h-8 w-8 mx-auto mb-2 opacity-40" />
        <p className="text-sm">No communication history yet.</p>
      </div>
    );
  }

  return (
    <div className="relative space-y-0">
      {events.map((event, i) => (
        <div key={event.id} className="flex gap-3 relative">
          {/* Timeline line */}
          {i < events.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
          )}
          {/* Dot */}
          <div className={`shrink-0 mt-1 h-[22px] w-[22px] rounded-full flex items-center justify-center text-white ${eventColor(event.type)}`}>
            {eventIcon(event.type)}
          </div>
          {/* Content */}
          <div className="flex-1 pb-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium">{event.title}</span>
              <Badge variant="outline" className="text-[10px] h-4 px-1.5">
                {eventBadge(event.type)}
              </Badge>
              {event.meta && (
                <Badge variant={event.meta === "Failed" ? "destructive" : "secondary"} className="text-[10px] h-4 px-1.5">
                  {event.meta}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">{event.description}</p>
            <p className="text-[10px] text-muted-foreground mt-1">
              {format(new Date(event.timestamp), "dd MMM yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
