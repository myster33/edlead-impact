import { useState, useEffect } from "react";
import { SchoolLayout } from "@/components/school/SchoolLayout";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertTriangle, Clock, CheckCircle, XCircle, ArrowUpCircle, Eye, UserCheck,
  TrendingUp, Shield, Filter,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface MisconductReport {
  id: string;
  school_id: string | null;
  reporter_role: string;
  reporter_name: string | null;
  is_anonymous: boolean;
  victim_names: string | null;
  report_type: string;
  description: string;
  attachment_urls: string[];
  location: string | null;
  priority: string;
  status: string;
  assigned_to: string | null;
  resolved_at: string | null;
  resolution_notes: string | null;
  is_emergency: boolean;
  is_trending: boolean;
  created_at: string;
  updated_at: string;
}

interface AuditEntry {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  under_review: { label: "Under Review", icon: Eye, variant: "default" },
  resolved: { label: "Resolved", icon: CheckCircle, variant: "outline" },
  escalated: { label: "Escalated", icon: ArrowUpCircle, variant: "destructive" },
  dismissed: { label: "Dismissed", icon: XCircle, variant: "outline" },
};

const priorityColors: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-primary/10 text-primary",
  high: "bg-orange-500/10 text-orange-600",
  critical: "bg-destructive/10 text-destructive",
};

const reportTypeLabels: Record<string, string> = {
  bullying: "Bullying",
  harassment: "Harassment",
  violence: "Violence",
  theft: "Theft",
  substance: "Substance Abuse",
  vandalism: "Vandalism",
  emergency: "Emergency",
  other: "Other",
};

