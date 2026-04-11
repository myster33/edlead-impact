import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";

export function AdminEventBookingsTab() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["admin-event-bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_bookings")
        .select("*, events(title)")
        .order("created_at", { ascending: false });
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
    return b.parent_name;
  };

  const getContactEmail = (b: any) => {
    if (b.booker_type === "school") return b.school_email;
    if (b.booker_type === "student") return b.student_email;
    return b.parent_email;
  };

  if (isLoading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin" /></div>;
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold">Event Bookings</h3>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ref</TableHead>
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
                  No bookings yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
