import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Layout } from "@/components/layout/Layout";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Plus, Trash2, ArrowLeft } from "lucide-react";
import { Helmet } from "react-helmet-async";

type BookerType = "school" | "student" | "parent";

interface ExtraEntry {
  full_name: string;
  email: string;
  phone: string;
  grade?: string;
}

const EventBooking = () => {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
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

  // Parent fields
  const [parentName, setParentName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [children, setChildren] = useState<ExtraEntry[]>([{ full_name: "", email: "", phone: "", grade: "" }]);

  const { data: event, isLoading } = useQuery({
    queryKey: ["event-detail", eventId],
    queryFn: async () => {
      const { data, error } = await supabase.from("events").select("*").eq("id", eventId!).single();
      if (error) throw error;
      return data;
    },
    enabled: !!eventId,
  });

  // Fetch schools for student dropdown
  const { data: schools } = useQuery({
    queryKey: ["schools-list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("schools").select("id, name").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
    enabled: bookerType === "student",
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const refNumber = `EVT-${Date.now().toString(36).toUpperCase()}`;

      const bookingPayload: any = {
        event_id: eventId,
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
      } else {
        bookingPayload.parent_name = parentName;
        bookingPayload.parent_email = parentEmail;
        bookingPayload.parent_phone = parentPhone;
        bookingPayload.number_of_attendees = children.length;
      }

      const { data: booking, error: bookingErr } = await supabase
        .from("event_bookings")
        .insert(bookingPayload)
        .select("id")
        .single();
      if (bookingErr) throw bookingErr;

      // Insert extras
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

      // Increment bookings count
      await supabase.rpc("increment_event_bookings" as any, { _event_id: eventId } as any).catch(() => {
        // Fallback: manual update
        supabase.from("events").update({ current_bookings: (event?.current_bookings || 0) + (bookingPayload.number_of_attendees || 1) }).eq("id", eventId!);
      });

      return refNumber;
    },
    onSuccess: (ref) => {
      toast({ title: "Booking Submitted! 🎉", description: `Your reference number is ${ref}. Please save it.` });
      navigate("/events");
    },
    onError: () => {
      toast({ title: "Booking failed", description: "Please try again.", variant: "destructive" });
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="flex justify-center py-32"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      </Layout>
    );
  }

  if (!event) {
    return (
      <Layout>
        <div className="container py-32 text-center">
          <h1 className="text-2xl font-bold">Event not found</h1>
          <Button onClick={() => navigate("/events")} className="mt-4">Back to Events</Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Helmet>
        <title>Book: {event.title} | edLEAD</title>
      </Helmet>

      <div className="container max-w-2xl py-12 space-y-6">
        <Button variant="ghost" onClick={() => navigate("/events")} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back to Events
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>{event.title}</CardTitle>
            <p className="text-sm text-muted-foreground">{event.description}</p>
          </CardHeader>
        </Card>

        {/* Step 1: Select booker type */}
        {step === 1 && (
          <Card>
            <CardHeader><CardTitle className="text-lg">Who is booking?</CardTitle></CardHeader>
            <CardContent className="flex flex-col sm:flex-row gap-4">
              {(["school", "student", "parent"] as BookerType[]).map((type) => (
                <Button
                  key={type}
                  variant={bookerType === type ? "default" : "outline"}
                  className="flex-1 capitalize"
                  onClick={() => { setBookerType(type); setStep(2); }}
                >
                  {type}
                </Button>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Step 2: Dynamic form */}
        {step === 2 && bookerType && (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg capitalize">{bookerType} Details</CardTitle>
                <Badge variant="outline" className="capitalize">{bookerType}</Badge>
              </div>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submitMutation.mutate();
                }}
                className="space-y-4"
              >
                {bookerType === "school" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div><Label>School Name *</Label><Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} required /></div>
                      <div><Label>School Email *</Label><Input type="email" value={schoolEmail} onChange={(e) => setSchoolEmail(e.target.value)} required /></div>
                      <div><Label>School Phone *</Label><Input value={schoolPhone} onChange={(e) => setSchoolPhone(e.target.value)} required /></div>
                    </div>
                    <h4 className="font-medium pt-2">Contact Teacher</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><Label>Name *</Label><Input value={contactTeacherName} onChange={(e) => setContactTeacherName(e.target.value)} required /></div>
                      <div><Label>Email *</Label><Input type="email" value={contactTeacherEmail} onChange={(e) => setContactTeacherEmail(e.target.value)} required /></div>
                      <div><Label>Phone</Label><Input value={contactTeacherPhone} onChange={(e) => setContactTeacherPhone(e.target.value)} /></div>
                    </div>

                    {extraTeachers.length > 0 && (
                      <div className="space-y-3 pt-2">
                        <h4 className="font-medium">Additional Teachers</h4>
                        {extraTeachers.map((t, i) => (
                          <div key={i} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end">
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="sm:col-span-2">
                      <Label>School *</Label>
                      {schools && schools.length > 0 ? (
                        <Select value={studentSchoolName} onValueChange={setStudentSchoolName}>
                          <SelectTrigger><SelectValue placeholder="Select your school" /></SelectTrigger>
                          <SelectContent>
                            {schools.map((s) => (
                              <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input value={studentSchoolName} onChange={(e) => setStudentSchoolName(e.target.value)} placeholder="Enter your school name" required />
                      )}
                    </div>
                    <div><Label>Full Name *</Label><Input value={studentName} onChange={(e) => setStudentName(e.target.value)} required /></div>
                    <div><Label>Email *</Label><Input type="email" value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} required /></div>
                    <div><Label>Phone</Label><Input value={studentPhone} onChange={(e) => setStudentPhone(e.target.value)} /></div>
                  </div>
                )}

                {bookerType === "parent" && (
                  <>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div><Label>Parent Name *</Label><Input value={parentName} onChange={(e) => setParentName(e.target.value)} required /></div>
                      <div><Label>Email *</Label><Input type="email" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} required /></div>
                      <div><Label>Phone *</Label><Input value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} required /></div>
                    </div>

                    <h4 className="font-medium pt-2">Children</h4>
                    {children.map((c, i) => (
                      <div key={i} className="grid grid-cols-1 sm:grid-cols-5 gap-2 items-end">
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

                <div className="flex gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button type="submit" className="flex-1" disabled={submitMutation.isPending}>
                    {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Submit Booking
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
};

export default EventBooking;
