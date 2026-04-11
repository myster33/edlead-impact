import { AdminLayout } from "@/components/admin/AdminLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AdminEventsTab } from "@/components/admin/events/AdminEventsTab";
import { AdminEventBookingsTab } from "@/components/admin/events/AdminEventBookingsTab";
import { AdminEventAttendanceTab } from "@/components/admin/events/AdminEventAttendanceTab";
import { Helmet } from "react-helmet-async";

const AdminEvents = () => {
  return (
    <AdminLayout>
      <Helmet>
        <title>Events Management | edLEAD Admin</title>
      </Helmet>
      <div className="p-6 space-y-6">
        <h1 className="text-2xl font-bold">Events Management</h1>
        <Tabs defaultValue="events">
          <TabsList>
            <TabsTrigger value="events">Events</TabsTrigger>
            <TabsTrigger value="bookings">Bookings</TabsTrigger>
            <TabsTrigger value="attendance">Attendance</TabsTrigger>
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
