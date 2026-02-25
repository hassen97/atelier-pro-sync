import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  id: string;
  user_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  details: Record<string, any> | null;
  created_at: string;
  actor_name?: string;
}

export function useActivityLog(filters?: { action?: string; dateFrom?: string; dateTo?: string }) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-log", user?.id, filters],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("activity_log" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);

      if (filters?.action && filters.action !== "all") {
        query = query.eq("action", filters.action);
      }
      if (filters?.dateFrom) {
        query = query.gte("created_at", filters.dateFrom);
      }
      if (filters?.dateTo) {
        query = query.lte("created_at", filters.dateTo + "T23:59:59");
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as unknown as ActivityLogEntry[];
    },
    enabled: !!user,
  });
}
