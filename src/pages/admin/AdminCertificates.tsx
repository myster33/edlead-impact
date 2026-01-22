import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { toast } from "sonner";
import {
  Award,
  Calendar,
  FileText,
  Loader2,
  Mail,
  Plus,
  Send,
  Settings,
  Users,
  Eye,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  RefreshCw,
  Download,
  AlertTriangle,
  Palette,
  BarChart3,
  Upload,
  Image,
} from "lucide-react";
import { format } from "date-fns";
import { Switch } from "@/components/ui/switch";

interface Cohort {
  id: string;
  name: string;
  year: number;
  cohort_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface DesignSettings {
  primaryColor?: string;
  secondaryColor?: string;
  backgroundColor?: string;
  sidebarColor?: string;
  textColor?: string;
  accentColor?: string;
  layout?: string;
  showSeal?: boolean;
  showChevrons?: boolean;
  showDiagonalLines?: boolean;
  signatureStyle?: string;
  fontStyle?: string;
  backgroundImageUrl?: string;
}

interface CertificateTemplate {
  id: string;
  name: string;
  html_template: string;
  available_fields: unknown[];
  is_default: boolean;
  design_settings?: DesignSettings | null;
}

interface Application {
  id: string;
  full_name: string;
  student_email: string;
  school_name: string;
  province: string;
  country: string;
  grade: string;
  status: string;
  cohort_id: string | null;
  created_at: string;
}

interface CertificateRecipient {
  id: string;
  application_id: string;
  cohort_id: string;
  template_id: string;
  issued_at: string | null;
  email_sent: boolean;
  email_sent_at: string | null;
  email_opened: boolean;
  email_opened_at: string | null;
  open_count: number;
  certificate_downloaded: boolean;
  certificate_downloaded_at: string | null;
  download_count: number;
  tracking_id: string;
  applications: Application;
}

export default function AdminCertificates() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("cohorts");
  const [selectedCohort, setSelectedCohort] = useState<string>("");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [selectedRecipients, setSelectedRecipients] = useState<string[]>([]);
  const [completionDate, setCompletionDate] = useState(format(new Date(), "yyyy-MM-dd"));
  const [showCohortDialog, setShowCohortDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [showSendConfirm, setShowSendConfirm] = useState(false);
  const [editingCohort, setEditingCohort] = useState<Cohort | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [isGeneratingPreview, setIsGeneratingPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);
  const [showResendConfirm, setShowResendConfirm] = useState(false);
  const [selectedForResend, setSelectedForResend] = useState<string[]>([]);
  const [showDesignDialog, setShowDesignDialog] = useState(false);
  const [designTemplate, setDesignTemplate] = useState<CertificateTemplate | null>(null);
  const [designSettings, setDesignSettings] = useState<DesignSettings>({
    primaryColor: "#ED7621",
    secondaryColor: "#4A4A4A",
    backgroundColor: "#FFFFFF",
    sidebarColor: "#595959",
    textColor: "#4A4A4A",
    accentColor: "#ED7621",
    layout: "modern",
    showSeal: true,
    showChevrons: true,
    showDiagonalLines: true,
    signatureStyle: "line",
    fontStyle: "classic",
    backgroundImageUrl: "",
  });
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);

