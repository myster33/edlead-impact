import { useState, useEffect } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Sun, Moon, Monitor, Save, RotateCcw, Eye, Code, Mail, Send, History, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";

interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  subject: string;
  html_content: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface TemplateHistory {
  id: string;
  subject: string;
  html_content: string;
  changed_at: string;
  change_reason: string | null;
}

const defaultTemplates: Omit<EmailTemplate, "id" | "updated_at">[] = [
  {
    template_key: "applicant-approved",
    name: "Application Approved",
    category: "Applications",
    subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
    variables: ["applicant_name", "reference_number"],
    is_active: true,
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
      .bg-light { background-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center;">
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/email-assets/edlead-logo-full.png" alt="edLEAD" style="height: 50px; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Application Approved!</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{applicant_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Congratulations! 🎉 We are thrilled to inform you that your application to the edLEAD Programme has been <strong style="color: #10b981;">approved</strong>!</p>
        <div class="bg-light" style="background-color: #f0fdf4; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px;"><strong>Reference Number:</strong> {{reference_number}}</p>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We will be in touch shortly with next steps and additional information about the programme.</p>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    template_key: "applicant-rejected",
    name: "Application Rejected",
    category: "Applications",
    subject: "Update on Your edLEAD Application",
    variables: ["applicant_name", "reference_number"],
    is_active: true,
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center;">
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/email-assets/edlead-logo-full.png" alt="edLEAD" style="height: 50px; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Application Update</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{applicant_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Thank you for your interest in the edLEAD Programme. After careful consideration, we regret to inform you that your application was not successful at this time.</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">We encourage you to apply again in the future. Keep developing your leadership skills!</p>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    template_key: "story-approved",
    name: "Story Approved",
    category: "Blog",
    subject: "🎉 Your Story Has Been Published on edLEAD!",
    variables: ["author_name", "story_title", "story_url"],
    is_active: true,
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
      .bg-light { background-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center;">
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/email-assets/edlead-logo-full.png" alt="edLEAD" style="height: 50px; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Story Published!</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{author_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Great news! 🎉 Your story "<strong>{{story_title}}</strong>" has been approved and is now live on the edLEAD blog!</p>
        <div style="text-align: center; margin: 25px 0;">
          <a href="{{story_url}}" style="display: inline-block; background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 8px; font-weight: 600;">View Your Story</a>
        </div>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Thank you for sharing your experience with the edLEAD community!</p>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    template_key: "contact-confirmation",
    name: "Contact Confirmation",
    category: "General",
    subject: "Thank You for Contacting edLEAD",
    variables: ["name", "message"],
    is_active: true,
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
      .quote-box { background-color: #374151 !important; border-color: #4b5563 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center;">
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/email-assets/edlead-logo-full.png" alt="edLEAD" style="height: 50px; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">Message Received</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Dear <strong>{{name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Thank you for reaching out to us. We have received your message and will get back to you as soon as possible.</p>
        <div class="quote-box" style="background-color: #f9fafb; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0; border-radius: 0 8px 8px 0;">
          <p style="margin: 0; font-size: 14px; font-style: italic; color: inherit;">"{{message}}"</p>
        </div>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">Best regards,<br><strong>The edLEAD Team</strong></p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
  {
    template_key: "admin-notification",
    name: "Admin Notification",
    category: "Admin",
    subject: "Admin Notification - edLEAD",
    variables: ["admin_name", "notification_type", "details"],
    is_active: true,
    html_content: `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    @media (prefers-color-scheme: dark) {
      body { background-color: #1a1a2e !important; }
      .email-content { background-color: #1f2937 !important; color: #e5e7eb !important; }
      .email-header { background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%) !important; }
      .text-gray { color: #9ca3af !important; }
      .border-gray { border-color: #374151 !important; }
      .details-box { background-color: #374151 !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div class="email-content" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
      <div class="email-header" style="background: linear-gradient(135deg, #1e3a5f 0%, #3b82f6 100%); padding: 30px; text-align: center;">
        <img src="https://klxrjohcpaxviltzpxam.supabase.co/storage/v1/object/public/email-assets/edlead-logo-full.png" alt="edLEAD" style="height: 50px; margin-bottom: 15px;">
        <h2 style="color: #ffffff; margin: 0; font-size: 24px;">{{notification_type}}</h2>
      </div>
      <div style="padding: 30px;">
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">Hello <strong>{{admin_name}}</strong>,</p>
        <p style="font-size: 16px; line-height: 1.6; color: inherit;">This is an automated notification from the edLEAD Admin System.</p>
        <div class="details-box" style="background-color: #f9fafb; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: inherit;">{{details}}</p>
        </div>
        <p class="text-gray" style="font-size: 14px; color: #6b7280; margin-top: 30px;">This is an automated message from the edLEAD Admin System.</p>
      </div>
      <div class="border-gray" style="border-top: 1px solid #e5e7eb; padding: 20px; text-align: center;">
        <p class="text-gray" style="font-size: 12px; color: #9ca3af; margin: 0;">© 2025 edLEAD Programme. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>`,
  },
];

type PreviewMode = "light" | "dark" | "auto";

export default function AdminEmailTemplates() {
  const queryClient = useQueryClient();
  const [selectedTemplateKey, setSelectedTemplateKey] = useState<string>("applicant-approved");
  const [editedHtml, setEditedHtml] = useState("");
  const [editedSubject, setEditedSubject] = useState("");
  const [previewMode, setPreviewMode] = useState<PreviewMode>("auto");
  const [activeTab, setActiveTab] = useState("preview");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [historyOpen, setHistoryOpen] = useState(false);

  // Fetch templates from database
  const { data: templates, isLoading: templatesLoading, refetch } = useQuery({
    queryKey: ["email-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("email_templates")
        .select("*")
        .order("category", { ascending: true });
      
      if (error) throw error;
      
      // Parse variables from jsonb
      return (data || []).map(t => ({
        ...t,
        variables: Array.isArray(t.variables) ? t.variables as string[] : []
      })) as EmailTemplate[];
    },
  });

  // Fetch template history
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ["email-template-history", selectedTemplateKey],
    queryFn: async () => {
      const template = templates?.find(t => t.template_key === selectedTemplateKey);
      if (!template) return [];
      
      const { data, error } = await supabase
        .from("email_template_history")
        .select("*")
        .eq("template_id", template.id)
        .order("changed_at", { ascending: false })
        .limit(20);
      
      if (error) throw error;
      return data as TemplateHistory[];
    },
    enabled: !!templates && templates.length > 0,
  });

  // Initialize templates if database is empty
  const initializeTemplatesMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      
      const templatesWithUser = defaultTemplates.map(t => ({
        ...t,
        updated_by: session.session.user.id,
      }));
      
      const { error } = await supabase
        .from("email_templates")
        .upsert(templatesWithUser, { onConflict: "template_key" });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      toast.success("Templates initialized successfully");
    },
    onError: (error) => {
      toast.error("Failed to initialize templates", { description: error.message });
    },
  });

  // Save template mutation
  const saveTemplateMutation = useMutation({
    mutationFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error("Not authenticated");
      
      const template = templates?.find(t => t.template_key === selectedTemplateKey);
      if (!template) throw new Error("Template not found");
      
      // Save to history first
      const { error: historyError } = await supabase
        .from("email_template_history")
        .insert({
          template_id: template.id,
          subject: template.subject,
          html_content: template.html_content,
          changed_by: session.session.user.id,
        });
      
      if (historyError) console.error("Failed to save history:", historyError);
      
      // Update template
      const { error } = await supabase
        .from("email_templates")
        .update({
          subject: editedSubject,
          html_content: editedHtml,
          updated_by: session.session.user.id,
        })
        .eq("id", template.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["email-templates"] });
      queryClient.invalidateQueries({ queryKey: ["email-template-history"] });
      toast.success("Template saved successfully!", {
        description: "Changes will be reflected in future emails."
      });
    },
    onError: (error) => {
      toast.error("Failed to save template", { description: error.message });
    },
  });

  // Get selected template
  const selectedTemplate = templates?.find(t => t.template_key === selectedTemplateKey) 
    || (defaultTemplates.find(t => t.template_key === selectedTemplateKey) as EmailTemplate | undefined);

  // Update edited values when template changes
  useEffect(() => {
    if (selectedTemplate) {
      setEditedHtml(selectedTemplate.html_content);
      setEditedSubject(selectedTemplate.subject);
      const defaults: Record<string, string> = {};
      selectedTemplate.variables.forEach(v => {
        defaults[v] = `[${v}]`;
      });
      setTestVariables(defaults);
    }
  }, [selectedTemplate]);

  const handleTemplateChange = (templateKey: string) => {
    setSelectedTemplateKey(templateKey);
  };

  const replaceVariables = (html: string) => {
    let result = html;
    Object.entries(testVariables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{{${key}}}`, 'g'), value || `[${key}]`);
    });
    return result;
  };

  const getPreviewStyles = () => {
    if (previewMode === "dark") {
      return { backgroundColor: "#1a1a2e", colorScheme: "dark" as const };
    } else if (previewMode === "light") {
      return { backgroundColor: "#f3f4f6", colorScheme: "light" as const };
    }
    return {};
  };

  const handleSave = () => {
    saveTemplateMutation.mutate();
  };

  const handleReset = () => {
    const defaultTemplate = defaultTemplates.find(t => t.template_key === selectedTemplateKey);
    if (defaultTemplate) {
      setEditedHtml(defaultTemplate.html_content);
      setEditedSubject(defaultTemplate.subject);
      toast.info("Template reset to default");
    }
  };

  const handleRestoreFromHistory = (historyItem: TemplateHistory) => {
    setEditedHtml(historyItem.html_content);
    setEditedSubject(historyItem.subject);
    setHistoryOpen(false);
    toast.info("Template restored from history. Click Save to apply changes.");
  };

  const handleSendTest = async () => {
    toast.info("Test email feature coming soon", {
      description: "This will send a test email to your admin email address."
    });
  };

  const displayTemplates = templates && templates.length > 0 ? templates : defaultTemplates.map((t, i) => ({
    ...t,
    id: `default-${i}`,
    updated_at: new Date().toISOString(),
  }));

  const categories = [...new Set(displayTemplates.map(t => t.category))];
  const hasChanges = selectedTemplate && (editedHtml !== selectedTemplate.html_content || editedSubject !== selectedTemplate.subject);

  if (templatesLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">Preview and customize email templates with light/dark mode support</p>
          </div>
          <div className="flex gap-2">
            {(!templates || templates.length === 0) && (
              <Button 
                variant="outline" 
                onClick={() => initializeTemplatesMutation.mutate()}
                disabled={initializeTemplatesMutation.isPending}
              >
                {initializeTemplatesMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                <RefreshCw className="h-4 w-4 mr-2" />
                Initialize Templates
              </Button>
            )}
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset to Default
            </Button>
            <Button 
              onClick={handleSave} 
              disabled={!hasChanges || saveTemplateMutation.isPending}
            >
              {saveTemplateMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Selector */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Templates
              </CardTitle>
              <CardDescription>Select a template to preview or edit</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedTemplateKey} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{category}</div>
                      {displayTemplates.filter(t => t.category === category).map(template => (
                        <SelectItem key={template.template_key} value={template.template_key}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              {selectedTemplate && (
                <>
                  <div className="p-3 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">{selectedTemplate.name}</span>
                      <Badge variant="secondary">{selectedTemplate.category}</Badge>
                    </div>
                    {selectedTemplate.updated_at && (
                      <p className="text-xs text-muted-foreground">
                        Last updated: {format(new Date(selectedTemplate.updated_at), "PPp")}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Subject Line</Label>
                    <Input
                      value={editedSubject}
                      onChange={(e) => setEditedSubject(e.target.value)}
                      placeholder="Email subject"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label className="text-sm font-medium">Test Variables</Label>
                    {selectedTemplate.variables.map(variable => (
                      <div key={variable} className="space-y-1">
                        <Label className="text-xs text-muted-foreground">{variable}</Label>
                        <Input
                          value={testVariables[variable] || ""}
                          onChange={(e) => setTestVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                          placeholder={`Enter ${variable}`}
                        />
                      </div>
                    ))}
                  </div>
                </>
              )}

              <div className="space-y-3">
                <Label className="text-sm font-medium">Preview Mode</Label>
                <div className="flex gap-1 p-1 bg-muted rounded-lg">
                  <Button
                    variant={previewMode === "light" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewMode("light")}
                  >
                    <Sun className="h-4 w-4 mr-1" />
                    Light
                  </Button>
                  <Button
                    variant={previewMode === "dark" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewMode("dark")}
                  >
                    <Moon className="h-4 w-4 mr-1" />
                    Dark
                  </Button>
                  <Button
                    variant={previewMode === "auto" ? "default" : "ghost"}
                    size="sm"
                    className="flex-1"
                    onClick={() => setPreviewMode("auto")}
                  >
                    <Monitor className="h-4 w-4 mr-1" />
                    Auto
                  </Button>
                </div>
              </div>

              <div className="flex gap-2">
                <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <History className="h-4 w-4 mr-2" />
                      History
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>Template History</DialogTitle>
                      <DialogDescription>
                        View and restore previous versions of this template
                      </DialogDescription>
                    </DialogHeader>
                    <ScrollArea className="max-h-[400px]">
                      {historyLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : history && history.length > 0 ? (
                        <div className="space-y-3">
                          {history.map((item) => (
                            <div key={item.id} className="p-3 border rounded-lg">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium">{item.subject}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(item.changed_at), "PPp")}
                                </span>
                              </div>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRestoreFromHistory(item)}
                              >
                                Restore this version
                              </Button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center text-muted-foreground py-8">
                          No history available for this template
                        </p>
                      )}
                    </ScrollArea>
                  </DialogContent>
                </Dialog>

                <Button variant="outline" className="flex-1" onClick={handleSendTest}>
                  <Send className="h-4 w-4 mr-2" />
                  Test
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Preview/Editor */}
          <Card className="lg:col-span-2">
            <CardHeader className="pb-3">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="flex items-center justify-between">
                  <TabsList>
                    <TabsTrigger value="preview" className="flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Preview
                    </TabsTrigger>
                    <TabsTrigger value="code" className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      HTML Code
                    </TabsTrigger>
                  </TabsList>
                  <div className="flex items-center gap-2">
                    {hasChanges && (
                      <Badge variant="secondary" className="bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200">
                        Unsaved changes
                      </Badge>
                    )}
                    {previewMode !== "auto" && (
                      <Badge variant="outline">
                        {previewMode === "dark" ? <Moon className="h-3 w-3 mr-1" /> : <Sun className="h-3 w-3 mr-1" />}
                        {previewMode} mode
                      </Badge>
                    )}
                  </div>
                </div>
              </Tabs>
            </CardHeader>
            <CardContent>
              <TabsContent value="preview" className="mt-0">
                <div 
                  className="border rounded-lg overflow-hidden"
                  style={getPreviewStyles()}
                >
                  <div className="p-2 bg-muted border-b flex items-center gap-2">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-destructive" />
                      <div className="w-3 h-3 rounded-full bg-amber-500" />
                      <div className="w-3 h-3 rounded-full bg-green-500" />
                    </div>
                    <span className="text-xs text-muted-foreground ml-2">Email Preview</span>
                  </div>
                  <div className="p-4" style={getPreviewStyles()}>
                    <div className="mb-4 p-3 bg-muted/50 rounded-lg border">
                      <p className="text-sm"><strong>Subject:</strong> {editedSubject}</p>
                    </div>
                    <iframe
                      srcDoc={replaceVariables(editedHtml)}
                      className="w-full h-[500px] border-0 rounded-lg"
                      title="Email Preview"
                      style={getPreviewStyles()}
                    />
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="code" className="mt-0">
                <Textarea
                  value={editedHtml}
                  onChange={(e) => setEditedHtml(e.target.value)}
                  className="font-mono text-sm min-h-[600px]"
                  placeholder="Enter HTML code..."
                />
              </TabsContent>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