export default function SchoolReports() {
  const { currentSchool, schoolUser } = useSchoolAuth();
  const [reports, setReports] = useState<MisconductReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedReport, setSelectedReport] = useState<MisconductReport | null>(null);
  const [auditLog, setAuditLog] = useState<AuditEntry[]>([]);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [staffMembers, setStaffMembers] = useState<{ id: string; full_name: string }[]>([]);

  useEffect(() => {
    if (!currentSchool?.id) return;
    fetchReports();
    fetchStaff();

    const channel = supabase
      .channel("misconduct-reports-school")
      .on("postgres_changes", { event: "*", schema: "public", table: "misconduct_reports", filter: `school_id=eq.${currentSchool.id}` }, () => fetchReports())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [currentSchool?.id]);

  const fetchReports = async () => {
    if (!currentSchool?.id) return;
    const { data, error } = await supabase
      .from("misconduct_reports")
      .select("*")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false });
    if (!error && data) setReports(data as unknown as MisconductReport[]);
    setLoading(false);
  };

  const fetchStaff = async () => {
    if (!currentSchool?.id) return;
    const { data } = await supabase
      .from("school_users")
      .select("id, full_name")
      .eq("school_id", currentSchool.id)
      .in("role", ["school_admin", "hr"])
      .eq("is_active", true);
    if (data) setStaffMembers(data);
  };

  const fetchAuditLog = async (reportId: string) => {
    const { data } = await supabase
      .from("misconduct_report_audit")
      .select("*")
      .eq("report_id", reportId)
      .order("created_at", { ascending: true });
    if (data) setAuditLog(data as unknown as AuditEntry[]);
  };

  const openDetail = (report: MisconductReport) => {
    setSelectedReport(report);
    setResolutionNotes(report.resolution_notes || "");
    fetchAuditLog(report.id);
  };

  const updateReport = async (id: string, updates: Record<string, unknown>, action: string) => {
    const { error } = await supabase
      .from("misconduct_reports")
      .update(updates as any)
      .eq("id", id);
    if (error) { toast.error("Failed to update report"); return; }

    await supabase.from("misconduct_report_audit").insert({
      report_id: id,
      user_id: schoolUser?.user_id || null,
      action,
      details: updates as any,
    } as any);

    toast.success("Report updated");
    fetchReports();
    if (selectedReport?.id === id) {
      setSelectedReport({ ...selectedReport, ...updates } as MisconductReport);
      fetchAuditLog(id);
    }
  };

  const filtered = reports.filter(r => {
    if (statusFilter !== "all" && r.status !== statusFilter) return false;
    if (priorityFilter !== "all" && r.priority !== priorityFilter) return false;
    if (typeFilter !== "all" && r.report_type !== typeFilter) return false;
    return true;
  });

  const trendingReports = reports.filter(r => r.is_trending);
  const emergencyCount = reports.filter(r => r.is_emergency && r.status === "pending").length;

  return (
    <SchoolLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Misconduct Reports</h1>
            <p className="text-muted-foreground">Review, assign, and manage misconduct reports</p>
          </div>
          {emergencyCount > 0 && (
            <Badge variant="destructive" className="flex items-center gap-1 text-sm px-3 py-1">
              <AlertTriangle className="h-4 w-4" />
              {emergencyCount} emergency {emergencyCount === 1 ? "report" : "reports"}
            </Badge>
          )}
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(statusConfig).map(([key, cfg]) => {
            const count = reports.filter(r => r.status === key).length;
            const Icon = cfg.icon;
            return (
              <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setStatusFilter(key)}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-2xl font-bold">{count}</p>
                    <p className="text-xs text-muted-foreground">{cfg.label}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <Tabs defaultValue="reports">
          <TabsList>
            <TabsTrigger value="reports">All Reports</TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="reports" className="space-y-4">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 items-center">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {Object.entries(statusConfig).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Priority" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {Object.entries(reportTypeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {(statusFilter !== "all" || priorityFilter !== "all" || typeFilter !== "all") && (
                <Button variant="ghost" size="sm" onClick={() => { setStatusFilter("all"); setPriorityFilter("all"); setTypeFilter("all"); }}>
                  Clear filters
                </Button>
              )}
            </div>

            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Reporter</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                    ) : filtered.length === 0 ? (
                      <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No reports found</TableCell></TableRow>
                    ) : filtered.map(r => {
                      const sc = statusConfig[r.status] || statusConfig.pending;
                      return (
                        <TableRow key={r.id} className={r.is_emergency ? "border-l-4 border-l-destructive" : ""}>
                          <TableCell className="text-sm">{format(new Date(r.created_at), "dd MMM yyyy HH:mm")}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">{reportTypeLabels[r.report_type] || r.report_type}</Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.is_anonymous ? (
                              <span className="italic text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Anonymous</span>
                            ) : (
                              <span>{r.reporter_name || r.reporter_role}</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${priorityColors[r.priority]}`}>
                              {r.priority}
                            </span>
                          </TableCell>
                          <TableCell><Badge variant={sc.variant}>{sc.label}</Badge></TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => openDetail(r)}>
                              <Eye className="h-4 w-4 mr-1" /> View
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Trending Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {trendingReports.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No trending reports published yet. Mark resolved reports as trending to share anonymized awareness updates.</p>
                ) : (
                  <div className="space-y-4">
                    {trendingReports.map(r => (
                      <Card key={r.id}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <Badge variant="outline">{reportTypeLabels[r.report_type] || r.report_type}</Badge>
                              <p className="text-sm mt-2">{r.description.slice(0, 200)}{r.description.length > 200 ? "..." : ""}</p>
                              <p className="text-xs text-muted-foreground">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => updateReport(r.id, { is_trending: false }, "trending_removed")}>
                              Remove
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Detail dialog */}
        <Dialog open={!!selectedReport} onOpenChange={(open) => { if (!open) setSelectedReport(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedReport?.is_emergency && <AlertTriangle className="h-5 w-5 text-destructive" />}
                Report Detail
              </DialogTitle>
            </DialogHeader>
            {selectedReport && (
              <ScrollArea className="flex-1 pr-4">
                <div className="space-y-4">
                  {/* Info grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-muted-foreground">Type:</span> <span className="font-medium">{reportTypeLabels[selectedReport.report_type]}</span></div>
                    <div><span className="text-muted-foreground">Priority:</span> <span className={`font-medium px-2 py-0.5 rounded-full text-xs ${priorityColors[selectedReport.priority]}`}>{selectedReport.priority}</span></div>
                    <div><span className="text-muted-foreground">Reporter:</span> <span className="font-medium">{selectedReport.is_anonymous ? "Anonymous" : (selectedReport.reporter_name || selectedReport.reporter_role)}</span></div>
                    <div><span className="text-muted-foreground">Date:</span> <span className="font-medium">{format(new Date(selectedReport.created_at), "dd MMM yyyy HH:mm")}</span></div>
                    {selectedReport.victim_names && <div className="col-span-2"><span className="text-muted-foreground">Victim(s):</span> <span className="font-medium">{selectedReport.victim_names}</span></div>}
                    {selectedReport.location && <div className="col-span-2"><span className="text-muted-foreground">Location:</span> <span className="font-medium">{selectedReport.location}</span></div>}
                  </div>

                  <Separator />
                  <div>
                    <p className="text-sm font-medium mb-1">Description</p>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">{selectedReport.description}</p>
                  </div>

                  {selectedReport.attachment_urls?.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <p className="text-sm font-medium mb-1">Attachments</p>
                        <div className="flex gap-2 flex-wrap">
                          {selectedReport.attachment_urls.map((url, i) => (
                            <a key={i} href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline">Attachment {i + 1}</a>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  <Separator />

                  {/* Actions */}
                  <div className="space-y-3">
                    <p className="text-sm font-medium">Actions</p>
                    <div className="flex flex-wrap gap-2">
                      <Select value={selectedReport.status} onValueChange={(v) => {
                        const updates: Record<string, unknown> = { status: v };
                        if (v === "resolved") updates.resolved_at = new Date().toISOString();
                        updateReport(selectedReport.id, updates, "status_changed");
                      }}>
                        <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={selectedReport.assigned_to || "unassigned"} onValueChange={(v) => {
                        updateReport(selectedReport.id, { assigned_to: v === "unassigned" ? null : v }, "assigned");
                      }}>
                        <SelectTrigger className="w-48"><SelectValue placeholder="Assign to..." /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="unassigned">Unassigned</SelectItem>
                          {staffMembers.map(s => (
                            <SelectItem key={s.id} value={s.id}>{s.full_name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      {selectedReport.status === "resolved" && (
                        <Button
                          variant={selectedReport.is_trending ? "destructive" : "outline"}
                          size="sm"
                          onClick={() => updateReport(selectedReport.id, { is_trending: !selectedReport.is_trending }, selectedReport.is_trending ? "trending_removed" : "trending_added")}
                        >
                          <TrendingUp className="h-4 w-4 mr-1" />
                          {selectedReport.is_trending ? "Remove from trending" : "Mark as trending"}
                        </Button>
                      )}
                    </div>

                    <div>
                      <label className="text-sm text-muted-foreground">Resolution notes</label>
                      <Textarea
                        value={resolutionNotes}
                        onChange={(e) => setResolutionNotes(e.target.value)}
                        placeholder="Add notes about the resolution..."
                        rows={3}
                      />
                      <Button
                        size="sm"
                        className="mt-2"
                        disabled={resolutionNotes === (selectedReport.resolution_notes || "")}
                        onClick={() => updateReport(selectedReport.id, { resolution_notes: resolutionNotes }, "notes_updated")}
                      >
                        Save notes
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Audit timeline */}
                  <div>
                    <p className="text-sm font-medium mb-2">Activity Timeline</p>
                    {auditLog.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No activity recorded yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {auditLog.map(entry => (
                          <div key={entry.id} className="flex items-start gap-2 text-xs">
                            <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                            <div>
                              <span className="font-medium capitalize">{entry.action.replace(/_/g, " ")}</span>
                              <span className="text-muted-foreground ml-2">{format(new Date(entry.created_at), "dd MMM HH:mm")}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </SchoolLayout>
  );
}
