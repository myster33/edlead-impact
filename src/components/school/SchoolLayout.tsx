import { useLocation, Link } from "react-router-dom";
import { useMemo } from "react";
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
  LayoutDashboard, Users, ClipboardCheck, BookOpen, UserCheck, FileText,
  LogOut, Moon, Sun, Monitor, School, ChevronDown, Inbox, Link2, Settings,
} from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";
import edleadLogoDark from "@/assets/edlead-logo-dark.png";

const menuGroups = [
  [
    { title: "Dashboard", url: "/school/dashboard", icon: LayoutDashboard },
  ],
  [
    { title: "Attendance", url: "/school/attendance", icon: ClipboardCheck },
    { title: "Classes", url: "/school/classes", icon: BookOpen },
    { title: "Students", url: "/school/students", icon: Users },
    { title: "Staff", url: "/school/staff", icon: UserCheck },
  ],
  [
    { title: "Absence requests", url: "/school/absence-requests", icon: Inbox },
    { title: "Link requests", url: "/school/link-requests", icon: Link2 },
    { title: "Reports", url: "/school/reports", icon: FileText },
  ],
  [
    { title: "Settings", url: "/school/settings", icon: Settings },
  ],
];

const allMenuItems = menuGroups.flat();

export function SchoolLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { schoolUser, currentSchool, signOut } = useSchoolAuth();
  const { theme, setTheme } = useTheme();

  const displayName = schoolUser?.full_name || schoolUser?.email?.split("@")[0] || "User";
  const initials = displayName.split(/\s/).slice(0, 2).map(s => s.charAt(0).toUpperCase()).join("");

  const filteredGroups = useMemo(() => {
    if (schoolUser?.role === "hr") {
      const allowed = ["Dashboard", "Staff", "Reports"];
      return menuGroups.map(g => g.filter(i => allowed.includes(i.title))).filter(g => g.length > 0);
    }
    return menuGroups;
  }, [schoolUser?.role]);

  const filteredItems = filteredGroups.flat();

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar className="border-r">
          <SidebarHeader className="p-4 border-b">
            <Link to="/school/dashboard" className="flex items-center gap-2">
              <div className="relative h-8 transition-transform duration-200 hover:scale-105">
                <img src={edleadLogo} alt="edLEAD" className={`h-8 absolute transition-opacity duration-300 ${theme === "dark" ? "opacity-0" : "opacity-100"}`} />
                <img src={edleadLogoDark} alt="edLEAD" className={`h-8 transition-opacity duration-300 ${theme === "dark" ? "opacity-100" : "opacity-0"}`} />
              </div>
              <Badge variant="secondary" className="text-xs">School</Badge>
            </Link>
            {currentSchool && (
              <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                {currentSchool.logo_url ? (
                  <img src={currentSchool.logo_url} alt="" className="h-4 w-4 rounded object-cover" />
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
        </Sidebar>

        <main className="flex-1 overflow-auto flex flex-col">
          <header className="sticky top-0 z-10 bg-background border-b h-14 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4 flex-1">
              <h2 className="text-sm font-medium text-foreground">
                {filteredItems.find(i => i.url === location.pathname)?.title || "School Portal"}
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
