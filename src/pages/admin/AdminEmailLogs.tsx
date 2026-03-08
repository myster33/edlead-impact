import { useState, useEffect } from "react";
import { format } from "date-fns";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Search, Mail, RefreshCw, Loader2 } from "lucide-react";
import { TableSkeleton } from "@/components/admin/TableSkeleton";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";

interface EmailLog {
  id: string;
  recipient_email: string;
  template_key: string | null;
  subject: string;
  status: string;
  sent_at: string;
  resend_id: string | null;
  error_message: string | null;
  related_record_id: string | null;
  related_table: string | null;
}

const AdminEmailLogs = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(0);
  const pageSize = 50;

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("email_logs")
      .select("*")
      .order("sent_at", { ascending: false })
      .range(page * pageSize, (page + 1) * pageSize - 1);

    if (statusFilter !== "all") {
      query = query.eq("status", statusFilter);
    }
    if (search) {
      query = query.or(`recipient_email.ilike.%${search}%,subject.ilike.%${search}%,template_key.ilike.%${search}%`);
    }

    const { data, error } = await query;
    if (error) console.error("Error fetching email logs:", error);
    setLogs((data as any) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, statusFilter, search]);

  const statusColor = (status: string) => {
    switch (status) {
      case "sent": return "default";
      case "delivered": return "default";
      case "failed": return "destructive";
      case "bounced": return "destructive";
      default: return "secondary";
    }
  };

  return (
    <AdminLayout>
      <div className="p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Delivery Logs</h1>
            <p className="text-muted-foreground">Track all outbound email delivery status</p>
          </div>
          <Button variant="outline" onClick={fetchLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by email, subject, or template..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0); }}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(0); }}>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <TableSkeleton rows={10} />
            ) : logs.length === 0 ? (
              <AdminEmptyState
                icon={Mail}
                title="No email logs found"
                description="Email delivery logs will appear here once emails are sent."
              />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Recipient</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Template</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sent At</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="font-mono text-sm">{log.recipient_email}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{log.subject}</TableCell>
                      <TableCell>
                        {log.template_key ? (
                          <Badge variant="outline" className="text-xs">{log.template_key}</Badge>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusColor(log.status)}>{log.status}</Badge>
                        {log.error_message && (
                          <p className="text-xs text-destructive mt-1 max-w-[200px] truncate">{log.error_message}</p>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                        {format(new Date(log.sent_at), "dd MMM yyyy HH:mm")}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button variant="outline" disabled={page === 0} onClick={() => setPage(page - 1)}>
            Previous
          </Button>
          <span className="text-sm text-muted-foreground self-center">Page {page + 1}</span>
          <Button variant="outline" disabled={logs.length < pageSize} onClick={() => setPage(page + 1)}>
            Next
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminEmailLogs;
