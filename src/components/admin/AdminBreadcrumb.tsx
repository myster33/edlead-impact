import { useLocation, Link } from "react-router-dom";
import { useMemo } from "react";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType;
  moduleKey: string;
}

interface MenuGroup {
  label: string;
  icon: React.ComponentType;
  items: MenuItem[];
}

interface AdminBreadcrumbProps {
  filteredGroups: MenuGroup[];
}

export function AdminBreadcrumb({ filteredGroups }: AdminBreadcrumbProps) {
  const location = useLocation();

  const breadcrumbData = useMemo(() => {
    for (const group of filteredGroups) {
      const item = group.items.find((i) => location.pathname === i.url);
      if (item) {
        return { group, item };
      }
    }
    if (location.pathname === "/admin/settings") {
      return { group: null, item: { title: "Settings", url: "/admin/settings" } };
    }
    return null;
  }, [location.pathname, filteredGroups]);

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/admin/dashboard">Admin</Link>
          </BreadcrumbLink>
        </BreadcrumbItem>
        {breadcrumbData?.group && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to={breadcrumbData.group.items[0]?.url || "/admin/dashboard"}>
                  {breadcrumbData.group.label}
                </Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
          </>
        )}
        {breadcrumbData?.item && (
          <>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{breadcrumbData.item.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </>
        )}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
