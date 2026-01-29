import { useState } from "react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Smartphone, Save, RotateCcw, Eye, History, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { format } from "date-fns";
import { useAdminAuth } from "@/contexts/AdminAuthContext";

interface MessageTemplate {
  id: string;
  template_key: string;
  name: string;
  category: string;
  channel: "sms" | "whatsapp";
  message_content: string;
  variables: string[];
  is_active: boolean;
  updated_at: string;
}

interface TemplateHistory {
  id: string;
  message_content: string;
  changed_at: string;
  change_reason: string | null;
}

const SMS_CHAR_LIMIT = 160;
const WHATSAPP_CHAR_LIMIT = 4096;

export default function AdminMessageTemplates() {
  const [activeChannel, setActiveChannel] = useState<"sms" | "whatsapp">("sms");
  const [selectedTemplate, setSelectedTemplate] = useState<MessageTemplate | null>(null);
  const [editedContent, setEditedContent] = useState("");
  const [testPhone, setTestPhone] = useState("");
  const [testVariables, setTestVariables] = useState<Record<string, string>>({});
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { adminUser } = useAdminAuth();

  const { data: templates, isLoading } = useQuery({
    queryKey: ["message-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("*")
        .order("category", { ascending: true });

      if (error) throw error;
      return data as unknown as MessageTemplate[];
    },
  });

  const { data: history } = useQuery({
    queryKey: ["message-template-history", selectedTemplate?.id],
    queryFn: async () => {
      if (!selectedTemplate) return [];
      const { data, error } = await supabase
        .from("message_template_history")
        .select("*")
        .eq("template_id", selectedTemplate.id)
        .order("changed_at", { ascending: false })
        .limit(10);

      if (error) throw error;
      return data as TemplateHistory[];
    },
    enabled: !!selectedTemplate,
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, content }: { id: string; content: string }) => {
      // Save history first
      if (selectedTemplate) {
        await supabase.from("message_template_history").insert({
          template_id: id,
          message_content: selectedTemplate.message_content,
          changed_by: adminUser?.user_id,
        });
      }

      const { error } = await supabase
        .from("message_templates")
        .update({ 
          message_content: content, 
          updated_at: new Date().toISOString(),
          updated_by: adminUser?.user_id 
        })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["message-templates"] });
      queryClient.invalidateQueries({ queryKey: ["message-template-history"] });
      toast.success("Template saved successfully");
    },
    onError: () => {
      toast.error("Failed to save template");
    },
  });

  const handleSelectTemplate = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setEditedContent(template.message_content);
    // Initialize test variables
    const vars: Record<string, string> = {};
    template.variables.forEach((v) => {
      vars[v] = `[${v}]`;
    });
    setTestVariables(vars);
  };

  const handleSave = () => {
    if (!selectedTemplate) return;
    updateMutation.mutate({ id: selectedTemplate.id, content: editedContent });
  };

  const handleReset = () => {
    if (selectedTemplate) {
      setEditedContent(selectedTemplate.message_content);
    }
  };

  const handleRestoreVersion = (historicContent: string) => {
    setEditedContent(historicContent);
    toast.info("Version restored. Click Save to apply.");
  };

  const getPreviewContent = () => {
    let preview = editedContent;
    Object.entries(testVariables).forEach(([key, value]) => {
      preview = preview.replace(new RegExp(`\\{\\{${key}\\}\\}`, "gi"), value);
    });
    return preview;
  };

  const handleSendTest = async () => {
    if (!testPhone || !selectedTemplate) {
      toast.error("Please enter a test phone number");
      return;
    }

    setIsSending(true);
    try {
      const previewContent = getPreviewContent();
      const endpoint = selectedTemplate.channel === "sms" ? "send-sms" : "send-whatsapp";
      
      const { data, error } = await supabase.functions.invoke(endpoint, {
        body: {
          to: testPhone,
          message: previewContent,
          templateKey: selectedTemplate.template_key,
          recipientType: "learner",
        },
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(`Test ${selectedTemplate.channel.toUpperCase()} sent successfully`);
      } else {
        toast.error(data.message || data.error || "Failed to send test message");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send test message");
    } finally {
      setIsSending(false);
    }
  };

  const filteredTemplates = templates?.filter((t) => t.channel === activeChannel) || [];
  const charLimit = activeChannel === "sms" ? SMS_CHAR_LIMIT : WHATSAPP_CHAR_LIMIT;
  const currentLength = editedContent.length;
  const isOverLimit = currentLength > charLimit;

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <MessageSquare className="h-6 w-6" />
            Message Templates
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage SMS and WhatsApp message templates for automated notifications
          </p>
        </div>

        <Tabs value={activeChannel} onValueChange={(v) => setActiveChannel(v as "sms" | "whatsapp")}>
          <TabsList>
            <TabsTrigger value="sms" className="flex items-center gap-2">
              <Smartphone className="h-4 w-4" />
              SMS Templates
            </TabsTrigger>
            <TabsTrigger value="whatsapp" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              WhatsApp Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeChannel} className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Template List */}
              <Card className="lg:col-span-1">
                <CardHeader>
                  <CardTitle className="text-lg">Templates</CardTitle>
                  <CardDescription>Select a template to edit</CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-2">
                      {filteredTemplates.map((template) => (
                        <button
                          key={template.id}
                          onClick={() => handleSelectTemplate(template)}
                          className={`w-full text-left p-3 rounded-lg border transition-colors ${
                            selectedTemplate?.id === template.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:border-primary/50"
                          }`}
                        >
                          <div className="font-medium text-sm">{template.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">
                            {template.category}
                          </div>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={template.is_active ? "default" : "secondary"} className="text-xs">
                              {template.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                        </button>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Template Editor */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        {selectedTemplate?.name || "Select a Template"}
                      </CardTitle>
                      {selectedTemplate && (
                        <CardDescription>
                          {selectedTemplate.category} • Last updated:{" "}
                          {format(new Date(selectedTemplate.updated_at), "PPp")}
                        </CardDescription>
                      )}
                    </div>
                    {selectedTemplate && (
                      <div className="flex gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <History className="h-4 w-4 mr-2" />
                              History
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Template History</DialogTitle>
                              <DialogDescription>
                                Previous versions of this template
                              </DialogDescription>
                            </DialogHeader>
                            <ScrollArea className="h-[400px]">
                              <div className="space-y-4">
                                {history?.map((h) => (
                                  <div key={h.id} className="p-4 border rounded-lg">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-sm text-muted-foreground">
                                        {format(new Date(h.changed_at), "PPp")}
                                      </span>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleRestoreVersion(h.message_content)}
                                      >
                                        <RotateCcw className="h-3 w-3 mr-1" />
                                        Restore
                                      </Button>
                                    </div>
                                    <pre className="text-xs bg-muted p-2 rounded whitespace-pre-wrap">
                                      {h.message_content}
                                    </pre>
                                  </div>
                                ))}
                                {!history?.length && (
                                  <p className="text-muted-foreground text-center py-8">
                                    No history available
                                  </p>
                                )}
                              </div>
                            </ScrollArea>
                          </DialogContent>
                        </Dialog>
                      </div>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  {selectedTemplate ? (
                    <div className="space-y-6">
                      {/* Message Editor */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <Label>Message Content</Label>
                          <span className={`text-sm ${isOverLimit ? "text-destructive" : "text-muted-foreground"}`}>
                            {currentLength} / {charLimit} characters
                            {activeChannel === "sms" && currentLength > SMS_CHAR_LIMIT && (
                              <span className="ml-2">
                                ({Math.ceil(currentLength / 153)} SMS segments)
                              </span>
                            )}
                          </span>
                        </div>
                        <Textarea
                          value={editedContent}
                          onChange={(e) => setEditedContent(e.target.value)}
                          rows={8}
                          className="font-mono text-sm"
                        />
                        <div className="flex flex-wrap gap-2">
                          <span className="text-sm text-muted-foreground">Variables:</span>
                          {selectedTemplate.variables.map((v) => (
                            <Badge
                              key={v}
                              variant="outline"
                              className="cursor-pointer"
                              onClick={() =>
                                setEditedContent((prev) => prev + `{{${v}}}`)
                              }
                            >
                              {`{{${v}}}`}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Preview */}
                      <div className="space-y-2">
                        <Label>Preview</Label>
                        <div className="p-4 bg-muted rounded-lg">
                          <pre className="whitespace-pre-wrap text-sm">
                            {getPreviewContent()}
                          </pre>
                        </div>
                      </div>

                      {/* Test Variables */}
                      <div className="space-y-4 border-t pt-4">
                        <Label>Test Variables</Label>
                        <div className="grid grid-cols-2 gap-4">
                          {selectedTemplate.variables.map((v) => (
                            <div key={v} className="space-y-1">
                              <Label className="text-xs">{v}</Label>
                              <Input
                                value={testVariables[v] || ""}
                                onChange={(e) =>
                                  setTestVariables((prev) => ({
                                    ...prev,
                                    [v]: e.target.value,
                                  }))
                                }
                                placeholder={`Enter ${v}`}
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Send Test */}
                      <div className="space-y-2 border-t pt-4">
                        <Label>Send Test Message</Label>
                        <div className="flex gap-2">
                          <Input
                            value={testPhone}
                            onChange={(e) => setTestPhone(e.target.value)}
                            placeholder="Enter phone number (e.g., 0821234567)"
                            className="flex-1"
                          />
                          <Button
                            onClick={handleSendTest}
                            disabled={isSending || !testPhone}
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                              <Send className="h-4 w-4 mr-2" />
                            )}
                            Send Test
                          </Button>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 border-t pt-4">
                        <Button onClick={handleSave} disabled={updateMutation.isPending}>
                          {updateMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          ) : (
                            <Save className="h-4 w-4 mr-2" />
                          )}
                          Save Changes
                        </Button>
                        <Button variant="outline" onClick={handleReset}>
                          <RotateCcw className="h-4 w-4 mr-2" />
                          Reset
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Select a template from the list to edit</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
