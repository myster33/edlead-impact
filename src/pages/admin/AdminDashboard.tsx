import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { 
  LogOut, 
  Search, 
  Users, 
  FileText, 
  Clock, 
  CheckCircle,
  Shield,
  XCircle,
  Eye,
  Loader2,
  RefreshCw,
  Download,
  BarChart3,
  BookOpen,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  CalendarIcon,
  X
} from "lucide-react";

interface Application {
  id: string;
  reference_number?: string;
  full_name: string;
  student_email: string;
  school_name: string;
  school_address: string;
  grade: string;
  province: string;
  status: string;
  created_at: string;
  // Additional fields for detail view
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
}

export default function AdminDashboard() {
  const { adminUser, signOut } = useAdminAuth();
  const { toast } = useToast();
  
  const [applications, setApplications] = useState<Application[]>([]);
  const [filteredApplications, setFilteredApplications] = useState<Application[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate] = useState<Date | undefined>(undefined);

  // Stats
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [pendingBlogPosts, setPendingBlogPosts] = useState(0);

  useEffect(() => {
    fetchApplications();
    fetchPendingBlogPosts();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, provinceFilter, startDate, endDate]);
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

  useEffect(() => {
    filterApplications();
  }, [applications, searchTerm, statusFilter, provinceFilter]);

  const fetchApplications = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setApplications(data || []);
      
      // Calculate stats
      const total = data?.length || 0;
      const pending = data?.filter(a => a.status === "pending").length || 0;
      const approved = data?.filter(a => a.status === "approved").length || 0;
      const rejected = data?.filter(a => a.status === "rejected").length || 0;
      
      setStats({ total, pending, approved, rejected });
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

    // Search filter
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

    // Status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter((app) => app.status === statusFilter);
    }

    // Province filter
    if (provinceFilter !== "all") {
      filtered = filtered.filter((app) => app.province === provinceFilter);
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter((app) => new Date(app.created_at) >= startDate);
    }
    if (endDate) {
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      filtered = filtered.filter((app) => new Date(app.created_at) <= endOfDay);
    }

    setFilteredApplications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Pagination
  const totalPages = Math.ceil(filteredApplications.length / itemsPerPage);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const updateApplicationStatus = async (id: string, newStatus: string) => {
    if (!adminUser || (adminUser.role !== "reviewer" && adminUser.role !== "admin")) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to update application status.",
        variant: "destructive",
      });
      return;
    }

    // Find the application to get applicant details
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

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          app.id === id ? { ...app, status: newStatus } : app
        )
      );

      if (selectedApplication?.id === id) {
        setSelectedApplication({ ...selectedApplication, status: newStatus });
      }

      // Send email notification to applicant
      const referenceNumber = application.reference_number || application.id.slice(0, 8).toUpperCase();
      
      if (newStatus === "approved") {
        supabase.functions.invoke("notify-applicant-approved", {
          body: {
            applicantEmail: application.student_email,
            applicantName: application.full_name,
            referenceNumber,
          },
        }).catch(err => console.error("Failed to send approval notification:", err));
      } else if (newStatus === "rejected") {
        supabase.functions.invoke("notify-applicant-rejected", {
          body: {
            applicantEmail: application.student_email,
            applicantName: application.full_name,
            referenceNumber,
          },
        }).catch(err => console.error("Failed to send rejection notification:", err));
      }

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

  const handleSignOut = async () => {
    await signOut();
  };

  // Bulk selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === filteredApplications.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredApplications.map(app => app.id)));
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

      // Update local state
      setApplications((prev) =>
        prev.map((app) =>
          selectedIds.has(app.id) ? { ...app, status: newStatus } : app
        )
      );

      // Send email notifications for each application
      const selectedApps = applications.filter(app => selectedIds.has(app.id));
      for (const app of selectedApps) {
        const referenceNumber = app.reference_number || app.id.slice(0, 8).toUpperCase();
        
        if (newStatus === "approved") {
          supabase.functions.invoke("notify-applicant-approved", {
            body: {
              applicantEmail: app.student_email,
              applicantName: app.full_name,
              referenceNumber,
            },
          }).catch(err => console.error("Failed to send approval notification:", err));
        } else if (newStatus === "rejected") {
          supabase.functions.invoke("notify-applicant-rejected", {
            body: {
              applicantEmail: app.student_email,
              applicantName: app.full_name,
              referenceNumber,
            },
          }).catch(err => console.error("Failed to send rejection notification:", err));
        }
      }

      // Clear selection
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
      default:
        return <Badge variant="secondary">Pending</Badge>;
    }
  };

  const provinces = [
    "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
    "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape"
  ];

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
      "Reference",
      "Full Name",
      "Email",
      "Phone",
      "Date of Birth",
      "Gender",
      "Grade",
      "School Name",
      "School Address",
      "Province",
      "Parent Name",
      "Parent Email",
      "Parent Phone",
      "Nominating Teacher",
      "Status",
      "Submitted Date"
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

  return (
    <div className="min-h-screen bg-muted/30">
      {/* Header */}
      <header className="bg-background border-b sticky top-0 z-10">
        <div className="container flex items-center justify-between h-16 px-4">
          <div className="flex items-center gap-4">
            <h1 className="text-xl font-bold text-primary">edLEAD Admin</h1>
            <Badge variant="outline" className="hidden sm:inline-flex">
              {adminUser?.role}
            </Badge>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/analytics">
                <BarChart3 className="h-4 w-4 mr-2" />
                Analytics
              </Link>
            </Button>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/blog">
                <BookOpen className="h-4 w-4 mr-2" />
                Blog
              </Link>
            </Button>
            {adminUser?.role === "admin" && (
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/users">
                  <Shield className="h-4 w-4 mr-2" />
                  Manage Admins
                </Link>
              </Button>
            )}
            <span className="text-sm text-muted-foreground hidden sm:inline">
              {adminUser?.email}
            </span>
            <Button variant="outline" size="sm" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Applications</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                {stats.total}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Pending Review</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <Clock className="h-6 w-6 text-yellow-500" />
                {stats.pending}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Approved</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-500" />
                {stats.approved}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Rejected</CardDescription>
              <CardTitle className="text-3xl flex items-center gap-2">
                <XCircle className="h-6 w-6 text-destructive" />
                {stats.rejected}
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

        {/* Filters */}
        <Card className="mb-6">
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
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={exportToCSV} disabled={filteredApplications.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
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
                  </SelectContent>
                </Select>
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
          <Card className="mb-4 border-primary/50 bg-primary/5">
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
                              // Deselect all on current page
                              const newSelected = new Set(selectedIds);
                              paginatedApplications.forEach(app => newSelected.delete(app.id));
                              setSelectedIds(newSelected);
                            } else {
                              // Select all on current page
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
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setSelectedApplication(app)}
                          >
                            <Eye className="h-4 w-4" />
                            <span className="sr-only">View</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
              
              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>
                      Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredApplications.length)} of {filteredApplications.length}
                    </span>
                    <Select value={itemsPerPage.toString()} onValueChange={(v) => { setItemsPerPage(Number(v)); setCurrentPage(1); }}>
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <Button
                            key={pageNum}
                            variant={currentPage === pageNum ? "default" : "outline"}
                            size="sm"
                            className="w-8 h-8 p-0"
                            onClick={() => setCurrentPage(pageNum)}
                          >
                            {pageNum}
                          </Button>
                        );
                      })}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Application Detail Dialog */}
      <Dialog open={!!selectedApplication} onOpenChange={() => setSelectedApplication(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              Application Details
              <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                {selectedApplication?.reference_number || selectedApplication?.id.slice(0, 8).toUpperCase()}
              </code>
            </DialogTitle>
            <DialogDescription>
              Submitted on {selectedApplication && new Date(selectedApplication.created_at).toLocaleDateString("en-ZA", { dateStyle: "full" })}
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-6">
              {/* Status & Actions */}
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">Status:</span>
                  {getStatusBadge(selectedApplication.status)}
                </div>
                {(adminUser?.role === "reviewer" || adminUser?.role === "admin") && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-600 hover:bg-green-50"
                      onClick={() => updateApplicationStatus(selectedApplication.id, "approved")}
                      disabled={isUpdating || selectedApplication.status === "approved"}
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-destructive border-destructive hover:bg-destructive/10"
                      onClick={() => updateApplicationStatus(selectedApplication.id, "rejected")}
                      disabled={isUpdating || selectedApplication.status === "rejected"}
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                  </div>
                )}
              </div>

              {/* Learner Info */}
              <div>
                <h4 className="font-semibold mb-3">Learner Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Full Name:</span>
                    <p className="font-medium">{selectedApplication.full_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedApplication.student_email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Grade:</span>
                    <p className="font-medium">{selectedApplication.grade}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Date of Birth:</span>
                    <p className="font-medium">{selectedApplication.date_of_birth}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedApplication.student_phone}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Gender:</span>
                    <p className="font-medium">{selectedApplication.gender || "Not specified"}</p>
                  </div>
                </div>
              </div>

              {/* School Info */}
              <div>
                <h4 className="font-semibold mb-3">School Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">School Name:</span>
                    <p className="font-medium">{selectedApplication.school_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Province:</span>
                    <p className="font-medium">{selectedApplication.province}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Nominating Teacher:</span>
                    <p className="font-medium">{selectedApplication.nominating_teacher}</p>
                  </div>
                </div>
              </div>

              {/* Parent Info */}
              <div>
                <h4 className="font-semibold mb-3">Parent/Guardian Information</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Name:</span>
                    <p className="font-medium">{selectedApplication.parent_name}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Email:</span>
                    <p className="font-medium">{selectedApplication.parent_email}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Phone:</span>
                    <p className="font-medium">{selectedApplication.parent_phone}</p>
                  </div>
                </div>
              </div>

              {/* Motivation */}
              {selectedApplication.why_edlead && (
                <div>
                  <h4 className="font-semibold mb-3">Why edLEAD?</h4>
                  <p className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {selectedApplication.why_edlead}
                  </p>
                </div>
              )}

              {/* Project Idea */}
              {selectedApplication.project_idea && (
                <div>
                  <h4 className="font-semibold mb-3">Project Idea</h4>
                  <p className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {selectedApplication.project_idea}
                  </p>
                </div>
              )}

              {/* Leadership Meaning */}
              {selectedApplication.leadership_meaning && (
                <div>
                  <h4 className="font-semibold mb-3">What Leadership Means</h4>
                  <p className="text-sm bg-muted p-4 rounded-lg whitespace-pre-wrap">
                    {selectedApplication.leadership_meaning}
                  </p>
                </div>
              )}

              <div className="text-xs text-muted-foreground pt-4 border-t">
                Application ID: {selectedApplication.id}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
