import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminEventsTab } from "@/components/admin/events/AdminEventsTab";
import { AdminEventBookingsTab } from "@/components/admin/events/AdminEventBookingsTab";
import { AdminEventAttendanceTab } from "@/components/admin/events/AdminEventAttendanceTab";
import { Helmet } from "react-helmet-async";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const AdminEvents = () => {
  const { data: eventsCount } = useQuery({
    queryKey: ["admin-events-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("events")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: bookingsCount } = useQuery({
    queryKey: ["admin-bookings-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("event_bookings")
        .select("*", { count: "exact", head: true });
      if (error) throw error;
      return count || 0;
    },
  });

  const { data: attendanceStats } = useQuery({
    queryKey: ["admin-attendance-stats"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_attendance")
        .select("id, checked_in_at, checked_out_at");
      if (error) throw error;
      const total = data?.length || 0;
      const checkedIn = data?.filter((a) => a.checked_in_at && !a.checked_out_at).length || 0;
      const checkedOut = data?.filter((a) => a.checked_out_at).length || 0;
      return { total, checkedIn, checkedOut };
    },
  });

  return (
    <AdminLayout>
      <Helmet>
        <title>Events Management | edLEAD Admin</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Events Management</h1>
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">
              Events{eventsCount != null ? ` (${eventsCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="bookings">
              Bookings{bookingsCount != null ? ` (${bookingsCount})` : ""}
            </TabsTrigger>
            <TabsTrigger value="attendance">
              Attendance
              {attendanceStats
                ? ` (${attendanceStats.total} | In: ${attendanceStats.checkedIn} | Out: ${attendanceStats.checkedOut})`
                : ""}
            </TabsTrigger>
          </TabsList>
          <TabsContent value="events">
            <AdminEventsTab />
          </TabsContent>
          <TabsContent value="bookings">
            <AdminEventBookingsTab />
          </TabsContent>
          <TabsContent value="attendance">
            <AdminEventAttendanceTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminEvents;
