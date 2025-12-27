import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, subDays, eachDayOfInterval, startOfDay } from "date-fns";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Calendar } from "@/components/ui/calendar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2, Search, RefreshCw, Eye, ChevronLeft, ChevronRight, History, Download, CalendarIcon, FileText, Radio, BarChart3, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from "recharts";

interface AdminUser {
  id: string;
  email: string;
}

interface AuditLogEntry {
  id: string;
  admin_user_id: string | null;
  action: string;
  table_name: string;
  record_id: string | null;
  old_values: unknown;
  new_values: unknown;
  created_at: string;
  admin_email?: string;
}

const actionLabels: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  application_approved: { label: "Application Approved", variant: "default" },
  application_rejected: { label: "Application Rejected", variant: "destructive" },
  application_deleted: { label: "Application Deleted", variant: "destructive" },
  blog_approved: { label: "Blog Approved", variant: "default" },
  blog_rejected: { label: "Blog Rejected", variant: "destructive" },
  blog_deleted: { label: "Blog Deleted", variant: "destructive" },
  blog_featured: { label: "Blog Featured", variant: "secondary" },
  blog_archived: { label: "Blog Archived", variant: "outline" },
  blog_restored: { label: "Blog Restored", variant: "default" },
  admin_user_added: { label: "Admin Added", variant: "default" },
  admin_user_updated: { label: "Admin Updated", variant: "secondary" },
  admin_user_deleted: { label: "Admin Deleted", variant: "destructive" },
  admin_role_changed: { label: "Role Changed", variant: "secondary" },
  profile_updated: { label: "Profile Updated", variant: "secondary" },
  password_changed: { label: "Password Changed", variant: "outline" },
  mfa_enabled: { label: "2FA Enabled", variant: "default" },
  mfa_disabled: { label: "2FA Disabled", variant: "destructive" },
};

const ITEMS_PER_PAGE = 20;

