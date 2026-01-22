import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { ApplicationCharts } from "@/components/admin/ApplicationCharts";
import { CohortStatistics } from "@/components/admin/CohortStatistics";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  Users, 
  FileText, 
  Clock, 
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  BarChart3,
  BookOpen,
  CalendarIcon,
  X,
  MapPin,
  Trophy,
  Medal,
  Award,
  ArrowRight,
  Shield,
  Key,
  Globe
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useModulePermissions } from "@/hooks/use-module-permissions";

// Check if admin user has region restrictions
const getAdminRegionInfo = (adminUser: any) => {
  if (!adminUser || adminUser.role === "admin") {
    return { hasRestrictions: false, country: null, province: null };
  }
  return {
    hasRestrictions: !!(adminUser.country || adminUser.province),
    country: adminUser.country || null,
    province: adminUser.province || null,
  };
};

export default function AdminDashboard() {
  const { adminUser } = useAdminAuth();
  const { toast } = useToast();
  const { data: modulePermissions } = useModulePermissions();

  // Get modules this user has access to
  const accessibleModules = modulePermissions?.filter((module) => {
    if (adminUser?.role === "admin") return true;
    return module.allowed_roles.includes(adminUser?.role as "viewer" | "reviewer" | "admin");
  }) || [];
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [pendingBlogPosts, setPendingBlogPosts] = useState(0);
  
  // Reviewer activity stats (for admins to see all reviewer activity)
  const [reviewerActivity, setReviewerActivity] = useState<{
    admin_id: string;
    email: string;
    full_name: string | null;
    province: string | null;
    approved_count: number;
    rejected_count: number;
  }[]>([]);
  
  // Date range for reviewer activity
  const [activityStartDate, setActivityStartDate] = useState<Date | undefined>(undefined);
  const [activityEndDate, setActivityEndDate] = useState<Date | undefined>(undefined);

  // Admin region info
  const regionInfo = getAdminRegionInfo(adminUser);

  // Send report state
  const [isSendingReport, setIsSendingReport] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchPendingBlogPosts();
  }, [adminUser]);
  
  // Separate effect for reviewer activity with date filters
  useEffect(() => {
    if (adminUser?.role === "admin") {
      fetchReviewerActivity();
    }
  }, [adminUser, activityStartDate, activityEndDate]);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select("status");

      // Apply region filters for non-admin users
      if (regionInfo.hasRestrictions && regionInfo.province) {
        query = query.eq("province", regionInfo.province);
      }

      const { data, error } = await query;

      if (error) throw error;

      const total = data?.length || 0;
      const pending = data?.filter(a => a.status === "pending").length || 0;
      const approved = data?.filter(a => a.status === "approved").length || 0;
      const rejected = data?.filter(a => a.status === "rejected").length || 0;
      
      setStats({ total, pending, approved, rejected });
    } catch (error) {
      console.error("Error fetching stats:", error);
    } finally {
      setIsLoading(false);
    }
  };
  
  const fetchPendingBlogPosts = async () => {
    try {
      const { count, error } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");

      if (error) throw error;
      setPendingBlogPosts(count || 0);
    } catch (error) {
      console.error("Error fetching pending blog posts:", error);
    }
  };

  // Fetch reviewer activity from audit log
  const fetchReviewerActivity = async () => {
    try {
      // Get all admin users who are reviewers
      const { data: reviewers, error: reviewersError } = await supabase
        .from("admin_users")
        .select("id, user_id, email, full_name, province, role")
        .in("role", ["reviewer", "viewer"]);

      if (reviewersError) throw reviewersError;

      // Build query for audit log entries
      let auditQuery = supabase
        .from("admin_audit_log")
        .select("admin_user_id, action, created_at")
        .in("action", ["application_approved", "application_rejected"]);
      
      // Apply date filters
      if (activityStartDate) {
        auditQuery = auditQuery.gte("created_at", activityStartDate.toISOString());
      }
      if (activityEndDate) {
        const endOfDay = new Date(activityEndDate);
        endOfDay.setHours(23, 59, 59, 999);
        auditQuery = auditQuery.lte("created_at", endOfDay.toISOString());
      }

      const { data: auditLogs, error: auditError } = await auditQuery;

      if (auditError) throw auditError;

      // Calculate activity per reviewer
      const activityMap = new Map<string, { approved: number; rejected: number }>();
      
      auditLogs?.forEach(log => {
        if (!log.admin_user_id) return;
        const existing = activityMap.get(log.admin_user_id) || { approved: 0, rejected: 0 };
        if (log.action === "application_approved") {
          existing.approved++;
        } else if (log.action === "application_rejected") {
          existing.rejected++;
        }
        activityMap.set(log.admin_user_id, existing);
      });

      // Combine with reviewer data
      const activity = (reviewers || []).map(reviewer => ({
        admin_id: reviewer.id,
        email: reviewer.email,
        full_name: reviewer.full_name,
        province: reviewer.province,
        approved_count: activityMap.get(reviewer.id)?.approved || 0,
        rejected_count: activityMap.get(reviewer.id)?.rejected || 0,
      }));

      setReviewerActivity(activity);
    } catch (error) {
      console.error("Error fetching reviewer activity:", error);
    }
  };

  // Export reviewer activity to CSV
  const exportActivityToCSV = () => {
    if (reviewerActivity.length === 0) {
      toast({
        title: "No Data",
        description: "No reviewer activity to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = ["Reviewer Name", "Email", "Region", "Approved", "Rejected", "Total Processed"];
    
    const escapeCSV = (value: string | null | undefined) => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = reviewerActivity.map(r => [
      escapeCSV(r.full_name || r.email),
      escapeCSV(r.email),
      escapeCSV(r.province || "All regions"),
      r.approved_count,
      r.rejected_count,
      r.approved_count + r.rejected_count
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    
    const dateRange = activityStartDate || activityEndDate 
      ? `-${activityStartDate ? format(activityStartDate, "yyyy-MM-dd") : "start"}-to-${activityEndDate ? format(activityEndDate, "yyyy-MM-dd") : "now"}`
      : "";
    link.download = `reviewer-activity${dateRange}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${reviewerActivity.length} reviewer records to CSV.`,
    });
  };

  // Export reviewer activity to PDF
  const exportActivityToPDF = () => {
    if (reviewerActivity.length === 0) {
      toast({
        title: "No Data",
        description: "No reviewer activity to export.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF();
    
    // Title
    doc.setFontSize(18);
    doc.text("Reviewer Activity Report", 14, 22);
    
    // Subtitle with date and filter info
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString("en-ZA", { dateStyle: "full" });
    doc.text(`Generated on ${dateStr}`, 14, 30);
    
    // Date range
    if (activityStartDate || activityEndDate) {
      const rangeStr = `Period: ${activityStartDate ? format(activityStartDate, "dd/MM/yyyy") : "Start"} to ${activityEndDate ? format(activityEndDate, "dd/MM/yyyy") : "Present"}`;
      doc.text(rangeStr, 14, 36);
    }

    // Summary stats
    const totalApproved = reviewerActivity.reduce((sum, r) => sum + r.approved_count, 0);
    const totalRejected = reviewerActivity.reduce((sum, r) => sum + r.rejected_count, 0);
    doc.text(`Total Approved: ${totalApproved} | Total Rejected: ${totalRejected} | Total Processed: ${totalApproved + totalRejected}`, 14, activityStartDate || activityEndDate ? 42 : 36);

    // Table data
    const tableData = reviewerActivity.map(r => [
      r.full_name || r.email,
      r.email,
      r.province || "All regions",
      r.approved_count.toString(),
      r.rejected_count.toString(),
      (r.approved_count + r.rejected_count).toString()
    ]);

    autoTable(doc, {
      startY: activityStartDate || activityEndDate ? 48 : 42,
      head: [["Name", "Email", "Region", "Approved", "Rejected", "Total"]],
      body: tableData,
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 9, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 35 },
        1: { cellWidth: 50 },
        2: { cellWidth: 30 },
        3: { cellWidth: 20, halign: "center" },
        4: { cellWidth: 20, halign: "center" },
        5: { cellWidth: 20, halign: "center" }
      }
    });

    const dateRange = activityStartDate || activityEndDate 
      ? `-${activityStartDate ? format(activityStartDate, "yyyy-MM-dd") : "start"}-to-${activityEndDate ? format(activityEndDate, "yyyy-MM-dd") : "now"}`
      : "";
    doc.save(`reviewer-activity${dateRange}-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "Export Complete",
      description: `Exported ${reviewerActivity.length} reviewer records to PDF.`,
    });
  };

  // Send performance report via email
  const sendPerformanceReport = async (period: "weekly" | "monthly") => {
    setIsSendingReport(true);
    try {
      const response = await supabase.functions.invoke("send-performance-report", {
        body: { period },
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      if (!response.data.success) {
        throw new Error(response.data.error || "Failed to send report");
      }

      toast({
        title: "Report Sent",
        description: `${period === "monthly" ? "Monthly" : "Weekly"} performance report has been sent to all admins.`,
      });
    } catch (error: any) {
      console.error("Error sending report:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to send performance report.",
        variant: "destructive",
      });
    } finally {
      setIsSendingReport(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Welcome Card with Role & Access Info */}
        <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-full bg-primary/10">
                  <Shield className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-xl">
                    Welcome back, {adminUser?.full_name || adminUser?.email?.split("@")[0]}!
                  </CardTitle>
                  <CardDescription className="flex items-center gap-2 mt-1">
                    <Badge variant="default" className="capitalize">
                      {adminUser?.role}
                    </Badge>
                    {regionInfo.hasRestrictions && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          <span>
                            {regionInfo.province && regionInfo.country 
                              ? `${regionInfo.province}, ${regionInfo.country}`
                              : regionInfo.province || regionInfo.country}
                          </span>
                        </div>
                      </>
                    )}
                    {!regionInfo.hasRestrictions && adminUser?.role === "admin" && (
                      <>
                        <span className="text-muted-foreground">•</span>
                        <div className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          <span>All Regions</span>
                        </div>
                      </>
                    )}
                  </CardDescription>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Region Info for Restricted Users */}
              {regionInfo.hasRestrictions && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded-md">
                  <MapPin className="h-4 w-4 text-primary" />
                  <span>You can only view and manage applications from your assigned region.</span>
                </div>
              )}
              
              {/* Module Access Info */}
              <div className="flex items-start gap-2 text-sm text-muted-foreground bg-background/50 px-3 py-2 rounded-md flex-1">
                <Key className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <span className="font-medium text-foreground">Module Access: </span>
                  {adminUser?.role === "admin" ? (
                    <span>Full access to all modules</span>
                  ) : accessibleModules.length > 0 ? (
                    <span className="flex flex-wrap gap-1 mt-1">
                      {accessibleModules.map((module) => (
                        <Badge key={module.id} variant="outline" className="text-xs">
                          {module.module_name}
                        </Badge>
                      ))}
                    </span>
                  ) : (
                    <span>No modules assigned. Contact an administrator.</span>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                ) : (
                  <>
                    <Users className="h-6 w-6 text-primary" />
                    {stats.total}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-yellow-500" />
                ) : (
                  <>
                    <Clock className="h-6 w-6 text-yellow-500" />
                    {stats.pending}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-green-500" />
                ) : (
                  <>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                    {stats.approved}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                {isLoading ? (
                  <Loader2 className="h-6 w-6 animate-spin text-destructive" />
                ) : (
                  <>
                    <XCircle className="h-6 w-6 text-destructive" />
                    {stats.rejected}
                  </>
                )}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="border-orange-200 bg-orange-50/50 dark:border-orange-900 dark:bg-orange-950/20">
            <CardHeader className="pb-2">
              <CardDescription>Pending Blog Posts</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <BookOpen className="h-6 w-6 text-orange-500" />
                {pendingBlogPosts}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <Link to="/admin/blog" className="text-sm text-orange-600 hover:underline">
                Review posts →
              </Link>
            </CardContent>
          </Card>
        </div>

        {/* Application Status Charts */}
        <ApplicationCharts regionInfo={regionInfo} />

        {/* Cohort Statistics */}
        <CohortStatistics regionInfo={regionInfo} />

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Navigate to common tasks</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link to="/admin/applications">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">Review Applications</p>
                          <p className="text-sm text-muted-foreground">{stats.pending} pending</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/blog">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BookOpen className="h-8 w-8 text-orange-500" />
                        <div>
                          <p className="font-medium">Manage Stories</p>
                          <p className="text-sm text-muted-foreground">{pendingBlogPosts} pending</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/analytics">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <BarChart3 className="h-8 w-8 text-blue-500" />
                        <div>
                          <p className="font-medium">View Analytics</p>
                          <p className="text-sm text-muted-foreground">Insights & trends</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
              <Link to="/admin/users">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Users className="h-8 w-8 text-green-500" />
                        <div>
                          <p className="font-medium">Admin Users</p>
                          <p className="text-sm text-muted-foreground">Manage team</p>
                        </div>
                      </div>
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Reviewer Activity Summary - Only visible to admins */}
        {adminUser?.role === "admin" && (
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Reviewer Activity Summary
                  </CardTitle>
                  <CardDescription>
                    Applications processed by each reviewer in their assigned region
                    {(activityStartDate || activityEndDate) && (
                      <span className="ml-1">
                        ({activityStartDate ? format(activityStartDate, "dd/MM/yyyy") : "Start"} - {activityEndDate ? format(activityEndDate, "dd/MM/yyyy") : "Present"})
                      </span>
                    )}
                  </CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" disabled={isSendingReport}>
                        {isSendingReport ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : (
                          <BarChart3 className="h-4 w-4 mr-2" />
                        )}
                        Send Report
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-48 p-2" align="end">
                      <div className="space-y-1">
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => sendPerformanceReport("weekly")}
                          disabled={isSendingReport}
                        >
                          Weekly Report
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="w-full justify-start"
                          onClick={() => sendPerformanceReport("monthly")}
                          disabled={isSendingReport}
                        >
                          Monthly Report
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                  <Button variant="outline" size="sm" onClick={exportActivityToCSV} disabled={reviewerActivity.length === 0}>
                    <Download className="h-4 w-4 mr-2" />
                    CSV
                  </Button>
                  <Button variant="outline" size="sm" onClick={exportActivityToPDF} disabled={reviewerActivity.length === 0}>
                    <FileText className="h-4 w-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {/* Date Range Filters */}
              <div className="flex flex-wrap items-center gap-4 mb-4 pb-4 border-b">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Period:</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !activityStartDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activityStartDate ? format(activityStartDate, "dd/MM/yyyy") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activityStartDate}
                        onSelect={setActivityStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="sm" className={cn("w-[140px] justify-start text-left font-normal", !activityEndDate && "text-muted-foreground")}>
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {activityEndDate ? format(activityEndDate, "dd/MM/yyyy") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={activityEndDate}
                        onSelect={setActivityEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {(activityStartDate || activityEndDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setActivityStartDate(undefined);
                        setActivityEndDate(undefined);
                      }}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {reviewerActivity.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reviewer activity found for the selected period.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Reviewer</TableHead>
                      <TableHead>Region</TableHead>
                      <TableHead className="text-center">Approved</TableHead>
                      <TableHead className="text-center">Rejected</TableHead>
                      <TableHead className="text-center">Total Processed</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reviewerActivity.map((reviewer) => (
                      <TableRow key={reviewer.admin_id}>
                        <TableCell>
                          <div>
                            <span className="font-medium">{reviewer.full_name || reviewer.email}</span>
                            {reviewer.full_name && (
                              <p className="text-xs text-muted-foreground">{reviewer.email}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {reviewer.province ? (
                            <Badge variant="secondary">{reviewer.province}</Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">All regions</span>
                          )}
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-green-600 font-medium">{reviewer.approved_count}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-destructive font-medium">{reviewer.rejected_count}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="font-medium">{reviewer.approved_count + reviewer.rejected_count}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        )}

        {/* Reviewer Leaderboard - Only visible to admins */}
        {adminUser?.role === "admin" && reviewerActivity.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-yellow-500" />
                Top Reviewers Leaderboard
              </CardTitle>
              <CardDescription>
                Reviewers ranked by total applications processed
                {(activityStartDate || activityEndDate) && (
                  <span className="ml-1">
                    ({activityStartDate ? format(activityStartDate, "dd/MM/yyyy") : "Start"} - {activityEndDate ? format(activityEndDate, "dd/MM/yyyy") : "Present"})
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[...reviewerActivity]
                  .sort((a, b) => (b.approved_count + b.rejected_count) - (a.approved_count + a.rejected_count))
                  .slice(0, 3)
                  .map((reviewer, index) => {
                    const total = reviewer.approved_count + reviewer.rejected_count;
                    const approvalRate = total > 0 ? Math.round((reviewer.approved_count / total) * 100) : 0;
                    const initials = (reviewer.full_name || reviewer.email)
                      .split(/[\s@]/)
                      .slice(0, 2)
                      .map(s => s.charAt(0).toUpperCase())
                      .join("");
                    
                    const medalIcon = index === 0 
                      ? <Trophy className="h-6 w-6 text-yellow-500" />
                      : index === 1 
                        ? <Medal className="h-6 w-6 text-gray-400" />
                        : <Award className="h-6 w-6 text-amber-600" />;
                    
                    const bgColor = index === 0 
                      ? "bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-900"
                      : index === 1 
                        ? "bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-700"
                        : "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900";
                    
                    return (
                      <Card key={reviewer.admin_id} className={cn("relative", bgColor)}>
                        <div className="absolute top-3 right-3">
                          {medalIcon}
                        </div>
                        <CardContent className="pt-6">
                          <div className="flex items-center gap-3 mb-4">
                            <Avatar className="h-12 w-12">
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {initials}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="font-semibold truncate">{reviewer.full_name || reviewer.email.split("@")[0]}</p>
                              {reviewer.province && (
                                <p className="text-xs text-muted-foreground">{reviewer.province}</p>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            <div>
                              <p className="text-2xl font-bold text-primary">{total}</p>
                              <p className="text-xs text-muted-foreground">Total</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-green-600">{reviewer.approved_count}</p>
                              <p className="text-xs text-muted-foreground">Approved</p>
                            </div>
                            <div>
                              <p className="text-2xl font-bold text-destructive">{reviewer.rejected_count}</p>
                              <p className="text-xs text-muted-foreground">Rejected</p>
                            </div>
                          </div>
                          <div className="mt-4 pt-4 border-t">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Approval Rate</span>
                              <span className="font-medium">{approvalRate}%</span>
                            </div>
                            <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-green-500 rounded-full transition-all"
                                style={{ width: `${approvalRate}%` }}
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
              </div>
              
              {reviewerActivity.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No reviewer activity to display yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  );
}
