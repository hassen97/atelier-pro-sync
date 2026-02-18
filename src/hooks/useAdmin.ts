import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ShopOwner {
  user_id: string;
  full_name: string | null;
  username: string | null;
  created_at: string;
  role: string;
  team_count: number;
  repair_count: number;
  shop_name: string;
  is_locked: boolean;
}

export interface AdminStats {
  total_owners: number;
  total_employees: number;
  total_repairs: number;
}

export interface AdminRevenue {
  total_revenue: number;
  sales_revenue: number;
  repair_revenue: number;
}

export interface ActivityItem {
  type: "repair" | "sale";
  id: string;
  description: string;
  amount: number;
  status: string;
  created_at: string;
  shop_name: string;
}

export function useIsPlatformAdmin() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-platform-admin", user?.id],
    queryFn: async () => {
      if (!user) return false;
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();
      return data?.role === "platform_admin";
    },
    enabled: !!user,
  });
}

export function useAdminData() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data as { owners: ShopOwner[]; stats: AdminStats };
    },
    enabled: !!user,
  });
}

export function useAdminRevenue() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-revenue"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-revenue" },
      });
      if (error) throw error;
      return data as AdminRevenue;
    },
    enabled: !!user,
  });
}

export function useAdminActivity() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["admin-activity"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-activity" },
      });
      if (error) throw error;
      return data as { activity: ActivityItem[] };
    },
    enabled: !!user,
  });
}

export function useDeleteOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (userId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "delete", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Propriétaire supprimé avec succès");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la suppression"),
  });
}

export function useResetOwnerPassword() {
  return useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "reset-password", userId, newPassword },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => toast.success("Mot de passe réinitialisé"),
    onError: (err: any) => toast.error(err.message || "Erreur lors de la réinitialisation"),
  });
}

export function useCreateOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (params: { fullName: string; username: string; password: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "create", ...params },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Compte propriétaire créé avec succès");
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la création"),
  });
}

export function useLockOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, lock }: { userId: string; lock: boolean }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: lock ? "lock" : "unlock", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success(variables.lock ? "Compte verrouillé" : "Compte déverrouillé");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });
}
