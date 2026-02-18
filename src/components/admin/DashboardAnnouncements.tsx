import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  AlertTriangle,
  Info,
  Megaphone,
  Plus,
  Trash2,
  Pin,
  X,
  Loader2,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

interface Announcement {
  id: string;
  title: string;
  content: string;
  is_pinned: boolean;
  priority: "info" | "warning" | "urgent";
  created_by: string;
  created_at: string;
  expires_at: string | null;
  creator_name?: string | null;
}

const priorityConfig = {
  info: {
    icon: Info,
    label: "Info",
    badgeClass: "bg-primary/10 text-primary",
    borderClass: "border-l-primary",
    iconClass: "text-primary",
  },
  warning: {
    icon: AlertTriangle,
    label: "Warning",
    badgeClass: "bg-muted text-foreground",
    borderClass: "border-l-ring",
    iconClass: "text-ring",
  },
  urgent: {
    icon: Megaphone,
    label: "Urgent",
    badgeClass: "bg-destructive/10 text-destructive",
    borderClass: "border-l-destructive",
    iconClass: "text-destructive",
  },
};

export function DashboardAnnouncements() {
  const { adminUser } = useAdminAuth();
  const { toast } = useToast();
  const isAdmin = adminUser?.role === "admin";

  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [priority, setPriority] = useState<"info" | "warning" | "urgent">("info");
  const [isSaving, setIsSaving] = useState(false);

  const fetchAnnouncements = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("dashboard_announcements")
        .select("*, admin_users!created_by(full_name, email)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      const mapped = (data || []).map((row: any) => ({
        id: row.id,
        title: row.title,
        content: row.content,
        is_pinned: row.is_pinned,
        priority: row.priority as "info" | "warning" | "urgent",
        created_by: row.created_by,
        created_at: row.created_at,
        expires_at: row.expires_at,
        creator_name: row.admin_users?.full_name || row.admin_users?.email || null,
      }));

      // Filter out expired announcements
      const now = new Date();
      setAnnouncements(mapped.filter((a) => !a.expires_at || new Date(a.expires_at) > now));
    } catch (err) {
      console.error("Error fetching announcements:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnnouncements();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("dashboard-announcements")
      .on("postgres_changes", { event: "*", schema: "public", table: "dashboard_announcements" }, () => {
        fetchAnnouncements();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchAnnouncements]);

  const handleCreate = async () => {
    if (!title.trim() || !content.trim() || !adminUser?.id) return;
    setIsSaving(true);
    try {
      const { error } = await supabase.from("dashboard_announcements").insert({
        title: title.trim(),
        content: content.trim(),
        priority,
        is_pinned: true,
        created_by: adminUser.id,
      });
      if (error) throw error;
      toast({ title: "Announcement posted", description: "All admins will see this on the dashboard." });
      setTitle("");
      setContent("");
      setPriority("info");
      setShowDialog(false);
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const { error } = await supabase.from("dashboard_announcements").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Announcement removed" });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setDeletingId(null);
    }
  };

  if (!isLoading && announcements.length === 0 && !isAdmin) return null;

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Pin className="h-4 w-4 text-primary" />
              <CardTitle className="text-base">Announcements</CardTitle>
              {announcements.length > 0 && (
                <Badge variant="secondary" className="text-xs">{announcements.length}</Badge>
              )}
            </div>
            {isAdmin && (
              <Button size="sm" variant="outline" onClick={() => setShowDialog(true)}>
                <Plus className="h-4 w-4 mr-1" />
                Post
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading...
            </div>
          ) : announcements.length === 0 ? (
            <p className="text-sm text-muted-foreground italic">
              No active announcements. {isAdmin ? "Post one to broadcast a message to all admins." : ""}
            </p>
          ) : (
            <div className="space-y-3">
              {announcements.map((ann) => {
                const config = priorityConfig[ann.priority];
                const Icon = config.icon;
                return (
                  <div
                    key={ann.id}
                    className={cn(
                      "relative rounded-md border-l-4 bg-muted/40 px-4 py-3 pr-10",
                      config.borderClass
                    )}
                  >
                    <div className="flex items-start gap-2">
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", config.iconClass)} />
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{ann.title}</span>
                          <span className={cn("text-xs px-1.5 py-0.5 rounded-full font-medium", config.badgeClass)}>
                            {config.label}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{ann.content}</p>
                        <p className="text-xs text-muted-foreground mt-1.5">
                          Posted by {ann.creator_name || "Admin"} ·{" "}
                          {formatDistanceToNow(new Date(ann.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    {isAdmin && (
                      <button
                        className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                        onClick={() => handleDelete(ann.id)}
                        disabled={deletingId === ann.id}
                        title="Remove announcement"
                      >
                        {deletingId === ann.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <X className="h-3.5 w-3.5" />
                        )}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Megaphone className="h-5 w-5 text-primary" />
              Post Announcement
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="ann-title">Title</Label>
              <Input
                id="ann-title"
                placeholder="e.g. Cohort applications close Friday"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={100}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ann-content">Message</Label>
              <Textarea
                id="ann-content"
                placeholder="Details visible to all admin users on the dashboard..."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                rows={4}
                maxLength={500}
              />
              <p className="text-xs text-muted-foreground text-right">{content.length}/500</p>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={(v) => setPriority(v as typeof priority)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="info">
                    <div className="flex items-center gap-2">
                      <Info className="h-4 w-4 text-primary" />
                      Info — General notice
                    </div>
                  </SelectItem>
                  <SelectItem value="warning">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-ring" />
                      Warning — Needs attention
                    </div>
                  </SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2">
                      <Megaphone className="h-4 w-4 text-destructive" />
                      Urgent — Critical update
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!title.trim() || !content.trim() || isSaving}>
              {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Megaphone className="h-4 w-4 mr-2" />}
              Post Announcement
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