  // Cohort form state
  const [cohortForm, setCohortForm] = useState({
    name: "",
    year: new Date().getFullYear(),
    cohort_number: 1,
    start_date: "",
    end_date: "",
    is_active: false,
  });

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    name: "",
    html_template: "",
    is_default: false,
  });

  // Fetch cohorts
  const { data: cohorts, isLoading: cohortsLoading } = useQuery({
    queryKey: ["cohorts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("cohorts")
        .select("*")
        .order("year", { ascending: false })
        .order("cohort_number", { ascending: false });
      if (error) throw error;
      return data as Cohort[];
    },
  });

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ["certificate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("certificate_templates")
        .select("*")
        .order("is_default", { ascending: false });
      if (error) throw error;
      return data as CertificateTemplate[];
    },
  });

  // Fetch applications for selected cohort
  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["cohort-applications", selectedCohort],
    queryFn: async () => {
      if (!selectedCohort) return [];
      const { data, error } = await supabase
        .from("applications")
        .select("*")
        .eq("cohort_id", selectedCohort)
        .eq("status", "approved")
        .order("full_name");
      if (error) throw error;
      return data as Application[];
    },
    enabled: !!selectedCohort,
  });

  // Fetch existing recipients for selected cohort
  const { data: existingRecipients } = useQuery({
    queryKey: ["certificate-recipients", selectedCohort],
    queryFn: async () => {
      if (!selectedCohort) return [];
      const { data, error } = await supabase
        .from("certificate_recipients")
        .select("*, applications(*)")
        .eq("cohort_id", selectedCohort);
      if (error) throw error;
      return data as CertificateRecipient[];
    },
    enabled: !!selectedCohort,
  });

  // Set default template
  useEffect(() => {
    if (templates && templates.length > 0 && !selectedTemplate) {
      const defaultTemplate = templates.find((t) => t.is_default) || templates[0];
      setSelectedTemplate(defaultTemplate.id);
    }
  }, [templates, selectedTemplate]);

  // Create/Update cohort mutation
  const cohortMutation = useMutation({
    mutationFn: async (data: typeof cohortForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("cohorts")
          .update({
            name: data.name,
            year: data.year,
            cohort_number: data.cohort_number,
            start_date: data.start_date,
            end_date: data.end_date,
            is_active: data.is_active,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("cohorts").insert([
          {
            name: data.name,
            year: data.year,
            cohort_number: data.cohort_number,
            start_date: data.start_date,
            end_date: data.end_date,
            is_active: data.is_active,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      toast.success(editingCohort ? "Cohort updated" : "Cohort created");
      setShowCohortDialog(false);
      resetCohortForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save cohort");
    },
  });

  // Delete cohort mutation
  const deleteCohortMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("cohorts").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cohorts"] });
      toast.success("Cohort deleted");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete cohort");
    },
  });

  // Create/Update template mutation
  const templateMutation = useMutation({
    mutationFn: async (data: typeof templateForm & { id?: string }) => {
      if (data.id) {
        const { error } = await supabase
          .from("certificate_templates")
          .update({
            name: data.name,
            html_template: data.html_template,
            is_default: data.is_default,
          })
          .eq("id", data.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("certificate_templates").insert([
          {
            name: data.name,
            html_template: data.html_template,
            is_default: data.is_default,
          },
        ]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success(editingTemplate ? "Template updated" : "Template created");
      setShowTemplateDialog(false);
      resetTemplateForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save template");
    },
  });

  // Update design settings mutation
  const updateDesignMutation = useMutation({
    mutationFn: async ({ templateId, settings }: { templateId: string; settings: DesignSettings }) => {
      const { error } = await supabase
        .from("certificate_templates")
        .update({ design_settings: JSON.parse(JSON.stringify(settings)) })
        .eq("id", templateId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-templates"] });
      toast.success("Design settings updated");
      setShowDesignDialog(false);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to update design settings");
    },
  });

  // Upload background image handler
  const handleBackgroundUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploadingBackground(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `background-${designTemplate?.id || "default"}-${Date.now()}.${fileExt}`;
      const filePath = fileName;

      const { error: uploadError } = await supabase.storage
        .from("certificate-backgrounds")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("certificate-backgrounds")
        .getPublicUrl(filePath);

      setDesignSettings({ ...designSettings, backgroundImageUrl: publicUrl });
      toast.success("Background image uploaded successfully");
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error(error.message || "Failed to upload background image");
    } finally {
      setIsUploadingBackground(false);
    }
  };
  const addRecipientsMutation = useMutation({
    mutationFn: async (applicationIds: string[]) => {
      const recipients = applicationIds.map((appId) => ({
        application_id: appId,
        cohort_id: selectedCohort,
        template_id: selectedTemplate,
      }));
      const { error } = await supabase.from("certificate_recipients").insert(recipients);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["certificate-recipients", selectedCohort] });
      toast.success("Recipients added successfully");
      setSelectedRecipients([]);
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to add recipients");
    },
  });

  // Send certificates
  const sendCertificates = async () => {
    if (!selectedCohort || !selectedTemplate || selectedRecipients.length === 0) {
      toast.error("Please select cohort, template, and recipients");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-certificate", {
        body: {
          recipientIds: selectedRecipients,
          templateId: selectedTemplate,
          cohortId: selectedCohort,
          completionDate: format(new Date(completionDate), "MMMM d, yyyy"),
        },
      });

      if (error) throw error;

      toast.success(data.message || "Certificates sent successfully!");
      queryClient.invalidateQueries({ queryKey: ["certificate-recipients", selectedCohort] });
      setSelectedRecipients([]);
      setShowSendConfirm(false);
    } catch (error: any) {
      console.error("Error sending certificates:", error);
      toast.error(error.message || "Failed to send certificates");
    } finally {
      setIsSending(false);
    }
  };

  // Resend certificates to failed/sent recipients
  const resendCertificates = async () => {
    if (!selectedCohort || !selectedTemplate || selectedForResend.length === 0) {
      toast.error("Please select recipients to resend");
      return;
    }

    setIsSending(true);
    try {
      // Reset email_sent status for selected recipients
      const { error: resetError } = await supabase
        .from("certificate_recipients")
        .update({ email_sent: false, email_sent_at: null })
        .in("id", selectedForResend);

      if (resetError) throw resetError;

      const { data, error } = await supabase.functions.invoke("send-certificate", {
        body: {
          recipientIds: selectedForResend,
          templateId: selectedTemplate,
          cohortId: selectedCohort,
          completionDate: format(new Date(completionDate), "MMMM d, yyyy"),
        },
      });

      if (error) throw error;

      toast.success(data.message || "Certificates resent successfully!");
      queryClient.invalidateQueries({ queryKey: ["certificate-recipients", selectedCohort] });
      setSelectedForResend([]);
      setShowResendConfirm(false);
    } catch (error: any) {
      console.error("Error resending certificates:", error);
      toast.error(error.message || "Failed to resend certificates");
    } finally {
      setIsSending(false);
    }
  };

  // Generate PDF preview
  const generatePdfPreview = async () => {
    setIsGeneratingPreview(true);
    setPreviewPdfUrl(null);
    
    try {
      const cohort = cohorts?.find((c) => c.id === selectedCohort);
      const template = templates?.find((t) => t.id === selectedTemplate);
      const settings = (template?.design_settings as DesignSettings) || designSettings;
      
      // Use the background image URL from settings
      const backgroundImageUrl = settings.backgroundImageUrl || "";
      
      const { data, error } = await supabase.functions.invoke("generate-certificate-preview", {
        body: {
          fullName: "John Doe",
          schoolName: "Sample High School",
          province: "Gauteng",
          country: "South Africa",
          cohortName: cohort?.name || "Cohort 2026-1",
          completionDate: format(new Date(completionDate), "MMMM d, yyyy"),
          backgroundImageUrl,
        },
      });

      if (error) throw error;

      // Convert base64 to blob URL
      const pdfBlob = base64ToBlob(data.pdf, "application/pdf");
      const url = URL.createObjectURL(pdfBlob);
      setPreviewPdfUrl(url);
      setShowPreviewDialog(true);
    } catch (error: any) {
      console.error("Error generating preview:", error);
      toast.error(error.message || "Failed to generate preview");
    } finally {
      setIsGeneratingPreview(false);
    }
  };

  // Helper to convert base64 to Blob
  const base64ToBlob = (base64: string, mimeType: string): Blob => {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  };

  // Download preview PDF
  const downloadPreviewPdf = () => {
    if (previewPdfUrl) {
      const link = document.createElement("a");
      link.href = previewPdfUrl;
      link.download = "edLEAD_Certificate_Preview.pdf";
      link.click();
    }
  };

  const resetCohortForm = () => {
    setCohortForm({
      name: "",
      year: new Date().getFullYear(),
      cohort_number: 1,
      start_date: "",
      end_date: "",
      is_active: false,
    });
    setEditingCohort(null);
  };

  const resetTemplateForm = () => {
    setTemplateForm({
      name: "",
      html_template: "",
      is_default: false,
    });
    setEditingTemplate(null);
  };

  const openEditCohort = (cohort: Cohort) => {
    setEditingCohort(cohort);
    setCohortForm({
      name: cohort.name,
      year: cohort.year,
      cohort_number: cohort.cohort_number,
      start_date: cohort.start_date,
      end_date: cohort.end_date,
      is_active: cohort.is_active,
    });
    setShowCohortDialog(true);
  };

  const openEditTemplate = (template: CertificateTemplate) => {
    setEditingTemplate(template);
    setTemplateForm({
      name: template.name,
      html_template: template.html_template,
      is_default: template.is_default,
    });
    setShowTemplateDialog(true);
  };

  // Get applications not yet added as recipients
  const availableApplications = applications?.filter(
    (app) => !existingRecipients?.some((r) => r.application_id === app.id)
  );

  // Preview template with sample data
  const getPreviewHtml = () => {
    const template = templates?.find((t) => t.id === selectedTemplate);
    if (!template) return "";

    return template.html_template
      .replace(/\{\{full_name\}\}/g, "John Doe")
      .replace(/\{\{school_name\}\}/g, "Sample High School")
      .replace(/\{\{province\}\}/g, "Gauteng")
      .replace(/\{\{country\}\}/g, "South Africa")
      .replace(/\{\{grade\}\}/g, "Grade 11")
      .replace(/\{\{project_idea\}\}/g, "Environmental Awareness Campaign")
      .replace(/\{\{cohort_name\}\}/g, cohorts?.find((c) => c.id === selectedCohort)?.name || "Cohort 2026-1")
      .replace(/\{\{completion_date\}\}/g, format(new Date(completionDate), "MMMM d, yyyy"));
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Certificate Management</h1>
            <p className="text-muted-foreground">
              Manage cohorts, templates, and issue certificates
            </p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="cohorts" className="gap-2">
              <Calendar className="h-4 w-4" />
              Cohorts
            </TabsTrigger>
            <TabsTrigger value="templates" className="gap-2">
              <FileText className="h-4 w-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="issue" className="gap-2">
              <Award className="h-4 w-4" />
              Issue Certificates
            </TabsTrigger>
          </TabsList>

          {/* Cohorts Tab */}
          <TabsContent value="cohorts" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Application Cohorts</h2>
              <Dialog open={showCohortDialog} onOpenChange={(open) => {
                setShowCohortDialog(open);
                if (!open) resetCohortForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Cohort
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{editingCohort ? "Edit Cohort" : "Create Cohort"}</DialogTitle>
                    <DialogDescription>
                      Define a new cohort period for applications
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="year">Year</Label>
                        <Input
                          id="year"
                          type="number"
                          value={cohortForm.year}
                          onChange={(e) =>
                            setCohortForm({ ...cohortForm, year: parseInt(e.target.value) })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cohort_number">Cohort Number</Label>
                        <Input
                          id="cohort_number"
                          type="number"
                          value={cohortForm.cohort_number}
                          onChange={(e) =>
                            setCohortForm({ ...cohortForm, cohort_number: parseInt(e.target.value) })
                          }
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="name">Cohort Name</Label>
                      <Input
                        id="name"
                        value={cohortForm.name}
                        onChange={(e) => setCohortForm({ ...cohortForm, name: e.target.value })}
                        placeholder={`Cohort ${cohortForm.year}-${cohortForm.cohort_number}`}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="start_date">Start Date</Label>
                        <Input
                          id="start_date"
                          type="date"
                          value={cohortForm.start_date}
                          onChange={(e) =>
                            setCohortForm({ ...cohortForm, start_date: e.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="end_date">End Date</Label>
                        <Input
                          id="end_date"
                          type="date"
                          value={cohortForm.end_date}
                          onChange={(e) =>
                            setCohortForm({ ...cohortForm, end_date: e.target.value })
                          }
                        />
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_active"
                        checked={cohortForm.is_active}
                        onCheckedChange={(checked) =>
                          setCohortForm({ ...cohortForm, is_active: !!checked })
                        }
                      />
                      <Label htmlFor="is_active">Currently accepting applications</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() =>
                        cohortMutation.mutate({
                          ...cohortForm,
                          id: editingCohort?.id,
                        })
                      }
                      disabled={cohortMutation.isPending}
                    >
                      {cohortMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingCohort ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {cohortsLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Card>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cohorts?.map((cohort) => (
                      <TableRow key={cohort.id}>
                        <TableCell className="font-medium">{cohort.name}</TableCell>
                        <TableCell>
                          {format(new Date(cohort.start_date), "MMM d, yyyy")} -{" "}
                          {format(new Date(cohort.end_date), "MMM d, yyyy")}
                        </TableCell>
                        <TableCell>
                          <Badge variant={cohort.is_active ? "default" : "secondary"}>
                            {cohort.is_active ? "Active" : "Closed"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditCohort(cohort)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteCohortMutation.mutate(cohort.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!cohorts || cohorts.length === 0) && (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                          No cohorts found. Create one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold">Certificate Templates</h2>
              <Dialog open={showTemplateDialog} onOpenChange={(open) => {
                setShowTemplateDialog(open);
                if (!open) resetTemplateForm();
              }}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Template
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>{editingTemplate ? "Edit Template" : "Create Template"}</DialogTitle>
                    <DialogDescription>
                      Available variables: {`{{full_name}}, {{school_name}}, {{province}}, {{country}}, {{grade}}, {{project_idea}}, {{cohort_name}}, {{completion_date}}`}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="template_name">Template Name</Label>
                      <Input
                        id="template_name"
                        value={templateForm.name}
                        onChange={(e) => setTemplateForm({ ...templateForm, name: e.target.value })}
                        placeholder="e.g., Standard Certificate"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="html_template">HTML Template</Label>
                      <Textarea
                        id="html_template"
                        value={templateForm.html_template}
                        onChange={(e) =>
                          setTemplateForm({ ...templateForm, html_template: e.target.value })
                        }
                        placeholder="Enter HTML template..."
                        className="min-h-[300px] font-mono text-sm"
                      />
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="is_default"
                        checked={templateForm.is_default}
                        onCheckedChange={(checked) =>
                          setTemplateForm({ ...templateForm, is_default: !!checked })
                        }
                      />
                      <Label htmlFor="is_default">Set as default template</Label>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button
                      onClick={() =>
                        templateMutation.mutate({
                          ...templateForm,
                          id: editingTemplate?.id,
                        })
                      }
                      disabled={templateMutation.isPending}
                    >
                      {templateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                      {editingTemplate ? "Update" : "Create"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            {templatesLoading ? (
              <div className="flex justify-center p-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {templates?.map((template) => (
                  <Card key={template.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-lg">{template.name}</CardTitle>
                        {template.is_default && <Badge>Default</Badge>}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditTemplate(template)}
                        >
                          <Pencil className="h-4 w-4 mr-2" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedTemplate(template.id);
                            generatePdfPreview();
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setDesignTemplate(template);
                            const ds = template.design_settings as DesignSettings | null;
                            setDesignSettings({
                              primaryColor: ds?.primaryColor || "#ED7621",
                              secondaryColor: ds?.secondaryColor || "#4A4A4A",
                              backgroundColor: ds?.backgroundColor || "#FFFFFF",
                              sidebarColor: ds?.sidebarColor || "#595959",
                              textColor: ds?.textColor || "#4A4A4A",
                              accentColor: ds?.accentColor || "#ED7621",
                              layout: ds?.layout || "modern",
                              showSeal: ds?.showSeal ?? true,
                              showChevrons: ds?.showChevrons ?? true,
                              showDiagonalLines: ds?.showDiagonalLines ?? true,
                              signatureStyle: ds?.signatureStyle || "line",
                              fontStyle: ds?.fontStyle || "classic",
                              backgroundImageUrl: ds?.backgroundImageUrl || "",
                            });
                            setShowDesignDialog(true);
                          }}
                        >
                          <Palette className="h-4 w-4 mr-2" />
                          Design
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {(!templates || templates.length === 0) && (
                  <Card className="col-span-2">
                    <CardContent className="text-center text-muted-foreground py-8">
                      No templates found. Create one to get started.
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
          </TabsContent>

          {/* Issue Certificates Tab */}
          <TabsContent value="issue" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Issue Certificates</CardTitle>
                <CardDescription>
                  Select a cohort, choose recipients, and send certificates
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Select Cohort</Label>
                    <Select value={selectedCohort} onValueChange={setSelectedCohort}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a cohort" />
                      </SelectTrigger>
                      <SelectContent>
                        {cohorts?.map((cohort) => (
                          <SelectItem key={cohort.id} value={cohort.id}>
                            {cohort.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Certificate Template</Label>
                    <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a template" />
                      </SelectTrigger>
                      <SelectContent>
                        {templates?.map((template) => (
                          <SelectItem key={template.id} value={template.id}>
                            {template.name} {template.is_default && "(Default)"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Completion Date</Label>
                    <Input
                      type="date"
                      value={completionDate}
                      onChange={(e) => setCompletionDate(e.target.value)}
                    />
                  </div>
                </div>

                {selectedTemplate && (
                  <Button
                    variant="outline"
                    onClick={generatePdfPreview}
                    disabled={isGeneratingPreview}
                  >
                    {isGeneratingPreview ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4 mr-2" />
                    )}
                    Preview Certificate PDF
                  </Button>
                )}

                {selectedCohort && (
                  <>
                    <div className="border-t pt-4">
                      <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        Available Recipients (Approved Applications)
                      </h3>
                      {applicationsLoading ? (
                        <div className="flex justify-center p-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : availableApplications && availableApplications.length > 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 mb-2">
                            <Checkbox
                              id="select-all-available"
                              checked={
                                availableApplications.length > 0 &&
                                availableApplications.every((a) =>
                                  selectedRecipients.includes(a.id)
                                )
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedRecipients(availableApplications.map((a) => a.id));
                                } else {
                                  setSelectedRecipients([]);
                                }
                              }}
                            />
                            <Label htmlFor="select-all-available">Select All</Label>
                          </div>
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>School</TableHead>
                                <TableHead>Province</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {availableApplications.map((app) => (
                                <TableRow key={app.id}>
                                  <TableCell>
                                    <Checkbox
                                      checked={selectedRecipients.includes(app.id)}
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          setSelectedRecipients([...selectedRecipients, app.id]);
                                        } else {
                                          setSelectedRecipients(
                                            selectedRecipients.filter((id) => id !== app.id)
                                          );
                                        }
                                      }}
                                    />
                                  </TableCell>
                                  <TableCell className="font-medium">{app.full_name}</TableCell>
                                  <TableCell>{app.student_email}</TableCell>
                                  <TableCell>{app.school_name}</TableCell>
                                  <TableCell>{app.province}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                          <div className="flex justify-end mt-4">
                            <Button
                              onClick={() => addRecipientsMutation.mutate(selectedRecipients)}
                              disabled={selectedRecipients.length === 0 || addRecipientsMutation.isPending}
                            >
                              {addRecipientsMutation.isPending && (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                              )}
                              Add {selectedRecipients.length} as Recipients
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          No approved applications available for this cohort, or all have been added as recipients.
                        </p>
                      )}
                    </div>

                    {existingRecipients && existingRecipients.length > 0 && (
                      <div className="border-t pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold flex items-center gap-2">
                            <Award className="h-4 w-4" />
                            Certificate Recipients
                          </h3>
                          {/* Tracking Stats Summary */}
                          <div className="flex gap-4 text-sm">
                            <div className="flex items-center gap-1">
                              <Mail className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Sent:</span>
                              <Badge variant="outline">
                                {existingRecipients.filter((r) => r.email_sent).length}/{existingRecipients.length}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Opened:</span>
                              <Badge variant="outline" className="bg-primary/10">
                                {existingRecipients.filter((r) => r.email_opened).length}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-1">
                              <Download className="h-4 w-4 text-muted-foreground" />
                              <span className="text-muted-foreground">Downloaded:</span>
                              <Badge variant="outline" className="bg-green-500/10">
                                {existingRecipients.filter((r) => r.certificate_downloaded).length}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead className="w-12">Resend</TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Delivery</TableHead>
                              <TableHead>Engagement</TableHead>
                              <TableHead>Sent At</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {existingRecipients.map((recipient) => (
                              <TableRow key={recipient.id}>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedRecipients.includes(recipient.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedRecipients([...selectedRecipients, recipient.id]);
                                      } else {
                                        setSelectedRecipients(
                                          selectedRecipients.filter((id) => id !== recipient.id)
                                        );
                                      }
                                    }}
                                    disabled={recipient.email_sent}
                                  />
                                </TableCell>
                                <TableCell>
                                  <Checkbox
                                    checked={selectedForResend.includes(recipient.id)}
                                    onCheckedChange={(checked) => {
                                      if (checked) {
                                        setSelectedForResend([...selectedForResend, recipient.id]);
                                      } else {
                                        setSelectedForResend(
                                          selectedForResend.filter((id) => id !== recipient.id)
                                        );
                                      }
                                    }}
                                    disabled={!recipient.email_sent}
                                  />
                                </TableCell>
                                <TableCell className="font-medium">
                                  {recipient.applications?.full_name}
                                </TableCell>
                                <TableCell className="text-sm">{recipient.applications?.student_email}</TableCell>
                                <TableCell>
                                  {recipient.email_sent ? (
                                    <Badge variant="default" className="gap-1">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Sent
                                    </Badge>
                                  ) : (
                                    <Badge variant="secondary" className="gap-1">
                                      <Clock className="h-3 w-3" />
                                      Pending
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-1">
                                    {recipient.email_opened && (
                                      <Badge variant="outline" className="gap-1 text-xs bg-primary/10">
                                        <Eye className="h-3 w-3" />
                                        {recipient.open_count > 1 ? `${recipient.open_count}x` : "Opened"}
                                      </Badge>
                                    )}
                                    {recipient.certificate_downloaded && (
                                      <Badge variant="outline" className="gap-1 text-xs bg-green-500/10">
                                        <Download className="h-3 w-3" />
                                        {recipient.download_count > 1 ? `${recipient.download_count}x` : "Downloaded"}
                                      </Badge>
                                    )}
                                    {!recipient.email_opened && !recipient.certificate_downloaded && recipient.email_sent && (
                                      <span className="text-muted-foreground text-xs">Not opened</span>
                                    )}
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm">
                                  {recipient.email_sent_at
                                    ? format(new Date(recipient.email_sent_at), "MMM d, yyyy HH:mm")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex items-center gap-2">
                            <Checkbox
                              id="select-all-sent"
                              checked={
                                existingRecipients.filter((r) => r.email_sent).length > 0 &&
                                existingRecipients
                                  .filter((r) => r.email_sent)
                                  .every((r) => selectedForResend.includes(r.id))
                              }
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setSelectedForResend(
                                    existingRecipients.filter((r) => r.email_sent).map((r) => r.id)
                                  );
                                } else {
                                  setSelectedForResend([]);
                                }
                              }}
                            />
                            <Label htmlFor="select-all-sent" className="text-sm">
                              Select all sent for resend
                            </Label>
                          </div>
                          <div className="flex gap-2">
                            {selectedForResend.length > 0 && (
                              <Button
                                variant="outline"
                                onClick={() => setShowResendConfirm(true)}
                              >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Resend ({selectedForResend.length})
                              </Button>
                            )}
                            <Button
                              onClick={() => setShowSendConfirm(true)}
                              disabled={
                                selectedRecipients.length === 0 ||
                                !selectedRecipients.some((id) =>
                                  existingRecipients.some((r) => r.id === id && !r.email_sent)
                                )
                              }
                            >
                              <Send className="h-4 w-4 mr-2" />
                              Send Certificates ({selectedRecipients.filter((id) =>
                                existingRecipients.some((r) => r.id === id && !r.email_sent)
                              ).length})
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog - PDF Preview */}
        <Dialog open={showPreviewDialog} onOpenChange={(open) => {
          setShowPreviewDialog(open);
          if (!open && previewPdfUrl) {
            URL.revokeObjectURL(previewPdfUrl);
            setPreviewPdfUrl(null);
          }
        }}>
          <DialogContent className="max-w-5xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Certificate PDF Preview</span>
                {previewPdfUrl && (
                  <Button variant="outline" size="sm" onClick={downloadPreviewPdf}>
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
              </DialogTitle>
            </DialogHeader>
            {previewPdfUrl ? (
              <div className="border rounded-lg overflow-hidden h-[70vh]">
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full"
                  title="Certificate Preview"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center h-[400px] text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No preview available. Click "Preview Certificate PDF" to generate.</p>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Send Confirmation Dialog */}
        <AlertDialog open={showSendConfirm} onOpenChange={setShowSendConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Send Certificates?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to send certificates to{" "}
                {selectedRecipients.filter((id) =>
                  existingRecipients?.some((r) => r.id === id && !r.email_sent)
                ).length}{" "}
                recipients. Each will receive an email with their certificate PDF attached.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={sendCertificates} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4 mr-2" />
                    Send Certificates
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Resend Confirmation Dialog */}
        <AlertDialog open={showResendConfirm} onOpenChange={setShowResendConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Resend Certificates?</AlertDialogTitle>
              <AlertDialogDescription>
                You are about to resend certificates to {selectedForResend.length} recipients 
                who have already received their certificates. This is useful if emails bounced 
                or failed to deliver. Each will receive a new email with their certificate PDF attached.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isSending}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={resendCertificates} disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Resending...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Resend Certificates
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Design Settings Dialog */}
        <Dialog open={showDesignDialog} onOpenChange={setShowDesignDialog}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                Certificate Design Settings
              </DialogTitle>
              <DialogDescription>
                Customize the appearance of the PDF certificate for {designTemplate?.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Primary Color (Orange accents)</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={designSettings.primaryColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, primaryColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={designSettings.primaryColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, primaryColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Sidebar Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={designSettings.sidebarColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, sidebarColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={designSettings.sidebarColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, sidebarColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Text Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={designSettings.textColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, textColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={designSettings.textColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, textColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Background Color</Label>
                  <div className="flex gap-2">
                    <Input
                      type="color"
                      value={designSettings.backgroundColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, backgroundColor: e.target.value })}
                      className="w-12 h-10 p-1"
                    />
                    <Input
                      value={designSettings.backgroundColor}
                      onChange={(e) => setDesignSettings({ ...designSettings, backgroundColor: e.target.value })}
                      className="flex-1"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Visual Elements</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="flex items-center justify-between">
                    <Label>Show Seal</Label>
                    <Switch
                      checked={designSettings.showSeal}
                      onCheckedChange={(checked) => setDesignSettings({ ...designSettings, showSeal: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Show Chevrons</Label>
                    <Switch
                      checked={designSettings.showChevrons}
                      onCheckedChange={(checked) => setDesignSettings({ ...designSettings, showChevrons: checked })}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Diagonal Lines</Label>
                    <Switch
                      checked={designSettings.showDiagonalLines}
                      onCheckedChange={(checked) => setDesignSettings({ ...designSettings, showDiagonalLines: checked })}
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium flex items-center gap-2">
                  <Image className="h-4 w-4" />
                  Background Image
                </h4>
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Upload a custom background image for the certificate. Text will be positioned in the white content area (right side).
                  </p>
                  
                  {/* Upload button */}
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/jpg"
                        onChange={handleBackgroundUpload}
                        className="hidden"
                        disabled={isUploadingBackground}
                      />
                      <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                        {isUploadingBackground ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Upload className="h-4 w-4" />
                        )}
                        <span>{isUploadingBackground ? "Uploading..." : "Upload Background"}</span>
                      </div>
                    </label>
                    {designSettings.backgroundImageUrl && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setDesignSettings({ ...designSettings, backgroundImageUrl: "" })}
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Remove
                      </Button>
                    )}
                  </div>

                  {/* Preview */}
                  {designSettings.backgroundImageUrl ? (
                    <div className="border rounded-lg p-2 bg-muted/50">
                      <img 
                        src={designSettings.backgroundImageUrl} 
                        alt="Certificate background" 
                        className="w-full h-40 object-contain rounded"
                      />
                      <p className="text-xs text-muted-foreground mt-2 truncate">
                        {designSettings.backgroundImageUrl}
                      </p>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground bg-muted/30">
                      <Image className="h-12 w-12 mx-auto mb-2 opacity-40" />
                      <p className="text-sm">No background image uploaded</p>
                      <p className="text-xs">Upload a JPG or PNG image (max 5MB)</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4 border-t pt-4">
                <h4 className="font-medium">Style Options</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Font Style</Label>
                    <Select
                      value={designSettings.fontStyle}
                      onValueChange={(value) => setDesignSettings({ ...designSettings, fontStyle: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="classic">Classic (Times)</SelectItem>
                        <SelectItem value="modern">Modern (Helvetica)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Layout</Label>
                    <Select
                      value={designSettings.layout}
                      onValueChange={(value) => setDesignSettings({ ...designSettings, layout: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="modern">Modern (Sidebar)</SelectItem>
                        <SelectItem value="classic">Classic (Centered)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDesignDialog(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  if (designTemplate) {
                    updateDesignMutation.mutate({
                      templateId: designTemplate.id,
                      settings: designSettings,
                    });
                  }
                }}
                disabled={updateDesignMutation.isPending}
              >
                {updateDesignMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Save Design
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
