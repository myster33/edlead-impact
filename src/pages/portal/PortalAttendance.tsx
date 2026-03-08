import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck } from "lucide-react";

export default function PortalAttendance() {
  const { portalUser } = usePortalAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!portalUser?.id) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("attendance_events")
        .select("*")
        .eq("user_id", portalUser.id)
        .order("timestamp", { ascending: false })
        .limit(50);
      setEvents(data || []);
      setIsLoading(false);
    };
    fetch();
  }, [portalUser?.id]);

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Attendance</h1>
          <p className="text-muted-foreground">Your attendance history</p>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><ClipboardCheck className="h-5 w-5" />Recent Records</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : events.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">No attendance records yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map(e => (
                    <TableRow key={e.id}>
                      <TableCell>{e.event_date}</TableCell>
                      <TableCell className="capitalize">{e.event_type?.replace("_", " ")}</TableCell>
                      <TableCell><Badge variant={e.status === "present" ? "default" : e.status === "late" ? "secondary" : "destructive"}>{e.status}</Badge></TableCell>
                      <TableCell>{new Date(e.timestamp).toLocaleTimeString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </PortalLayout>
  );
}
