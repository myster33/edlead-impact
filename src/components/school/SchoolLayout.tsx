import { useLocation, Link } from "react-router-dom";
import { useMemo, useState, useEffect, useCallback } from "react";
import { useTheme } from "next-themes";
import { useSchoolAuth } from "@/contexts/SchoolAuthContext";
import {
  Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton,
  SidebarMenuItem, SidebarProvider, SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { AvatarImage } from "@/components/ui/avatar";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import {
  LayoutDashboard, Users, ClipboardCheck, BookOpen, UserCheck, FileText,
  LogOut, Moon, Sun, Monitor, School, ChevronDown, Inbox, Settings,
  CalendarDays, Clock, BookMarked, Bell, GraduationCap, MessageCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";

const menuGroups = [
  [
    { title: "Dashboard", url: "/school/dashboard", icon: LayoutDashboard },
  ],
  [
    { title: "Attendance", url: "/school/attendance", icon: ClipboardCheck },
    { title: "Period attendance", url: "/school/period-attendance", icon: BookMarked, teacherOnly: true },
    { title: "Timetable", url: "/school/timetable", icon: Clock, teacherOnly: true },
    { title: "Calendar", url: "/school/calendar", icon: CalendarDays },
    { title: "Classes", url: "/school/classes", icon: BookOpen },
    { title: "Subjects", url: "/school/subjects", icon: GraduationCap },
    { title: "Students", url: "/school/students", icon: Users },
    { title: "Staff", url: "/school/staff", icon: UserCheck },
  ],
  [
    { title: "Absence requests", url: "/school/absence-requests", icon: Inbox },
    { title: "Reports", url: "/school/reports", icon: FileText },
  ],
  [
    { title: "edLEAD Chat", url: "/school/edlead-chat", icon: MessageCircle },
  ],
  [
    { title: "Settings", url: "/school/settings", icon: Settings },
  ],
];

const allMenuItems = menuGroups.flat();

interface Notification {
  id: string;
  type: "registration" | "parent_link";
  title: string;
  description: string;
  created_at: string;
  role?: string;
}

export function SchoolLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { schoolUser, currentSchool, signOut } = useSchoolAuth();
  const { theme, setTheme } = useTheme();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const displayName = schoolUser?.full_name || schoolUser?.email?.split("@")[0] || "User";
  const initials = displayName.split(/\s/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join("");

  const isTeacherRole = ["class_teacher", "subject_teacher", "educator"].includes(schoolUser?.role || "");

  const filteredGroups = useMemo(() => {
    if (schoolUser?.role === "hr") {
      const allowed = ["Dashboard", "Staff", "Reports"];
      return menuGroups.map(g => g.filter(i => allowed.includes(i.title))).filter(g => g.length > 0);
    }
    return menuGroups.map(g => g.filter(i => {
      if ((i as any).teacherOnly && !isTeacherRole) return false;
      return true;
    })).filter(g => g.length > 0);
  }, [schoolUser?.role, isTeacherRole]);

  const filteredItems = filteredGroups.flat();

  // Fetch pending requests as notifications
  const fetchNotifications = useCallback(async () => {
    if (!currentSchool?.id) return;
    const notifs: Notification[] = [];

    const [regRes, linkRes] = await Promise.all([
      (supabase as any).from("portal_registration_requests")
        .select("id, full_name, role, created_at")
        .eq("school_id", currentSchool.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
      (supabase as any).from("parent_link_requests")
        .select("id, student_name, created_at, school_users!parent_link_requests_parent_user_id_fkey(full_name)")
        .eq("school_id", currentSchool.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

    (regRes.data || []).forEach((r: any) => {
      const roleLabel = r.role === "student" ? "Student" : r.role === "parent" ? "Parent" : r.role?.replace("_", " ");
      notifs.push({
        id: r.id,
        type: "registration",
        title: `New ${roleLabel} registration`,
        description: r.full_name,
        created_at: r.created_at,
        role: r.role,
      });
    });

    (linkRes.data || []).forEach((r: any) => {
      notifs.push({
        id: r.id,
        type: "parent_link",
        title: "Parent link request",
        description: `${r.school_users?.full_name || "Parent"} → ${r.student_name}`,
        created_at: r.created_at,
      });
    });

    notifs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    setNotifications(notifs);
  }, [currentSchool?.id]);

  // Fetch unread school chat messages
  const fetchUnreadChats = useCallback(async () => {
    if (!currentSchool?.id) return;
    const { count } = await (supabase as any)
      .from("school_chat_conversations")
      .select("id", { count: "exact", head: true })
      .eq("school_id", currentSchool.id)
      .eq("status", "open");
    setUnreadChatCount(count || 0);
  }, [currentSchool?.id]);

  useEffect(() => { fetchNotifications(); fetchUnreadChats(); }, [fetchNotifications, fetchUnreadChats]);

  // Refresh every 30s
  useEffect(() => {
    const interval = setInterval(() => { fetchNotifications(); fetchUnreadChats(); }, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications, fetchUnreadChats]);

  const pendingCount = notifications.length;

  const getNotifLink = (n: Notification) => {
    if (n.type === "parent_link") return "/school/students";
    if (n.role === "student" || n.role === "parent") return "/school/students";
    return "/school/staff";
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 border-b">
            {currentSchool && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {currentSchool.logo_url ? (
                  <img src={currentSchool.logo_url} alt="" className="h-12 w-12 rounded object-cover" />
                ) : (
                  <School className="h-3 w-3" />
                )}
                <span className="truncate">{currentSchool.name}</span>
              </div>
            )}
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2 py-1">
              {filteredGroups.map((group, gi) => (
                <div key={gi}>
                  {gi > 0 && <Separator className="my-1.5" />}
                  {group.map(item => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url} className="flex items-center gap-2">
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </div>
              ))}
            </SidebarMenu>
        </SidebarContent>

          <div className="mt-auto border-t p-4">
            <Link to="/school/dashboard" className="flex items-center gap-2">
              <div className="relative h-8 transition-transform duration-200 hover:scale-105">
                <img src={edleadLogo} alt="edLEAD" className={`h-8 absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
                <img src={edleadLogoDark} alt="edLEAD" className={`h-8 transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
              </div>
              <Badge variant="secondary" className="text-xs">School</Badge>
            </Link>
          </div>
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          <header className="sticky top-0 z-10 bg-background border-b h-14 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4 flex-1">
              <h2 className="text-sm font-medium text-foreground">
                {filteredItems.find(i => i.url === location.pathname)?.title || "School Portal"}
              </h2>
            </div>

            {/* Chat Messages Icon */}
            <Link to="/school/edlead-chat" className="relative">
              <Button variant="ghost" size="icon" className="h-9 w-9">
                <MessageCircle className="h-5 w-5" />
                {unreadChatCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {unreadChatCount > 9 ? "9+" : unreadChatCount}
                  </span>
                )}
              </Button>
            </Link>

            {/* Notification Bell */}
            <Popover open={notifOpen} onOpenChange={setNotifOpen}>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 relative">
                  <Bell className="h-5 w-5" />
                  {pendingCount > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                      {pendingCount > 9 ? "9+" : pendingCount}
                    </span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-80 p-0">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold">Notifications</h3>
                  <p className="text-xs text-muted-foreground">{pendingCount} pending request{pendingCount !== 1 ? "s" : ""}</p>
                </div>
                <div className="max-h-72 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <p className="text-sm text-muted-foreground text-center py-6">No pending requests</p>
                  ) : (
                    notifications.map(n => (
                      <Link
                        key={n.id}
                        to={getNotifLink(n)}
                        onClick={() => setNotifOpen(false)}
                        className="flex items-start gap-3 px-4 py-3 hover:bg-muted/50 transition-colors border-b last:border-b-0"
                      >
                        <div className="mt-0.5">
                          {n.type === "registration" ? (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <UserCheck className="h-4 w-4 text-primary" />
                            </div>
                          ) : (
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Users className="h-4 w-4 text-primary" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium leading-tight">{n.title}</p>
                          <p className="text-xs text-muted-foreground truncate">{n.description}</p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {new Date(n.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9 ml-1">
                  {theme === "dark" ? <Moon className="h-5 w-5" /> : theme === "light" ? <Sun className="h-5 w-5" /> : <Monitor className="h-5 w-5" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => setTheme("light")}><Sun className="h-4 w-4 mr-2" />Light</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")}><Moon className="h-4 w-4 mr-2" />Dark</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")}><Monitor className="h-4 w-4 mr-2" />System</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="ml-2 flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    {schoolUser?.profile_picture_url && (
                      <AvatarImage src={schoolUser.profile_picture_url} alt={displayName} />
                    )}
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{schoolUser?.role?.replace("_", " ")}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{schoolUser?.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>
          <div className="flex-1 p-6">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
