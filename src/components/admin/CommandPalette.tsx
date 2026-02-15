import { useEffect, useState, useCallback } from "react";
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
  Search,
  FileBarChart,
} from "lucide-react";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { useModulePermissions, ModulePermission } from "@/hooks/use-module-permissions";

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

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const navigate = useNavigate();
  const { adminUser, signOut } = useAdminAuth();
  const { data: modulePermissions } = useModulePermissions();
  const { setTheme } = useTheme();

  const filteredItems = allNavItems.filter((item) => {
    if (item.moduleKey === "settings") return true;
    if (adminUser?.role === "admin") return true;
    const perm = modulePermissions?.find((p) => p.module_key === item.moduleKey);
    if (!perm) return false;
    return perm.allowed_roles.includes(adminUser?.role as "viewer" | "reviewer" | "admin");
  });

  const groups = Array.from(new Set(filteredItems.map((i) => i.group)));

  const runCommand = useCallback(
    (command: () => void) => {
      onOpenChange(false);
      command();
    },
    [onOpenChange]
  );

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search modules, actions..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        {groups.map((group) => (
          <CommandGroup key={group} heading={group}>
            {filteredItems
              .filter((i) => i.group === group)
              .map((item) => (
                <CommandItem
                  key={item.url}
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
          <CommandItem onSelect={() => runCommand(() => setTheme("light"))}>
            <Sun className="mr-2 h-4 w-4" />
            Light Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("dark"))}>
            <Moon className="mr-2 h-4 w-4" />
            Dark Mode
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => setTheme("system"))}>
            <Monitor className="mr-2 h-4 w-4" />
            System Theme
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem onSelect={() => runCommand(() => signOut())}>
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
