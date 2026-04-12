import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

interface PendingAction {
  ids: string[];
  status: string;
}

export function AdminEventBookingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);

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

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-event-bookings", filterEventId, filterDate, filterType],
    queryFn: async () => {
      let query = supabase
        .from("event_bookings")
        .select("*, events(title, short_code)")
        .order("created_at", { ascending: false });

      if (filterEventId && filterEventId !== "all") {
        query = query.eq("event_id", filterEventId);
      }
      if (filterDate) {
        query = query.gte("created_at", `${filterDate}T00:00:00`).lte("created_at", `${filterDate}T23:59:59`);
      }
      if (filterType && filterType !== "all") {
        query = query.eq("booker_type", filterType as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const processStatusChange = async (id: string, status: string) => {
    const { error } = await supabase.from("event_bookings").update({ status }).eq("id", id);
    if (error) throw error;

    const booking = bookings?.find((b) => b.id === id);
    if (!booking) return;

    // Remove attendance records when not confirmed
    if (status === "pending" || status === "cancelled") {
      try {
        await supabase.from("event_attendance").delete().eq("booking_id", id);
      } catch (e) {
        console.error("Attendance removal error:", e);
      }
    }

    // When confirmed, create attendance records
    if (status === "confirmed") {
      const bt = booking.booker_type;
      const ticketNumber = booking.reference_number || "N/A";
      const attendanceRecords: any[] = [];

      if (bt === "school") {
        attendanceRecords.push({
          event_id: booking.event_id,
          booking_id: booking.id,
          attendee_name: booking.contact_teacher_name || booking.school_name || "Teacher",
          phone: booking.contact_teacher_phone || booking.school_phone,
          email: booking.contact_teacher_email || booking.school_email,
          attendee_type: "teacher",
          school_name: booking.school_name,
          ticket_number: ticketNumber,
          checked_in_at: null,
        });
        try {
          const { data: extras } = await supabase
            .from("event_booking_extras")
            .select("*")
            .eq("booking_id", booking.id)
            .eq("type", "teacher" as any);
          extras?.forEach((t: any) => {
            attendanceRecords.push({
              event_id: booking.event_id,
              booking_id: booking.id,
              attendee_name: t.full_name,
              phone: t.phone || null,
              email: t.email || null,
              attendee_type: "teacher",
              school_name: booking.school_name,
              ticket_number: ticketNumber,
              checked_in_at: null,
            });
          });
        } catch { /* non-critical */ }
      } else if (bt === "student") {
        attendanceRecords.push({
          event_id: booking.event_id,
          booking_id: booking.id,
          attendee_name: booking.student_name || "Student",
          phone: booking.student_phone,
          email: booking.student_email,
          attendee_type: "student",
          school_name: booking.student_school_name,
          parent_name: booking.parent_name || "Parent/Guardian",
          parent_phone: booking.parent_phone,
          parent_email: booking.parent_email,
          ticket_number: ticketNumber,
          checked_in_at: null,
        });
      } else if (bt === "parent") {
        try {
          const { data: extras } = await supabase
            .from("event_booking_extras")
            .select("*")
            .eq("booking_id", booking.id)
            .eq("type", "child" as any);
          extras?.forEach((c: any) => {
            attendanceRecords.push({
              event_id: booking.event_id,
              booking_id: booking.id,
              attendee_name: c.full_name,
              phone: c.phone || null,
              email: c.email || null,
              attendee_type: "student",
              parent_name: booking.parent_name,
              parent_phone: booking.parent_phone,
              parent_email: booking.parent_email,
              ticket_number: ticketNumber,
              checked_in_at: null,
            });
          });
        } catch { /* non-critical */ }
      } else {
        attendanceRecords.push({
          event_id: booking.event_id,
          booking_id: booking.id,
          attendee_name: booking.parent_name || "Guest",
          phone: booking.parent_phone,
          email: booking.parent_email,
          attendee_type: "other",
          ticket_number: ticketNumber,
          checked_in_at: null,
        });
      }

      if (attendanceRecords.length > 0) {
        try {
          await supabase.from("event_attendance").insert(attendanceRecords);
        } catch (e) {
          console.error("Attendance creation error:", e);
        }
      }
    }

    // Send notification for confirmed/cancelled
    if (status === "confirmed" || status === "cancelled") {
      const contacts: { name: string; phone: string | null; email: string | null; role: string; parentOf?: string }[] = [];
      const bt = booking.booker_type;
      if (bt === "school") {
        contacts.push({ name: booking.contact_teacher_name || booking.school_name || "Teacher", phone: booking.contact_teacher_phone || booking.school_phone, email: booking.contact_teacher_email || booking.school_email, role: "teacher" });
      } else if (bt === "student") {
        contacts.push({ name: booking.student_name || "Student", phone: booking.student_phone, email: booking.student_email, role: "student" });
        if (booking.parent_phone || booking.parent_email) {
          contacts.push({ name: booking.parent_name || "Parent/Guardian", phone: booking.parent_phone, email: booking.parent_email, role: "parent", parentOf: booking.student_name || "your child" });
        }
      } else if (bt === "parent") {
        contacts.push({ name: booking.parent_name || "Parent", phone: booking.parent_phone, email: booking.parent_email, role: "parent" });
      } else {
        contacts.push({ name: booking.parent_name || "Guest", phone: booking.parent_phone, email: booking.parent_email, role: "guest" });
      }

      try {
        await supabase.functions.invoke("notify-event-booking", {
          body: {
            bookerType: bt,
            ticketNumber: booking.reference_number || "N/A",
            eventTitle: (booking as any).events?.title || "Event",
            eventShortCode: (booking as any).events?.short_code || undefined,
            contacts,
            statusChange: status,
          },
        });
      } catch (e) {
        console.error("Status notification error:", e);
      }
    }
  };

  const executePendingAction = useMutation({
    mutationFn: async (action: PendingAction) => {
      for (const id of action.ids) {
        await processStatusChange(id, action.status);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-bookings"] });
      const count = pendingAction?.ids.length || 0;
      toast({ title: `${count} booking${count !== 1 ? "s" : ""} updated to ${pendingAction?.status}` });
      setSelectedIds(new Set());
      setPendingAction(null);
    },
    onError: () => {
      toast({ title: "Error updating bookings", variant: "destructive" });
      setPendingAction(null);
    },
  });

  const handleStatusChange = (id: string, status: string) => {
    setPendingAction({ ids: [id], status });
  };

  const handleBulkAction = (status: string) => {
    setPendingAction({ ids: Array.from(selectedIds), status });
  };

  const confirmAction = () => {
    if (pendingAction) {
      executePendingAction.mutate(pendingAction);
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!bookings) return;
    if (selectedIds.size === bookings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(bookings.map((b) => b.id)));
    }
  };

  const getContactName = (b: any) => {
    if (b.booker_type === "school") return b.contact_teacher_name || b.school_name;
    if (b.booker_type === "student") return b.student_name;
    if (b.booker_type === "guest") return b.parent_name;
    return b.parent_name;
  };

  const getContactPhone = (b: any) => {
    if (b.booker_type === "school") return b.school_phone || b.contact_teacher_phone;
    if (b.booker_type === "student") return b.student_phone;
    if (b.booker_type === "guest") return b.parent_phone;
    return b.parent_phone;
  };

  const getContactEmail = (b: any) => {
    if (b.booker_type === "school") return b.school_email;
    if (b.booker_type === "student") return b.student_email;
    if (b.booker_type === "guest") return b.parent_email;
    return b.parent_email;
  };

  const statusLabel = pendingAction?.status === "confirmed" ? "Confirm" : pendingAction?.status === "cancelled" ? "Cancel" : pendingAction?.status === "pending" ? "set to Pending" : pendingAction?.status;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="text-lg font-semibold mr-auto">Event Bookings</h3>
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
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Date</Label>
            <Input
              type="date"
              className="w-[160px] h-9"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {(filterEventId !== "all" || filterDate || filterType !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterEventId("all"); setFilterDate(""); setFilterType("all"); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 rounded-md border bg-muted/50 px-4 py-2">
          <span className="text-sm font-medium">{selectedIds.size} selected</span>
          <Button size="sm" onClick={() => handleBulkAction("confirmed")}>Confirm Selected</Button>
          <Button size="sm" variant="destructive" onClick={() => handleBulkAction("cancelled")}>Cancel Selected</Button>
          <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>Clear Selection</Button>
        </div>
      )}

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <Checkbox
                    checked={bookings && bookings.length > 0 && selectedIds.size === bookings.length}
                    onCheckedChange={toggleSelectAll}
                  />
                </TableHead>
                <TableHead>Ticket No.</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((b) => (
                <TableRow key={b.id} data-state={selectedIds.has(b.id) ? "selected" : undefined}>
                  <TableCell>
                    <Checkbox
                      checked={selectedIds.has(b.id)}
                      onCheckedChange={() => toggleSelect(b.id)}
                    />
                  </TableCell>
                  <TableCell className="font-mono text-xs">{b.reference_number || "—"}</TableCell>
                  <TableCell>{(b as any).events?.title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{b.booker_type}</Badge>
                  </TableCell>
                  <TableCell>{getContactName(b)}</TableCell>
                  <TableCell className="text-sm">{getContactPhone(b)}</TableCell>
                  <TableCell className="text-sm">{getContactEmail(b)}</TableCell>
                  <TableCell className="text-sm">{format(new Date(b.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => handleStatusChange(b.id, v)}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {bookings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!pendingAction} onOpenChange={(open) => { if (!open) setPendingAction(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              You are about to <strong>{statusLabel}</strong> {pendingAction?.ids.length}{" "}
              booking{(pendingAction?.ids.length || 0) !== 1 ? "s" : ""}. This will also update the attendance registry accordingly.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={executePendingAction.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmAction} disabled={executePendingAction.isPending}>
              {executePendingAction.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Yes, continue
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
