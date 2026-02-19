import { useLocation, Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useModulePermissions, ModulePermission } from "@/hooks/use-module-permissions";
import { useElectron } from "@/hooks/use-electron";
import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { OnlineAdminsPanel } from "./OnlineAdminsPanel";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  LayoutDashboard,
  Users,
  FileText,
  BarChart3,
  BookOpen,
  Settings,
  LogOut,
  Shield,
  History,
  MapPin,
  Mail,
  Lock,
  Award,
  MessageSquare,
  MessageCircle,
  Send,
  Moon,
  Sun,
  Monitor,
  Download,
  Apple,
  FileBarChart,
  Eye,
  GraduationCap,
  Radio,
  ShieldCheck,
  Search,
} from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";
import { UpdateNotificationBanner } from "./UpdateNotificationBanner";
import { NotificationBell } from "./NotificationBell";
import { CommandPalette } from "./CommandPalette";
import { AdminBreadcrumb } from "./AdminBreadcrumb";
import { KeyboardShortcuts } from "./KeyboardShortcuts";
import { ShortcutsHelpDialog } from "./ShortcutsHelpDialog";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminProfile {
  full_name: string | null;
  position: string | null;
  profile_picture_url: string | null;
  country: string | null;
  province: string | null;
  theme_preference: string | null;
}

