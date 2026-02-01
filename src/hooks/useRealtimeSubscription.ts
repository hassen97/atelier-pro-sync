import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type TableName = "repairs" | "sales" | "products" | "customers" | "suppliers";

interface UseRealtimeSubscriptionOptions {
  tables: TableName[];
  queryKeys: string[][];
}

export function useRealtimeSubscription({ tables, queryKeys }: UseRealtimeSubscriptionOptions) {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel("dashboard-realtime");

    // Subscribe to each table
    tables.forEach((table) => {
      channel.on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log(`Realtime update on ${table}:`, payload.eventType);
          
          // Invalidate all related queries
          queryKeys.forEach((queryKey) => {
            queryClient.invalidateQueries({ queryKey });
          });
        }
      );
    });

    channel.subscribe((status) => {
      console.log("Realtime subscription status:", status);
    });

    return () => {
      console.log("Unsubscribing from realtime");
      supabase.removeChannel(channel);
    };
  }, [user, queryClient, tables, queryKeys]);
}

// Pre-configured hook for dashboard
export function useDashboardRealtime() {
  useRealtimeSubscription({
    tables: ["repairs", "sales", "products", "customers"],
    queryKeys: [
      ["dashboard-stats"],
      ["recent-repairs"],
      ["low-stock-alerts"],
      ["repairs"],
    ],
  });
}
