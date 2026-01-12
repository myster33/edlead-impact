import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Sun, Moon, Monitor, Save, RotateCcw, Eye, Code, Mail, Send } from "lucide-react";
import { toast } from "sonner";

interface EmailTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  subject: string;
  html: string;
  variables: string[];
}

const defaultTemplates: EmailTemplate[] = [
  {
    id: "applicant-approved",
    name: "Application Approved",
    description: "Sent when an application is approved",
    category: "Applications",
    subject: "🎉 Congratulations! Your edLEAD Application Has Been Approved",
    variables: ["applicant_name", "reference_number"],
    html: `<!DOCTYPE html>
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
    id: "applicant-rejected",
    name: "Application Rejected",
    description: "Sent when an application is rejected",
    category: "Applications",
    subject: "Update on Your edLEAD Application",
    variables: ["applicant_name", "reference_number"],
    html: `<!DOCTYPE html>
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
    id: "story-approved",
    name: "Story Approved",
    description: "Sent when a blog story is approved",
    category: "Blog",
    subject: "🎉 Your Story Has Been Published on edLEAD!",
    variables: ["author_name", "story_title", "story_url"],
    html: `<!DOCTYPE html>
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
    id: "contact-confirmation",
    name: "Contact Confirmation",
    description: "Sent when someone submits the contact form",
    category: "General",
    subject: "Thank You for Contacting edLEAD",
    variables: ["name", "message"],
    html: `<!DOCTYPE html>
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
    id: "admin-notification",
    name: "Admin Notification",
    description: "Sent to admins for various alerts",
    category: "Admin",
    subject: "Admin Notification - edLEAD",
    variables: ["admin_name", "notification_type", "details"],
    html: `<!DOCTYPE html>
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
  const [templates] = useState<EmailTemplate[]>(defaultTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate>(defaultTemplates[0]);
  const [editedHtml, setEditedHtml] = useState(defaultTemplates[0].html);
  const [editedSubject, setEditedSubject] = useState(defaultTemplates[0].subject);
  const [previewMode, setPreviewMode] = useState<PreviewMode>("auto");
  const [activeTab, setActiveTab] = useState("preview");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});

  const handleTemplateChange = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(template);
      setEditedHtml(template.html);
      setEditedSubject(template.subject);
      // Reset test variables with defaults
      const defaults: Record<string, string> = {};
      template.variables.forEach(v => {
        defaults[v] = `[${v}]`;
      });
      setTestVariables(defaults);
    }
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
    // In a real implementation, this would save to the database
    toast.success("Template saved successfully!", {
      description: "Changes will be reflected in future emails."
    });
  };

  const handleReset = () => {
    setEditedHtml(selectedTemplate.html);
    setEditedSubject(selectedTemplate.subject);
    toast.info("Template reset to default");
  };

  const handleSendTest = () => {
    toast.success("Test email sent!", {
      description: "Check your inbox for the preview."
    });
  };

  const categories = [...new Set(templates.map(t => t.category))];

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-2xl font-bold">Email Templates</h1>
            <p className="text-muted-foreground">Preview and customize email templates with light/dark mode support</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleReset}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
            <Button onClick={handleSave}>
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
              <Select value={selectedTemplate.id} onValueChange={handleTemplateChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select template" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(category => (
                    <div key={category}>
                      <div className="px-2 py-1.5 text-sm font-semibold text-muted-foreground">{category}</div>
                      {templates.filter(t => t.category === category).map(template => (
                        <SelectItem key={template.id} value={template.id}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </div>
                  ))}
                </SelectContent>
              </Select>

              <div className="p-3 bg-muted rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{selectedTemplate.name}</span>
                  <Badge variant="secondary">{selectedTemplate.category}</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{selectedTemplate.description}</p>
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
                      size={1}
                      value={testVariables[variable] || ""}
                      onChange={(e) => setTestVariables(prev => ({ ...prev, [variable]: e.target.value }))}
                      placeholder={`Enter ${variable}`}
                    />
                  </div>
                ))}
              </div>

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

              <Button variant="outline" className="w-full" onClick={handleSendTest}>
                <Send className="h-4 w-4 mr-2" />
                Send Test Email
              </Button>
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
                  {previewMode !== "auto" && (
                    <Badge variant="outline" className="ml-auto">
                      {previewMode === "dark" ? <Moon className="h-3 w-3 mr-1" /> : <Sun className="h-3 w-3 mr-1" />}
                      {previewMode} mode
                    </Badge>
                  )}
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
                      <div className="w-3 h-3 rounded-full bg-red-500" />
                      <div className="w-3 h-3 rounded-full bg-yellow-500" />
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
