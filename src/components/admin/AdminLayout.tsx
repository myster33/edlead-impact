import { useLocation, Link } from "react-router-dom";
import { useEffect, useState, useMemo } from "react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useModulePermissions, ModulePermission } from "@/hooks/use-module-permissions";
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
} from "lucide-react";
import edleadLogo from "@/assets/edlead-logo.png";

interface AdminLayoutProps {
  children: React.ReactNode;
}

interface AdminProfile {
  full_name: string | null;
  position: string | null;
  profile_picture_url: string | null;
  country: string | null;
  province: string | null;
}

// Module key to menu item mapping
const allMenuItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
    moduleKey: "dashboard",
  },
  {
    title: "Applications",
    url: "/admin/applications",
    icon: FileText,
    moduleKey: "applications",
  },
  {
    title: "Stories",
    url: "/admin/blog",
    icon: BookOpen,
    moduleKey: "blog",
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
    moduleKey: "analytics",
  },
  {
    title: "Admin Users",
    url: "/admin/users",
    icon: Users,
    moduleKey: "admin-users",
  },
  {
    title: "Email Templates",
    url: "/admin/email-templates",
    icon: Mail,
    moduleKey: "email-templates",
  },
  {
    title: "Audit Log",
    url: "/admin/audit-log",
    icon: History,
    moduleKey: "audit-log",
  },
  {
    title: "Permissions",
    url: "/admin/permissions",
    icon: Lock,
    moduleKey: "permissions",
  },
  {
    title: "Certificates",
    url: "/admin/certificates",
    icon: Award,
    moduleKey: "certificates",
  },
];

// Filter menu items based on module permissions
const getFilteredMenuItems = (
  role: string | undefined,
  permissions: ModulePermission[] | undefined
) => {
  if (!role) return [];
  
  // Admins always have access to everything
  if (role === "admin") {
    return allMenuItems;
  }
  
  // For non-admins, filter based on module permissions
  return allMenuItems.filter((item) => {
    const permission = permissions?.find((p) => p.module_key === item.moduleKey);
    if (!permission) {
      // If no permission record exists, deny access for non-admins
      return false;
    }
    return permission.allowed_roles.includes(role as "viewer" | "reviewer" | "admin");
  });
};

export function AdminLayout({ children }: AdminLayoutProps) {
  const location = useLocation();
  const { adminUser, signOut } = useAdminAuth();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const { data: modulePermissions } = useModulePermissions();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!adminUser?.id) return;
      
      const { data } = await supabase
        .from("admin_users")
        .select("full_name, position, profile_picture_url, country, province")
        .eq("id", adminUser.id)
        .maybeSingle();
      
      if (data) {
        setProfile(data);
      }
    };

    fetchProfile();
  }, [adminUser?.id]);

  // Get filtered menu items based on role and permissions
  const menuItems = useMemo(
    () => getFilteredMenuItems(adminUser?.role, modulePermissions),
    [adminUser?.role, modulePermissions]
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
              <img src={edleadLogo} alt="edLEAD" className="h-8" />
              <Badge variant="secondary" className="text-xs">Admin</Badge>
            </Link>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Navigation</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map((item) => {
                    const isActive = location.pathname === item.url;
                    return (
                      <SidebarMenuItem key={item.title}>
                        <SidebarMenuButton asChild isActive={isActive}>
                          <Link to={item.url}>
                            <item.icon className="h-4 w-4" />
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

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
                <p className="text-sm font-medium truncate">{displayName}</p>
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

        <main className="flex-1 overflow-auto">
          <header className="sticky top-0 z-10 bg-background border-b h-14 flex items-center px-4">
            <SidebarTrigger />
            <div className="ml-4">
              <h1 className="text-lg font-semibold">
                {menuItems.find(item => location.pathname === item.url)?.title || 
                 (location.pathname === "/admin/settings" ? "Settings" : "Admin Panel")}
              </h1>
            </div>
          </header>
          <div className="p-6">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}