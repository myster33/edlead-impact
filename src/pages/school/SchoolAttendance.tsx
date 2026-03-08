import { useState, useEffect, useCallback } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardCheck, Calendar, UserCheck, Users, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface StudentForMarking {
  id: string;
  full_name: string;
  role: string;
  email: string;
  existingStatus?: string;
  existingEventId?: string;
}

export default function SchoolAttendance() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const { toast } = useToast();
  const [attendanceEvents, setAttendanceEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("records");

  // Mark attendance state
  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("all-students");
  const [markingTarget, setMarkingTarget] = useState<"students" | "staff">("students");
  const [studentsToMark, setStudentsToMark] = useState<StudentForMarking[]>([]);
  const [markingStatus, setMarkingStatus] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);

  const fetchAttendance = useCallback(async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);
    const { data } = await supabase
      .from("attendance_events")
      .select("*, school_users!attendance_events_user_id_fkey(full_name, role)")
      .eq("school_id", currentSchool.id)
      .eq("event_date", selectedDate)
      .order("timestamp", { ascending: false });
    setAttendanceEvents(data || []);
    setIsLoading(false);
  }, [currentSchool?.id, selectedDate]);

  useEffect(() => {
    fetchAttendance();
    const channel = supabase
      .channel("school-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_events" }, () => fetchAttendance())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAttendance]);

  // Fetch classes for class filter
  useEffect(() => {
    if (!currentSchool?.id) return;
    supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", currentSchool.id)
      .order("grade")
      .then(({ data }) => setClasses(data || []));
  }, [currentSchool?.id]);

  // Fetch students/staff to mark when tab or filters change
  useEffect(() => {
    if (activeTab !== "mark" || !currentSchool?.id) return;

    const fetchUsersToMark = async () => {
      setLoadingStudents(true);

      let userIds: string[] = [];

      if (markingTarget === "students") {
        if (selectedClassId && selectedClassId !== "all-students") {
          // Get students in specific class
          const { data: classStudents } = await supabase
            .from("class_students")
            .select("student_id")
            .eq("class_id", selectedClassId);
          userIds = (classStudents || []).map((cs: any) => cs.student_id);
        }

        // Get student users
        let query = supabase
          .from("school_users")
          .select("id, full_name, role, email")
          .eq("school_id", currentSchool.id)
          .eq("role", "student")
          .eq("is_active", true)
          .order("full_name");

        if (userIds.length > 0) {
          query = query.in("id", userIds);
        }

        const { data: students } = await query;

        // Fetch existing attendance for this date
        const { data: existing } = await supabase
          .from("attendance_events")
          .select("id, user_id, status")
          .eq("school_id", currentSchool.id)
          .eq("event_date", selectedDate)
          .eq("event_type", "check_in");

        const existingMap = new Map((existing || []).map((e: any) => [e.user_id, e]));

        const mapped: StudentForMarking[] = (students || []).map((s: any) => {
          const ex = existingMap.get(s.id) as any;
          return {
            ...s,
            existingStatus: ex?.status || undefined,
            existingEventId: ex?.id || undefined,
          };
        });

        setStudentsToMark(mapped);

        // Pre-fill marking status from existing records
        const initial: Record<string, string> = {};
        mapped.forEach(s => {
          if (s.existingStatus) initial[s.id] = s.existingStatus;
        });
        setMarkingStatus(initial);
      } else {
        // Staff
        const { data: staff } = await supabase
          .from("school_users")
          .select("id, full_name, role, email")
          .eq("school_id", currentSchool.id)
          .in("role", ["educator", "class_teacher", "subject_teacher", "school_admin", "hr"])
          .eq("is_active", true)
          .order("full_name");

        const { data: existing } = await supabase
          .from("attendance_events")
          .select("id, user_id, status")
          .eq("school_id", currentSchool.id)
          .eq("event_date", selectedDate)
          .eq("event_type", "check_in")
          .in("role", ["educator", "class_teacher", "subject_teacher", "school_admin", "hr"]);

        const existingMap = new Map((existing || []).map((e: any) => [e.user_id, e]));

        const mapped: StudentForMarking[] = (staff || []).map((s: any) => {
          const ex = existingMap.get(s.id) as any;
          return {
            ...s,
            existingStatus: ex?.status || undefined,
            existingEventId: ex?.id || undefined,
          };
        });

        setStudentsToMark(mapped);
        const initial: Record<string, string> = {};
        mapped.forEach(s => {
          if (s.existingStatus) initial[s.id] = s.existingStatus;
        });
        setMarkingStatus(initial);
      }

      setLoadingStudents(false);
    };

    fetchUsersToMark();
  }, [activeTab, currentSchool?.id, selectedClassId, markingTarget, selectedDate]);

  const setAllStatus = (status: string) => {
    const updated: Record<string, string> = {};
    studentsToMark.forEach(s => { updated[s.id] = status; });
    setMarkingStatus(updated);
  };

  const handleSubmitAttendance = async () => {
    if (!currentSchool?.id || !schoolUser?.id) return;

    const entries = Object.entries(markingStatus).filter(([_, status]) => status);
    if (entries.length === 0) {
      toast({ title: "No selections", description: "Please mark at least one person.", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);

    // Separate into updates and inserts
    const toUpdate: { id: string; status: string }[] = [];
    const toInsert: any[] = [];

    entries.forEach(([userId, status]) => {
      const student = studentsToMark.find(s => s.id === userId);
      if (student?.existingEventId) {
        toUpdate.push({ id: student.existingEventId, status });
      } else {
        toInsert.push({
          user_id: userId,
          school_id: currentSchool.id,
          role: student?.role || "student",
          event_type: "check_in",
          event_date: selectedDate,
          method: "manual",
          status,
          marked_by: schoolUser.id,
        });
      }
    });

    let hasError = false;

    // Batch insert new records
    if (toInsert.length > 0) {
      const { error } = await supabase.from("attendance_events").insert(toInsert);
      if (error) { hasError = true; console.error(error); }
    }

    // Update existing records
    for (const item of toUpdate) {
      const { error } = await supabase
        .from("attendance_events")
        .update({ status: item.status, marked_by: schoolUser.id })
        .eq("id", item.id);
      if (error) { hasError = true; console.error(error); }
    }

    if (hasError) {
      toast({ title: "Error", description: "Some records failed to save.", variant: "destructive" });
    } else {
      toast({ title: "Attendance saved", description: `${entries.length} records saved successfully.` });
    }

    setIsSubmitting(false);
    fetchAttendance();
  };

  const statusColor = (status: string) => {
    switch (status) {
      case "present": return "default";
      case "late": return "secondary";
      case "absent": return "destructive";
      default: return "outline";
    }
  };

  const markedCount = Object.values(markingStatus).filter(Boolean).length;
  const presentCount = Object.values(markingStatus).filter(v => v === "present").length;
  const lateCount = Object.values(markingStatus).filter(v => v === "late").length;
  const absentCount = Object.values(markingStatus).filter(v => v === "absent").length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground">Daily attendance tracking (STATs)</p>
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
            <TabsTrigger value="records">Records</TabsTrigger>
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="records" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  Attendance Records — {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : attendanceEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No attendance records for this date.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Method</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceEvents.map(event => (
                        <TableRow key={event.id}>
                          <TableCell className="font-medium">{event.school_users?.full_name || "—"}</TableCell>
                          <TableCell className="capitalize">{event.role?.replace("_", " ")}</TableCell>
                          <TableCell className="capitalize">{event.event_type?.replace("_", " ")}</TableCell>
                          <TableCell className="capitalize">{event.method}</TableCell>
                          <TableCell>
                            <Badge variant={statusColor(event.status) as any}>{event.status}</Badge>
                          </TableCell>
                          <TableCell>{new Date(event.timestamp).toLocaleTimeString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="mark" className="mt-4 space-y-4">
            {/* Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Marking</label>
                    <Select value={markingTarget} onValueChange={(v) => setMarkingTarget(v as "students" | "staff")}>
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="students"><span className="flex items-center gap-2"><Users className="h-4 w-4" />Students</span></SelectItem>
                        <SelectItem value="staff"><span className="flex items-center gap-2"><UserCheck className="h-4 w-4" />Staff</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {markingTarget === "students" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Class</label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder="All students" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all-students">All students</SelectItem>
                          {classes.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="flex gap-2 sm:ml-auto">
                    <Button size="sm" variant="outline" onClick={() => setAllStatus("present")}>All Present</Button>
                    <Button size="sm" variant="outline" onClick={() => setAllStatus("late")}>All Late</Button>
                    <Button size="sm" variant="outline" onClick={() => setAllStatus("absent")}>All Absent</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary badges */}
            {markedCount > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Badge variant="default">{presentCount} Present</Badge>
                <Badge variant="secondary">{lateCount} Late</Badge>
                <Badge variant="destructive">{absentCount} Absent</Badge>
                <Badge variant="outline">{studentsToMark.length - markedCount} Unmarked</Badge>
              </div>
            )}

            {/* Marking table */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <UserCheck className="h-5 w-5" />
                  {markingTarget === "students" ? "Mark Student Attendance" : "Mark Staff Attendance"} — {selectedDate}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingStudents ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : studentsToMark.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {markingTarget === "students" ? "No students found. Add students to this school first." : "No staff found."}
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Status</TableHead>
                          {studentsToMark.some(s => s.existingStatus) && <TableHead>Saved</TableHead>}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {studentsToMark.map((student, idx) => (
                          <TableRow key={student.id}>
                            <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{student.full_name}</TableCell>
                            <TableCell className="capitalize text-sm text-muted-foreground">{student.role.replace("_", " ")}</TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {(["present", "late", "absent"] as const).map(status => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={markingStatus[student.id] === status ? (
                                      status === "present" ? "default" : status === "late" ? "secondary" : "destructive"
                                    ) : "outline"}
                                    className="text-xs h-7 px-2"
                                    onClick={() => setMarkingStatus(prev => ({
                                      ...prev,
                                      [student.id]: prev[student.id] === status ? "" : status,
                                    }))}
                                  >
                                    {status.charAt(0).toUpperCase() + status.slice(1)}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                            {studentsToMark.some(s => s.existingStatus) && (
                              <TableCell>
                                {student.existingStatus && (
                                  <CheckCircle className="h-4 w-4 text-primary" />
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleSubmitAttendance} disabled={isSubmitting || markedCount === 0}>
                        {isSubmitting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : (
                          <><ClipboardCheck className="mr-2 h-4 w-4" />Save Attendance ({markedCount})</>
                        )}
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SchoolLayout>
  );
}
