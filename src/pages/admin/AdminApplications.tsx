import { useState, useEffect } from "react";
import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useAuditLog } from "@/hooks/use-audit-log";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  Search, 
  FileText, 
  CheckCircle,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  Download,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  X,
  MapPin,
  Users,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface Application {
  id: string;
  reference_number?: string;
  full_name: string;
  student_email: string;
  school_name: string;
  school_address: string;
  grade: string;
  province: string;
  country?: string;
  status: string;
  created_at: string;
  date_of_birth?: string;
  gender?: string;
  student_phone?: string;
  parent_name?: string;
  parent_email?: string;
  parent_phone?: string;
  nominating_teacher?: string;
  teacher_position?: string;
  project_idea?: string;
  why_edlead?: string;
  leadership_meaning?: string;
  cohort_id?: string;
}

interface Cohort {
  id: string;
  name: string;
  year: number;
  cohort_number: number;
  is_active: boolean;
}

const getAdminRegionInfo = (adminUser: any) => {
  if (!adminUser || adminUser.role === "admin") {
    return { hasRestrictions: false, country: null, province: null, role: adminUser?.role || null };
  }
  return {
    hasRestrictions: !!(adminUser.country || adminUser.province),
    country: adminUser.country || null,
    province: adminUser.province || null,
    role: adminUser.role,
  };
};

