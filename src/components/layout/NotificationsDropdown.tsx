import { Bell, Check, Wrench, AlertTriangle, Package } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

interface Notification {
  id: string;
  type: "repair" | "stock" | "alert";
  title: string;
  description: string;
  time: string;
  read: boolean;
}

const initialNotifications: Notification[] = [
  {
    id: "1",
    type: "repair",
    title: "Réparation terminée",
    description: "iPhone 14 Pro - REP-001 est prêt",
    time: "Il y a 5 min",
    read: false,
  },
  {
    id: "2",
    type: "stock",
    title: "Stock faible",
    description: "Écran Samsung S23 - 2 restants",
    time: "Il y a 1h",
    read: false,
  },
  {
    id: "3",
    type: "alert",
    title: "Paiement en attente",
    description: "3 réparations avec solde impayé",
    time: "Il y a 2h",
    read: true,
  },
];

const iconMap = {
  repair: Wrench,
  stock: Package,
  alert: AlertTriangle,
};

const colorMap = {
  repair: "text-primary bg-primary/10",
  stock: "text-amber-500 bg-amber-500/10",
  alert: "text-destructive bg-destructive/10",
};

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="h-9 w-9 relative">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-4 h-4 bg-destructive rounded-full text-[10px] font-medium text-destructive-foreground flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto py-1 px-2 text-xs"
              onClick={markAllAsRead}
            >
              <Check className="h-3 w-3 mr-1" />
              Tout marquer lu
            </Button>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <div className="py-6 text-center text-muted-foreground text-sm">
            Aucune notification
          </div>
        ) : (
          notifications.map((notification) => {
            const Icon = iconMap[notification.type];
            return (
              <DropdownMenuItem
                key={notification.id}
                className={cn(
                  "flex items-start gap-3 p-3 cursor-pointer",
                  !notification.read && "bg-muted/50"
                )}
                onClick={() => markAsRead(notification.id)}
              >
                <div
                  className={cn(
                    "shrink-0 w-8 h-8 rounded-full flex items-center justify-center",
                    colorMap[notification.type]
                  )}
                >
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium text-sm truncate">
                      {notification.title}
                    </p>
                    {!notification.read && (
                      <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {notification.description}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {notification.time}
                  </p>
                </div>
              </DropdownMenuItem>
            );
          })
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-center justify-center text-sm text-primary">
          Voir toutes les notifications
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
