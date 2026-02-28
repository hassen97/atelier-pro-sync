import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Repair = Tables<"repairs">;
export type RepairInsert = TablesInsert<"repairs">;
export type RepairUpdate = TablesUpdate<"repairs">;

export type RepairStatus = "pending" | "in_progress" | "completed" | "delivered";

export function useRepairs() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["repairs", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          customer:customers(id, name, phone, email)
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useRepair(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["repair", id],
    queryFn: async () => {
      if (!user || !id) return null;
      
      const { data, error } = await supabase
        .from("repairs")
        .select(`
          *,
          customer:customers(id, name, phone, email),
          repair_parts(id, product_id, quantity, unit_price)
        `)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateRepair() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (repair: Omit<RepairInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("repairs")
        .insert({ ...repair, user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Réparation créée avec succès");
    },
    onError: (error) => {
      console.error("Error creating repair:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: RepairUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("repairs")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["repair", data.id] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Réparation mise à jour");
    },
    onError: (error) => {
      console.error("Error updating repair:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useUpdateRepairStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: RepairStatus }) => {
      const updates: RepairUpdate = {
        status,
        updated_at: new Date().toISOString(),
      };

      // Set delivery date if status is delivered
      if (status === "delivered") {
        updates.delivery_date = new Date().toISOString();
      }

      const { data, error } = await supabase
        .from("repairs")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
    },
    onError: (error) => {
      console.error("Error updating repair status:", error);
      toast.error("Erreur lors du changement de statut");
    },
  });
}

export function useDeleteRepair() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("repairs")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["repairs"] });
      queryClient.invalidateQueries({ queryKey: ["recent-repairs"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Réparation supprimée");
    },
    onError: (error) => {
      console.error("Error deleting repair:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}
