import { useLocation, Link } from "react-router-dom";
import { useMemo } from "react";
import { useTheme } from "next-themes";
import { usePortalAuth } from "@/contexts/PortalAuthContext";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  LayoutDashboard, ClipboardCheck, BookOpen, Users, FileText, Inbox,
  LogOut, Moon, Sun, Monitor, School, ChevronDown, CreditCard,
} from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";

const roleMenuItems: Record<string, { title: string; url: string; icon: React.ElementType }[]> = {
  student: [
    { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
    { title: "My attendance", url: "/portal/attendance", icon: ClipboardCheck },
    { title: "E-Card", url: "/portal/e-card", icon: CreditCard },
  ],
  parent: [
    { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
    { title: "My children", url: "/portal/my-children", icon: Users },
    { title: "Attendance", url: "/portal/attendance", icon: ClipboardCheck },
    { title: "Absence request", url: "/portal/absence-request", icon: Inbox },
  ],
  educator: [
    { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
    { title: "My classes", url: "/portal/my-classes", icon: BookOpen },
    { title: "Attendance", url: "/portal/attendance", icon: ClipboardCheck },
    { title: "Reports", url: "/portal/reports", icon: FileText },
  ],
  class_teacher: [
    { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
    { title: "My classes", url: "/portal/my-classes", icon: BookOpen },
    { title: "Attendance", url: "/portal/attendance", icon: ClipboardCheck },
    { title: "Reports", url: "/portal/reports", icon: FileText },
  ],
  subject_teacher: [
    { title: "Dashboard", url: "/portal/dashboard", icon: LayoutDashboard },
    { title: "My classes", url: "/portal/my-classes", icon: BookOpen },
    { title: "Attendance", url: "/portal/attendance", icon: ClipboardCheck },
  ],
};

export function PortalLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { portalUser, currentSchool, availableSchools, switchSchool, signOut } = usePortalAuth();
  const { theme, setTheme } = useTheme();

  const role = portalUser?.role || "student";
  const menuItems = useMemo(() => roleMenuItems[role] || roleMenuItems.student, [role]);

  const displayName = portalUser?.full_name || portalUser?.email?.split("@")[0] || "User";
  const initials = displayName.split(/\s/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join("");

  const roleLabel = role.replace(/_/g, " ");

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 border-b">
            <Link to="/portal/dashboard" className="flex items-center gap-2">
              <div className="relative h-8 transition-transform duration-200 hover:scale-105">
                <img src={edleadLogo} alt="edLEAD" className={`h-8 absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
                <img src={edleadLogoDark} alt="edLEAD" className={`h-8 transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
              </div>
              <Badge variant="secondary" className="text-xs capitalize">{roleLabel}</Badge>
            </Link>
            {availableSchools.length > 1 ? (
              <Select value={currentSchool?.id} onValueChange={switchSchool}>
                <SelectTrigger className="mt-2 h-8 text-xs">
                  <SelectValue placeholder="Select school" />
                </SelectTrigger>
                <SelectContent>
                  {availableSchools.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : currentSchool ? (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                <School className="h-3 w-3" />
                <span className="truncate">{currentSchool.name}</span>
              </div>
            ) : null}
          </SidebarHeader>

          <SidebarContent>
            <SidebarMenu className="px-2 py-1">
              {menuItems.map(item => {
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
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          <header className="sticky top-0 z-10 bg-background border-b h-14 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4 flex-1">
              <h2 className="text-sm font-medium text-foreground">
                {menuItems.find(i => i.url === location.pathname)?.title || "Portal"}
              </h2>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-9 w-9">
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
                    <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <p className="text-sm font-medium leading-none">{displayName}</p>
                    <p className="text-xs text-muted-foreground capitalize">{roleLabel}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{displayName}</p>
                  <p className="text-xs text-muted-foreground">{portalUser?.email}</p>
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
