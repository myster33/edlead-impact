import { useState, useEffect } from "react";
import { PortalLayout } from "@/components/portal/PortalLayout";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertTriangle, Send, Shield, Clock, CheckCircle, XCircle, ArrowUpCircle,
  Eye, TrendingUp, MapPin, Paperclip, Siren,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

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

const statusConfig: Record<string, { label: string; icon: React.ElementType; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pending", icon: Clock, variant: "secondary" },
  under_review: { label: "Under Review", icon: Eye, variant: "default" },
  resolved: { label: "Resolved", icon: CheckCircle, variant: "outline" },
  escalated: { label: "Escalated", icon: ArrowUpCircle, variant: "destructive" },
  dismissed: { label: "Dismissed", icon: XCircle, variant: "outline" },
};

export default function PortalReports() {
  const { portalUser, currentSchool } = usePortalAuth();
  const [activeTab, setActiveTab] = useState("submit");

  // Submit form state
  const [reportType, setReportType] = useState("other");
  const [description, setDescription] = useState("");
  const [victimNames, setVictimNames] = useState("");
  const [location, setLocation] = useState("");
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  // My reports state
  const [myReports, setMyReports] = useState<any[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);

  // Trending state
  const [trending, setTrending] = useState<any[]>([]);

  useEffect(() => {
    if (activeTab === "my-reports") fetchMyReports();
    if (activeTab === "trending") fetchTrending();
  }, [activeTab]);

  const fetchMyReports = async () => {
    setLoadingReports(true);
    const { data } = await supabase
      .from("misconduct_reports")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setMyReports(data);
    setLoadingReports(false);
  };

  const fetchTrending = async () => {
    const { data } = await supabase
      .from("misconduct_reports")
      .select("id, report_type, description, created_at")
      .eq("is_trending", true)
      .order("created_at", { ascending: false });
    if (data) setTrending(data);
  };

  const uploadAttachments = async (): Promise<string[]> => {
    const urls: string[] = [];
    for (const file of files.slice(0, 3)) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`File "${file.name}" exceeds 10MB limit`);
        continue;
      }
      const path = `misconduct/${Date.now()}-${file.name}`;
      const { error } = await supabase.storage.from("school-assets").upload(path, file);
      if (error) {
        toast.error(`Failed to upload ${file.name}`);
        continue;
      }
      const { data: urlData } = supabase.storage.from("school-assets").getPublicUrl(path);
      urls.push(urlData.publicUrl);
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      toast.error("Please provide a description");
      return;
    }
    setSubmitting(true);
    try {
      const attachmentUrls = files.length > 0 ? await uploadAttachments() : [];

      const payload: Record<string, unknown> = {
        school_id: currentSchool?.id || null,
        reporter_role: portalUser?.role || "guest",
        reporter_name: isAnonymous ? null : (portalUser?.full_name || null),
        reporter_user_id: isAnonymous ? null : (portalUser?.user_id || null),
        is_anonymous: isAnonymous,
        victim_names: victimNames || null,
        report_type: reportType,
        description: description.trim(),
        attachment_urls: attachmentUrls,
        location: location || null,
        priority: "medium",
        status: "pending",
        is_emergency: false,
      };

      const { error } = await supabase.from("misconduct_reports").insert(payload as any);
      if (error) throw error;

      toast.success("Report submitted successfully");
      resetForm();
      setActiveTab("my-reports");
    } catch {
      toast.error("Failed to submit report");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePanic = async () => {
    setSubmitting(true);
    try {
      let geoLocation = "";
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        geoLocation = `${pos.coords.latitude}, ${pos.coords.longitude}`;
      } catch {
        geoLocation = "Location unavailable";
      }

      const payload: Record<string, unknown> = {
        school_id: currentSchool?.id || null,
        reporter_role: portalUser?.role || "guest",
        reporter_name: portalUser?.full_name || null,
        reporter_user_id: portalUser?.user_id || null,
        is_anonymous: false,
        report_type: "emergency",
        description: "EMERGENCY PANIC BUTTON ACTIVATED",
        location: geoLocation,
        priority: "critical",
        status: "pending",
        is_emergency: true,
        attachment_urls: [],
      };

      const { error } = await supabase.from("misconduct_reports").insert(payload as any);
      if (error) throw error;

      toast.success("Emergency alert sent! Help is on the way.");
      setActiveTab("my-reports");
    } catch {
      toast.error("Failed to send emergency alert");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setReportType("other");
    setDescription("");
    setVictimNames("");
    setLocation("");
    setIsAnonymous(false);
    setFiles([]);
  };

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Misconduct Reports</h1>
            <p className="text-muted-foreground">Report incidents, track status, and view awareness updates</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="submit">Submit Report</TabsTrigger>
            <TabsTrigger value="my-reports">My Reports</TabsTrigger>
            <TabsTrigger value="trending" className="flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5" /> Trending
            </TabsTrigger>
          </TabsList>

          <TabsContent value="submit" className="space-y-4">
            {/* Emergency panic button */}
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Siren className="h-6 w-6 text-destructive" />
                  <div>
                    <p className="font-semibold text-destructive">Emergency? Need immediate help?</p>
                    <p className="text-xs text-muted-foreground">This sends an instant alert to school admin with your location</p>
                  </div>
                </div>
                <Button variant="destructive" size="lg" onClick={handlePanic} disabled={submitting} className="gap-2">
                  <AlertTriangle className="h-5 w-5" /> Panic Button
                </Button>
              </CardContent>
            </Card>

            {/* Submit form */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Send className="h-5 w-5" /> Submit a Report</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Report type *</Label>
                    <Select value={reportType} onValueChange={setReportType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(reportTypeLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Victim name(s)</Label>
                    <Input
                      placeholder="Names of affected individuals (optional)"
                      value={victimNames}
                      onChange={(e) => setVictimNames(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Description *</Label>
                  <Textarea
                    placeholder="Describe what happened..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={5}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> Location</Label>
                    <Input
                      placeholder="Where did this happen? (optional)"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="flex items-center gap-1"><Paperclip className="h-3.5 w-3.5" /> Attachments (max 3, 10MB each)</Label>
                    <Input
                      type="file"
                      multiple
                      accept="image/*,.pdf,.doc,.docx"
                      onChange={(e) => setFiles(Array.from(e.target.files || []).slice(0, 3))}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-md bg-muted/50">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm font-medium">Submit anonymously</p>
                    <p className="text-xs text-muted-foreground">Your identity will not be linked to this report</p>
                  </div>
                  <Switch checked={isAnonymous} onCheckedChange={setIsAnonymous} />
                </div>

                <Button onClick={handleSubmit} disabled={submitting || !description.trim()} className="w-full md:w-auto">
                  {submitting ? "Submitting..." : "Submit Report"}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="my-reports" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>My Reports</CardTitle>
              </CardHeader>
              <CardContent>
                {loadingReports ? (
                  <p className="text-center text-muted-foreground py-8">Loading...</p>
                ) : myReports.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">You haven't submitted any reports yet.</p>
                ) : (
                  <div className="space-y-3">
                    {myReports.map(r => {
                      const sc = statusConfig[r.status] || statusConfig.pending;
                      return (
                        <Card key={r.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline">{reportTypeLabels[r.report_type] || r.report_type}</Badge>
                                  <Badge variant={sc.variant}>{sc.label}</Badge>
                                  {r.is_emergency && <Badge variant="destructive">Emergency</Badge>}
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">{r.description.slice(0, 150)}{r.description.length > 150 ? "..." : ""}</p>
                              </div>
                              <p className="text-xs text-muted-foreground whitespace-nowrap ml-4">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trending" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5" /> Awareness Feed</CardTitle>
              </CardHeader>
              <CardContent>
                {trending.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">No trending reports at this time.</p>
                ) : (
                  <div className="space-y-3">
                    {trending.map(r => (
                      <Card key={r.id}>
                        <CardContent className="p-4">
                          <Badge variant="outline" className="mb-2">{reportTypeLabels[r.report_type] || r.report_type}</Badge>
                          <p className="text-sm">{r.description.slice(0, 300)}{r.description.length > 300 ? "..." : ""}</p>
                          <p className="text-xs text-muted-foreground mt-2">{format(new Date(r.created_at), "dd MMM yyyy")}</p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