// Grouped menu items
const menuGroups = [
  {
    label: "Overview",
    icon: Eye,
    items: [
      { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
      { title: "Analytics", url: "/admin/analytics", icon: BarChart3, moduleKey: "analytics" },
      { title: "Reports", url: "/admin/reports", icon: FileBarChart, moduleKey: "reports" },
    ],
  },
  {
    label: "Programme",
    icon: GraduationCap,
    items: [
      { title: "Applications", url: "/admin/applications", icon: FileText, moduleKey: "applications" },
      { title: "Certificates", url: "/admin/certificates", icon: Award, moduleKey: "certificates" },
      { title: "Stories", url: "/admin/blog", icon: BookOpen, moduleKey: "blog" },
    ],
  },
  {
    label: "Communication",
    icon: Radio,
    items: [
      { title: "Live Chat", url: "/admin/chat", icon: MessageCircle, moduleKey: "chat" },
      { title: "Message Center", url: "/admin/message-center", icon: Send, moduleKey: "message-center" },
      { title: "Message Templates", url: "/admin/message-templates", icon: MessageSquare, moduleKey: "message-templates" },
      { title: "Email Templates", url: "/admin/email-templates", icon: Mail, moduleKey: "email-templates" },
    ],
  },
  {
    label: "Administration",
    icon: ShieldCheck,
    items: [
      { title: "Admin Users", url: "/admin/users", icon: Users, moduleKey: "admin-users" },
      { title: "Permissions", url: "/admin/permissions", icon: Lock, moduleKey: "permissions" },
      { title: "Audit Log", url: "/admin/audit-log", icon: History, moduleKey: "audit-log" },
    ],
  },
];

type MenuItem = (typeof menuGroups)[number]["items"][number];

// Filter menu items based on module permissions
const filterItem = (
  item: MenuItem,
  role: string,
  permissions: ModulePermission[] | undefined
): boolean => {
  if (role === "admin") return true;
  const permission = permissions?.find((p) => p.module_key === item.moduleKey);
  if (!permission) return false;
  return permission.allowed_roles.includes(role as "viewer" | "reviewer" | "admin");
};

const getFilteredGroups = (
  role: string | undefined,
  permissions: ModulePermission[] | undefined
) => {
  if (!role) return [];
  return menuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter((item) => filterItem(item, role, permissions)),
    }))
    .filter((group) => group.items.length > 0);
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { adminUser, signOut } = useAdminAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [unreadChats, setUnreadChats] = useState(0);
  const { data: modulePermissions } = useModulePermissions();
  const { theme, setTheme } = useTheme();
  const { isElectron } = useElectron();
  const { playNotification } = useChatNotificationSound();
  const [commandOpen, setCommandOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);

  const presenceUser = useMemo(() => adminUser ? {
    id: adminUser.id,
    email: adminUser.email,
    role: adminUser.role,
    full_name: adminUser.full_name ?? null,
    profile_picture_url: profile?.profile_picture_url ?? null,
  } : null, [adminUser, profile?.profile_picture_url]);

  const { onlineAdmins } = useOnlinePresence(presenceUser);

  const handleOpenCommandPalette = useCallback(() => setCommandOpen(true), []);
  const handleOpenHelp = useCallback(() => setShortcutsOpen(true), []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!adminUser?.id) return;
      
      const { data } = await supabase
        .from("admin_users")
        .select("full_name, position, profile_picture_url, country, province, theme_preference")
        .eq("id", adminUser.id)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
        // Apply saved theme preference
        if (data.theme_preference) {
          setTheme(data.theme_preference);
        }
      }
    };

    fetchProfile();
  }, [adminUser?.id, setTheme]);

  // Fetch unread chat count and subscribe to realtime updates
  useEffect(() => {
    const fetchUnread = async () => {
      const { count } = await supabase
        .from("chat_messages")
        .select("*", { count: "exact", head: true })
        .eq("sender_type", "visitor")
        .eq("is_read", false);
      setUnreadChats(count || 0);
    };
    fetchUnread();

    // Request notification permission on mount
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const channel = supabase
      .channel("admin-chat-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "chat_messages", filter: "sender_type=eq.visitor" }, (payload) => {
        fetchUnread();
        playNotification();

        // Browser push notification when tab not focused
        if (document.hidden && "Notification" in window && Notification.permission === "granted") {
          const msg = payload.new as { content?: string };
          new Notification("New Chat Message", {
            body: msg?.content?.slice(0, 100) || "You have a new message",
            icon: "/edlead-icon.png",
            tag: "chat-notification",
          });
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "chat_messages" }, () => fetchUnread())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Update browser tab title with unread count
  useEffect(() => {
    const baseTitle = "edLEAD Admin";
    if (unreadChats > 0) {
      document.title = `(${unreadChats}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => { document.title = baseTitle; };
  }, [unreadChats]);

  // Save theme preference to database when it changes
  const handleThemeChange = async (newTheme: string) => {
    setTheme(newTheme);
    
    if (adminUser?.id) {
      await supabase
        .from("admin_users")
        .update({ theme_preference: newTheme })
        .eq("id", adminUser.id);
    }
  };

  // Get filtered groups based on role and permissions
  const filteredGroups = useMemo(
    () => getFilteredGroups(adminUser?.role, modulePermissions),
    [adminUser?.role, modulePermissions]
  );

  // All filtered items flat (for header title lookup)
  const allFilteredItems = useMemo(
    () => filteredGroups.flatMap((g) => g.items),
    [filteredGroups]
  );

  const displayName = profile?.full_name || adminUser?.email?.split("@")[0] || "Admin";
  const initials = (profile?.full_name || adminUser?.email || "AD")
    .split(/[\s@]/)
    .slice(0, 2)
    .map(s => s.charAt(0).toUpperCase())
    .join("");

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 border-b">
            <Link to="/admin/dashboard" className="flex items-center gap-2">
              <div className="relative h-8 transition-transform duration-200 hover:scale-105">
                <img 
                  src={edleadLogo} 
                  alt="edLEAD" 
                  className={`h-8 absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`}
                />
                <img 
                  src={edleadLogoDark} 
                  alt="edLEAD" 
                  className={`h-8 transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`}
                />
              </div>
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            {filteredGroups.map((group) => {
                const groupHasActive = group.items.some((item) => location.pathname === item.url);
                return (
                  <Collapsible key={group.label} defaultOpen={groupHasActive}>
                    <SidebarGroup>
                      <CollapsibleTrigger className="flex w-full items-center gap-2 px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider hover:text-foreground transition-colors [&[data-state=open]>.chevron]:rotate-180">
                        <group.icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="flex-1">{group.label}</span>
                        <ChevronDown className="chevron h-3.5 w-3.5 shrink-0 transition-transform duration-200" />
                      </CollapsibleTrigger>
                      <CollapsibleContent>
                        <SidebarGroupContent>
                          <SidebarMenu>
                            {group.items.map((item) => {
                              const isActive = location.pathname === item.url;
                              return (
                                <SidebarMenuItem key={item.title}>
                                  <SidebarMenuButton asChild isActive={isActive}>
                                    <Link to={item.url} className="flex items-center gap-2">
                                      <item.icon className="h-4 w-4" />
                                      <span className="flex-1">{item.title}</span>
                        {item.moduleKey === "chat" && unreadChats > 0 && (
                                        <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                                          {unreadChats}
                                        </Badge>
                                      )}
                                      {item.moduleKey === "blog" && (
                                        <PendingBlogBadge />
                                      )}
                                    </Link>
                                  </SidebarMenuButton>
                                </SidebarMenuItem>
                              );
                            })}
                          </SidebarMenu>
                        </SidebarGroupContent>
                      </CollapsibleContent>
                    </SidebarGroup>
                  </Collapsible>
                );
              })
            }

            <SidebarGroup>
              <SidebarGroupLabel>Account</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.pathname === "/admin/settings"}>
                      <Link to="/admin/settings">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t">
            {/* Download Desktop App - Only show on web, not in Electron */}
            {!isElectron && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mb-3"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Desktop App
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="center" className="w-48">
                  <DropdownMenuItem asChild>
                    <a 
                      href="/downloads/edLEAD-Admin-Windows.zip"
                      download="edLEAD-Admin-Windows.zip"
                      className="flex items-center cursor-pointer"
                    >
                      <Monitor className="h-4 w-4 mr-2" />
                      Windows (.zip)
                    </a>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <a 
                      href="/downloads/edLEAD-Admin-macOS.zip"
                      download="edLEAD-Admin-macOS.zip"
                      className="flex items-center cursor-pointer"
                    >
                      <Apple className="h-4 w-4 mr-2" />
                      macOS (.zip)
                    </a>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            
            <div className="flex items-center gap-3 mb-3">
              <Avatar className="h-10 w-10">
                {profile?.profile_picture_url && (
                  <AvatarImage src={profile.profile_picture_url} alt={displayName} />
                )}
                <AvatarFallback className="bg-primary text-primary-foreground text-sm">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate text-foreground">{displayName}</p>
                {profile?.position && (
                  <p className="text-xs text-muted-foreground truncate">{profile.position}</p>
                )}
                <div className="flex items-center gap-1">
                  <Shield className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground capitalize">{adminUser?.role}</span>
                </div>
                {adminUser?.role !== "admin" && (profile?.country || profile?.province) && (
                  <div className="flex items-center gap-1 mt-0.5">
                    <MapPin className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground truncate">
                      {profile.province && profile.country 
                        ? `${profile.province}, ${profile.country}`
                        : profile.province || profile.country}
                    </span>
                  </div>
                )}
              </div>
            </div>
            {onlineAdmins.length > 0 && (
              <div className="mb-3 p-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Online Now</span>
                  <span className="text-[10px] text-muted-foreground">{onlineAdmins.length}</span>
                </div>
                <OnlineAdminsPanel admins={onlineAdmins} currentAdminId={adminUser?.id} variant="compact" />
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          {/* Update notification banner - only shows in Electron when update available */}
          <UpdateNotificationBanner />
          
          <header className="sticky top-0 z-10 bg-background border-b h-14 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4 flex-1">
              <AdminBreadcrumb filteredGroups={filteredGroups} />
            </div>
            <Button
              variant="outline"
              size="sm"
              className="mr-2 hidden sm:flex items-center gap-2 text-muted-foreground"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-4 w-4" />
              <span className="text-xs">Search...</span>
              <kbd className="pointer-events-none hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                ⌘K
              </kbd>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="mr-2 sm:hidden h-9 w-9"
              onClick={() => setCommandOpen(true)}
            >
              <Search className="h-5 w-5" />
            </Button>
            <NotificationBell />
            <Link to="/admin/chat" className="relative mr-2">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MessageCircle className="h-5 w-5" />
                {unreadChats > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                    {unreadChats}
                  </span>
                )}
              </Button>
            </Link>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9"
                >
                  {theme === "dark" ? (
                    <Moon className="h-5 w-5" />
                  ) : theme === "light" ? (
                    <Sun className="h-5 w-5" />
                  ) : (
                    <Monitor className="h-5 w-5" />
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleThemeChange("light")}>
                  <Sun className="h-4 w-4 mr-2" />
                  Light
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("dark")}>
                  <Moon className="h-4 w-4 mr-2" />
                  Dark
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleThemeChange("system")}>
                  <Monitor className="h-4 w-4 mr-2" />
                  System
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
      <KeyboardShortcuts onOpenCommandPalette={handleOpenCommandPalette} onOpenHelp={handleOpenHelp} />
      <ShortcutsHelpDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
    </SidebarProvider>
  );
}

// Small helper component to show pending blog count in sidebar
function PendingBlogBadge() {
  const [count, setCount] = useState(0);
  useEffect(() => {
    const fetch = async () => {
      const { count: c } = await supabase
        .from("blog_posts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setCount(c || 0);
    };
    fetch();
  }, []);
  if (count === 0) return null;
  return (
    <Badge variant="secondary" className="text-xs h-5 min-w-5 flex items-center justify-center">
      {count}
    </Badge>
  );
}