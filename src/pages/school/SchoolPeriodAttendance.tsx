import { useState, useEffect, useCallback, useMemo } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Calendar, Loader2, BookOpen, Filter, UserX, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRADE_OPTIONS = [
  "Grade RRR", "Grade RR", "Grade R",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

const DAYS_OF_WEEK = ["", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export default function SchoolPeriodAttendance() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [activeTab, setActiveTab] = useState("mark");

  // Teacher marking state
  const [timetableEntries, setTimetableEntries] = useState<any[]>([]);
  const [selectedEntryId, setSelectedEntryId] = useState("");
  const [students, setStudents] = useState<any[]>([]);
  const [absentStudentIds, setAbsentStudentIds] = useState<Set<string>>(new Set());
  const [existingRecords, setExistingRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Admin view state
  const [adminGrade, setAdminGrade] = useState("all");
  const [adminClassId, setAdminClassId] = useState("all");
  const [adminSubjectId, setAdminSubjectId] = useState("all");
  const [allClasses, setAllClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]);
  const [adminRecords, setAdminRecords] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);

  const isStaffRole = schoolUser?.role === "school_admin" || schoolUser?.role === "hr";
  const isTeacherRole = ["class_teacher", "subject_teacher", "educator"].includes(schoolUser?.role || "");

  // Get day of week from selected date (1=Mon, 5=Fri)
  const selectedDayOfWeek = useMemo(() => {
    const d = new Date(selectedDate);
    const day = d.getDay(); // 0=Sun, 1=Mon...
    return day === 0 ? 7 : day; // Convert to 1=Mon format
  }, [selectedDate]);

  // Fetch teacher's timetable entries for the selected day
  const fetchTimetableEntries = useCallback(async () => {
    if (!currentSchool?.id || !schoolUser?.id || !isTeacherRole) return;
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
  }, [currentSchool?.id, schoolUser?.id, isTeacherRole, selectedDayOfWeek, selectedEntryId]);

  useEffect(() => { fetchTimetableEntries(); }, [fetchTimetableEntries]);

  // Fetch students for selected timetable entry
  useEffect(() => {
    if (!selectedEntryId || !currentSchool?.id) return;

    const fetchStudents = async () => {
      setLoadingStudents(true);
      const entry = timetableEntries.find(e => e.id === selectedEntryId);
      if (!entry) { setLoadingStudents(false); return; }

      // Get students in the class who also take this subject
      const [classStudentsRes, subjectStudentsRes] = await Promise.all([
        supabase.from("class_students").select("student_id").eq("class_id", entry.class_id),
        supabase.from("student_subjects").select("student_id").eq("subject_id", entry.subject_id),
      ]);

      const classStudentIds = new Set((classStudentsRes.data || []).map((cs: any) => cs.student_id));
      const subjectStudentIds = new Set((subjectStudentsRes.data || []).map((ss: any) => ss.student_id));

      // Students must be in both the class AND taking the subject
      // If no student_subjects records exist for this subject, fall back to all class students
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

      // Fetch existing period attendance for this entry + date
      const { data: existing } = await supabase
        .from("period_attendance")
        .select("*")
        .eq("timetable_entry_id", selectedEntryId)
        .eq("event_date", selectedDate);

      setExistingRecords(existing || []);

      // Set absent students from existing records
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

    // All students get a record - present by default, absent if toggled
    const records = students.map(student => ({
      school_id: currentSchool.id,
      timetable_entry_id: selectedEntryId,
      student_id: student.id,
      event_date: selectedDate,
      status: absentStudentIds.has(student.id) ? "absent" : "present",
      marked_by: schoolUser.id,
    }));

    // Delete existing records for this entry+date first, then insert fresh
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

  // Admin: fetch classes and subjects
  useEffect(() => {
    if (!currentSchool?.id || !isStaffRole) return;
    Promise.all([
      supabase.from("classes").select("id, name, grade").eq("school_id", currentSchool.id).order("grade"),
      supabase.from("subjects").select("id, name").eq("school_id", currentSchool.id).eq("is_active", true).order("name"),
    ]).then(([classesRes, subjectsRes]) => {
      setAllClasses(classesRes.data || []);
      setAllSubjects(subjectsRes.data || []);
    });
  }, [currentSchool?.id, isStaffRole]);

  const adminFilteredClasses = useMemo(() => {
    if (adminGrade === "all") return allClasses;
    return allClasses.filter(c => c.grade === adminGrade);
  }, [allClasses, adminGrade]);

  const adminAvailableGrades = useMemo(() => {
    const grades = new Set(allClasses.map(c => c.grade));
    return GRADE_OPTIONS.filter(g => grades.has(g));
  }, [allClasses]);

  // Admin: fetch period attendance records
  const fetchAdminRecords = useCallback(async () => {
    if (!currentSchool?.id || !isStaffRole) return;
    setAdminLoading(true);

    // Build query for period_attendance with joins
    let query = supabase
      .from("period_attendance")
      .select("*, school_users!period_attendance_student_id_fkey(full_name), timetable_entries(*, subjects(name), classes(name, grade))")
      .eq("school_id", currentSchool.id)
      .eq("event_date", selectedDate)
      .order("created_at", { ascending: false });

    const { data } = await query;

    // Filter client-side by grade, class, subject
    let filtered = data || [];
    if (adminGrade !== "all") {
      filtered = filtered.filter((r: any) => r.timetable_entries?.classes?.grade === adminGrade);
    }
    if (adminClassId !== "all") {
      filtered = filtered.filter((r: any) => r.timetable_entries?.class_id === adminClassId);
    }
    if (adminSubjectId !== "all") {
      filtered = filtered.filter((r: any) => r.timetable_entries?.subject_id === adminSubjectId);
    }

    setAdminRecords(filtered);
    setAdminLoading(false);
  }, [currentSchool?.id, isStaffRole, selectedDate, adminGrade, adminClassId, adminSubjectId]);

  useEffect(() => {
    if (activeTab === "admin-view" && isStaffRole) {
      fetchAdminRecords();
    }
  }, [activeTab, fetchAdminRecords, isStaffRole]);

  useEffect(() => { setAdminClassId("all"); }, [adminGrade]);

  const selectedEntry = timetableEntries.find(e => e.id === selectedEntryId);
  const hasExistingRecords = existingRecords.length > 0;

  const adminSummary = useMemo(() => {
    const total = adminRecords.length;
    const present = adminRecords.filter(r => r.status === "present").length;
    const absent = adminRecords.filter(r => r.status === "absent").length;
    return { total, present, absent };
  }, [adminRecords]);

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Period Attendance</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              {isTeacherRole ? "Mark attendance per subject period" : "View period attendance by grade, class & subject"}
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

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            {(isTeacherRole || isStaffRole) && <TabsTrigger value="mark">Mark Attendance</TabsTrigger>}
            {isStaffRole && (
              <TabsTrigger value="admin-view" className="gap-1.5">
                <Filter className="h-3.5 w-3.5" />
                View Records
              </TabsTrigger>
            )}
          </TabsList>

          {/* Mark Period Attendance */}
          <TabsContent value="mark" className="mt-4 space-y-4">
            {selectedDayOfWeek > 5 ? (
              <Card className="border-dashed">
                <CardContent className="pt-6 text-center">
                  <p className="text-muted-foreground">Selected date is a weekend. No periods scheduled.</p>
                </CardContent>
              </Card>
            ) : (
              <>
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
              </>
            )}
          </TabsContent>

          {/* Admin View */}
          {isStaffRole && (
            <TabsContent value="admin-view" className="mt-4 space-y-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5" /> Grade
                      </label>
                      <Select value={adminGrade} onValueChange={setAdminGrade}>
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="All grades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {adminAvailableGrades.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Class</label>
                      <Select value={adminClassId} onValueChange={setAdminClassId}>
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes</SelectItem>
                          {adminFilteredClasses.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Subject</label>
                      <Select value={adminSubjectId} onValueChange={setAdminSubjectId}>
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="All subjects" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Subjects</SelectItem>
                          {allSubjects.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {adminRecords.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="outline">{adminSummary.total} Total</Badge>
                  <Badge variant="default">{adminSummary.present} Present</Badge>
                  <Badge variant="destructive">{adminSummary.absent} Absent</Badge>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Period Attendance — {selectedDate}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {adminLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : adminRecords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">No period attendance records found for the selected filters.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Student</TableHead>
                          <TableHead>Subject</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Period</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {adminRecords.map((record: any, idx: number) => (
                          <TableRow key={record.id}>
                            <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{record.school_users?.full_name || "—"}</TableCell>
                            <TableCell>{record.timetable_entries?.subjects?.name || "—"}</TableCell>
                            <TableCell>{record.timetable_entries?.classes?.name || "—"}</TableCell>
                            <TableCell>{record.timetable_entries?.classes?.grade || "—"}</TableCell>
                            <TableCell className="text-sm">
                              {record.timetable_entries?.start_time?.slice(0, 5)}–{record.timetable_entries?.end_time?.slice(0, 5)}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={record.status === "present" ? "default" : "destructive"}>
                                {record.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}
        </Tabs>
      </div>
    </SchoolLayout>
  );
}
