import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ClipboardCheck, Calendar } from "lucide-react";

export default function SchoolAttendance() {
  const { currentSchool } = useSchoolAuth();
  const [attendanceEvents, setAttendanceEvents] = useState<any[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentSchool?.id) return;
    const fetchAttendance = async () => {
      setIsLoading(true);
      const { data } = await supabase
        .from("attendance_events")
        .select("*, school_users!attendance_events_user_id_fkey(full_name, role)")
        .eq("school_id", currentSchool.id)
        .eq("event_date", selectedDate)
        .order("timestamp", { ascending: false });
      setAttendanceEvents(data || []);
      setIsLoading(false);
    };
    fetchAttendance();

    // Subscribe to realtime
    const channel = supabase
      .channel("school-attendance")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "attendance_events" }, () => fetchAttendance())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentSchool?.id, selectedDate]);

  const statusColor = (status: string) => {
    switch (status) {
      case "present": return "default";
      case "late": return "secondary";
      case "absent": return "destructive";
      default: return "outline";
    }
  };

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
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
              className="border rounded-md px-3 py-2 text-sm bg-background text-foreground"
            />
          </div>
        </div>

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
      </div>
    </SchoolLayout>
  );
}
