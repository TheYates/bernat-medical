import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import { Link, useLocation } from 'react-router-dom';
import {
  Users,
  Calendar,
  Settings,
  User,
  ClipboardList,
  Home,
  ChevronLeft,
  ChevronRight,
  FileText,
  Package,
  UserPlus,
} from 'lucide-react';
import { AccessType } from '@/types/user';
import { Icons } from '@/components/icons';
import { Button } from '@/components/ui/button';

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
    label: 'Dashboard',
    href: '/dashboard',
    roles: ['admin', 'user'],
    requiredAccess: undefined,
  },
  {
    icon: Users,
    label: 'Users',
    href: '/dashboard/users',
    roles: ['admin'],
    requiredAccess: 'settings',
  },
  {
    icon: Package,
    label: 'Inventory',
    href: '/dashboard/inventory',
    roles: ['admin', 'user'],
    requiredAccess: 'settings',
  },
  {
    icon: Calendar,
    label: 'Appointments',
    href: '/dashboard/appointments',
    roles: ['admin', 'user'],
    requiredAccess: 'appointments',
  },
  {
    icon: ClipboardList,
    label: 'Medical Records',
    href: '/dashboard/records',
    roles: ['admin', 'user'],
    requiredAccess: 'records',
  },
  {
    icon: Settings,
    label: 'Settings',
    href: '/dashboard/settings',
    roles: ['admin'],
    requiredAccess: 'settings',
  },
  {
    icon: FileText,
    label: 'Reports',
    href: '/dashboard/reports',
    roles: ['admin'],
    requiredAccess: 'settings',
  },
  {
    icon: UserPlus,
    label: 'Register Patient',
    href: '/dashboard/register-patient',
    roles: ['admin', 'user'],
    requiredAccess: 'records',
  },
  {
    icon: FileText,
    label: 'Service Request',
    href: '/dashboard/service-request',
    roles: ['admin', 'user'],
    requiredAccess: 'records',
  },
];

export function Sidebar() {
  const { user } = useAuth();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);

  console.log('Current user:', user);

  const filteredLinks = links.filter((link) => {
    const hasRole = link.roles.includes(user?.role || '');
    const hasAccess = !link.requiredAccess || user?.access?.includes(link.requiredAccess);
    
    console.log(`Link ${link.label}:`, { hasRole, hasAccess });
    
    return hasRole && hasAccess;
  });

  return (
    <div
      className={cn(
        'relative bg-card h-screen border-r flex flex-col transition-all duration-300',
        collapsed ? 'w-16' : 'w-64'
      )}
    >
      <div className={cn(
        'p-4 flex items-center',
        collapsed ? 'justify-center' : 'justify-between'
      )}>
        <Icons.logo className={cn(
          'transition-all duration-300',
          collapsed ? 'h-8 w-8' : 'h-8 w-auto'
        )} />
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-8 w-8", collapsed ? "absolute -right-4" : "ml-auto")}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
                'flex items-center gap-3 px-3 py-2 rounded-md mb-1 transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'hover:bg-muted',
                collapsed ? 'justify-center' : 'justify-start'
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