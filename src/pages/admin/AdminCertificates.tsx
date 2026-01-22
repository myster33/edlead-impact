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
} from "lucide-react";
import { format } from "date-fns";

interface Cohort {
  id: string;
  name: string;
  year: number;
  cohort_number: number;
  start_date: string;
  end_date: string;
  is_active: boolean;
}

interface CertificateTemplate {
  id: string;
  name: string;
  html_template: string;
  available_fields: string[];
  is_default: boolean;
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

  // Add recipients mutation
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
                            setShowPreviewDialog(true);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Preview
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
                    onClick={() => setShowPreviewDialog(true)}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Preview Certificate
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
                        <h3 className="font-semibold mb-4 flex items-center gap-2">
                          <Award className="h-4 w-4" />
                          Certificate Recipients
                        </h3>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-12"></TableHead>
                              <TableHead>Name</TableHead>
                              <TableHead>Email</TableHead>
                              <TableHead>Status</TableHead>
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
                                <TableCell className="font-medium">
                                  {recipient.applications?.full_name}
                                </TableCell>
                                <TableCell>{recipient.applications?.student_email}</TableCell>
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
                                  {recipient.email_sent_at
                                    ? format(new Date(recipient.email_sent_at), "MMM d, yyyy HH:mm")
                                    : "-"}
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        <div className="flex justify-end mt-4">
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
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Preview Dialog */}
        <Dialog open={showPreviewDialog} onOpenChange={setShowPreviewDialog}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
            <DialogHeader>
              <DialogTitle>Certificate Preview</DialogTitle>
            </DialogHeader>
            <div
              className="border rounded-lg overflow-hidden"
              dangerouslySetInnerHTML={{ __html: getPreviewHtml() }}
            />
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
      </div>
    </AdminLayout>
  );
}
