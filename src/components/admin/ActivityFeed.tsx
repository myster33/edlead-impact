import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  CheckCircle,
  XCircle,
  BookOpen,
  Users,
  Settings,
  Activity,
  Lock,
  Award,
} from "lucide-react";

interface FeedItem {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  icon: React.ComponentType<{ className?: string }>;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  badgeLabel: string;
}

const getIconForAction = (action: string) => {
  if (action.includes("approved")) return { icon: CheckCircle, variant: "default" as const, label: "Approved" };
  if (action.includes("rejected")) return { icon: XCircle, variant: "destructive" as const, label: "Rejected" };
  if (action.includes("blog") || action.includes("story")) return { icon: BookOpen, variant: "secondary" as const, label: "Story" };
  if (action.includes("user") || action.includes("admin")) return { icon: Users, variant: "outline" as const, label: "Admin" };
  if (action.includes("certificate")) return { icon: Award, variant: "default" as const, label: "Certificate" };
  if (action.includes("permission")) return { icon: Lock, variant: "secondary" as const, label: "Permission" };
  if (action.includes("setting")) return { icon: Settings, variant: "outline" as const, label: "Settings" };
  return { icon: Activity, variant: "outline" as const, label: action.split("_").join(" ") };
};

const formatAction = (action: string, tableName: string) => {
  const readable = action.replace(/_/g, " ");
  return readable.charAt(0).toUpperCase() + readable.slice(1);
};

export function ActivityFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchActivity = async () => {
    try {
      const [auditRes, appsRes, blogsRes] = await Promise.all([
        supabase
          .from("admin_audit_log")
          .select("id, action, table_name, created_at")
          .order("created_at", { ascending: false })
          .limit(15),
        supabase
          .from("applications")
          .select("id, full_name, school_name, created_at, status")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("blog_posts")
          .select("id, title, author_name, created_at, status")
          .eq("status", "pending")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const items: FeedItem[] = [];

      auditRes.data?.forEach((log) => {
        const { icon, variant, label } = getIconForAction(log.action);
        items.push({
          id: `audit-${log.id}`,
          type: "audit",
          description: formatAction(log.action, log.table_name),
          timestamp: log.created_at || new Date().toISOString(),
          icon,
          badgeVariant: variant,
          badgeLabel: label,
        });
      });

      appsRes.data?.forEach((app) => {
        items.push({
          id: `app-${app.id}`,
          type: "application",
          description: `New application from ${app.full_name} (${app.school_name})`,
          timestamp: app.created_at,
          icon: FileText,
          badgeVariant: "default",
          badgeLabel: "Application",
        });
      });

      blogsRes.data?.forEach((post) => {
        items.push({
          id: `blog-${post.id}`,
          type: "blog",
          description: `Story "${post.title}" by ${post.author_name} awaiting review`,
          timestamp: post.created_at,
          icon: BookOpen,
          badgeVariant: "secondary",
          badgeLabel: "Pending Story",
        });
      });

      // Sort by timestamp descending, take top 20
      items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setFeedItems(items.slice(0, 20));
    } catch (error) {
      console.error("Error fetching activity feed:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    const channel = supabase
      .channel("activity-feed")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_audit_log" }, () => fetchActivity())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "applications" }, () => fetchActivity())
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "blog_posts" }, () => fetchActivity())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Live Activity Feed</CardTitle>
        </div>
        <CardDescription>Recent events across the platform, updated in real-time</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-5 w-5 animate-spin mr-2" />
            Loading activity...
          </div>
        ) : feedItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No recent activity to display.</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {feedItems.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
                  >
                    <div className="mt-0.5 p-1.5 rounded-full bg-primary/10">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground leading-snug">{item.description}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={item.badgeVariant} className="text-xs">
                          {item.badgeLabel}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
