import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminEventBookingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filterEventId, setFilterEventId] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("all");

  const { data: events } = useQuery({
    queryKey: ["admin-events-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("id, title")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-event-bookings", filterEventId, filterDate, filterType],
    queryFn: async () => {
      let query = supabase
        .from("event_bookings")
        .select("*, events(title)")
        .order("created_at", { ascending: false });

      if (filterEventId && filterEventId !== "all") {
        query = query.eq("event_id", filterEventId);
      }
      if (filterDate) {
        query = query.gte("created_at", `${filterDate}T00:00:00`).lte("created_at", `${filterDate}T23:59:59`);
      }
      if (filterType && filterType !== "all") {
        query = query.eq("booker_type", filterType as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("event_bookings").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-event-bookings"] });
      toast({ title: "Booking status updated" });
    },
  });

  const getContactName = (b: any) => {
    if (b.booker_type === "school") return b.contact_teacher_name || b.school_name;
    if (b.booker_type === "student") return b.student_name;
    if (b.booker_type === "guest") return b.parent_name;
    return b.parent_name;
  };

  const getContactEmail = (b: any) => {
    if (b.booker_type === "school") return b.school_email;
    if (b.booker_type === "student") return b.student_email;
    if (b.booker_type === "guest") return b.parent_email;
    return b.parent_email;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <h3 className="text-lg font-semibold mr-auto">Event Bookings</h3>
        <div className="flex items-end gap-3">
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Event</Label>
            <Select value={filterEventId} onValueChange={setFilterEventId}>
              <SelectTrigger className="w-[200px] h-9">
                <SelectValue placeholder="All Events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Events</SelectItem>
                {events?.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.title}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Type</Label>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="school">School</SelectItem>
                <SelectItem value="student">Student</SelectItem>
                <SelectItem value="parent">Parent</SelectItem>
                <SelectItem value="guest">Guest</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Filter by Date</Label>
            <Input
              type="date"
              className="w-[160px] h-9"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
            />
          </div>
          {(filterEventId !== "all" || filterDate || filterType !== "all") && (
            <Button variant="ghost" size="sm" onClick={() => { setFilterEventId("all"); setFilterDate(""); setFilterType("all"); }}>
              Clear
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Ticket No.</TableHead>
                <TableHead>Event</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings?.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-mono text-xs">{b.reference_number || "—"}</TableCell>
                  <TableCell>{(b as any).events?.title || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize">{b.booker_type}</Badge>
                  </TableCell>
                  <TableCell>{getContactName(b)}</TableCell>
                  <TableCell className="text-sm">{getContactEmail(b)}</TableCell>
                  <TableCell className="text-sm">{format(new Date(b.created_at), "dd MMM yyyy")}</TableCell>
                  <TableCell>
                    <Select value={b.status} onValueChange={(v) => updateStatus.mutate({ id: b.id, status: v })}>
                      <SelectTrigger className="w-28 h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="confirmed">Confirmed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                </TableRow>
              ))}
              {bookings?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    No bookings found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
