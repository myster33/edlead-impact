import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileDown, FileText, Download, Printer } from "lucide-react";
import { format } from "date-fns";
import { toast } from "@/hooks/use-toast";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { loadLogoBase64, addPDFLetterhead, addPDFFooter } from "@/lib/pdf-letterhead";

// ── helpers ──────────────────────────────────────────────

const downloadCSV = (rows: string[][], filename: string) => {
  const csv = rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

const statusColor = (s: string) => {
  switch (s) {
    case "approved": return "default";
    case "rejected": return "destructive";
    case "pending": return "secondary";
    default: return "outline";
  }
};

// ── types ────────────────────────────────────────────────

interface Application {
  id: string;
  reference_number: string | null;
  full_name: string;
  student_email: string;
  school_name: string;
  grade: string;
  province: string;
  country: string;
  status: string;
  created_at: string;
  cohort_id: string | null;
}

interface Cohort {
  id: string;
  name: string;
  year: number;
  cohort_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface BlogPost {
  id: string;
  title: string;
  author_name: string;
  category: string;
  status: string;
  submitted_at: string;
  approved_at: string | null;
}

// ── provinces ────────────────────────────────────────────
const provinces = [
  "Eastern Cape", "Free State", "Gauteng", "KwaZulu-Natal",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape", "Western Cape",
];

const AdminReports = () => {
  // shared
  const [applications, setApplications] = useState<Application[]>([]);
  const [cohorts, setCohorts] = useState<Cohort[]>([]);
  const [blogPosts, setBlogPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);

  // filters – applications
  const [appStatus, setAppStatus] = useState("all");
  const [appProvince, setAppProvince] = useState("all");
  const [appCohort, setAppCohort] = useState("all");
  const [appDateFrom, setAppDateFrom] = useState("");
  const [appDateTo, setAppDateTo] = useState("");

  // filters – blog
  const [blogStatus, setBlogStatus] = useState("all");
  const [blogDateFrom, setBlogDateFrom] = useState("");
  const [blogDateTo, setBlogDateTo] = useState("");

  useEffect(() => {
    const load = async () => {
      const [appsRes, cohortsRes, blogRes] = await Promise.all([
        supabase.from("applications").select("id, reference_number, full_name, student_email, school_name, grade, province, country, status, created_at, cohort_id").order("created_at", { ascending: false }),
        supabase.from("cohorts").select("*").order("year", { ascending: false }),
        supabase.from("blog_posts").select("id, title, author_name, category, status, submitted_at, approved_at").order("submitted_at", { ascending: false }),
      ]);
      setApplications(appsRes.data || []);
      setCohorts(cohortsRes.data || []);
      setBlogPosts(blogRes.data || []);
      setLoading(false);
    };
    load();
  }, []);

  // ── filtered data ──────────────────────────────────────

  const filteredApps = applications.filter(a => {
    if (appStatus !== "all" && a.status !== appStatus) return false;
    if (appProvince !== "all" && a.province !== appProvince) return false;
    if (appCohort !== "all" && a.cohort_id !== appCohort) return false;
    if (appDateFrom && a.created_at < appDateFrom) return false;
    if (appDateTo && a.created_at > appDateTo + "T23:59:59") return false;
    return true;
  });

  const filteredBlog = blogPosts.filter(b => {
    if (blogStatus !== "all" && b.status !== blogStatus) return false;
    if (blogDateFrom && b.submitted_at < blogDateFrom) return false;
    if (blogDateTo && b.submitted_at > blogDateTo + "T23:59:59") return false;
    return true;
  });

  // ── export: applications ───────────────────────────────

  const appHeaders = ["Ref #", "Name", "Email", "School", "Grade", "Province", "Country", "Status", "Date"];

  const appRow = (a: Application) => [
    a.reference_number || "N/A",
    a.full_name,
    a.student_email,
    a.school_name,
    a.grade,
    a.province,
    a.country,
    a.status,
    format(new Date(a.created_at), "yyyy-MM-dd"),
  ];

  const exportAppPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let logoBase64 = "";
    try { logoBase64 = await loadLogoBase64(); } catch {}

    const filters: string[] = [];
    if (appStatus !== "all") filters.push(`Status: ${appStatus}`);
    if (appProvince !== "all") filters.push(`Province: ${appProvince}`);
    if (appCohort !== "all") {
      const c = cohorts.find(c => c.id === appCohort);
      filters.push(`Cohort: ${c?.name || appCohort}`);
    }
    if (appDateFrom) filters.push(`From: ${appDateFrom}`);
    if (appDateTo) filters.push(`To: ${appDateTo}`);

    const subtitle = `Generated: ${format(new Date(), "PPpp")} • Total: ${filteredApps.length} applications${filters.length ? ` • ${filters.join(" | ")}` : ""}`;
    const startY = addPDFLetterhead(doc, logoBase64, "Applications Report", subtitle);

    autoTable(doc, {
      head: [appHeaders],
      body: filteredApps.map(appRow),
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      didDrawPage: () => addPDFFooter(doc),
    });

    doc.save(`edlead-applications-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF Downloaded", description: `${filteredApps.length} applications exported.` });
  };

  const exportAppCSV = () => {
    downloadCSV([appHeaders, ...filteredApps.map(appRow)], `edlead-applications-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast({ title: "CSV Downloaded", description: `${filteredApps.length} applications exported.` });
  };

  // ── export: cohorts ────────────────────────────────────

  const cohortHeaders = ["Name", "Year", "Cohort #", "Start", "End", "Active", "Applications", "Pending", "Approved", "Rejected"];

  const cohortRow = (c: Cohort) => {
    const apps = applications.filter(a => a.cohort_id === c.id);
    return [
      c.name,
      String(c.year),
      String(c.cohort_number),
      format(new Date(c.start_date), "yyyy-MM-dd"),
      format(new Date(c.end_date), "yyyy-MM-dd"),
      c.is_active ? "Yes" : "No",
      String(apps.length),
      String(apps.filter(a => a.status === "pending").length),
      String(apps.filter(a => a.status === "approved").length),
      String(apps.filter(a => a.status === "rejected").length),
    ];
  };

  const exportCohortPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let logoBase64 = "";
    try { logoBase64 = await loadLogoBase64(); } catch {}

    const startY = addPDFLetterhead(doc, logoBase64, "Cohort Comparison Report", `Generated: ${format(new Date(), "PPpp")}`);

    autoTable(doc, {
      head: [cohortHeaders],
      body: cohorts.map(cohortRow),
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      didDrawPage: () => addPDFFooter(doc),
    });

    doc.save(`edlead-cohort-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF Downloaded", description: `${cohorts.length} cohorts exported.` });
  };

  const exportCohortCSV = () => {
    downloadCSV([cohortHeaders, ...cohorts.map(cohortRow)], `edlead-cohort-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast({ title: "CSV Downloaded", description: `${cohorts.length} cohorts exported.` });
  };

  // ── export: blog ───────────────────────────────────────

  const blogHeaders = ["Title", "Author", "Category", "Status", "Submitted", "Approved"];

  const blogRow = (b: BlogPost) => [
    b.title,
    b.author_name,
    b.category,
    b.status,
    format(new Date(b.submitted_at), "yyyy-MM-dd"),
    b.approved_at ? format(new Date(b.approved_at), "yyyy-MM-dd") : "N/A",
  ];

  const exportBlogPDF = async () => {
    const doc = new jsPDF({ orientation: "landscape" });
    let logoBase64 = "";
    try { logoBase64 = await loadLogoBase64(); } catch {}

    const startY = addPDFLetterhead(doc, logoBase64, "Blog Activity Report", `Generated: ${format(new Date(), "PPpp")} • Total: ${filteredBlog.length} posts`);

    autoTable(doc, {
      head: [blogHeaders],
      body: filteredBlog.map(blogRow),
      startY,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [249, 115, 22] },
      alternateRowStyles: { fillColor: [255, 247, 237] },
      didDrawPage: () => addPDFFooter(doc),
    });

    doc.save(`edlead-blog-report-${format(new Date(), "yyyy-MM-dd")}.pdf`);
    toast({ title: "PDF Downloaded", description: `${filteredBlog.length} posts exported.` });
  };

  const exportBlogCSV = () => {
    downloadCSV([blogHeaders, ...filteredBlog.map(blogRow)], `edlead-blog-report-${format(new Date(), "yyyy-MM-dd")}.csv`);
    toast({ title: "CSV Downloaded", description: `${filteredBlog.length} posts exported.` });
  };

  // ── render ─────────────────────────────────────────────

  if (loading) {
    return (
      <AdminLayout>
        <div className="space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-64 w-full" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <style>{`
        @media print {
          /* Hide sidebar, nav, and non-essential UI */
          aside, nav, header, [data-sidebar], .no-print { display: none !important; }
          /* Make main content full width */
          main, [role="main"], .flex-1 { 
            margin: 0 !important; padding: 10mm !important; 
            width: 100% !important; max-width: 100% !important;
          }
          /* Remove max-height scroll constraints on tables */
          .max-h-96 { max-height: none !important; overflow: visible !important; }
          /* Show all table rows, not just first 20 */
          body { font-size: 11px; }
        }
      `}</style>
      <div className="space-y-6 print-area">
        <div>
          <h2 className="text-2xl font-bold">Reports & Data Export</h2>
          <p className="text-muted-foreground">Generate and download reports for applications, cohorts, and blog activity.</p>
        </div>

        <Tabs defaultValue="applications">
          <TabsList>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            <TabsTrigger value="cohorts">Cohorts</TabsTrigger>
            <TabsTrigger value="blog">Blog Activity</TabsTrigger>
          </TabsList>

          {/* ── Applications Tab ─────────────────────────── */}
          <TabsContent value="applications" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Application Summary Report</CardTitle>
                <CardDescription>Filter and export application data.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Filters */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={appStatus} onValueChange={setAppStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Province</Label>
                    <Select value={appProvince} onValueChange={setAppProvince}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {provinces.map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">Cohort</Label>
                    <Select value={appCohort} onValueChange={setAppCohort}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        {cohorts.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={appDateFrom} onChange={e => setAppDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={appDateTo} onChange={e => setAppDateTo(e.target.value)} />
                  </div>
                </div>

                {/* Export buttons */}
                <div className="flex gap-2">
                  <Button onClick={exportAppPDF} size="sm"><FileDown className="h-4 w-4 mr-2" />Download PDF</Button>
                  <Button onClick={exportAppCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Download CSV</Button>
                  <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
                  <span className="text-sm text-muted-foreground self-center ml-2">{filteredApps.length} applications</span>
                </div>

                {/* Preview table */}
                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {appHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredApps.slice(0, 20).map(a => (
                        <TableRow key={a.id}>
                          <TableCell className="text-xs">{a.reference_number || "N/A"}</TableCell>
                          <TableCell className="text-xs font-medium">{a.full_name}</TableCell>
                          <TableCell className="text-xs">{a.student_email}</TableCell>
                          <TableCell className="text-xs">{a.school_name}</TableCell>
                          <TableCell className="text-xs">{a.grade}</TableCell>
                          <TableCell className="text-xs">{a.province}</TableCell>
                          <TableCell className="text-xs">{a.country}</TableCell>
                          <TableCell><Badge variant={statusColor(a.status) as any} className="text-xs">{a.status}</Badge></TableCell>
                          <TableCell className="text-xs">{format(new Date(a.created_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                      {filteredApps.length === 0 && (
                        <TableRow><TableCell colSpan={9} className="text-center text-muted-foreground py-8">No applications match filters.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {filteredApps.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Showing 20 of {filteredApps.length} — download for full report.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Cohorts Tab ──────────────────────────────── */}
          <TabsContent value="cohorts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Cohort Comparison Report</CardTitle>
                <CardDescription>Compare application statistics across cohorts.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button onClick={exportCohortPDF} size="sm"><FileDown className="h-4 w-4 mr-2" />Download PDF</Button>
                  <Button onClick={exportCohortCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Download CSV</Button>
                  <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
                  <span className="text-sm text-muted-foreground self-center ml-2">{cohorts.length} cohorts</span>
                </div>

                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {cohortHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {cohorts.map(c => {
                        const row = cohortRow(c);
                        return (
                          <TableRow key={c.id}>
                            {row.map((cell, i) => (
                              <TableCell key={i} className="text-xs">
                                {i === 5 ? (
                                  <Badge variant={cell === "Yes" ? "default" : "secondary"} className="text-xs">{cell}</Badge>
                                ) : cell}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                      {cohorts.length === 0 && (
                        <TableRow><TableCell colSpan={10} className="text-center text-muted-foreground py-8">No cohorts found.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── Blog Tab ─────────────────────────────────── */}
          <TabsContent value="blog" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Blog Activity Report</CardTitle>
                <CardDescription>Track story submissions and approvals over time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <Label className="text-xs">Status</Label>
                    <Select value={blogStatus} onValueChange={setBlogStatus}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="approved">Approved</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">From</Label>
                    <Input type="date" value={blogDateFrom} onChange={e => setBlogDateFrom(e.target.value)} />
                  </div>
                  <div>
                    <Label className="text-xs">To</Label>
                    <Input type="date" value={blogDateTo} onChange={e => setBlogDateTo(e.target.value)} />
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button onClick={exportBlogPDF} size="sm"><FileDown className="h-4 w-4 mr-2" />Download PDF</Button>
                  <Button onClick={exportBlogCSV} variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />Download CSV</Button>
                  <Button onClick={() => window.print()} variant="outline" size="sm"><Printer className="h-4 w-4 mr-2" />Print</Button>
                  <span className="text-sm text-muted-foreground self-center ml-2">{filteredBlog.length} posts</span>
                </div>

                <div className="border rounded-md overflow-auto max-h-96">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {blogHeaders.map(h => <TableHead key={h}>{h}</TableHead>)}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredBlog.slice(0, 20).map(b => (
                        <TableRow key={b.id}>
                          <TableCell className="text-xs font-medium">{b.title}</TableCell>
                          <TableCell className="text-xs">{b.author_name}</TableCell>
                          <TableCell className="text-xs">{b.category}</TableCell>
                          <TableCell><Badge variant={statusColor(b.status) as any} className="text-xs">{b.status}</Badge></TableCell>
                          <TableCell className="text-xs">{format(new Date(b.submitted_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="text-xs">{b.approved_at ? format(new Date(b.approved_at), "MMM d, yyyy") : "—"}</TableCell>
                        </TableRow>
                      ))}
                      {filteredBlog.length === 0 && (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No posts match filters.</TableCell></TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {filteredBlog.length > 20 && (
                    <p className="text-xs text-muted-foreground text-center py-2">Showing 20 of {filteredBlog.length} — download for full report.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminReports;