export default function AdminApplications() {
  const { adminUser } = useAdminAuth();
  const { logAction } = useAuditLog();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [cohortFilter, setCohortFilter] = useState<string>("all");
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);
  const [pendingStatusChange, setPendingStatusChange] = useState<{
    id: string;
    newStatus: string;
    currentStatus: string;
    applicantName: string;
  } | null>(null);

  const regionInfo = getAdminRegionInfo(adminUser);

  const provinces = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
    "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"
  ];

  useEffect(() => {
    fetchApplications();
    fetchCohorts();
  }, [adminUser]);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, provinceFilter, cohortFilter, startDate, endDate]);

  const fetchCohorts = async () => {
    try {
      const { data, error } = await supabase
        .from("cohorts")
        .select("id, name, year, cohort_number, is_active")
        .order("year", { ascending: false })
        .order("cohort_number", { ascending: false });
      
      if (error) throw error;
      setCohorts(data || []);
    } catch (error) {
      console.error("Error fetching cohorts:", error);
    }
  };

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      let query = supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

      // Apply region restrictions for reviewers/viewers
      if (regionInfo.hasRestrictions) {
        if (regionInfo.country) {
          query = query.eq("country", regionInfo.country);
        }
        if (regionInfo.province) {
          query = query.eq("province", regionInfo.province);
        }
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (error) {
      console.error("Error fetching applications:", error);
      toast({
        title: "Error",
        description: "Failed to load applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const filterApplications = () => {
    let filtered = [...applications];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (app) =>
          app.full_name.toLowerCase().includes(term) ||
          app.student_email.toLowerCase().includes(term) ||
          app.school_name.toLowerCase().includes(term) ||
          (app.reference_number && app.reference_number.toLowerCase().includes(term))
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    if (provinceFilter !== "all") {
      filtered = filtered.filter((app) => app.province === provinceFilter);
    }

    if (cohortFilter !== "all") {
      if (cohortFilter === "unassigned") {
        filtered = filtered.filter((app) => !app.cohort_id);
      } else {
        filtered = filtered.filter((app) => app.cohort_id === cohortFilter);
      }
    }

    if (startDate) {
      filtered = filtered.filter((app) => new Date(app.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((app) => new Date(app.created_at) <= endOfDay);
    }

    setFilteredApplications(filtered);
    setCurrentPage(1);
  };

  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const handleStatusChange = (id: string, newStatus: string) => {
    const application = applications.find(app => app.id === id);
    if (!application) {
      toast({
        title: "Error",
        description: "Application not found.",
        variant: "destructive",
      });
      return;
    }

    // If changing FROM approved to another status, show confirmation dialog
    if (application.status === "approved" && newStatus !== "approved") {
      setPendingStatusChange({
        id,
        newStatus,
        currentStatus: application.status,
        applicantName: application.full_name,
      });
      return;
    }

    // Otherwise, proceed directly
    updateApplicationStatus(id, newStatus);
  };

  const confirmStatusChange = () => {
    if (pendingStatusChange) {
      updateApplicationStatus(pendingStatusChange.id, pendingStatusChange.newStatus);
      setPendingStatusChange(null);
    }
  };

  const updateApplicationStatus = async (id: string, newStatus: string) => {
    if (!adminUser || (adminUser.role !== "reviewer" && adminUser.role !== "admin")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update application status.",
        variant: "destructive",
      });
      return;
    }

    const application = applications.find(app => app.id === id);
    if (!application) {
      toast({
        title: "Error",
        description: "Application not found.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .eq("id", id);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );

      if (selectedApplication?.id === id) {
        setSelectedApplication({ ...selectedApplication, status: newStatus });
      }

      const referenceNumber = application.reference_number || application.id.slice(0, 8).toUpperCase();
      
      // Send status change notification email
      supabase.functions.invoke("notify-applicant-status-change", {
        body: {
          applicantEmail: application.student_email,
          applicantName: application.full_name,
          referenceNumber,
          newStatus,
          oldStatus: application.status,
        },
      }).catch(err => console.error("Failed to send status change notification:", err));

      // Log the action
      const actionMap: Record<string, string> = {
        approved: "application_approved",
        rejected: "application_rejected",
        pending: "application_pending",
        cancelled: "application_cancelled",
      };
      const action = actionMap[newStatus] || "application_status_changed";
      logAction({
        action: action as any,
        table_name: "applications",
        record_id: id,
        old_values: { status: application.status },
        new_values: { 
          status: newStatus, 
          full_name: application.full_name,
          reference_number: application.reference_number 
        },
      });

      toast({
        title: "Status Updated",
        description: `Application status changed to ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating status:", error);
      toast({
        title: "Error",
        description: "Failed to update status. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const bulkUpdateStatus = async (newStatus: string) => {
    if (!adminUser || (adminUser.role !== "reviewer" && adminUser.role !== "admin")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update application status.",
        variant: "destructive",
      });
      return;
    }

    if (selectedIds.size === 0) {
      toast({
        title: "No Selection",
        description: "Please select applications to update.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const idsArray = Array.from(selectedIds);
      
      const { error } = await supabase
        .from("applications")
        .update({ status: newStatus })
        .in("id", idsArray);

      if (error) throw error;

      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.has(app.id) ? { ...app, status: newStatus } : app
        )
      );

      const selectedApps = applications.filter(app => selectedIds.has(app.id));
      for (const app of selectedApps) {
        const referenceNumber = app.reference_number || app.id.slice(0, 8).toUpperCase();
        
        supabase.functions.invoke("notify-applicant-status-change", {
          body: {
            applicantEmail: app.student_email,
            applicantName: app.full_name,
            referenceNumber,
            newStatus,
            oldStatus: app.status,
          },
        }).catch(err => console.error("Failed to send status change notification:", err));
      }

      for (const app of selectedApps) {
        const action = newStatus === "approved" ? "application_approved" : "application_rejected";
        logAction({
          action: action as any,
          table_name: "applications",
          record_id: app.id,
          new_values: { 
            status: newStatus, 
            full_name: app.full_name,
            reference_number: app.reference_number 
          },
        });
      }

      setSelectedIds(new Set());

      toast({
        title: "Bulk Update Complete",
        description: `${idsArray.length} applications ${newStatus}.`,
      });
    } catch (error) {
      console.error("Error updating applications:", error);
      toast({
        title: "Error",
        description: "Failed to update applications. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved":
        return <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">Approved</Badge>;
      case "rejected":
        return <Badge variant="destructive">Rejected</Badge>;
      case "cancelled":
        return <Badge variant="outline" className="bg-muted">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const getCohortName = (cohortId: string | undefined) => {
    if (!cohortId) return "Unassigned";
    const cohort = cohorts.find(c => c.id === cohortId);
    return cohort ? cohort.name : "Unknown";
  };

  const updateApplicationCohort = async (applicationId: string, cohortId: string | null) => {
    if (!adminUser || adminUser.role !== "admin") {
      toast({
        title: "Permission Denied",
        description: "Only admins can change cohort assignments.",
        variant: "destructive",
      });
      return;
    }

    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from("applications")
        .update({ cohort_id: cohortId })
        .eq("id", applicationId);

      if (error) throw error;

      const application = applications.find(app => app.id === applicationId);
      const oldCohortName = getCohortName(application?.cohort_id);
      const newCohortName = cohortId ? getCohortName(cohortId) : "Unassigned";

      setApplications((prev) =>
        prev.map((app) =>
          app.id === applicationId ? { ...app, cohort_id: cohortId || undefined } : app
        )
      );

      if (selectedApplication?.id === applicationId) {
        setSelectedApplication({ ...selectedApplication, cohort_id: cohortId || undefined });
      }

      logAction({
        action: "cohort_assigned" as any,
        table_name: "applications",
        record_id: applicationId,
        old_values: { cohort: oldCohortName },
        new_values: { 
          cohort: newCohortName,
          full_name: application?.full_name,
          reference_number: application?.reference_number 
        },
      });

      toast({
        title: "Cohort Updated",
        description: `Application assigned to ${newCohortName}.`,
      });
    } catch (error) {
      console.error("Error updating cohort:", error);
      toast({
        title: "Error",
        description: "Failed to update cohort. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const exportToCSV = () => {
    if (filteredApplications.length === 0) {
      toast({
        title: "No Data",
        description: "No applications to export.",
        variant: "destructive",
      });
      return;
    }

    const headers = [
      "Reference", "Full Name", "Email", "Phone", "Date of Birth", "Gender",
      "Grade", "School Name", "School Address", "Province", "Parent Name",
      "Parent Email", "Parent Phone", "Nominating Teacher", "Status", "Submitted Date"
    ];

    const escapeCSV = (value: string | null | undefined) => {
      if (value == null) return "";
      const str = String(value);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredApplications.map(app => [
      escapeCSV(app.reference_number || app.id.slice(0, 8).toUpperCase()),
      escapeCSV(app.full_name),
      escapeCSV(app.student_email),
      escapeCSV(app.student_phone),
      escapeCSV(app.date_of_birth),
      escapeCSV(app.gender),
      escapeCSV(app.grade),
      escapeCSV(app.school_name),
      escapeCSV(app.school_address),
      escapeCSV(app.province),
      escapeCSV(app.parent_name),
      escapeCSV(app.parent_email),
      escapeCSV(app.parent_phone),
      escapeCSV(app.nominating_teacher),
      escapeCSV(app.status),
      escapeCSV(new Date(app.created_at).toLocaleDateString("en-ZA"))
    ].join(","));

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `edlead-applications-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredApplications.length} applications to CSV.`,
    });
  };

  const exportToPDF = () => {
    if (filteredApplications.length === 0) {
      toast({
        title: "No Data",
        description: "No applications to export.",
        variant: "destructive",
      });
      return;
    }

    const doc = new jsPDF({ orientation: "landscape" });
    
    doc.setFontSize(18);
    doc.text("edLEAD Applications Report", 14, 22);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    const dateStr = new Date().toLocaleDateString("en-ZA", { dateStyle: "full" });
    doc.text(`Generated on ${dateStr}`, 14, 30);
    doc.text(`Total: ${filteredApplications.length} applications`, 14, 36);
    
    const filters = [];
    if (statusFilter !== "all") filters.push(`Status: ${statusFilter}`);
    if (provinceFilter !== "all") filters.push(`Province: ${provinceFilter}`);
    if (startDate) filters.push(`From: ${format(startDate, "dd/MM/yyyy")}`);
    if (endDate) filters.push(`To: ${format(endDate, "dd/MM/yyyy")}`);
    if (filters.length > 0) {
      doc.text(`Filters: ${filters.join(", ")}`, 14, 42);
    }

    const tableData = filteredApplications.map(app => [
      app.reference_number || app.id.slice(0, 8).toUpperCase(),
      app.full_name,
      app.student_email,
      app.school_name,
      app.grade,
      app.province,
      app.status.charAt(0).toUpperCase() + app.status.slice(1),
      new Date(app.created_at).toLocaleDateString("en-ZA")
    ]);

    autoTable(doc, {
      startY: filters.length > 0 ? 48 : 42,
      head: [["Ref", "Name", "Email", "School", "Grade", "Province", "Status", "Date"]],
      body: tableData,
      headStyles: { fillColor: [30, 64, 175] },
      alternateRowStyles: { fillColor: [245, 247, 250] },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: 35 },
        2: { cellWidth: 45 },
        3: { cellWidth: 40 },
        4: { cellWidth: 15 },
        5: { cellWidth: 30 },
        6: { cellWidth: 20 },
        7: { cellWidth: 22 }
      }
    });

    doc.save(`edlead-applications-${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "Export Complete",
      description: `Exported ${filteredApplications.length} applications to PDF.`,
    });
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Region Assignment Banner for Restricted Users */}
        {regionInfo.hasRestrictions && (
          <Alert className="border-primary/20 bg-primary/5">
            <MapPin className="h-4 w-4" />
            <AlertDescription className="flex items-center gap-2">
              <span className="font-medium">Your assigned region:</span>
              {regionInfo.province && (
                <Badge variant="secondary">{regionInfo.province}</Badge>
              )}
              {regionInfo.country && (
                <Badge variant="outline">{regionInfo.country}</Badge>
              )}
              <span className="text-muted-foreground text-sm ml-2">
                You can only view and manage applications from this region.
              </span>
            </AlertDescription>
          </Alert>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Applications
                </CardTitle>
                <CardDescription>
                  Showing {filteredApplications.length} of {applications.length} applications
                </CardDescription>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredApplications.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  CSV
                </Button>
                <Button variant="outline" size="sm" onClick={exportToPDF} disabled={filteredApplications.length === 0}>
                  <FileText className="h-4 w-4 mr-2" />
                  PDF
                </Button>
                <Button variant="outline" size="sm" onClick={fetchApplications} disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
                  Refresh
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name, email, or school..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
                {!regionInfo.hasRestrictions && (
                  <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Province" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Provinces</SelectItem>
                      {provinces.map((p) => (
                        <SelectItem key={p} value={p}>{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                <Select value={cohortFilter} onValueChange={setCohortFilter}>
                  <SelectTrigger className="w-full sm:w-[180px]">
                    <SelectValue placeholder="Cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Cohorts</SelectItem>
                    <SelectItem value="unassigned">Unassigned</SelectItem>
                    {cohorts.map((cohort) => (
                      <SelectItem key={cohort.id} value={cohort.id}>
                        {cohort.name} {cohort.is_active && "(Active)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {/* Date Range Filter */}
              <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                <span className="text-sm text-muted-foreground">Date Range:</span>
                <div className="flex flex-wrap gap-2 items-center">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !startDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {startDate ? format(startDate, "dd/MM/yyyy") : "From"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={startDate}
                        onSelect={setStartDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  <span className="text-muted-foreground">to</span>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-[140px] justify-start text-left font-normal",
                          !endDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {endDate ? format(endDate, "dd/MM/yyyy") : "To"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={endDate}
                        onSelect={setEndDate}
                        initialFocus
                        className={cn("p-3 pointer-events-auto")}
                      />
                    </PopoverContent>
                  </Popover>
                  {(startDate || endDate) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setStartDate(undefined); setEndDate(undefined); }}
                      className="h-8 px-2"
                    >
                      <X className="h-4 w-4" />
                      Clear dates
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        {selectedIds.size > 0 && (
          <Card className="border-primary/50 bg-primary/5">
            <CardContent className="py-3">
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="h-5 w-5 text-primary" />
                  <span className="font-medium">{selectedIds.size} selected</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => bulkUpdateStatus("approved")}
                    disabled={isUpdating}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                    Approve Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => bulkUpdateStatus("rejected")}
                    disabled={isUpdating}
                  >
                    {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                    Reject Selected
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedIds(new Set())}
                    disabled={isUpdating}
                  >
                    Clear Selection
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications Table */}
        <Card>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredApplications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No applications found</p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedIds.size === paginatedApplications.length && paginatedApplications.length > 0}
                            onCheckedChange={() => {
                              if (selectedIds.size === paginatedApplications.length) {
                                const newSelected = new Set(selectedIds);
                                paginatedApplications.forEach(app => newSelected.delete(app.id));
                                setSelectedIds(newSelected);
                              } else {
                                const newSelected = new Set(selectedIds);
                                paginatedApplications.forEach(app => newSelected.add(app.id));
                                setSelectedIds(newSelected);
                              }
                            }}
                          />
                        </TableHead>
                        <TableHead>Ref</TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead className="hidden md:table-cell">School</TableHead>
                        <TableHead className="hidden sm:table-cell">Grade</TableHead>
                        <TableHead className="hidden lg:table-cell">Province</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="hidden sm:table-cell">Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedApplications.map((app) => (
                        <TableRow key={app.id} className={selectedIds.has(app.id) ? "bg-primary/5" : ""}>
                          <TableCell>
                            <Checkbox
                              checked={selectedIds.has(app.id)}
                              onCheckedChange={() => toggleSelect(app.id)}
                            />
                          </TableCell>
                          <TableCell>
                            <code className="text-xs font-mono bg-muted px-1.5 py-0.5 rounded">
                              {app.reference_number || app.id.slice(0, 8).toUpperCase()}
                            </code>
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">{app.full_name}</p>
                              <p className="text-sm text-muted-foreground">{app.student_email}</p>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">{app.school_name}</TableCell>
                          <TableCell className="hidden sm:table-cell">{app.grade}</TableCell>
                          <TableCell className="hidden lg:table-cell">{app.province}</TableCell>
                          <TableCell>{getStatusBadge(app.status)}</TableCell>
                          <TableCell className="hidden sm:table-cell">
                            {new Date(app.created_at).toLocaleDateString("en-ZA")}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedApplication(app)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {app.status !== "approved" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                  onClick={() => handleStatusChange(app.id, "approved")}
                                  disabled={isUpdating}
                                  title="Approve"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {app.status !== "rejected" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                  onClick={() => handleStatusChange(app.id, "rejected")}
                                  disabled={isUpdating}
                                  title="Reject"
                                >
                                  <XCircle className="h-4 w-4" />
                                </Button>
                              )}
                              {app.status !== "pending" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-yellow-600 hover:text-yellow-700 hover:bg-yellow-50"
                                  onClick={() => handleStatusChange(app.id, "pending")}
                                  disabled={isUpdating}
                                  title="Set Pending"
                                >
                                  <RefreshCw className="h-4 w-4" />
                                </Button>
                              )}
                              {app.status !== "cancelled" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-muted-foreground hover:text-muted-foreground hover:bg-muted"
                                  onClick={() => handleStatusChange(app.id, "cancelled")}
                                  disabled={isUpdating}
                                  title="Cancel"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Pagination */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>Show</span>
                    <Select value={String(itemsPerPage)} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
                      <SelectTrigger className="w-[70px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="10">10</SelectItem>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      Page {currentPage} of {totalPages || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages || totalPages === 0}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Application Detail Dialog */}
        <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Application Details</DialogTitle>
              <DialogDescription>
                Reference: {selectedApplication?.reference_number || selectedApplication?.id.slice(0, 8).toUpperCase()}
              </DialogDescription>
            </DialogHeader>
            {selectedApplication && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h4 className="font-semibold mb-2">Personal Information</h4>
                  <dl className="space-y-1 text-sm">
                    <div><dt className="text-muted-foreground inline">Name:</dt> <dd className="inline">{selectedApplication.full_name}</dd></div>
                    <div><dt className="text-muted-foreground inline">Email:</dt> <dd className="inline">{selectedApplication.student_email}</dd></div>
                    <div><dt className="text-muted-foreground inline">Phone:</dt> <dd className="inline">{selectedApplication.student_phone || "N/A"}</dd></div>
                    <div><dt className="text-muted-foreground inline">DOB:</dt> <dd className="inline">{selectedApplication.date_of_birth || "N/A"}</dd></div>
                    <div><dt className="text-muted-foreground inline">Gender:</dt> <dd className="inline">{selectedApplication.gender || "N/A"}</dd></div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">School Information</h4>
                  <dl className="space-y-1 text-sm">
                    <div><dt className="text-muted-foreground inline">School:</dt> <dd className="inline">{selectedApplication.school_name}</dd></div>
                    <div><dt className="text-muted-foreground inline">Address:</dt> <dd className="inline">{selectedApplication.school_address}</dd></div>
                    <div><dt className="text-muted-foreground inline">Grade:</dt> <dd className="inline">{selectedApplication.grade}</dd></div>
                    <div><dt className="text-muted-foreground inline">Province:</dt> <dd className="inline">{selectedApplication.province}</dd></div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Parent/Guardian</h4>
                  <dl className="space-y-1 text-sm">
                    <div><dt className="text-muted-foreground inline">Name:</dt> <dd className="inline">{selectedApplication.parent_name || "N/A"}</dd></div>
                    <div><dt className="text-muted-foreground inline">Email:</dt> <dd className="inline">{selectedApplication.parent_email || "N/A"}</dd></div>
                    <div><dt className="text-muted-foreground inline">Phone:</dt> <dd className="inline">{selectedApplication.parent_phone || "N/A"}</dd></div>
                  </dl>
                </div>
                <div>
                  <h4 className="font-semibold mb-2">Teacher Nomination</h4>
                  <dl className="space-y-1 text-sm">
                    <div><dt className="text-muted-foreground inline">Teacher:</dt> <dd className="inline">{selectedApplication.nominating_teacher || "N/A"}</dd></div>
                    <div><dt className="text-muted-foreground inline">Position:</dt> <dd className="inline">{selectedApplication.teacher_position || "N/A"}</dd></div>
                  </dl>
                </div>
                {selectedApplication.project_idea && (
                  <div className="col-span-full">
                    <h4 className="font-semibold mb-2">Project Idea</h4>
                    <p className="text-sm text-muted-foreground">{selectedApplication.project_idea}</p>
                  </div>
                )}
                {selectedApplication.why_edlead && (
                  <div className="col-span-full">
                    <h4 className="font-semibold mb-2">Why edLEAD</h4>
                    <p className="text-sm text-muted-foreground">{selectedApplication.why_edlead}</p>
                  </div>
                )}
                {selectedApplication.leadership_meaning && (
                  <div className="col-span-full">
                    <h4 className="font-semibold mb-2">Leadership Meaning</h4>
                    <p className="text-sm text-muted-foreground">{selectedApplication.leadership_meaning}</p>
                  </div>
                )}
                {/* Cohort Assignment */}
                <div className="col-span-full pt-4 border-t">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Cohort:</span>
                    </div>
                    {adminUser?.role === "admin" ? (
                      <Select 
                        value={selectedApplication.cohort_id || "unassigned"} 
                        onValueChange={(value) => updateApplicationCohort(selectedApplication.id, value === "unassigned" ? null : value)}
                        disabled={isUpdating}
                      >
                        <SelectTrigger className="w-[200px]">
                          <SelectValue placeholder="Select cohort" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {cohorts.map((cohort) => (
                            <SelectItem key={cohort.id} value={cohort.id}>
                              {cohort.name} {cohort.is_active && "(Active)"}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant="outline">{getCohortName(selectedApplication.cohort_id)}</Badge>
                    )}
                  </div>
                </div>

                <div className="col-span-full flex justify-between items-center pt-4 border-t">
                  <div>
                    <span className="text-sm text-muted-foreground mr-2">Status:</span>
                    {getStatusBadge(selectedApplication.status)}
                  </div>
                <div className="flex flex-wrap gap-2">
                    {selectedApplication.status !== "approved" && (
                      <Button
                        size="sm"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange(selectedApplication.id, "approved")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                        Approve
                      </Button>
                    )}
                    {selectedApplication.status !== "rejected" && (
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(selectedApplication.id, "rejected")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <XCircle className="h-4 w-4 mr-2" />}
                        Reject
                      </Button>
                    )}
                    {selectedApplication.status !== "pending" && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                        onClick={() => handleStatusChange(selectedApplication.id, "pending")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                        Set Pending
                      </Button>
                    )}
                    {selectedApplication.status !== "cancelled" && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleStatusChange(selectedApplication.id, "cancelled")}
                        disabled={isUpdating}
                      >
                        {isUpdating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <X className="h-4 w-4 mr-2" />}
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Confirmation Dialog for changing approved status */}
        <AlertDialog open={!!pendingStatusChange} onOpenChange={() => setPendingStatusChange(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirm Status Change</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to change the status of <strong>{pendingStatusChange?.applicantName}</strong>'s 
                application from <strong>approved</strong> to <strong>{pendingStatusChange?.newStatus}</strong>. 
                This action will notify the applicant via email. Are you sure you want to proceed?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmStatusChange}>
                Confirm Change
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}
