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
import { ClipboardCheck, Calendar, UserCheck, Users, Loader2, CheckCircle, LogIn, LogOut, GraduationCap, Building, Filter, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const GRADE_OPTIONS = [
  "Grade RRR", "Grade RR", "Grade R",
  "Grade 1", "Grade 2", "Grade 3", "Grade 4", "Grade 5", "Grade 6",
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12",
];

interface UserForMarking {
  id: string;
  full_name: string;
  role: string;
  email: string;
  checkInStatus?: string;
  checkInEventId?: string;
  checkInTime?: string;
  checkOutStatus?: string;
  checkOutEventId?: string;
  checkOutTime?: string;
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
  const [markingEventType, setMarkingEventType] = useState<"check_in" | "check_out">("check_in");
  const [usersToMark, setUsersToMark] = useState<UserForMarking[]>([]);
  const [markingStatus, setMarkingStatus] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Class teacher's assigned classes
  const [teacherClasses, setTeacherClasses] = useState<any[]>([]);

  // Class attendance view filters (admin)
  const [classViewGrade, setClassViewGrade] = useState<string>("all");
  const [classViewClassId, setClassViewClassId] = useState<string>("all");
  const [classAttendanceRecords, setClassAttendanceRecords] = useState<any[]>([]);
  const [classAttendanceLoading, setClassAttendanceLoading] = useState(false);

  const isClassTeacher = schoolUser?.role === "class_teacher";
  const isSubjectTeacher = schoolUser?.role === "subject_teacher";
  const isEducator = schoolUser?.role === "educator";
  const isTeacherRole = isClassTeacher || isSubjectTeacher || isEducator;
  const isStaffRole = schoolUser?.role === "school_admin" || schoolUser?.role === "hr";

  // Classes filtered by selected grade for the class attendance view
  const classesForSelectedGrade = useMemo(() => {
    if (classViewGrade === "all") return classes;
    return classes.filter(c => c.grade === classViewGrade);
  }, [classes, classViewGrade]);

  // Available grades from school's actual classes
  const availableGrades = useMemo(() => {
    const grades = new Set(classes.map(c => c.grade));
    return GRADE_OPTIONS.filter(g => grades.has(g));
  }, [classes]);

  // Fetch teacher's assigned classes
  useEffect(() => {
    if (!currentSchool?.id || !schoolUser?.id || !isTeacherRole) return;
    supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", currentSchool.id)
      .eq("class_teacher_id", schoolUser.id)
      .order("grade")
      .then(({ data }) => {
        setTeacherClasses(data || []);
        if (data && data.length > 0) {
          setSelectedClassId(data[0].id);
        }
      });
  }, [currentSchool?.id, schoolUser?.id, isTeacherRole]);

  const fetchAttendance = useCallback(async () => {
    if (!currentSchool?.id) return;
    setIsLoading(true);

    let query = supabase
      .from("attendance_events")
      .select("*, school_users!attendance_events_user_id_fkey(full_name, role)")
      .eq("school_id", currentSchool.id)
      .eq("event_date", selectedDate)
      .order("timestamp", { ascending: false });

    // Class teachers only see their class students' records
    if (isTeacherRole && teacherClasses.length > 0) {
      const classIds = teacherClasses.map(c => c.id);
      const { data: classStudents } = await supabase
        .from("class_students")
        .select("student_id")
        .in("class_id", classIds);
      const studentIds = (classStudents || []).map((cs: any) => cs.student_id);
      if (studentIds.length > 0) {
        query = query.in("user_id", studentIds);
      }
    }

    const { data } = await query;
    setAttendanceEvents(data || []);
    setIsLoading(false);
  }, [currentSchool?.id, selectedDate, isTeacherRole, teacherClasses]);

  // Fetch class attendance for admin view
  const fetchClassAttendance = useCallback(async () => {
    if (!currentSchool?.id || !isStaffRole) return;
    setClassAttendanceLoading(true);

    // Get class IDs to filter by
    let targetClassIds: string[] = [];
    if (classViewClassId !== "all") {
      targetClassIds = [classViewClassId];
    } else if (classViewGrade !== "all") {
      targetClassIds = classesForSelectedGrade.map(c => c.id);
    } else {
      targetClassIds = classes.map(c => c.id);
    }

    if (targetClassIds.length === 0) {
      setClassAttendanceRecords([]);
      setClassAttendanceLoading(false);
      return;
    }

    // Get students in those classes
    const { data: classStudents } = await supabase
      .from("class_students")
      .select("student_id, class_id")
      .in("class_id", targetClassIds);

    const studentIds = (classStudents || []).map((cs: any) => cs.student_id);
    const studentClassMap = new Map<string, string>();
    (classStudents || []).forEach((cs: any) => studentClassMap.set(cs.student_id, cs.class_id));

    if (studentIds.length === 0) {
      setClassAttendanceRecords([]);
      setClassAttendanceLoading(false);
      return;
    }

    // Get attendance events for those students
    const { data: events } = await supabase
      .from("attendance_events")
      .select("*, school_users!attendance_events_user_id_fkey(full_name, role)")
      .eq("school_id", currentSchool.id)
      .eq("event_date", selectedDate)
      .in("user_id", studentIds)
      .order("timestamp", { ascending: false });

    // Map with class info
    const map = new Map<string, any>();
    (events || []).forEach((event: any) => {
      const userId = event.user_id;
      if (!map.has(userId)) {
        const classId = studentClassMap.get(userId);
        const cls = classes.find(c => c.id === classId);
        map.set(userId, {
          name: event.school_users?.full_name || "—",
          role: event.role,
          className: cls?.name || "—",
          grade: cls?.grade || "—",
          checkIn: undefined,
          checkOut: undefined,
        });
      }
      const entry = map.get(userId)!;
      if (event.event_type === "check_in") entry.checkIn = event;
      if (event.event_type === "check_out") entry.checkOut = event;
    });

    // Also include students with no attendance yet
    const { data: studentUsers } = await supabase
      .from("school_users")
      .select("id, full_name, role")
      .in("id", studentIds)
      .eq("is_active", true)
      .order("full_name");

    (studentUsers || []).forEach((su: any) => {
      if (!map.has(su.id)) {
        const classId = studentClassMap.get(su.id);
        const cls = classes.find(c => c.id === classId);
        map.set(su.id, {
          name: su.full_name,
          role: su.role,
          className: cls?.name || "—",
          grade: cls?.grade || "—",
          checkIn: undefined,
          checkOut: undefined,
        });
      }
    });

    setClassAttendanceRecords(Array.from(map.values()));
    setClassAttendanceLoading(false);
  }, [currentSchool?.id, isStaffRole, classViewClassId, classViewGrade, classesForSelectedGrade, classes, selectedDate]);

  useEffect(() => {
    fetchAttendance();
    const channel = supabase
      .channel("school-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_events" }, () => {
        fetchAttendance();
        if (activeTab === "class-view") fetchClassAttendance();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fetchAttendance, fetchClassAttendance, activeTab]);

  useEffect(() => {
    if (!currentSchool?.id) return;
    supabase
      .from("classes")
      .select("id, name, grade")
      .eq("school_id", currentSchool.id)
      .order("grade")
      .then(({ data }) => setClasses(data || []));
  }, [currentSchool?.id]);

  // Fetch class attendance when tab or filters change
  useEffect(() => {
    if (activeTab === "class-view" && isStaffRole && classes.length > 0) {
      fetchClassAttendance();
    }
  }, [activeTab, fetchClassAttendance, isStaffRole, classes]);

  // Reset class filter when grade changes
  useEffect(() => {
    setClassViewClassId("all");
  }, [classViewGrade]);

  // Fetch users to mark when tab or filters change
  useEffect(() => {
    if (activeTab !== "mark" || !currentSchool?.id) return;

    const fetchUsersToMark = async () => {
      setLoadingUsers(true);

      let userIds: string[] = [];
      const effectiveClassId = selectedClassId;

      if (markingTarget === "students" && effectiveClassId && effectiveClassId !== "all-students") {
        const { data: classStudents } = await supabase
          .from("class_students")
          .select("student_id")
          .eq("class_id", effectiveClassId);
        userIds = (classStudents || []).map((cs: any) => cs.student_id);
      }

      const roleFilter = markingTarget === "students"
        ? ["student" as const]
        : ["educator" as const, "class_teacher" as const, "subject_teacher" as const, "school_admin" as const, "hr" as const];

      let query = supabase
        .from("school_users")
        .select("id, full_name, role, email")
        .eq("school_id", currentSchool.id)
        .in("role", roleFilter)
        .eq("is_active", true)
        .order("full_name");

      if (markingTarget === "students" && userIds.length > 0) {
        query = query.in("id", userIds);
      }

      if (isTeacherRole && markingTarget === "students" && effectiveClassId === "all-students" && teacherClasses.length > 0) {
        const allClassIds = teacherClasses.map(c => c.id);
        const { data: allClassStudents } = await supabase
          .from("class_students")
          .select("student_id")
          .in("class_id", allClassIds);
        const allStudentIds = (allClassStudents || []).map((cs: any) => cs.student_id);
        if (allStudentIds.length > 0) {
          query = query.in("id", allStudentIds);
        }
      }

      const { data: users } = await query;

      const { data: existing } = await supabase
        .from("attendance_events")
        .select("id, user_id, status, event_type, timestamp")
        .eq("school_id", currentSchool.id)
        .eq("event_date", selectedDate);

      const checkInMap = new Map<string, any>();
      const checkOutMap = new Map<string, any>();
      (existing || []).forEach((e: any) => {
        if (e.event_type === "check_in") checkInMap.set(e.user_id, e);
        if (e.event_type === "check_out") checkOutMap.set(e.user_id, e);
      });

      const mapped: UserForMarking[] = (users || []).map((u: any) => {
        const ci = checkInMap.get(u.id) as any;
        const co = checkOutMap.get(u.id) as any;
        return {
          ...u,
          checkInStatus: ci?.status,
          checkInEventId: ci?.id,
          checkInTime: ci?.timestamp,
          checkOutStatus: co?.status,
          checkOutEventId: co?.id,
          checkOutTime: co?.timestamp,
        };
      });

      setUsersToMark(mapped);

      const initial: Record<string, string> = {};
      mapped.forEach(u => {
        const ex = markingEventType === "check_in" ? u.checkInStatus : u.checkOutStatus;
        if (ex) initial[u.id] = ex;
      });
      setMarkingStatus(initial);
      setLoadingUsers(false);
    };

    fetchUsersToMark();
  }, [activeTab, currentSchool?.id, selectedClassId, markingTarget, selectedDate, markingEventType, isTeacherRole, teacherClasses]);

  const setAllStatus = (status: string) => {
    const updated: Record<string, string> = {};
    usersToMark.forEach(u => { updated[u.id] = status; });
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

    const toUpdate: { id: string; status: string }[] = [];
    const toInsert: any[] = [];

    entries.forEach(([userId, status]) => {
      const user = usersToMark.find(u => u.id === userId);
      const existingEventId = markingEventType === "check_in" ? user?.checkInEventId : user?.checkOutEventId;

      if (existingEventId) {
        toUpdate.push({ id: existingEventId, status });
      } else {
        toInsert.push({
          user_id: userId,
          school_id: currentSchool.id,
          role: user?.role || "student",
          event_type: markingEventType,
          event_date: selectedDate,
          method: "manual",
          status,
          marked_by: schoolUser.id,
        });
      }
    });

    let hasError = false;

    if (toInsert.length > 0) {
      const { error } = await supabase.from("attendance_events").insert(toInsert);
      if (error) { hasError = true; console.error(error); }
    }

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
      toast({ title: "Attendance saved", description: `${entries.length} ${markingEventType.replace("_", " ")} records saved.` });
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

  // Group records by user for the records view
  const groupedRecords = useMemo(() => {
    const map = new Map<string, { name: string; role: string; checkIn?: any; checkOut?: any }>();
    attendanceEvents.forEach(event => {
      const userId = event.user_id;
      if (!map.has(userId)) {
        map.set(userId, {
          name: event.school_users?.full_name || "—",
          role: event.role,
          checkIn: undefined,
          checkOut: undefined,
        });
      }
      const entry = map.get(userId)!;
      if (event.event_type === "check_in") entry.checkIn = event;
      if (event.event_type === "check_out") entry.checkOut = event;
    });
    return Array.from(map.values());
  }, [attendanceEvents]);

  // Class attendance summary stats
  const classAttendanceSummary = useMemo(() => {
    const total = classAttendanceRecords.length;
    const present = classAttendanceRecords.filter(r => r.checkIn?.status === "present").length;
    const late = classAttendanceRecords.filter(r => r.checkIn?.status === "late").length;
    const absent = classAttendanceRecords.filter(r => r.checkIn?.status === "absent").length;
    const unmarked = total - present - late - absent;
    return { total, present, late, absent, unmarked };
  }, [classAttendanceRecords]);

  const availableClasses = isTeacherRole ? teacherClasses : classes;

  const attendanceContextLabel = isTeacherRole ? "Class Attendance" : "School Attendance";
  const attendanceContextIcon = isTeacherRole
    ? <GraduationCap className="h-5 w-5 text-primary" />
    : <Building className="h-5 w-5 text-primary" />;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Attendance</h1>
            <p className="text-muted-foreground flex items-center gap-2">
              {attendanceContextIcon}
              {isTeacherRole
                ? "Mark and view class attendance for your students"
                : "Daily check-in & check-out tracking (STATs)"
              }
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="gap-1.5 py-1.5 px-3">
              {isTeacherRole ? <GraduationCap className="h-3.5 w-3.5" /> : <Building className="h-3.5 w-3.5" />}
              {attendanceContextLabel}
            </Badge>
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded-md px-3 py-2 text-sm bg-background text-foreground border-input"
            />
          </div>
        </div>

        {/* Info card for class teachers */}
        {isTeacherRole && teacherClasses.length === 0 && (
          <Card className="border-dashed">
            <CardContent className="pt-6">
              <p className="text-muted-foreground text-center">
                You don't have any classes assigned yet. Ask your school administrator to assign you as a class teacher.
              </p>
            </CardContent>
          </Card>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="records">Records</TabsTrigger>
            {isStaffRole && (
              <TabsTrigger value="class-view" className="gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" />
                Class Attendance
              </TabsTrigger>
            )}
            <TabsTrigger value="mark">Mark Attendance</TabsTrigger>
          </TabsList>

          {/* School Attendance Records tab */}
          <TabsContent value="records" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  {isTeacherRole ? "Class Attendance Records" : "School Attendance Records"} — {selectedDate}
                </CardTitle>
                {isTeacherRole && teacherClasses.length > 0 && (
                  <CardDescription>
                    Showing records for: {teacherClasses.map(c => `${c.name} (${c.grade})`).join(", ")}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : groupedRecords.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No attendance records for this date.</p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead className="text-center">
                          <span className="flex items-center justify-center gap-1"><LogIn className="h-3.5 w-3.5" />Check In</span>
                        </TableHead>
                        <TableHead className="text-center">Check-In Time</TableHead>
                        <TableHead className="text-center">
                          <span className="flex items-center justify-center gap-1"><LogOut className="h-3.5 w-3.5" />Check Out</span>
                        </TableHead>
                        <TableHead className="text-center">Check-Out Time</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {groupedRecords.map((record, idx) => (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{record.name}</TableCell>
                          <TableCell className="capitalize">{record.role?.replace("_", " ")}</TableCell>
                          <TableCell className="text-center">
                            {record.checkIn ? (
                              <Badge variant={statusColor(record.checkIn.status) as any}>{record.checkIn.status}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {record.checkIn ? new Date(record.checkIn.timestamp).toLocaleTimeString() : "—"}
                          </TableCell>
                          <TableCell className="text-center">
                            {record.checkOut ? (
                              <Badge variant={statusColor(record.checkOut.status) as any}>{record.checkOut.status}</Badge>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </TableCell>
                          <TableCell className="text-center text-sm">
                            {record.checkOut ? new Date(record.checkOut.timestamp).toLocaleTimeString() : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Class Attendance View (Admin only) */}
          {isStaffRole && (
            <TabsContent value="class-view" className="mt-4 space-y-4">
              {/* Filters */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                        <Filter className="h-3.5 w-3.5" /> Grade
                      </label>
                      <Select value={classViewGrade} onValueChange={setClassViewGrade}>
                        <SelectTrigger className="w-44">
                          <SelectValue placeholder="All grades" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Grades</SelectItem>
                          {availableGrades.map(g => (
                            <SelectItem key={g} value={g}>{g}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">Class</label>
                      <Select value={classViewClassId} onValueChange={setClassViewClassId}>
                        <SelectTrigger className="w-52">
                          <SelectValue placeholder="All classes" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Classes{classViewGrade !== "all" ? ` in ${classViewGrade}` : ""}</SelectItem>
                          {classesForSelectedGrade.map(c => (
                            <SelectItem key={c.id} value={c.id}>{c.name} ({c.grade})</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Summary */}
              {classAttendanceRecords.length > 0 && (
                <div className="flex gap-3 flex-wrap">
                  <Badge variant="outline">{classAttendanceSummary.total} Total</Badge>
                  <Badge variant="default">{classAttendanceSummary.present} Present</Badge>
                  <Badge variant="secondary">{classAttendanceSummary.late} Late</Badge>
                  <Badge variant="destructive">{classAttendanceSummary.absent} Absent</Badge>
                  <Badge variant="outline">{classAttendanceSummary.unmarked} Not Marked</Badge>
                </div>
              )}

              {/* Class attendance table */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <GraduationCap className="h-5 w-5" />
                    Class Attendance — {selectedDate}
                  </CardTitle>
                  <CardDescription>
                    {classViewGrade !== "all" ? classViewGrade : "All grades"}
                    {classViewClassId !== "all" ? ` — ${classesForSelectedGrade.find(c => c.id === classViewClassId)?.name}` : ""}
                    {" · Marked by class teachers"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {classAttendanceLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                  ) : classAttendanceRecords.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      {classes.length === 0
                        ? "No classes created yet. Create classes and assign students first."
                        : "No students found for the selected filters."
                      }
                    </p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Grade</TableHead>
                          <TableHead>Class</TableHead>
                          <TableHead className="text-center">
                            <span className="flex items-center justify-center gap-1"><LogIn className="h-3.5 w-3.5" />Check In</span>
                          </TableHead>
                          <TableHead className="text-center">Time</TableHead>
                          <TableHead className="text-center">
                            <span className="flex items-center justify-center gap-1"><LogOut className="h-3.5 w-3.5" />Check Out</span>
                          </TableHead>
                          <TableHead className="text-center">Time</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classAttendanceRecords.map((record, idx) => (
                          <TableRow key={idx}>
                            <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{record.name}</TableCell>
                            <TableCell className="text-sm">{record.grade}</TableCell>
                            <TableCell className="text-sm">{record.className}</TableCell>
                            <TableCell className="text-center">
                              {record.checkIn ? (
                                <Badge variant={statusColor(record.checkIn.status) as any}>{record.checkIn.status}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {record.checkIn ? new Date(record.checkIn.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
                            </TableCell>
                            <TableCell className="text-center">
                              {record.checkOut ? (
                                <Badge variant={statusColor(record.checkOut.status) as any}>{record.checkOut.status}</Badge>
                              ) : (
                                <span className="text-muted-foreground text-xs">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {record.checkOut ? new Date(record.checkOut.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}
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

          {/* Mark Attendance tab */}
          <TabsContent value="mark" className="mt-4 space-y-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-end flex-wrap">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-foreground">Event Type</label>
                    <Select value={markingEventType} onValueChange={(v) => setMarkingEventType(v as "check_in" | "check_out")}>
                      <SelectTrigger className="w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="check_in"><span className="flex items-center gap-2"><LogIn className="h-4 w-4" />Check In</span></SelectItem>
                        <SelectItem value="check_out"><span className="flex items-center gap-2"><LogOut className="h-4 w-4" />Check Out</span></SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {isStaffRole && (
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
                  )}

                  {markingTarget === "students" && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-foreground">
                        {isTeacherRole ? "Your Class" : "Class"}
                      </label>
                      <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                        <SelectTrigger className="w-48">
                          <SelectValue placeholder={isTeacherRole ? "Select class" : "All students"} />
                        </SelectTrigger>
                        <SelectContent>
                          {!isTeacherRole && (
                            <SelectItem value="all-students">All students</SelectItem>
                          )}
                          {availableClasses.map(c => (
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

            {markedCount > 0 && (
              <div className="flex gap-3 flex-wrap">
                <Badge variant="default">{presentCount} Present</Badge>
                <Badge variant="secondary">{lateCount} Late</Badge>
                <Badge variant="destructive">{absentCount} Absent</Badge>
                <Badge variant="outline">{usersToMark.length - markedCount} Unmarked</Badge>
              </div>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  {markingEventType === "check_in" ? <LogIn className="h-5 w-5" /> : <LogOut className="h-5 w-5" />}
                  Mark {markingEventType === "check_in" ? "Check In" : "Check Out"} — {isTeacherRole ? "Class Students" : (markingTarget === "students" ? "Students" : "Staff")} — {selectedDate}
                </CardTitle>
                {isTeacherRole && selectedClassId !== "all-students" && (
                  <CardDescription>
                    {availableClasses.find(c => c.id === selectedClassId)?.name} ({availableClasses.find(c => c.id === selectedClassId)?.grade})
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                {loadingUsers ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : usersToMark.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    {isTeacherRole
                      ? "No students found in your class. Students need to be assigned to your class first."
                      : markingTarget === "students" ? "No students found. Add students to this school first." : "No staff found."
                    }
                  </p>
                ) : (
                  <>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-8">#</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1"><LogIn className="h-3.5 w-3.5" />In</span>
                          </TableHead>
                          <TableHead>
                            <span className="flex items-center gap-1"><LogOut className="h-3.5 w-3.5" />Out</span>
                          </TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Saved</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {usersToMark.map((user, idx) => {
                          const existingStatus = markingEventType === "check_in" ? user.checkInStatus : user.checkOutStatus;
                          return (
                            <TableRow key={user.id}>
                              <TableCell className="text-muted-foreground text-xs">{idx + 1}</TableCell>
                              <TableCell className="font-medium">{user.full_name}</TableCell>
                              <TableCell className="capitalize text-sm text-muted-foreground">{user.role.replace("_", " ")}</TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {user.checkInStatus ? (
                                  <span className="flex items-center gap-1">
                                    <Badge variant={statusColor(user.checkInStatus) as any} className="text-[10px] px-1.5 py-0">{user.checkInStatus}</Badge>
                                    <span>{user.checkInTime ? new Date(user.checkInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                                  </span>
                                ) : "—"}
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">
                                {user.checkOutStatus ? (
                                  <span className="flex items-center gap-1">
                                    <Badge variant={statusColor(user.checkOutStatus) as any} className="text-[10px] px-1.5 py-0">{user.checkOutStatus}</Badge>
                                    <span>{user.checkOutTime ? new Date(user.checkOutTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                                  </span>
                                ) : "—"}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-1">
                                  {(["present", "late", "absent"] as const).map(status => (
                                    <Button
                                      key={status}
                                      size="sm"
                                      variant={markingStatus[user.id] === status ? (
                                        status === "present" ? "default" : status === "late" ? "secondary" : "destructive"
                                      ) : "outline"}
                                      className="text-xs h-7 px-2"
                                      onClick={() => setMarkingStatus(prev => ({
                                        ...prev,
                                        [user.id]: prev[user.id] === status ? "" : status,
                                      }))}
                                    >
                                      {status.charAt(0).toUpperCase() + status.slice(1)}
                                    </Button>
                                  ))}
                                </div>
                              </TableCell>
                              <TableCell>
                                {existingStatus && <CheckCircle className="h-4 w-4 text-primary" />}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>

                    <div className="mt-4 flex justify-end">
                      <Button onClick={handleSubmitAttendance} disabled={isSubmitting || markedCount === 0}>
                        {isSubmitting ? (
                          <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Saving...</>
                        ) : (
                          <><ClipboardCheck className="mr-2 h-4 w-4" />Save {markingEventType === "check_in" ? "Check In" : "Check Out"} ({markedCount})</>
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
