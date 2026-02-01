import { createContext, useContext, ReactNode, useEffect } from "react";
import { useNotifications, Notification } from "@/hooks/useNotifications";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useProducts } from "@/hooks/useProducts";
import { useRepairs } from "@/hooks/useRepairs";

interface NotificationsContextType {
  notifications: Notification[];
  unreadCount: number;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications,
    // Persisted tracking functions
    addNotifiedProduct,
    removeNotifiedProduct,
    hasNotifiedProduct,
    addNotifiedRepair,
    hasNotifiedRepair,
  } = useNotifications();
  
  const { settings: notifSettings } = useNotificationSettings();
  const { data: products } = useProducts();
  const { data: repairs } = useRepairs();

  // Check for low stock products - uses persisted tracking
  useEffect(() => {
    if (!notifSettings.lowStockAlerts || !products) return;

    products.forEach((product) => {
      if (product.quantity <= product.min_quantity && !hasNotifiedProduct(product.id)) {
        addNotifiedProduct(product.id);
        addNotification({
          type: "stock",
          title: "Stock faible",
          description: `${product.name} - ${product.quantity} unité(s) restante(s)`,
          time: "À l'instant",
          read: false,
        });
      } else if (product.quantity > product.min_quantity && hasNotifiedProduct(product.id)) {
        // Remove from tracking if stock is replenished (allows re-notification if it drops again)
        removeNotifiedProduct(product.id);
      }
    });
  }, [products, notifSettings.lowStockAlerts, addNotification, hasNotifiedProduct, addNotifiedProduct, removeNotifiedProduct]);

  // Check for completed/delivered repairs - uses persisted tracking
  useEffect(() => {
    if (!repairs) return;

    repairs.forEach((repair) => {
      // Notify when a repair is completed
      if (
        (repair.status === "completed" || repair.status === "delivered") &&
        !hasNotifiedRepair(repair.id)
      ) {
        addNotifiedRepair(repair.id);
        const customerName = (repair as any).customer?.name || "Client anonyme";
        addNotification({
          type: "repair",
          title: repair.status === "completed" ? "Réparation terminée" : "Réparation livrée",
          description: `${repair.device_model} - ${customerName}`,
          time: "À l'instant",
          read: false,
        });
      }
    });
  }, [repairs, addNotification, hasNotifiedRepair, addNotifiedRepair]);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        markAsRead,
        markAllAsRead,
        addNotification,
        removeNotification,
        clearAllNotifications,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  const context = useContext(NotificationsContext);
  if (context === undefined) {
    throw new Error("useNotificationsContext must be used within a NotificationsProvider");
  }
  return context;
}
