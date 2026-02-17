import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  LayoutDashboard,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Award,
  MessageCircle,
  Send,
  MessageSquare,
  Mail,
  Users,
  Lock,
  History,
  Sun,
  Moon,
  Monitor,
  FileBarChart,
  User,
  School,
  Newspaper,
  ClipboardList,
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useModulePermissions, ModulePermission } from "@/hooks/use-module-permissions";
import { supabase } from "@/integrations/supabase/client";

const allNavItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, moduleKey: "dashboard", group: "Overview" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, moduleKey: "analytics", group: "Overview" },
  { title: "Reports", url: "/admin/reports", icon: FileBarChart, moduleKey: "reports", group: "Overview" },
  { title: "Applications", url: "/admin/applications", icon: FileText, moduleKey: "applications", group: "Programme" },
  { title: "Certificates", url: "/admin/certificates", icon: Award, moduleKey: "certificates", group: "Programme" },
  { title: "Stories", url: "/admin/blog", icon: BookOpen, moduleKey: "blog", group: "Programme" },
  { title: "Live Chat", url: "/admin/chat", icon: MessageCircle, moduleKey: "chat", group: "Communication" },
  { title: "Message Center", url: "/admin/message-center", icon: Send, moduleKey: "message-center", group: "Communication" },
  { title: "Message Templates", url: "/admin/message-templates", icon: MessageSquare, moduleKey: "message-templates", group: "Communication" },
  { title: "Email Templates", url: "/admin/email-templates", icon: Mail, moduleKey: "email-templates", group: "Communication" },
  { title: "Admin Users", url: "/admin/users", icon: Users, moduleKey: "admin-users", group: "Administration" },
  { title: "Permissions", url: "/admin/permissions", icon: Lock, moduleKey: "permissions", group: "Administration" },
  { title: "Audit Log", url: "/admin/audit-log", icon: History, moduleKey: "audit-log", group: "Administration" },
  { title: "Settings", url: "/admin/settings", icon: Settings, moduleKey: "settings", group: "Account" },
];

interface SearchResult {
  id: string;
  title: string;
  subtitle: string;
  url: string;
  type: "application" | "blog" | "audit";
}

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuth();
  const { data: modulePermissions } = useModulePermissions();
  const { setTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [dataResults, setDataResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const filteredItems = allNavItems.filter((item) => {
    if (item.moduleKey === "settings") return true;
    if (adminUser?.role === "admin") return true;
    const perm = modulePermissions?.find((p) => p.module_key === item.moduleKey);
    if (!perm) return false;
    return perm.allowed_roles.includes(adminUser?.role as "viewer" | "reviewer" | "admin");
  });

  const groups = Array.from(new Set(filteredItems.map((i) => i.group)));

  // Search across data when query changes
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query || query.length < 2) {
      setDataResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    debounceRef.current = setTimeout(async () => {
      const searchTerm = `%${query}%`;
      const results: SearchResult[] = [];

      // Search applications
      const { data: apps } = await supabase
        .from("applications")
        .select("id, full_name, school_name, reference_number, status")
        .or(`full_name.ilike.${searchTerm},school_name.ilike.${searchTerm},reference_number.ilike.${searchTerm}`)
        .limit(5);

      if (apps) {
        apps.forEach((app) => {
          results.push({
            id: app.id,
            title: app.full_name,
            subtitle: `${app.school_name} · ${app.status} · ${app.reference_number || "No ref"}`,
            url: `/admin/applications?search=${encodeURIComponent(app.full_name)}`,
            type: "application",
          });
        });
      }

      // Search blog posts
      const { data: blogs } = await supabase
        .from("blog_posts")
        .select("id, title, author_name, status")
        .or(`title.ilike.${searchTerm},author_name.ilike.${searchTerm}`)
        .limit(5);

      if (blogs) {
        blogs.forEach((blog) => {
          results.push({
            id: blog.id,
            title: blog.title,
            subtitle: `by ${blog.author_name} · ${blog.status}`,
            url: `/admin/blog?search=${encodeURIComponent(blog.title)}`,
            type: "blog",
          });
        });
      }

      // Search audit log
      const { data: logs } = await supabase
        .from("admin_audit_log")
        .select("id, action, table_name, created_at")
        .or(`action.ilike.${searchTerm},table_name.ilike.${searchTerm}`)
        .order("created_at", { ascending: false })
        .limit(5);

      if (logs) {
        logs.forEach((log) => {
          results.push({
            id: log.id,
            title: `${log.action}`,
            subtitle: `on ${log.table_name} · ${new Date(log.created_at || "").toLocaleDateString()}`,
            url: `/admin/audit-log`,
            type: "audit",
          });
        });
      }

      setDataResults(results);
      setIsSearching(false);
    }, 300);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Reset query when dialog closes
  useEffect(() => {
    if (!open) {
      setQuery("");
      setDataResults([]);
    }
  }, [open]);

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  const applicationResults = dataResults.filter((r) => r.type === "application");
  const blogResults = dataResults.filter((r) => r.type === "blog");
  const auditResults = dataResults.filter((r) => r.type === "audit");

  const typeIcon = {
    application: User,
    blog: Newspaper,
    audit: ClipboardList,
  };

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput
        placeholder="Search modules, applications, stories, logs..."
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {isSearching ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Data results */}
        {applicationResults.length > 0 && (
          <CommandGroup heading="Applications">
            {applicationResults.map((r) => {
              const Icon = typeIcon[r.type];
              return (
                <CommandItem
                  key={r.id}
                  value={`app-${r.title}-${r.subtitle}`}
                  onSelect={() => runCommand(() => navigate(r.url))}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {blogResults.length > 0 && (
          <CommandGroup heading="Stories">
            {blogResults.map((r) => {
              const Icon = typeIcon[r.type];
              return (
                <CommandItem
                  key={r.id}
                  value={`blog-${r.title}-${r.subtitle}`}
                  onSelect={() => runCommand(() => navigate(r.url))}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {auditResults.length > 0 && (
          <CommandGroup heading="Audit Log">
            {auditResults.map((r) => {
              const Icon = typeIcon[r.type];
              return (
                <CommandItem
                  key={r.id}
                  value={`audit-${r.title}-${r.subtitle}`}
                  onSelect={() => runCommand(() => navigate(r.url))}
                >
                  <Icon className="mr-2 h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col">
                    <span>{r.title}</span>
                    <span className="text-xs text-muted-foreground">{r.subtitle}</span>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {dataResults.length > 0 && <CommandSeparator />}

        {/* Navigation modules */}
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {filteredItems
              .filter((i) => i.group === group)
              .map((item) => (
                <CommandItem
                  key={item.url}
                  value={`nav-${item.title}`}
                  onSelect={() => runCommand(() => navigate(item.url))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  {item.title}
                </CommandItem>
              ))}
          </CommandGroup>
        ))}
        <CommandSeparator />
        <CommandGroup heading="Theme">
          <CommandItem value="theme-light" onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </CommandItem>
          <CommandItem value="theme-dark" onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </CommandItem>
          <CommandItem value="theme-system" onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            System Theme
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem value="action-signout" onSelect={() => runCommand(() => signOut())}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
