import { useState, useEffect, useCallback, useMemo } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Calendar, Loader2, BookOpen, UserX, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const DAYS_OF_WEEK = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function SchoolPeriodAttendance() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

  // Teacher marking state
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [absentStudentIds, setAbsentStudentIds] = useState<Set<string>>(new Set());
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Get day of week from selected date (1=Mon, 5=Fri)
  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay();
    return day === 0 ? 7 : day;
  }, [selectedDate]);

  // Fetch teacher's timetable entries for the selected day
  const fetchTimetableEntries = useCallback(async () => {
    if (!currentSchool?.id || !schoolUser?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("timetable_entries")
      .select("*, subjects(name), classes(name, grade)")
      .eq("school_id", currentSchool.id)
      .eq("teacher_id", schoolUser.id)
      .eq("day_of_week", selectedDayOfWeek)
      .order("start_time");
    setTimetableEntries(data || []);
    if (data && data.length > 0 && !selectedEntryId) {
      setSelectedEntryId(data[0].id);
    }
    setIsLoading(false);
  }, [currentSchool?.id, schoolUser?.id, selectedDayOfWeek, selectedEntryId]);

  useEffect(() => { fetchTimetableEntries(); }, [fetchTimetableEntries]);

  // Fetch students for selected timetable entry
  useEffect(() => {
    if (!selectedEntryId || !currentSchool?.id) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);
      const entry = timetableEntries.find(e => e.id === selectedEntryId);
      if (!entry) { setLoadingStudents(false); return; }

      const [classStudentsRes, subjectStudentsRes] = await Promise.all([
        supabase.from("class_students").select("student_id").eq("class_id", entry.class_id),
        supabase.from("student_subjects").select("student_id").eq("subject_id", entry.subject_id),
      ]);

      const classStudentIds = new Set((classStudentsRes.data || []).map((cs: any) => cs.student_id));
      const subjectStudentIds = new Set((subjectStudentsRes.data || []).map((ss: any) => ss.student_id));

      const hasSubjectEnrollments = subjectStudentIds.size > 0;
      const targetIds = hasSubjectEnrollments
        ? [...classStudentIds].filter(id => subjectStudentIds.has(id))
        : [...classStudentIds];

      if (targetIds.length === 0) {
        setStudents([]);
        setLoadingStudents(false);
        return;
      }

      const { data: studentUsers } = await supabase
        .from("school_users")
        .select("id, full_name, email")
        .in("id", targetIds)
        .eq("is_active", true)
        .order("full_name");

      setStudents(studentUsers || []);

      const { data: existing } = await supabase
        .from("period_attendance")
        .select("*")
        .eq("timetable_entry_id", selectedEntryId)
        .eq("event_date", selectedDate);

      setExistingRecords(existing || []);

      const absentIds = new Set<string>();
      (existing || []).forEach((r: any) => {
        if (r.status === "absent") absentIds.add(r.student_id);
      });
      setAbsentStudentIds(absentIds);
      setLoadingStudents(false);
    };

    fetchStudents();
  }, [selectedEntryId, selectedDate, currentSchool?.id, timetableEntries]);

  const toggleAbsent = (studentId: string) => {
    setAbsentStudentIds(prev => {
      const next = new Set(prev);
      if (next.has(studentId)) next.delete(studentId);
      else next.add(studentId);
      return next;
    });
  };

  const handleSubmitPeriodAttendance = async () => {
    if (!currentSchool?.id || !schoolUser?.id || !selectedEntryId) return;
    setIsSubmitting(true);

    const records = students.map(student => ({
      school_id: currentSchool.id,
      timetable_entry_id: selectedEntryId,
      student_id: student.id,
      event_date: selectedDate,
      status: absentStudentIds.has(student.id) ? "absent" : "present",
      marked_by: schoolUser.id,
    }));

    await supabase
      .from("period_attendance")
      .delete()
      .eq("timetable_entry_id", selectedEntryId)
      .eq("event_date", selectedDate);

    const { error } = await supabase.from("period_attendance").insert(records);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Period attendance saved",
        description: `${students.length - absentStudentIds.size} present, ${absentStudentIds.size} absent`,
      });
    }
    setIsSubmitting(false);
  };

  const selectedEntry = timetableEntries.find(e => e.id === selectedEntryId);
  const hasExistingRecords = existingRecords.length > 0;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Period Attendance</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Mark attendance per subject period
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background text-foreground border-input"
            />
          </div>
        </div>

        {selectedDayOfWeek > 5 ? (
          <Card className="border-dashed">
            <CardContent className="pt-6 text-center">
              <p className="text-muted-foreground">Selected date is a weekend. No periods scheduled.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Period selector */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="space-y-1.5 flex-1">
                    <label className="text-sm font-medium text-foreground">
                      {DAYS_OF_WEEK[selectedDayOfWeek]} Periods
                    </label>
                    <Select value={selectedEntryId} onValueChange={setSelectedEntryId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select period" />
                      </SelectTrigger>
                      <SelectContent>
                        {timetableEntries.map(entry => (
                          <SelectItem key={entry.id} value={entry.id}>
                            {entry.period_label ? `${entry.period_label} — ` : ""}
                            {entry.start_time?.slice(0, 5)}–{entry.end_time?.slice(0, 5)} · {entry.subjects?.name} · {entry.classes?.name} ({entry.classes?.grade})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                {timetableEntries.length === 0 && !isLoading && (
                  <p className="text-muted-foreground text-sm mt-3">
                    No periods scheduled for {DAYS_OF_WEEK[selectedDayOfWeek]}. Add entries in your Timetable first.
                  </p>
                )}
              </CardContent>
            </Card>

            {selectedEntry && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ClipboardCheck className="h-5 w-5" />
                    {selectedEntry.subjects?.name} — {selectedEntry.classes?.name} ({selectedEntry.classes?.grade})
                  </CardTitle>
                  <CardDescription>
                    {selectedEntry.start_time?.slice(0, 5)}–{selectedEntry.end_time?.slice(0, 5)} · {selectedDate}
                    {hasExistingRecords && <Badge variant="secondary" className="ml-2">Already marked</Badge>}
                    <span className="block mt-1 text-xs">All students are present by default. Only toggle students who are <strong>absent</strong>.</span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loadingStudents ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : students.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No students found for this class/subject combination.
                    </p>
                  ) : (
                    <>
                      <div className="flex gap-3 flex-wrap mb-4">
                        <Badge variant="default">{students.length - absentStudentIds.size} Present</Badge>
                        <Badge variant="destructive">{absentStudentIds.size} Absent</Badge>
                      </div>

                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-8">#</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead className="text-center">Status</TableHead>
                            <TableHead className="text-center">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((student, idx) => {
                            const isAbsent = absentStudentIds.has(student.id);
                            return (
                              <TableRow key={student.id} className={isAbsent ? "bg-destructive/5" : ""}>
                                <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                                <TableCell className="font-medium">{student.full_name}</TableCell>
                                <TableCell className="text-center">
                                  <Badge variant={isAbsent ? "destructive" : "default"}>
                                    {isAbsent ? "Absent" : "Present"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="text-center">
                                  <Button
                                    size="sm"
                                    variant={isAbsent ? "destructive" : "outline"}
                                    className="text-xs h-7"
                                    onClick={() => toggleAbsent(student.id)}
                                  >
                                    {isAbsent ? (
                                      <><CheckCircle className="mr-1 h-3 w-3" />Mark Present</>
                                    ) : (
                                      <><UserX className="mr-1 h-3 w-3" />Mark Absent</>
                                    )}
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>

                      <div className="mt-4 flex justify-end">
                        <Button onClick={handleSubmitPeriodAttendance} disabled={isSubmitting}>
                          {isSubmitting ? (
                            <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                          ) : (
                            <><ClipboardCheck className="mr-2 h-4 w-4" />Save Period Attendance</>
                          )}
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </div>
    </SchoolLayout>
  );
}