export default function AdminAuditLog() {
  const { adminUser, isLoading: authLoading } = useAdminAuth();
  const navigate = useNavigate();

  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [tableFilter, setTableFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [adminEmailsMap, setAdminEmailsMap] = useState<Record<string, string>>({});
  const [isLive, setIsLive] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "timeline">("table");

  const isAdmin = adminUser?.role === "admin";

  useEffect(() => {
    if (!authLoading && !adminUser) {
      navigate("/admin");
    }
  }, [adminUser, authLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      fetchAdminUsers();
      fetchLogs();
    }
  }, [isAdmin]);

  useEffect(() => {
    if (isAdmin) {
      fetchLogs();
    }
  }, [currentPage, actionFilter, tableFilter, adminFilter, dateFrom, dateTo]);

  // Real-time subscription for new audit log entries
  useEffect(() => {
    if (!isAdmin || !isLive) return;

    const channel = supabase
      .channel('audit-log-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'admin_audit_log'
        },
        async (payload) => {
          console.log('New audit log entry:', payload);
          const newLog = payload.new as AuditLogEntry;
          
          // Get admin email for the new entry
          let adminEmail = "System";
          if (newLog.admin_user_id && adminEmailsMap[newLog.admin_user_id]) {
            adminEmail = adminEmailsMap[newLog.admin_user_id];
          } else if (newLog.admin_user_id) {
            const { data: admin } = await supabase
              .from("admin_users")
              .select("email")
              .eq("id", newLog.admin_user_id)
              .single();
            if (admin) {
              adminEmail = admin.email;
              setAdminEmailsMap(prev => ({ ...prev, [newLog.admin_user_id!]: admin.email }));
            }
          }

          const logWithEmail = { ...newLog, admin_email: adminEmail };
          
          // Only add to current view if on first page and matches filters
          if (currentPage === 1) {
            const matchesFilters = 
              (actionFilter === "all" || newLog.action === actionFilter) &&
              (tableFilter === "all" || newLog.table_name === tableFilter) &&
              (adminFilter === "all" || newLog.admin_user_id === adminFilter);
            
            if (matchesFilters) {
              setLogs(prev => [logWithEmail, ...prev.slice(0, ITEMS_PER_PAGE - 1)]);
              setTotalCount(prev => prev + 1);
              toast.success("New audit log entry", {
                description: actionLabels[newLog.action]?.label || newLog.action,
              });
            }
          } else {
            setTotalCount(prev => prev + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin, isLive, currentPage, actionFilter, tableFilter, adminFilter, adminEmailsMap]);

  const fetchAdminUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("admin_users")
        .select("id, email")
        .order("email");
      
      if (error) throw error;
      setAdminUsers(data || []);
      
      // Build email map
      const emailMap = (data || []).reduce((acc, admin) => {
        acc[admin.id] = admin.email;
        return acc;
      }, {} as Record<string, string>);
      setAdminEmailsMap(emailMap);
    } catch (error) {
      console.error("Error fetching admin users:", error);
    }
  };

  const fetchLogs = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("admin_audit_log")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1);

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }
      if (adminFilter !== "all") {
        query = query.eq("admin_user_id", adminFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        const nextDay = new Date(dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt("created_at", format(nextDay, "yyyy-MM-dd"));
      }

      const { data, error, count } = await query;

      if (error) throw error;

      // Fetch admin emails for each log entry
      const adminIds = [...new Set((data || []).map(log => log.admin_user_id).filter(Boolean))];
      
      let adminEmails: Record<string, string> = {};
      if (adminIds.length > 0) {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id, email")
          .in("id", adminIds);
        
        if (admins) {
          adminEmails = admins.reduce((acc, admin) => {
            acc[admin.id] = admin.email;
            return acc;
          }, {} as Record<string, string>);
        }
      }

      const logsWithEmails = (data || []).map(log => ({
        ...log,
        admin_email: log.admin_user_id ? adminEmails[log.admin_user_id] : "System",
      }));

      setLogs(logsWithEmails);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching audit logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAllLogs = async (): Promise<AuditLogEntry[]> => {
    try {
      let query = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false });

      if (actionFilter !== "all") {
        query = query.eq("action", actionFilter);
      }
      if (tableFilter !== "all") {
        query = query.eq("table_name", tableFilter);
      }
      if (adminFilter !== "all") {
        query = query.eq("admin_user_id", adminFilter);
      }
      if (dateFrom) {
        query = query.gte("created_at", format(dateFrom, "yyyy-MM-dd"));
      }
      if (dateTo) {
        const nextDay = new Date(dateTo);
        nextDay.setDate(nextDay.getDate() + 1);
        query = query.lt("created_at", format(nextDay, "yyyy-MM-dd"));
      }

      const { data, error } = await query;

      if (error) throw error;

      // Get admin emails
      const adminIds = [...new Set((data || []).map(log => log.admin_user_id).filter(Boolean))];
      let adminEmails: Record<string, string> = { ...adminEmailsMap };
      
      const missingIds = adminIds.filter(id => !adminEmails[id]);
      if (missingIds.length > 0) {
        const { data: admins } = await supabase
          .from("admin_users")
          .select("id, email")
          .in("id", missingIds);
        
        if (admins) {
          admins.forEach(admin => {
            adminEmails[admin.id] = admin.email;
          });
        }
      }

      return (data || []).map(log => ({
        ...log,
        admin_email: log.admin_user_id ? adminEmails[log.admin_user_id] : "System",
      }));
    } catch (error) {
      console.error("Error fetching all logs:", error);
      return [];
    }
  };

  const exportAllToCSV = async () => {
    setIsExporting(true);
    toast.info("Fetching all audit logs...");
    
    try {
      const allLogsData = await fetchAllLogs();
      
      const headers = ["Date & Time", "Admin", "Action", "Table", "Record ID", "Old Values", "New Values"];
      const csvData = allLogsData.map(log => [
        format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
        log.admin_email || "Unknown",
        actionLabels[log.action]?.label || log.action,
        log.table_name,
        log.record_id || "N/A",
        log.old_values ? JSON.stringify(log.old_values) : "",
        log.new_values ? JSON.stringify(log.new_values) : "",
      ]);

      const csvContent = [
        headers.join(","),
        ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      ].join("\n");

      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `audit-log-full-${format(new Date(), "yyyy-MM-dd")}.csv`;
      link.click();
      
      toast.success(`Exported ${allLogsData.length} audit log entries`);
    } catch (error) {
      toast.error("Failed to export audit logs");
    } finally {
      setIsExporting(false);
    }
  };

  const exportAllToPDF = async () => {
    setIsExporting(true);
    toast.info("Generating PDF report...");
    
    try {
      const allLogsData = await fetchAllLogs();
      const doc = new jsPDF();
      
      doc.setFontSize(18);
      doc.text("Complete Audit Log Report", 14, 22);
      doc.setFontSize(10);
      doc.text(`Generated: ${format(new Date(), "MMMM dd, yyyy HH:mm")}`, 14, 30);
      doc.text(`Total Entries: ${allLogsData.length}`, 14, 36);
      
      if (dateFrom || dateTo) {
        const dateRange = `Date Range: ${dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Start"} - ${dateTo ? format(dateTo, "MMM dd, yyyy") : "End"}`;
        doc.text(dateRange, 14, 42);
      }

      const tableData = allLogsData.map(log => [
        format(new Date(log.created_at), "MMM dd, yyyy HH:mm"),
        log.admin_email || "Unknown",
        actionLabels[log.action]?.label || log.action,
        log.table_name,
        log.record_id?.slice(0, 8) || "N/A",
      ]);

      autoTable(doc, {
        head: [["Date & Time", "Admin", "Action", "Table", "Record ID"]],
        body: tableData,
        startY: dateFrom || dateTo ? 48 : 42,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [41, 128, 185] },
      });

      doc.save(`audit-log-full-${format(new Date(), "yyyy-MM-dd")}.pdf`);
      toast.success(`Exported ${allLogsData.length} audit log entries to PDF`);
    } catch (error) {
      toast.error("Failed to export audit logs to PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const exportToCSV = () => {
    const headers = ["Date & Time", "Admin", "Action", "Table", "Record ID", "Old Values", "New Values"];
    const csvData = filteredLogs.map(log => [
      format(new Date(log.created_at), "yyyy-MM-dd HH:mm:ss"),
      log.admin_email || "Unknown",
      actionLabels[log.action]?.label || log.action,
      log.table_name,
      log.record_id || "N/A",
      log.old_values ? JSON.stringify(log.old_values) : "",
      log.new_values ? JSON.stringify(log.new_values) : "",
    ]);

    const csvContent = [
      headers.join(","),
      ...csvData.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `audit-log-${format(new Date(), "yyyy-MM-dd")}.csv`;
    link.click();
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    doc.setFontSize(18);
    doc.text("Audit Log Report", 14, 22);
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(), "MMMM dd, yyyy HH:mm")}`, 14, 30);
    
    if (dateFrom || dateTo) {
      const dateRange = `Date Range: ${dateFrom ? format(dateFrom, "MMM dd, yyyy") : "Start"} - ${dateTo ? format(dateTo, "MMM dd, yyyy") : "End"}`;
      doc.text(dateRange, 14, 36);
    }

    const tableData = filteredLogs.map(log => [
      format(new Date(log.created_at), "MMM dd, yyyy HH:mm"),
      log.admin_email || "Unknown",
      actionLabels[log.action]?.label || log.action,
      log.table_name,
      log.record_id?.slice(0, 8) || "N/A",
    ]);

    autoTable(doc, {
      head: [["Date & Time", "Admin", "Action", "Table", "Record ID"]],
      body: tableData,
      startY: dateFrom || dateTo ? 42 : 36,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [41, 128, 185] },
    });

    doc.save(`audit-log-${format(new Date(), "yyyy-MM-dd")}.pdf`);
  };

  const clearDateFilters = () => {
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  const filteredLogs = logs.filter(log => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      log.action.toLowerCase().includes(query) ||
      log.table_name.toLowerCase().includes(query) ||
      log.admin_email?.toLowerCase().includes(query) ||
      log.record_id?.toLowerCase().includes(query)
    );
  });

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const getActionBadge = (action: string) => {
    const config = actionLabels[action] || { label: action, variant: "secondary" as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const viewDetails = (log: AuditLogEntry) => {
    setSelectedLog(log);
    setDetailsOpen(true);
  };

  // Timeline data calculation
  const timelineData = useMemo(() => {
    const last14Days = eachDayOfInterval({
      start: subDays(new Date(), 13),
      end: new Date()
    });

    return last14Days.map(day => {
      const dayStart = startOfDay(day);
      const dayLogs = logs.filter(log => {
        const logDate = startOfDay(new Date(log.created_at));
        return logDate.getTime() === dayStart.getTime();
      });

      const applications = dayLogs.filter(l => l.table_name === "applications").length;
      const blogs = dayLogs.filter(l => l.table_name === "blog_posts").length;
      const admins = dayLogs.filter(l => l.table_name === "admin_users").length;

      return {
        date: format(day, "MMM dd"),
        fullDate: format(day, "MMMM dd, yyyy"),
        applications,
        blogs,
        admins,
        total: dayLogs.length
      };
    });
  }, [logs]);

  const actionBreakdownData = useMemo(() => {
    const actionCounts: Record<string, number> = {};
    logs.forEach(log => {
      const label = actionLabels[log.action]?.label || log.action;
      actionCounts[label] = (actionCounts[label] || 0) + 1;
    });

    return Object.entries(actionCounts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
  }, [logs]);

  const CHART_COLORS = [
    "hsl(var(--primary))",
    "hsl(var(--destructive))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
  ];

  if (authLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <AdminLayout>
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              You don't have permission to view the audit log.
            </p>
          </CardContent>
        </Card>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Audit Log</h2>
            <p className="text-muted-foreground">
              Track all admin actions and changes in the system.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" disabled={loading || isExporting}>
                  <Download className="h-4 w-4 mr-2" />
                  Export
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportToCSV} disabled={filteredLogs.length === 0}>
                  <FileText className="h-4 w-4 mr-2" />
                  Current Page (CSV)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportToPDF} disabled={filteredLogs.length === 0}>
                  <FileText className="h-4 w-4 mr-2" />
                  Current Page (PDF)
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAllToCSV}>
                  <Download className="h-4 w-4 mr-2" />
                  All Logs (CSV) - {totalCount} entries
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportAllToPDF}>
                  <Download className="h-4 w-4 mr-2" />
                  All Logs (PDF) - {totalCount} entries
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button onClick={fetchLogs} variant="outline" disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button
              onClick={() => setIsLive(!isLive)}
              variant={isLive ? "default" : "outline"}
              className="gap-2"
            >
              <Radio className={cn("h-4 w-4", isLive && "animate-pulse")} />
              {isLive ? "Live" : "Paused"}
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalCount}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Applications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.table_name === "applications").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Blog Posts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.table_name === "blog_posts").length}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {logs.filter(l => l.table_name === "admin_users").length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by action, table, admin, or record ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={actionFilter} onValueChange={setActionFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="application_approved">Application Approved</SelectItem>
                    <SelectItem value="application_rejected">Application Rejected</SelectItem>
                    <SelectItem value="blog_approved">Blog Approved</SelectItem>
                    <SelectItem value="blog_rejected">Blog Rejected</SelectItem>
                    <SelectItem value="blog_featured">Blog Featured</SelectItem>
                    <SelectItem value="profile_updated">Profile Updated</SelectItem>
                    <SelectItem value="password_changed">Password Changed</SelectItem>
                    <SelectItem value="mfa_enabled">2FA Enabled</SelectItem>
                    <SelectItem value="mfa_disabled">2FA Disabled</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={tableFilter} onValueChange={setTableFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by table" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Tables</SelectItem>
                    <SelectItem value="applications">Applications</SelectItem>
                    <SelectItem value="blog_posts">Blog Posts</SelectItem>
                    <SelectItem value="admin_users">Admin Users</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={adminFilter} onValueChange={setAdminFilter}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by admin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Admins</SelectItem>
                    {adminUsers.map((admin) => (
                      <SelectItem key={admin.id} value={admin.id}>
                        {admin.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateFrom && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateFrom ? format(dateFrom, "MMM dd, yyyy") : "From date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateFrom}
                      onSelect={setDateFrom}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-[180px] justify-start text-left font-normal",
                        !dateTo && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateTo ? format(dateTo, "MMM dd, yyyy") : "To date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={dateTo}
                      onSelect={setDateTo}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
                {(dateFrom || dateTo) && (
                  <Button variant="ghost" size="sm" onClick={clearDateFilters}>
                    Clear dates
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* View Toggle & Content */}
        <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "table" | "timeline")}>
          <TabsList className="mb-4">
            <TabsTrigger value="table">
              <History className="h-4 w-4 mr-2" />
              Table View
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <BarChart3 className="h-4 w-4 mr-2" />
              Timeline View
            </TabsTrigger>
          </TabsList>

          <TabsContent value="timeline" className="space-y-6">
            {/* Activity Timeline Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Activity Over Last 14 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis 
                        dataKey="date" 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <YAxis 
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 12 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                        labelStyle={{ color: "hsl(var(--foreground))" }}
                      />
                      <Legend />
                      <Bar dataKey="applications" name="Applications" fill="hsl(var(--primary))" stackId="a" />
                      <Bar dataKey="blogs" name="Blog Posts" fill="hsl(var(--chart-2))" stackId="a" />
                      <Bar dataKey="admins" name="Admin Users" fill="hsl(var(--chart-3))" stackId="a" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Action Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Top Actions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={actionBreakdownData} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis type="number" className="text-xs fill-muted-foreground" />
                      <YAxis 
                        type="category" 
                        dataKey="name" 
                        width={150}
                        className="text-xs fill-muted-foreground"
                        tick={{ fontSize: 11 }}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: "hsl(var(--card))",
                          border: "1px solid hsl(var(--border))",
                          borderRadius: "8px"
                        }}
                      />
                      <Bar dataKey="value" name="Count">
                        {actionBreakdownData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="table">
            <Card>
              <CardContent className="pt-6">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-12">
                <History className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium">No audit logs found</h3>
                <p className="text-muted-foreground">
                  Actions will appear here once admins start making changes.
                </p>
              </div>
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Admin</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Table</TableHead>
                      <TableHead>Record ID</TableHead>
                      <TableHead className="text-right">Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM dd, yyyy HH:mm")}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {log.admin_email || "Unknown"}
                        </TableCell>
                        <TableCell>{getActionBadge(log.action)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{log.table_name}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs max-w-[100px] truncate">
                          {log.record_id?.slice(0, 8) || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => viewDetails(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>

                {/* Pagination */}
                <div className="flex items-center justify-between mt-4 pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1} to{" "}
                    {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} of {totalCount} entries
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Audit Log Details</DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Date & Time</p>
                  <p className="font-medium">
                    {format(new Date(selectedLog.created_at), "MMMM dd, yyyy HH:mm:ss")}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Admin</p>
                  <p className="font-medium">{selectedLog.admin_email || "Unknown"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Action</p>
                  <div>{getActionBadge(selectedLog.action)}</div>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Table</p>
                  <Badge variant="outline">{selectedLog.table_name}</Badge>
                </div>
                <div className="col-span-2">
                  <p className="text-sm text-muted-foreground">Record ID</p>
                  <p className="font-mono text-sm">{selectedLog.record_id || "N/A"}</p>
                </div>
              </div>

              {selectedLog.old_values && typeof selectedLog.old_values === 'object' && Object.keys(selectedLog.old_values as object).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Previous Values</p>
                  <ScrollArea className="h-[120px] rounded border p-3">
                    <pre className="text-xs">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}

              {selectedLog.new_values && typeof selectedLog.new_values === 'object' && Object.keys(selectedLog.new_values as object).length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">New Values</p>
                  <ScrollArea className="h-[120px] rounded border p-3">
                    <pre className="text-xs">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </ScrollArea>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
