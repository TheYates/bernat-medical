import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { Link, useLocation } from "react-router-dom";
import {
  Users,
  Calendar,
  Settings,
  ClipboardList,
  Home,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  UserPlus,
  Activity,
  FlaskConical,
  LayoutDashboard,
  Stethoscope,
  Scan,
  Pill,
} from "lucide-react";
import { AccessType } from "@/types/user";
import { Icons } from "@/components/icons";
import { Button } from "@/components/ui/button";

interface SidebarLink {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  roles: string[];
  requiredAccess?: AccessType | null;
}

const links: SidebarLink[] = [
  {
    icon: Home,
    label: "Dashboard",
    href: "/dashboard",
    roles: ["admin", "user"],
    requiredAccess: undefined,
  },
  {
    icon: UserPlus,
    label: "Register Patient",
    href: "/dashboard/register-patient",
    roles: ["admin", "user"],
    requiredAccess: "records",
  },
  {
    icon: FileText,
    label: "Service Request",
    href: "/dashboard/service-request",
    roles: ["admin", "user"],
    requiredAccess: "records",
  },
  {
    icon: Activity,
    label: "Vital Signs",
    href: "/dashboard/vital-signs",
    roles: ["admin", "user"],
    requiredAccess: "records",
  },
  {
    icon: ClipboardList,
    label: "Consultation",
    href: "/dashboard/consultation",
    roles: ["admin", "user"],
    requiredAccess: "records",
  },
  {
    icon: FlaskConical,
    label: "Laboratory",
    href: "/dashboard/laboratory",
    roles: ["admin", "user"],
    requiredAccess: "lab",
  },

  {
    icon: Scan,
    label: "X-ray/Scan",
    href: "/dashboard/xray",
    roles: ["admin", "user"],
    requiredAccess: "xray",
  },

  {
    icon: Pill,
    label: "Pharmacy",
    href: "/dashboard/pharmacy",
    roles: ["admin", "user"],
    requiredAccess: "pharmacy",
  },
  {
    icon: Package,
    label: "Inventory",
    href: "/dashboard/inventory",
    roles: ["admin", "user"],
    requiredAccess: "settings",
  },
  {
    icon: FileText,
    label: "Reports",
    href: "/dashboard/reports",
    roles: ["admin"],
    requiredAccess: "settings",
  },
  {
    icon: Settings,
    label: "Settings",
    href: "/dashboard/settings",
    roles: ["admin"],
    requiredAccess: "settings",
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  const filteredLinks = links.filter((link) => {
    const hasRole = link.roles.includes(user?.role || "");
    // Admin should have access to everything
    const hasAccess =
      user?.role === "admin" ||
      !link.requiredAccess ||
      user?.access?.includes(link.requiredAccess);

    return hasRole && hasAccess;
  });

  return (
    <div
      className={cn(
        "relative bg-card h-screen border-r flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "p-4 flex items-center",
          collapsed ? "justify-center" : "justify-between"
        )}
      >
        <Icons.logo
          className={cn(
            "transition-all duration-300",
            collapsed ? "h-8 w-8" : "h-8 w-auto"
          )}
        />
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", collapsed ? "absolute -right-4" : "ml-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="h-4 w-4" />
          ) : (
            <ChevronLeft className="h-4 w-4" />
          )}
        </Button>
      </div>
      <nav className="flex-1 px-2 py-2">
        {filteredLinks.map((link) => {
          const Icon = link.icon;
          const isActive = location.pathname === link.href;
          return (
            <Link
              key={link.href}
              to={link.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted",
                collapsed ? "justify-center" : "justify-start"
              )}
              title={collapsed ? link.label : undefined}
            >
              <Icon className="h-5 w-5 min-w-[20px]" />
              {!collapsed && <span>{link.label}</span>}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
