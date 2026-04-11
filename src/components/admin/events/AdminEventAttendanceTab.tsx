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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, UserCheck, Search, LogOut, QrCode } from "lucide-react";
import { format } from "date-fns";

export function AdminEventAttendanceTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [filterSchool, setFilterSchool] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [checkInForm, setCheckInForm] = useState({
    event_id: "",
    attendee_name: "",
    phone: "",
    email: "",
    booking_ref: "",
    attendee_type: "student" as "student" | "teacher" | "other",
    school_name: "",
    parent_name: "",
    parent_phone: "",
    parent_email: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    queryKey: ["admin-event-attendance", filterEventId, filterSchool, searchTerm],
    queryFn: async () => {
      let query = supabase
        .from("event_attendance")
        .select("*, events(title)")
        .order("checked_in_at", { ascending: false });

      if (filterEventId && filterEventId !== "all") {
        query = query.eq("event_id", filterEventId);
      }
      if (filterSchool && filterSchool !== "all") {
        query = query.eq("school_name", filterSchool);
      }
      if (searchTerm.trim()) {
        query = query.or(`attendee_name.ilike.%${searchTerm}%,ticket_number.ilike.%${searchTerm}%`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const handleCheckOut = async (id: string) => {
    const { error } = await supabase
      .from("event_attendance")
      .update({ checked_out_at: new Date().toISOString() } as any)
      .eq("id", id);
    if (error) {
      toast({ title: "Check-out failed", description: error.message, variant: "destructive" });
    } else {
      queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
      toast({ title: "Checked out successfully" });
    }
  };

  const handleScanCheckIn = async () => {
    if (!scanInput.trim()) return;
    // Look up by ticket number
    const { data } = await supabase
      .from("event_attendance")
      .select("id, attendee_name, checked_out_at")
      .eq("ticket_number", scanInput.trim().toUpperCase())
      .maybeSingle();
    
    if (!data) {
      toast({ title: "Ticket not found", description: `No record for ${scanInput}`, variant: "destructive" });
      return;
    }
    if (!(data as any).checked_out_at) {
      // Already checked in — check them out
      await handleCheckOut(data.id);
      toast({ title: "Checked Out", description: `${data.attendee_name} checked out via scan` });
    } else {
      toast({ title: "Already checked out", description: data.attendee_name });
    }
    setScanInput("");
  };

  const handleCheckIn = async () => {
    if (!checkInForm.event_id || !checkInForm.attendee_name) {
      toast({ title: "Event and attendee name are required", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      let bookingId: string | null = null;
      if (checkInForm.booking_ref.trim()) {
        const { data: booking } = await supabase
          .from("event_bookings")
          .select("id")
          .eq("reference_number", checkInForm.booking_ref.trim())
          .eq("event_id", checkInForm.event_id)
          .maybeSingle();
        bookingId = booking?.id || null;
      }

      const insertData: any = {
        event_id: checkInForm.event_id,
        booking_id: bookingId,
        attendee_name: checkInForm.attendee_name.trim(),
        phone: checkInForm.phone.trim() || null,
        email: checkInForm.email.trim() || null,
        attendee_type: checkInForm.attendee_type,
        school_name: checkInForm.school_name.trim() || null,
        ticket_number: "",
      };

      if (checkInForm.attendee_type === "student") {
        insertData.parent_name = checkInForm.parent_name.trim() || null;
        insertData.parent_phone = checkInForm.parent_phone.trim() || null;
        insertData.parent_email = checkInForm.parent_email.trim() || null;
      }

      const { data: record, error } = await supabase
        .from("event_attendance")
        .insert(insertData)
        .select("*, events(title)")
        .single();

      if (error) throw error;

      // Send notifications
      const eventTitle = (record as any).events?.title || "Event";
      const hasContactInfo = record.phone || (record as any).email || 
        (record as any).parent_phone || (record as any).parent_email;
      
      if (hasContactInfo) {
        try {
          await supabase.functions.invoke("notify-event-checkin", {
            body: {
              attendeeName: record.attendee_name,
              ticketNumber: record.ticket_number,
              eventTitle,
              phone: record.phone,
              email: (record as any).email,
              attendeeType: (record as any).attendee_type,
              parentPhone: (record as any).parent_phone,
              parentEmail: (record as any).parent_email,
              parentName: (record as any).parent_name,
            },
          });

          await supabase
            .from("event_attendance")
            .update({ notification_sent: true, email_sent: true } as any)
            .eq("id", record.id);
        } catch (notifErr) {
          console.error("Notification error:", notifErr);
        }
      }

      queryClient.invalidateQueries({ queryKey: ["admin-event-attendance"] });
      toast({
        title: "Checked In",
        description: `${record.attendee_name} — Ticket: ${record.ticket_number}`,
      });
      setCheckInOpen(false);
      setCheckInForm({
        event_id: "", attendee_name: "", phone: "", email: "", booking_ref: "",
        attendee_type: "student", school_name: "", parent_name: "", parent_phone: "", parent_email: "",
      });
    } catch (err: any) {
      console.error(err);
      toast({ title: "Check-in failed", description: err.message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

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
            <Label className="text-xs text-muted-foreground">Filter by School</Label>
            <Select value={filterSchool} onValueChange={setFilterSchool}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Schools" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {[...new Set(attendance?.map((a: any) => a.school_name).filter(Boolean) || [])].sort().map((s: string) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
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
          <Button variant="outline" onClick={() => setScanMode(!scanMode)}>
            <QrCode className="h-4 w-4 mr-2" />
            Scan QR
          </Button>
          <Button onClick={() => setCheckInOpen(true)}>
            <UserCheck className="h-4 w-4 mr-2" />
            Check In
          </Button>
        </div>
      </div>

      {/* QR / Ticket scan bar */}
      {scanMode && (
        <div className="flex items-center gap-3 p-3 border rounded-md bg-muted/30">
          <QrCode className="h-5 w-5 text-primary" />
          <Input
            className="max-w-xs"
            placeholder="Scan or enter ticket number (e.g. EVT-000001)"
            value={scanInput}
            onChange={(e) => setScanInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleScanCheckIn()}
            autoFocus
          />
          <Button size="sm" onClick={handleScanCheckIn}>
            <LogOut className="h-4 w-4 mr-1" /> Check Out
          </Button>
        </div>
      )}

      {/* Check-in dialog */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Check In Attendee</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Event *</Label>
              <Select value={checkInForm.event_id} onValueChange={(v) => setCheckInForm({ ...checkInForm, event_id: v })}>
                <SelectTrigger><SelectValue placeholder="Select event" /></SelectTrigger>
                <SelectContent>
                  {events?.map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Attendee Type *</Label>
              <Select value={checkInForm.attendee_type} onValueChange={(v: any) => setCheckInForm({ ...checkInForm, attendee_type: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="student">Student</SelectItem>
                  <SelectItem value="teacher">Teacher</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>School Name <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={checkInForm.school_name}
                onChange={(e) => setCheckInForm({ ...checkInForm, school_name: e.target.value })}
                placeholder="School name"
              />
            </div>
            <div>
              <Label>Booking Reference <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                value={checkInForm.booking_ref}
                onChange={(e) => setCheckInForm({ ...checkInForm, booking_ref: e.target.value })}
                placeholder="e.g. EVB-123456"
              />
            </div>
            <div>
              <Label>Attendee Name *</Label>
              <Input
                value={checkInForm.attendee_name}
                onChange={(e) => setCheckInForm({ ...checkInForm, attendee_name: e.target.value })}
                placeholder="Full name"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Phone <span className="text-muted-foreground text-xs">(SMS/WhatsApp)</span></Label>
                <Input
                  value={checkInForm.phone}
                  onChange={(e) => setCheckInForm({ ...checkInForm, phone: e.target.value })}
                  placeholder="+27..."
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={checkInForm.email}
                  onChange={(e) => setCheckInForm({ ...checkInForm, email: e.target.value })}
                  placeholder="attendee@email.com"
                />
              </div>
            </div>

            {/* Parent/Guardian fields for students */}
            {checkInForm.attendee_type === "student" && (
              <div className="border-t pt-4 space-y-3">
                <Label className="text-sm font-semibold">Parent/Guardian Details</Label>
                <div>
                  <Label>Parent Name</Label>
                  <Input
                    value={checkInForm.parent_name}
                    onChange={(e) => setCheckInForm({ ...checkInForm, parent_name: e.target.value })}
                    placeholder="Parent full name"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Parent Phone</Label>
                    <Input
                      value={checkInForm.parent_phone}
                      onChange={(e) => setCheckInForm({ ...checkInForm, parent_phone: e.target.value })}
                      placeholder="+27..."
                    />
                  </div>
                  <div>
                    <Label>Parent Email</Label>
                    <Input
                      type="email"
                      value={checkInForm.parent_email}
                      onChange={(e) => setCheckInForm({ ...checkInForm, parent_email: e.target.value })}
                      placeholder="parent@email.com"
                    />
                  </div>
                </div>
              </div>
            )}

            <Button className="w-full" onClick={handleCheckIn} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Check In & Send Notifications
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket #</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Attendee</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>School</TableHead>
                <TableHead>Checked In</TableHead>
                <TableHead>Checked Out</TableHead>
                <TableHead>Notified</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attendance?.map((a: any) => (
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
                  <TableCell className="text-sm">{format(new Date(a.checked_in_at), "dd MMM yyyy, HH:mm")}</TableCell>
                  <TableCell className="text-sm">
                    {a.checked_out_at ? (
                      format(new Date(a.checked_out_at), "HH:mm")
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
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
                  <TableCell>
                    {!a.checked_out_at && (
                      <Button size="sm" variant="outline" onClick={() => handleCheckOut(a.id)}>
                        <LogOut className="h-3 w-3 mr-1" /> Out
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {attendance?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                    No attendance records yet. Use "Check In" to register attendees.
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
