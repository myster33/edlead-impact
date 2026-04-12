import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, Search, Download } from "lucide-react";
import { format } from "date-fns";

export function AdminEventAttendanceTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");

  const { data: events } = useQuery({
    queryKey: ["admin-events-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: attendance, isLoading } = useQuery({
    queryKey: ["admin-event-attendance", filterEventId, filterType, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("event_attendance")
        .select("*, events(title)")
        .order("created_at", { ascending: false });

      if (filterEventId && filterEventId !== "all") {
        query = query.eq("event_id", filterEventId);
      }
      if (filterType && filterType !== "all") {
        query = query.eq("attendee_type", filterType);
      }
      if (searchTerm.trim()) {
        query = query.or(`attendee_name.ilike.%${searchTerm}%,ticket_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCheckIn = async (record: any) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("event_attendance")
      .update({ checked_in_at: now } as any)
      .eq("id", record.id);

    if (error) {
      toast({ title: "Check-in failed", description: error.message, variant: "destructive" });
      return;
    }

    // Send check-in notification
    const eventTitle = record.events?.title || "Event";
    try {
      await supabase.functions.invoke("notify-event-checkin", {
        body: {
          attendeeName: record.attendee_name,
          ticketNumber: record.ticket_number,
          eventTitle,
          phone: record.phone,
          email: record.email,
          attendeeType: record.attendee_type,
          parentPhone: record.parent_phone,
          parentEmail: record.parent_email,
          parentName: record.parent_name,
        },
      });
      await supabase
        .from("event_attendance")
        .update({ notification_sent: true, email_sent: true } as any)
        .eq("id", record.id);
    } catch (e) {
      console.error("Check-in notification error:", e);
    }

    queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
    toast({ title: "Checked In", description: `${record.attendee_name} — ${record.ticket_number}` });
  };

  const handleCheckOut = async (record: any) => {
    const now = new Date().toISOString();
    const { error } = await supabase
      .from("event_attendance")
      .update({ checked_out_at: now } as any)
      .eq("id", record.id);

    if (error) {
      toast({ title: "Check-out failed", description: error.message, variant: "destructive" });
      return;
    }

    // Send check-out notification (especially for parents of students)
    const eventTitle = record.events?.title || "Event";
    try {
      await supabase.functions.invoke("notify-event-checkout", {
        body: {
          attendeeName: record.attendee_name,
          ticketNumber: record.ticket_number,
          eventTitle,
          phone: record.phone,
          email: record.email,
          attendeeType: record.attendee_type,
          parentPhone: record.parent_phone,
          parentEmail: record.parent_email,
          parentName: record.parent_name,
        },
      });
    } catch (e) {
      console.error("Check-out notification error:", e);
    }

    queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
    toast({ title: "Checked Out", description: `${record.attendee_name} has left the event` });
  };

  const handleUndoCheckIn = async (id: string) => {
    const { error } = await supabase
      .from("event_attendance")
      .update({ checked_in_at: null, notification_sent: false, email_sent: false } as any)
      .eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
    }
  };

  const handleUndoCheckOut = async (id: string) => {
    const { error } = await supabase
      .from("event_attendance")
      .update({ checked_out_at: null } as any)
      .eq("id", id);
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
    }
  };

  const exportToSpreadsheet = () => {
    if (!attendance || attendance.length === 0) {
      toast({ title: "No data to export", variant: "destructive" });
      return;
    }

    const headers = [
      "Ticket Number", "Event", "Attendee Name", "Type", "School",
      "Phone", "Email", "Parent Name", "Parent Phone", "Parent Email",
      "Checked In", "Checked Out", "Notified"
    ];

    const rows = attendance.map((a: any) => [
      a.ticket_number,
      a.events?.title || "",
      a.attendee_name,
      a.attendee_type || "student",
      a.school_name || "",
      a.phone || "",
      a.email || "",
      a.parent_name || "",
      a.parent_phone || "",
      a.parent_email || "",
      a.checked_in_at ? format(new Date(a.checked_in_at), "dd MMM yyyy, HH:mm") : "Not checked in",
      a.checked_out_at ? format(new Date(a.checked_out_at), "dd MMM yyyy, HH:mm") : "",
      a.notification_sent ? "Yes" : "No",
    ]);

    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: string) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const eventName = filterEventId !== "all"
      ? events?.find(e => e.id === filterEventId)?.title?.replace(/\s+/g, "_") || "event"
      : "all_events";
    link.download = `attendance_${eventName}_${format(new Date(), "yyyyMMdd")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast({ title: "Exported successfully" });
  };

  // A record is checked in when checked_in_at is set (not null)
  const isCheckedIn = (record: any) => !!record.checked_in_at;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="text-lg font-semibold mr-auto">Event Attendance</h3>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Event</Label>
            <Select value={filterEventId} onValueChange={setFilterEventId}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="teacher">Teacher</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative">
            <Label className="text-xs text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8 w-[200px] h-9"
                placeholder="Name or ticket..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          <Button variant="outline" onClick={exportToSpreadsheet}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket No.</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-center">Check In</TableHead>
                <TableHead className="text-center">Check Out</TableHead>
                <TableHead>Notified</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance?.map((a: any) => {
                const checkedIn = isCheckedIn(a);
                const checkedOut = !!a.checked_out_at;

                return (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs font-semibold">{a.ticket_number}</TableCell>
                    <TableCell>{a.events?.title || "—"}</TableCell>
                    <TableCell>
                      <div>
                        <span className="font-medium">{a.attendee_name}</span>
                        {a.phone && <div className="text-xs text-muted-foreground">{a.phone}</div>}
                        {a.email && <div className="text-xs text-muted-foreground">{a.email}</div>}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize text-xs">{a.attendee_type || "student"}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{a.school_name || "—"}</TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={checkedIn}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleCheckIn(a);
                            } else {
                              handleUndoCheckIn(a.id);
                            }
                          }}
                          disabled={checkedOut}
                        />
                        {checkedIn && a.checked_in_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(a.checked_in_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <Checkbox
                          checked={checkedOut}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              handleCheckOut(a);
                            } else {
                              handleUndoCheckOut(a.id);
                            }
                          }}
                          disabled={!checkedIn}
                        />
                        {checkedOut && a.checked_out_at && (
                          <span className="text-[10px] text-muted-foreground">
                            {format(new Date(a.checked_out_at), "HH:mm")}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Badge variant={a.notification_sent ? "default" : "secondary"} className="text-xs">
                          {a.notification_sent ? "SMS/WA" : "No"}
                        </Badge>
                        {a.email_sent && (
                          <Badge variant="default" className="text-xs">Email</Badge>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {attendance?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No attendance records yet. Attendance is automatically created from bookings.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
