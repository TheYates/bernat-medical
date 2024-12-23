import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bell } from 'lucide-react';
import { api } from '@/lib/api';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/utils';

interface Notification {
  id: number;
  type: 'restock_pending' | 'restock_approved' | 'restock_rejected';
  message: string;
  createdAt: string;
  is_read: boolean;
}

export function NotificationBell() {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  const { data: notifications } = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const response = await api.get('/notifications');
      const unread = response.data.filter((n: Notification) => !n.is_read).length;
      setUnreadCount(unread);
      return response.data;
    },
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  const markAsRead = async (id: number) => {
    try {
      await api.post(`/notifications/${id}/read`);
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-500 text-[10px] font-medium text-white flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        {notifications?.length === 0 ? (
          <div className="p-4 text-sm text-muted-foreground text-center">
            No notifications
          </div>
        ) : (
          notifications?.map((notification: Notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-4 cursor-pointer ${!notification.is_read ? 'bg-muted/50' : ''}`}
              onClick={() => markAsRead(notification.id)}
            >
              <div className="space-y-1">
                <p className="text-sm">{notification.message}</p>
                <p className="text-xs text-muted-foreground">
                  {formatDate(notification.createdAt, 'PPp')}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 