import { useEffect, useState } from "react";
import { formatDistanceToNow, startOfDay, endOfDay, subDays, subWeeks, subMonths, isWithinInterval } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CalendarIcon, X } from "lucide-react";
import { format } from "date-fns";
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

const FILTER_OPTIONS = [
  { value: "all", label: "All Events" },
  { value: "application", label: "Applications" },
  { value: "blog", label: "Stories" },
  { value: "audit", label: "Audit Actions" },
] as const;

type FilterType = (typeof FILTER_OPTIONS)[number]["value"];

const DATE_PRESETS = [
  { value: "all", label: "All Time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
  { value: "custom", label: "Custom Range" },
] as const;

type DatePreset = (typeof DATE_PRESETS)[number]["value"];

export function ActivityFeed() {
  const [feedItems, setFeedItems] = useState<FeedItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();

  const getDateRange = (): { from?: Date; to?: Date } => {
    const now = new Date();
    switch (datePreset) {
      case "today": return { from: startOfDay(now), to: endOfDay(now) };
      case "7d": return { from: startOfDay(subDays(now, 7)), to: endOfDay(now) };
      case "30d": return { from: startOfDay(subMonths(now, 1)), to: endOfDay(now) };
      case "custom": return { from: dateFrom ? startOfDay(dateFrom) : undefined, to: dateTo ? endOfDay(dateTo) : undefined };
      default: return {};
    }
  };

  const filteredItems = feedItems.filter((item) => {
    const matchesFilter = filter === "all" || item.type === filter;
    const matchesSearch = search === "" || item.description.toLowerCase().includes(search.toLowerCase());
    const { from, to } = getDateRange();
    const itemDate = new Date(item.timestamp);
    const matchesDate =
      (!from || itemDate >= from) && (!to || itemDate <= to);
    return matchesFilter && matchesSearch && matchesDate;
  });

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
        <div className="flex flex-col gap-2 mb-4">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search events..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="sm:max-w-[220px]"
            />
            <Select value={filter} onValueChange={(v) => setFilter(v as FilterType)}>
              <SelectTrigger className="sm:max-w-[160px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FILTER_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={datePreset} onValueChange={(v) => {
              setDatePreset(v as DatePreset);
              if (v !== "custom") { setDateFrom(undefined); setDateTo(undefined); }
            }}>
              <SelectTrigger className="sm:max-w-[160px]">
                <CalendarIcon className="h-4 w-4 mr-1.5 opacity-50" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {datePreset === "custom" && (
            <div className="flex flex-wrap items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "MMM d, yyyy") : "From date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                </PopoverContent>
              </Popover>
              <span className="text-xs text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "MMM d, yyyy") : "To date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                </PopoverContent>
              </Popover>
              {(dateFrom || dateTo) && (
                <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); }}>
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Activity className="h-5 w-5 animate-spin mr-2" />
            Loading activity...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{feedItems.length === 0 ? "No recent activity to display." : "No events match your filter."}</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="space-y-3">
              {filteredItems.map((item) => {
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
