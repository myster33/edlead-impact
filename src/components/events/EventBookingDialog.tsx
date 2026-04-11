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

export function EventBookingDialog({ open, onOpenChange, event }: EventBookingDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [bookerType, setBookerType] = useState<BookerType | null>(null);

  // School fields
  const [schoolName, setSchoolName] = useState("");
  const [schoolEmail, setSchoolEmail] = useState("");
  const [schoolPhone, setSchoolPhone] = useState("");
  const [contactTeacherName, setContactTeacherName] = useState("");
  const [contactTeacherEmail, setContactTeacherEmail] = useState("");
  const [contactTeacherPhone, setContactTeacherPhone] = useState("");
  const [extraTeachers, setExtraTeachers] = useState<ExtraEntry[]>([]);

  // Student fields
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [studentPhone, setStudentPhone] = useState("");
  const [studentSchoolName, setStudentSchoolName] = useState("");
  const [studentParentPhone, setStudentParentPhone] = useState("");
  const [studentParentEmail, setStudentParentEmail] = useState("");

  // Parent fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [children, setChildren] = useState<ExtraEntry[]>([{ full_name: "", email: "", phone: "", grade: "" }]);

  // Guest fields
  const [guestName, setGuestName] = useState("");
  const [guestEmail, setGuestEmail] = useState("");
  const [guestPhone, setGuestPhone] = useState("");

  const resetForm = () => {
    setStep(1);
    setBookerType(null);
    setSchoolName(""); setSchoolEmail(""); setSchoolPhone("");
    setContactTeacherName(""); setContactTeacherEmail(""); setContactTeacherPhone("");
    setExtraTeachers([]);
    setStudentName(""); setStudentEmail(""); setStudentPhone(""); setStudentSchoolName("");
    setStudentParentPhone(""); setStudentParentEmail("");
    setParentName(""); setParentEmail(""); setParentPhone("");
    setChildren([{ full_name: "", email: "", phone: "", grade: "" }]);
    setGuestName(""); setGuestEmail(""); setGuestPhone("");
  };

  const submitMutation = useMutation({
    mutationFn: async () => {
      const refNumber = `EVT-${Date.now().toString(36).toUpperCase()}`;
      const bookingPayload: any = {
        event_id: event.id,
        booker_type: bookerType,
        reference_number: refNumber,
        number_of_attendees: 1,
      };

      if (bookerType === "school") {
        bookingPayload.school_name = schoolName;
        bookingPayload.school_email = schoolEmail;
        bookingPayload.school_phone = schoolPhone;
        bookingPayload.contact_teacher_name = contactTeacherName;
        bookingPayload.contact_teacher_email = contactTeacherEmail;
        bookingPayload.contact_teacher_phone = contactTeacherPhone;
        bookingPayload.number_of_attendees = 1 + extraTeachers.length;
      } else if (bookerType === "student") {
        bookingPayload.student_name = studentName;
        bookingPayload.student_email = studentEmail;
        bookingPayload.student_phone = studentPhone;
        bookingPayload.student_school_name = studentSchoolName;
        bookingPayload.parent_phone = studentParentPhone;
        bookingPayload.parent_email = studentParentEmail;
      } else if (bookerType === "parent") {
        bookingPayload.parent_name = parentName;
        bookingPayload.parent_email = parentEmail;
        bookingPayload.parent_phone = parentPhone;
        bookingPayload.number_of_attendees = children.length;
      } else if (bookerType === "guest") {
        bookingPayload.parent_name = guestName;
        bookingPayload.parent_email = guestEmail;
        bookingPayload.parent_phone = guestPhone;
      }

      const { data: booking, error: bookingErr } = await supabase
        .from("event_bookings")
        .insert(bookingPayload as any)
        .select("id")
        .single();
      if (bookingErr) throw bookingErr;

      const extras: any[] = [];
      if (bookerType === "school") {
        extraTeachers.forEach((t) => {
          extras.push({ booking_id: booking.id, type: "teacher", full_name: t.full_name, email: t.email, phone: t.phone });
        });
      } else if (bookerType === "parent") {
        children.forEach((c) => {
          extras.push({ booking_id: booking.id, type: "child", full_name: c.full_name, email: c.email, phone: c.phone, grade: c.grade || null });
        });
      }

      if (extras.length > 0) {
        const { error: extErr } = await supabase.from("event_booking_extras").insert(extras);
        if (extErr) throw extErr;
      }

      try {
        await supabase
          .from("events")
          .update({ current_bookings: (event.current_bookings || 0) + (bookingPayload.number_of_attendees || 1) } as any)
          .eq("id", event.id);
      } catch { /* non-critical */ }

      return refNumber;
    },
    onSuccess: (ref) => {
      toast({ title: "Booking Submitted! 🎉", description: `Your reference number is ${ref}. Please save it.` });
      resetForm();
      onOpenChange(false);
    },
    onError: () => {
      toast({ title: "Booking failed", description: "Please try again.", variant: "destructive" });
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
                  <div><Label>School Phone *</Label><Input value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} required /></div>
                </div>
                <h4 className="font-medium text-sm pt-1">Contact Teacher</h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div><Label>Name *</Label><Input value={contactTeacherName} onChange={(e) => setContactTeacherName(e.target.value)} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={contactTeacherEmail} onChange={(e) => setContactTeacherEmail(e.target.value)} required /></div>
                  <div><Label>Phone</Label><Input value={contactTeacherPhone} onChange={(e) => setContactTeacherPhone(e.target.value)} /></div>
                </div>
                {extraTeachers.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Additional Teachers</h4>
                    {extraTeachers.map((t, i) => (
                      <div key={i} className="grid grid-cols-4 gap-2 items-end">
                        <div><Label>Name</Label><Input value={t.full_name} onChange={(e) => { const n = [...extraTeachers]; n[i].full_name = e.target.value; setExtraTeachers(n); }} /></div>
                        <div><Label>Email</Label><Input value={t.email} onChange={(e) => { const n = [...extraTeachers]; n[i].email = e.target.value; setExtraTeachers(n); }} /></div>
                        <div><Label>Phone</Label><Input value={t.phone} onChange={(e) => { const n = [...extraTeachers]; n[i].phone = e.target.value; setExtraTeachers(n); }} /></div>
                        <Button type="button" variant="ghost" size="icon" onClick={() => setExtraTeachers(extraTeachers.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                    ))}
                  </div>
                )}
                <Button type="button" variant="outline" size="sm" onClick={() => setExtraTeachers([...extraTeachers, { full_name: "", email: "", phone: "" }])}>
                  <Plus className="h-4 w-4 mr-1" /> Add Another Teacher
                </Button>
              </>
            )}

            {bookerType === "student" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required /></div>
                <div><Label>Phone</Label><Input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
                <div><Label>School Name *</Label><Input value={studentSchoolName} onChange={(e) => setStudentSchoolName(e.target.value)} required /></div>
                <div><Label>Parent Phone *</Label><Input value={studentParentPhone} onChange={(e) => setStudentParentPhone(e.target.value)} required /></div>
                <div><Label>Parent Email *</Label><Input type="email" value={studentParentEmail} onChange={(e) => setStudentParentEmail(e.target.value)} required /></div>
              </div>
            )}

            {bookerType === "guest" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><Label>Full Name *</Label><Input value={guestName} onChange={(e) => setGuestName(e.target.value)} required /></div>
                <div><Label>Email *</Label><Input type="email" value={guestEmail} onChange={(e) => setGuestEmail(e.target.value)} required /></div>
                <div><Label>Phone</Label><Input value={guestPhone} onChange={(e) => setGuestPhone(e.target.value)} /></div>
              </div>
            )}

            {bookerType === "parent" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><Label>Parent Name *</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} required /></div>
                  <div><Label>Email *</Label><Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required /></div>
                  <div><Label>Phone *</Label><Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required /></div>
                </div>
                <h4 className="font-medium text-sm pt-1">Children</h4>
                {children.map((c, i) => (
                  <div key={i} className="grid grid-cols-5 gap-2 items-end">
                    <div><Label>Name *</Label><Input value={c.full_name} onChange={(e) => { const n = [...children]; n[i].full_name = e.target.value; setChildren(n); }} required /></div>
                    <div><Label>Email</Label><Input value={c.email} onChange={(e) => { const n = [...children]; n[i].email = e.target.value; setChildren(n); }} /></div>
                    <div><Label>Phone</Label><Input value={c.phone} onChange={(e) => { const n = [...children]; n[i].phone = e.target.value; setChildren(n); }} /></div>
                    <div><Label>Grade</Label><Input value={c.grade || ""} onChange={(e) => { const n = [...children]; n[i].grade = e.target.value; setChildren(n); }} /></div>
                    {children.length > 1 && (
                      <Button type="button" variant="ghost" size="icon" onClick={() => setChildren(children.filter((_, j) => j !== i))}><Trash2 className="h-4 w-4" /></Button>
                    )}
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => setChildren([...children, { full_name: "", email: "", phone: "", grade: "" }])}>
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
