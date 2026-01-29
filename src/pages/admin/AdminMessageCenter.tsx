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
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, MessageSquare, Smartphone, Users, History, Loader2, Search, Filter, CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

interface Application {
  id: string;
  full_name: string;
  student_phone: string;
  parent_name: string;
  parent_phone: string;
  status: string;
  province: string;
  country: string;
  cohort_id: string | null;
}

interface MessageLog {
  id: string;
  channel: "sms" | "whatsapp";
  recipient_phone: string;
  recipient_type: "learner" | "parent";
  message_content: string;
  status: string;
  twilio_sid: string | null;
  error_message: string | null;
  created_at: string;
}

interface MessageTemplate {
  id: string;
  template_key: string;
  name: string;
  channel: "sms" | "whatsapp";
  message_content: string;
}

export default function AdminMessageCenter() {
  const [activeTab, setActiveTab] = useState("compose");
  const [channel, setChannel] = useState<"sms" | "whatsapp" | "both">("sms");
  const [recipientType, setRecipientType] = useState<"learner" | "parent" | "both">("learner");
  const [message, setMessage] = useState("");
  const [selectedApplications, setSelectedApplications] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [provinceFilter, setProvinceFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSending, setIsSending] = useState(false);
  const queryClient = useQueryClient();
  const { adminUser } = useAdminAuth();

  // Fetch applications
  const { data: applications, isLoading: applicationsLoading } = useQuery({
    queryKey: ["applications-for-messaging"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("applications")
        .select("id, full_name, student_phone, parent_name, parent_phone, status, province, country, cohort_id")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Application[];
    },
  });

  // Fetch message logs
  const { data: messageLogs, isLoading: logsLoading } = useQuery({
    queryKey: ["message-logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      return data as MessageLog[];
    },
  });

  // Fetch message templates
  const { data: templates } = useQuery({
    queryKey: ["message-templates-for-compose"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("message_templates")
        .select("id, template_key, name, channel, message_content")
        .eq("is_active", true);

      if (error) throw error;
      return data as MessageTemplate[];
    },
  });

  // Filter applications
  const filteredApplications = applications?.filter((app) => {
    if (statusFilter !== "all" && app.status !== statusFilter) return false;
    if (provinceFilter !== "all" && app.province !== provinceFilter) return false;
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        app.full_name.toLowerCase().includes(query) ||
        app.student_phone.includes(query) ||
        app.parent_phone.includes(query)
      );
    }
    return true;
  }) || [];

  // Get unique provinces
  const provinces = [...new Set(applications?.map((a) => a.province) || [])].sort();

  const handleSelectAll = () => {
    if (selectedApplications.length === filteredApplications.length) {
      setSelectedApplications([]);
    } else {
      setSelectedApplications(filteredApplications.map((a) => a.id));
    }
  };

  const handleSelectApplication = (id: string) => {
    setSelectedApplications((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    );
  };

  const handleUseTemplate = (template: MessageTemplate) => {
    setMessage(template.message_content);
    if (template.channel !== "sms" && template.channel !== "whatsapp") return;
    setChannel(template.channel);
  };

  const buildRecipientsList = () => {
    const recipients: {
      phone: string;
      name: string;
      type: "learner" | "parent";
      applicationId: string;
    }[] = [];

    const selectedApps = applications?.filter((a) => selectedApplications.includes(a.id)) || [];

    selectedApps.forEach((app) => {
      if (recipientType === "learner" || recipientType === "both") {
        if (app.student_phone) {
          recipients.push({
            phone: app.student_phone,
            name: app.full_name,
            type: "learner",
            applicationId: app.id,
          });
        }
      }
      if (recipientType === "parent" || recipientType === "both") {
        if (app.parent_phone) {
          recipients.push({
            phone: app.parent_phone,
            name: app.parent_name,
            type: "parent",
            applicationId: app.id,
          });
        }
      }
    });

    return recipients;
  };

  const handleSendMessages = async () => {
    if (!message.trim()) {
      toast.error("Please enter a message");
      return;
    }

    if (selectedApplications.length === 0) {
      toast.error("Please select at least one recipient");
      return;
    }

    const recipients = buildRecipientsList();

    if (recipients.length === 0) {
      toast.error("No valid phone numbers found for selected recipients");
      return;
    }

    setIsSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-bulk-message", {
        body: {
          channel,
          recipients,
          message,
          sentBy: adminUser?.user_id,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(data.message);
        setMessage("");
        setSelectedApplications([]);
        queryClient.invalidateQueries({ queryKey: ["message-logs"] });
      } else {
        toast.error(data.message || "Failed to send messages");
      }
    } catch (error: any) {
      toast.error(error.message || "Failed to send messages");
    } finally {
      setIsSending(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "sent":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-destructive" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Send className="h-6 w-6" />
            Message Center
          </h1>
          <p className="text-muted-foreground mt-1">
            Send SMS and WhatsApp messages to applicants and parents
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="compose">Compose</TabsTrigger>
            <TabsTrigger value="logs">Message Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="compose" className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recipient Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Select Recipients
                  </CardTitle>
                  <CardDescription>
                    Choose who should receive the message
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Filters */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Statuses</SelectItem>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="approved">Approved</SelectItem>
                          <SelectItem value="rejected">Rejected</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Province</Label>
                      <Select value={provinceFilter} onValueChange={setProvinceFilter}>
                        <SelectTrigger>
                          <SelectValue placeholder="All provinces" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Provinces</SelectItem>
                          {provinces.map((p) => (
                            <SelectItem key={p} value={p}>
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or phone..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9"
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedApplications.length === filteredApplications.length && filteredApplications.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm">Select All</span>
                    </div>
                    <Badge variant="secondary">
                      {selectedApplications.length} selected
                    </Badge>
                  </div>

                  <ScrollArea className="h-[300px] border rounded-lg">
                    <div className="p-2 space-y-1">
                      {applicationsLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : filteredApplications.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                          No applications found
                        </p>
                      ) : (
                        filteredApplications.map((app) => (
                          <div
                            key={app.id}
                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-muted ${
                              selectedApplications.includes(app.id) ? "bg-primary/10" : ""
                            }`}
                            onClick={() => handleSelectApplication(app.id)}
                          >
                            <Checkbox
                              checked={selectedApplications.includes(app.id)}
                              onCheckedChange={() => handleSelectApplication(app.id)}
                            />
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm truncate">
                                {app.full_name}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {app.province} • {app.student_phone}
                              </div>
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {app.status}
                            </Badge>
                          </div>
                        ))
                      )}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>

              {/* Compose Message */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Compose Message
                  </CardTitle>
                  <CardDescription>Write your message</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Channel Selection */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Channel</Label>
                      <Select value={channel} onValueChange={(v) => setChannel(v as "sms" | "whatsapp" | "both")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sms">
                            <div className="flex items-center gap-2">
                              <Smartphone className="h-4 w-4" />
                              SMS Only
                            </div>
                          </SelectItem>
                          <SelectItem value="whatsapp">
                            <div className="flex items-center gap-2">
                              <MessageSquare className="h-4 w-4" />
                              WhatsApp Only
                            </div>
                          </SelectItem>
                          <SelectItem value="both">
                            <div className="flex items-center gap-2">
                              <Send className="h-4 w-4" />
                              Both Channels
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Send To</Label>
                      <Select value={recipientType} onValueChange={(v) => setRecipientType(v as "learner" | "parent" | "both")}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="learner">Learners Only</SelectItem>
                          <SelectItem value="parent">Parents Only</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Quick Templates */}
                  {templates && templates.length > 0 && (
                    <div className="space-y-2">
                      <Label>Quick Templates</Label>
                      <div className="flex flex-wrap gap-2">
                        {templates
                          .filter((t) => channel === "both" || t.channel === channel)
                          .slice(0, 5)
                          .map((t) => (
                            <Button
                              key={t.id}
                              variant="outline"
                              size="sm"
                              onClick={() => handleUseTemplate(t)}
                            >
                              {t.name}
                            </Button>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Message Input */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Message</Label>
                      <span className="text-sm text-muted-foreground">
                        {message.length} characters
                        {channel === "sms" && message.length > 160 && (
                          <span className="ml-2">
                            ({Math.ceil(message.length / 153)} SMS segments)
                          </span>
                        )}
                      </span>
                    </div>
                    <Textarea
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Type your message here... Use {{name}} to personalize."
                      rows={6}
                    />
                    <p className="text-xs text-muted-foreground">
                      Use {"{{name}}"} to insert the recipient's name automatically.
                    </p>
                  </div>

                  {/* Summary */}
                  <div className="p-4 bg-muted rounded-lg">
                    <h4 className="font-medium mb-2">Summary</h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• {selectedApplications.length} applications selected</li>
                      <li>
                        • {buildRecipientsList().length} messages will be sent
                      </li>
                      <li>
                        • Channel: {channel === "both" ? "SMS + WhatsApp" : channel.toUpperCase()}
                      </li>
                    </ul>
                  </div>

                  {/* Send Button */}
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        className="w-full"
                        size="lg"
                        disabled={isSending || !message.trim() || selectedApplications.length === 0}
                      >
                        {isSending ? (
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        ) : (
                          <Send className="h-4 w-4 mr-2" />
                        )}
                        Send Messages
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Confirm Send</AlertDialogTitle>
                        <AlertDialogDescription>
                          You are about to send {buildRecipientsList().length} messages via{" "}
                          {channel === "both" ? "SMS and WhatsApp" : channel.toUpperCase()}.
                          This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleSendMessages}>
                          Send Now
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <History className="h-5 w-5" />
                  Message Logs
                </CardTitle>
                <CardDescription>
                  Recent message activity
                </CardDescription>
              </CardHeader>
              <CardContent>
                {logsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : messageLogs?.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    No messages sent yet
                  </p>
                ) : (
                  <ScrollArea className="h-[500px]">
                    <div className="space-y-3">
                      {messageLogs?.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-4 p-4 border rounded-lg"
                        >
                          <div className="flex-shrink-0">
                            {log.channel === "sms" ? (
                              <Smartphone className="h-5 w-5 text-primary" />
                            ) : (
                              <MessageSquare className="h-5 w-5 text-green-500" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-sm">
                                {log.recipient_phone}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {log.recipient_type}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                {format(new Date(log.created_at), "PPp")}
                              </span>
                            </div>
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {log.message_content}
                            </p>
                            {log.error_message && (
                              <p className="text-xs text-destructive mt-1">
                                Error: {log.error_message}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0 flex items-center gap-2">
                            {getStatusIcon(log.status)}
                            <Badge
                              variant={log.status === "sent" ? "default" : "destructive"}
                              className="text-xs"
                            >
                              {log.status}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
