import { useLocation, Link } from "react-router-dom";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTheme } from "next-themes";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useModulePermissions, ModulePermission } from "@/hooks/use-module-permissions";

import { useChatNotificationSound } from "@/hooks/use-chat-notification-sound";
import { useOnlinePresence } from "@/hooks/use-online-presence";
import { OnlineAdminsPanel } from "./OnlineAdminsPanel";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
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
  DropdownMenuSeparator,
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
  FileBarChart,
  Search,
  ChevronDown,
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

// Flat menu items (kept in original group order)
const menuItems = [
  { title: "Dashboard", url: "/admin/dashboard", icon: LayoutDashboard, moduleKey: "dashboard" },
  { title: "Analytics", url: "/admin/analytics", icon: BarChart3, moduleKey: "analytics" },
  { title: "Reports", url: "/admin/reports", icon: FileBarChart, moduleKey: "reports" },
  { title: "Applications", url: "/admin/applications", icon: FileText, moduleKey: "applications" },
  { title: "Certificates", url: "/admin/certificates", icon: Award, moduleKey: "certificates" },
  { title: "Stories", url: "/admin/blog", icon: BookOpen, moduleKey: "blog" },
  { title: "Live Chat", url: "/admin/chat", icon: MessageCircle, moduleKey: "chat" },
  { title: "Message Center", url: "/admin/message-center", icon: Send, moduleKey: "message-center" },
  { title: "Message Templates", url: "/admin/message-templates", icon: MessageSquare, moduleKey: "message-templates" },
  { title: "Email Templates", url: "/admin/email-templates", icon: Mail, moduleKey: "email-templates" },
  { title: "Admin Users", url: "/admin/users", icon: Users, moduleKey: "admin-users" },
  { title: "Permissions", url: "/admin/permissions", icon: Lock, moduleKey: "permissions" },
  { title: "Audit Log", url: "/admin/audit-log", icon: History, moduleKey: "audit-log" },
  { title: "Settings", url: "/admin/settings", icon: Settings, moduleKey: "settings" },
];

type MenuItem = (typeof menuItems)[number];

// Filter menu items based on module permissions
const filterItem = (
  item: MenuItem,
  role: string,
  permissions: ModulePermission[] | undefined
): boolean => {
  if (role === "admin") return true;
  // Settings is always visible
  if (item.moduleKey === "settings") return true;
  const permission = permissions?.find((p) => p.module_key === item.moduleKey);
  if (!permission) return false;
  return permission.allowed_roles.includes(role as "viewer" | "reviewer" | "admin");
};

// Keep grouped structure for breadcrumb compatibility
const menuGroups = [
  { label: "Overview", items: menuItems.slice(0, 3) },
  { label: "Programme", items: menuItems.slice(3, 6) },
  { label: "Communication", items: menuItems.slice(6, 10) },
  { label: "Administration", items: menuItems.slice(10, 13) },
  { label: "Account", items: menuItems.slice(13) },
];

const getFilteredItems = (
  role: string | undefined,
  permissions: ModulePermission[] | undefined
) => {
  if (!role) return [];
  return menuItems.filter((item) => filterItem(item, role, permissions));
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
  const [unreadDMs, setUnreadDMs] = useState(0);
  const { data: modulePermissions } = useModulePermissions();
  const { theme, setTheme } = useTheme();
  
  const { playNotification, playDMNotification } = useChatNotificationSound();
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

  // Fetch unread team DM count
  useEffect(() => {
    if (!adminUser?.id) return;

    const fetchUnreadDMs = async () => {
      const { data: adminRecord } = await supabase
        .from("admin_users")
        .select("id")
        .eq("user_id", adminUser.id)
        .maybeSingle();
      if (!adminRecord) return;

      const { count } = await supabase
        .from("admin_direct_messages")
        .select("*", { count: "exact", head: true })
        .eq("recipient_id", adminRecord.id)
        .eq("is_read", false);
      setUnreadDMs(count || 0);
    };
    fetchUnreadDMs();

    const dmChannel = supabase
      .channel("admin-dm-badge")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "admin_direct_messages" }, (payload) => {
        fetchUnreadDMs();
        const msg = payload.new as { content?: string; sender_id?: string };
        if (msg?.sender_id !== adminUser?.id) {
          playDMNotification();

          // Browser push notification when tab not focused
          if (document.hidden && "Notification" in window && Notification.permission === "granted") {
            new Notification("New Team Message", {
              body: msg?.content?.slice(0, 100) || "You have a new team message",
              icon: "/edlead-icon.png",
              tag: "dm-notification",
            });
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "admin_direct_messages" }, () => {
        fetchUnreadDMs();
      })
      .subscribe();

    return () => { supabase.removeChannel(dmChannel); };
  }, [adminUser?.id]);

  const totalChatUnread = unreadChats + unreadDMs;

  // Update browser tab title with unread count
  useEffect(() => {
    const baseTitle = "edLEAD Admin";
    if (totalChatUnread > 0) {
      document.title = `(${totalChatUnread}) ${baseTitle}`;
    } else {
      document.title = baseTitle;
    }
    return () => { document.title = baseTitle; };
  }, [totalChatUnread]);

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

  // Get filtered groups based on role and permissions (for breadcrumb)
  const filteredGroups = useMemo(
    () => getFilteredGroups(adminUser?.role, modulePermissions),
    [adminUser?.role, modulePermissions]
  );

  // Flat filtered items for sidebar
  const filteredItems = useMemo(
    () => getFilteredItems(adminUser?.role, modulePermissions),
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
            <SidebarMenu className="px-2 py-1">
              {filteredGroups.map((group, groupIndex) => (
                <div key={group.label}>
                  {groupIndex > 0 && (
                    <div className="my-2 mx-2 border-t border-border/40" />
                  )}
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span className="flex-1">{item.title}</span>
                            {item.moduleKey === "chat" && totalChatUnread > 0 && (
                              <Badge variant="destructive" className="text-xs h-5 min-w-5 flex items-center justify-center">
                                {totalChatUnread}
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
                </div>
              ))}
            </SidebarMenu>
          </SidebarContent>

          <SidebarFooter className="p-4 border-t">
            {onlineAdmins.length > 0 && (
              <div className="p-2 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">Online Now</span>
                  <span className="text-[10px] text-muted-foreground">{onlineAdmins.length}</span>
                </div>
                <OnlineAdminsPanel admins={onlineAdmins} currentAdminId={adminUser?.id} variant="compact" />
              </div>
            )}
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
                {totalChatUnread > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 min-w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center px-1">
                    {totalChatUnread}
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

            {/* Profile dropdown */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="h-7 w-7">
                    {profile?.profile_picture_url && (
                      <AvatarImage src={profile.profile_picture_url} alt={displayName} />
                    )}
                    <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline text-sm font-medium">{displayName}</span>
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2">
                  <p className="text-sm font-medium">{displayName}</p>
                  {profile?.position && (
                    <p className="text-xs text-muted-foreground">{profile.position}</p>
                  )}
                  <div className="flex items-center gap-1 mt-1">
                    <Shield className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground capitalize">{adminUser?.role}</span>
                  </div>
                  {(profile?.country || profile?.province) && (
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
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link to="/admin/settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  Sign Out
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