import { formatDistanceToNow } from "date-fns";
import { FileText, BookOpen, Bell, CheckCheck, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Notification } from "./NotificationBell";

interface NotificationListProps {
  notifications: Notification[];
  onClickNotification: (n: Notification) => void;
  onMarkAllRead: () => void;
  onDelete: (id: string) => void;
}

const typeIcons: Record<string, React.ElementType> = {
  new_application: FileText,
  blog_submission: BookOpen,
  status_change: Bell,
  system: Bell,
};

export function NotificationList({
  notifications,
  onClickNotification,
  onMarkAllRead,
  onDelete,
}: NotificationListProps) {
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <h4 className="text-sm font-semibold">Notifications</h4>
        {unreadCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={onMarkAllRead}
          >
            <CheckCheck className="h-3 w-3 mr-1" />
            Mark all read
          </Button>
        )}
      </div>

      <ScrollArea className="max-h-80">
        {notifications.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No notifications yet
          </div>
        ) : (
          <div>
            {notifications.map((n) => {
              const Icon = typeIcons[n.type] || Bell;
              return (
                <div
                  key={n.id}
                  className={`flex items-start gap-3 px-4 py-3 border-b last:border-b-0 cursor-pointer hover:bg-accent/50 transition-colors ${
                    !n.is_read ? "bg-accent/20" : ""
                  }`}
                  onClick={() => onClickNotification(n)}
                >
                  <div className="mt-0.5 shrink-0">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-tight ${!n.is_read ? "font-medium" : ""}`}>
                      {n.title}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                      {n.message}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 hover:opacity-100"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(n.id);
                    }}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
