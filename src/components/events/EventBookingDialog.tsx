import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, Plus, Trash2 } from "lucide-react";

type BookerType = "school" | "student" | "parent" | "guest";

interface ExtraEntry {
  full_name: string;
  email: string;
  phone: string;
  grade?: string;
}

interface EventBookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: {
    id: string;
    title: string;
    current_bookings: number;
  };
}

const COUNTRY_CODE = "+27";

function ensureCountryCode(phone: string): string {
  if (!phone) return phone;
  const cleaned = phone.trim();
  if (cleaned.startsWith("+")) return cleaned;
  if (cleaned.startsWith("0")) return COUNTRY_CODE + cleaned.substring(1);
  return COUNTRY_CODE + cleaned;
}

export function EventBookingDialog({ open, onOpenChange, event }: EventBookingDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [bookerType, setBookerType] = useState<BookerType | null>(null);

  // School fields
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState(COUNTRY_CODE);
  const [contactTeacherName, setContactTeacherName] = useState("");
  const [contactTeacherEmail, setContactTeacherEmail] = useState("");
  const [contactTeacherPhone, setContactTeacherPhone] = useState(COUNTRY_CODE);
  const [extraTeachers, setExtraTeachers] = useState<ExtraEntry[]>([]);

  // Student fields
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState(COUNTRY_CODE);
  const [studentSchoolName, setStudentSchoolName] = useState("");
  const [studentParentPhone, setStudentParentPhone] = useState(COUNTRY_CODE);
  const [studentParentEmail, setStudentParentEmail] = useState("");

  // Parent fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState(COUNTRY_CODE);
  const [children, setChildren] = useState<ExtraEntry[]>([{ full_name: "", email: "", phone: COUNTRY_CODE, grade: "" }]);

  // Guest fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState(COUNTRY_CODE);

  const resetForm = () => {
    setStep(1);
    setBookerType(null);
    setSchoolName(""); setSchoolEmail(""); setSchoolPhone(COUNTRY_CODE);
    setContactTeacherName(""); setContactTeacherEmail(""); setContactTeacherPhone(COUNTRY_CODE);
    setExtraTeachers([]);
    setStudentName(""); setStudentEmail(""); setStudentPhone(COUNTRY_CODE); setStudentSchoolName("");
    setStudentParentPhone(COUNTRY_CODE); setStudentParentEmail("");
    setParentName(""); setParentEmail(""); setParentPhone(COUNTRY_CODE);
    setChildren([{ full_name: "", email: "", phone: COUNTRY_CODE, grade: "" }]);
    setGuestName(""); setGuestEmail(""); setGuestPhone(COUNTRY_CODE);
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const ticketNumber = `EVT-${Date.now().toString(36).toUpperCase()}`;
      const bookingId = crypto.randomUUID();
      const bookingPayload: any = {
        id: bookingId,
        event_id: event.id,
        booker_type: bookerType,
        reference_number: ticketNumber,
        number_of_attendees: 1,
      };

      // Contacts to notify
      const contacts: { name: string; phone: string | null; email: string | null; role: string; parentOf?: string }[] = [];

      if (bookerType === "school") {
        bookingPayload.school_name = schoolName;
        bookingPayload.school_email = schoolEmail;
        bookingPayload.school_phone = ensureCountryCode(schoolPhone);
        bookingPayload.contact_teacher_name = contactTeacherName;
        bookingPayload.contact_teacher_email = contactTeacherEmail;
        bookingPayload.contact_teacher_phone = ensureCountryCode(contactTeacherPhone);
        bookingPayload.number_of_attendees = 1 + extraTeachers.length;
        contacts.push({ name: contactTeacherName, phone: ensureCountryCode(contactTeacherPhone), email: contactTeacherEmail, role: "teacher" });
        extraTeachers.forEach(t => {
          if (t.phone || t.email) contacts.push({ name: t.full_name, phone: t.phone ? ensureCountryCode(t.phone) : null, email: t.email || null, role: "teacher" });
        });
      } else if (bookerType === "student") {
        bookingPayload.student_name = studentName;
        bookingPayload.student_email = studentEmail;
        bookingPayload.student_phone = ensureCountryCode(studentPhone);
        bookingPayload.student_school_name = studentSchoolName;
        bookingPayload.parent_phone = ensureCountryCode(studentParentPhone);
        bookingPayload.parent_email = studentParentEmail;
        contacts.push({ name: studentName, phone: ensureCountryCode(studentPhone), email: studentEmail, role: "student" });
        if (studentParentPhone || studentParentEmail) {
          contacts.push({ name: "Parent/Guardian", phone: ensureCountryCode(studentParentPhone), email: studentParentEmail || null, role: "parent", parentOf: studentName });
        }
      } else if (bookerType === "parent") {
        bookingPayload.parent_name = parentName;
        bookingPayload.parent_email = parentEmail;
        bookingPayload.parent_phone = ensureCountryCode(parentPhone);
        bookingPayload.number_of_attendees = children.length;
        contacts.push({ name: parentName, phone: ensureCountryCode(parentPhone), email: parentEmail, role: "parent" });
      } else if (bookerType === "guest") {
        bookingPayload.parent_name = guestName;
        bookingPayload.parent_email = guestEmail;
        bookingPayload.parent_phone = ensureCountryCode(guestPhone);
        contacts.push({ name: guestName, phone: ensureCountryCode(guestPhone), email: guestEmail, role: "guest" });
      }

      const { error: bookingErr } = await supabase
        .from("event_bookings")
        .insert(bookingPayload as any);
      if (bookingErr) throw bookingErr;

      // Insert extras
      const extras: any[] = [];
      if (bookerType === "school") {
        extraTeachers.forEach((t) => {
          extras.push({ booking_id: bookingId, type: "teacher", full_name: t.full_name, email: t.email, phone: t.phone ? ensureCountryCode(t.phone) : null });
        });
      } else if (bookerType === "parent") {
        children.forEach((c) => {
          extras.push({ booking_id: bookingId, type: "child", full_name: c.full_name, email: c.email, phone: c.phone ? ensureCountryCode(c.phone) : null, grade: c.grade || null });
        });
      }

      if (extras.length > 0) {
        const { error: extErr } = await supabase.from("event_booking_extras").insert(extras);
        if (extErr) throw extErr;
      }

      // Create attendance records for easy check-in at reception
      const attendanceRecords: any[] = [];
      if (bookerType === "school") {
        attendanceRecords.push({
          event_id: event.id,
          booking_id: bookingId,
          attendee_name: contactTeacherName,
          phone: ensureCountryCode(contactTeacherPhone),
          email: contactTeacherEmail,
          attendee_type: "teacher",
          school_name: schoolName,
          ticket_number: "",
        });
        extraTeachers.forEach(t => {
          attendanceRecords.push({
            event_id: event.id,
            booking_id: bookingId,
            attendee_name: t.full_name,
            phone: t.phone ? ensureCountryCode(t.phone) : null,
            email: t.email || null,
            attendee_type: "teacher",
            school_name: schoolName,
            ticket_number: "",
          });
        });
      } else if (bookerType === "student") {
        attendanceRecords.push({
          event_id: event.id,
          booking_id: bookingId,
          attendee_name: studentName,
          phone: ensureCountryCode(studentPhone),
          email: studentEmail,
          attendee_type: "student",
          school_name: studentSchoolName,
          parent_name: "Parent/Guardian",
          parent_phone: ensureCountryCode(studentParentPhone),
          parent_email: studentParentEmail || null,
          ticket_number: "",
        });
      } else if (bookerType === "parent") {
        children.forEach(c => {
          attendanceRecords.push({
            event_id: event.id,
            booking_id: bookingId,
            attendee_name: c.full_name,
            phone: c.phone ? ensureCountryCode(c.phone) : null,
            email: c.email || null,
            attendee_type: "student",
            parent_name: parentName,
            parent_phone: ensureCountryCode(parentPhone),
            parent_email: parentEmail,
            ticket_number: "",
          });
        });
      } else if (bookerType === "guest") {
        attendanceRecords.push({
          event_id: event.id,
          booking_id: bookingId,
          attendee_name: guestName,
          phone: ensureCountryCode(guestPhone),
          email: guestEmail,
          attendee_type: "other",
          ticket_number: "",
        });
      }

      if (attendanceRecords.length > 0) {
        try {
          await supabase.from("event_attendance").insert(attendanceRecords);
        } catch (attErr) {
          console.error("Attendance pre-creation error (non-critical):", attErr);
        }
      }

      // Update capacity
      try {
        await supabase
          .from("events")
          .update({ current_bookings: (event.current_bookings || 0) + (bookingPayload.number_of_attendees || 1) } as any)
          .eq("id", event.id);
      } catch { /* non-critical */ }

      // Send notifications
      if (contacts.length > 0) {
        try {
          await supabase.functions.invoke("notify-event-booking", {
            body: {
              bookerType,
              ticketNumber,
              eventTitle: event.title,
              contacts,
            },
          });
        } catch (notifErr) {
          console.error("Booking notification error (non-critical):", notifErr);
        }
      }

      return ticketNumber;
    },
    onSuccess: (ticket) => {
      toast({ title: "Booking Submitted! 🎉", description: `Your Ticket Number is ${ticket}. Please save it.` });
      resetForm();
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Event booking failed", error);
      toast({
        title: "Booking failed",
        description: error instanceof Error ? error.message : "Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) resetForm(); onOpenChange(o); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Book: {event.title}</DialogTitle>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Who is booking?</p>
            <div className="grid grid-cols-2 gap-3">
              {(["school", "student", "parent", "guest"] as BookerType[]).map((type) => (
                <Button
                  key={type}
                  variant={bookerType === type ? "default" : "outline"}
                  className="capitalize"
                  onClick={() => { setBookerType(type); setStep(2); }}
                >
                  {type}
                </Button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && bookerType && (
          <form onSubmit={(e) => { e.preventDefault(); submitMutation.mutate(); }} className="space-y-4">
            <Badge variant="outline" className="capitalize">{bookerType}</Badge>

            {bookerType === "school" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>School Name *</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required /></div>
                  <div><Label>School Email *</Label><Input type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} required /></div>
                  <div><Label>School Phone *</Label><Input value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} required placeholder="+27..." /></div>
                </div>
                <h4 className="font-medium text-sm pt-1">Contact Teacher</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Name *</Label><Input value={contactTeacherName} onChange={(e) => setContactTeacherName(e.target.value)} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={contactTeacherEmail} onChange={(e) => setContactTeacherEmail(e.target.value)} required /></div>
                  <div><Label>Phone *</Label><Input value={contactTeacherPhone} onChange={(e) => setContactTeacherPhone(e.target.value)} required placeholder="+27..." /></div>
                </div>
                {extraTeachers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Additional Teachers</h4>
                    {extraTeachers.map((t, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 items-end">
                        <div><Label>Name</Label><Input value={t.full_name} onChange={(e) => { const n = [...extraTeachers]; n[i].full_name = e.target.value; setExtraTeachers(n); }} /></div>
                        <div><Label>Email</Label><Input value={t.email} onChange={(e) => { const n = [...extraTeachers]; n[i].email = e.target.value; setExtraTeachers(n); }} /></div>
                        <div><Label>Phone</Label><Input value={t.phone} onChange={(e) => { const n = [...extraTeachers]; n[i].phone = e.target.value; setExtraTeachers(n); }} placeholder="+27..." /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setExtraTeachers(extraTeachers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setExtraTeachers([...extraTeachers, { full_name: "", email: "", phone: COUNTRY_CODE }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Another Teacher
                </Button>
              </>
            )}

            {bookerType === "student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required /></div>
                <div><Label>Phone *</Label><Input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} required placeholder="+27..." /></div>
                <div><Label>School Name *</Label><Input value={studentSchoolName} onChange={(e) => setStudentSchoolName(e.target.value)} required /></div>
                <div><Label>Parent Phone *</Label><Input value={studentParentPhone} onChange={(e) => setStudentParentPhone(e.target.value)} required placeholder="+27..." /></div>
                <div><Label>Parent Email *</Label><Input type="email" value={studentParentEmail} onChange={(e) => setStudentParentEmail(e.target.value)} required /></div>
              </div>
            )}

            {bookerType === "guest" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required /></div>
                <div><Label>Phone *</Label><Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} required placeholder="+27..." /></div>
              </div>
            )}

            {bookerType === "parent" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Parent Name *</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required /></div>
                  <div><Label>Phone *</Label><Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required placeholder="+27..." /></div>
                </div>
                <h4 className="font-medium text-sm pt-1">Children</h4>
                {children.map((c, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <div><Label>Name *</Label><Input value={c.full_name} onChange={(e) => { const n = [...children]; n[i].full_name = e.target.value; setChildren(n); }} required /></div>
                    <div><Label>Email</Label><Input value={c.email} onChange={(e) => { const n = [...children]; n[i].email = e.target.value; setChildren(n); }} /></div>
                    <div><Label>Phone</Label><Input value={c.phone} onChange={(e) => { const n = [...children]; n[i].phone = e.target.value; setChildren(n); }} placeholder="+27..." /></div>
                    <div><Label>Grade</Label><Input value={c.grade || ""} onChange={(e) => { const n = [...children]; n[i].grade = e.target.value; setChildren(n); }} /></div>
                    {children.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setChildren(children.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setChildren([...children, { full_name: "", email: "", phone: COUNTRY_CODE, grade: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Another Child
                </Button>
              </>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
              <Button type="submit" className="flex-1" disabled={submitMutation.isPending}>
                {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Submit Booking
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
