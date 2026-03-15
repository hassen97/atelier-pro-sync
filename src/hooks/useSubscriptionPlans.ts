import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  currency: string;
  period: string;
  description: string | null;
  features: string[];
  highlight: boolean;
  sort_order: number;
  is_active: boolean;
}

export function usePublicPlans() {
  return useQuery({
    queryKey: ["public-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscription_plans" as any)
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return (data as any[]).map((p: any) => ({
        ...p,
        features: Array.isArray(p.features) ? p.features : JSON.parse(p.features || "[]"),
      })) as SubscriptionPlan[];
    },
  });
}

export function useAdminPlans() {
  return useQuery({
    queryKey: ["admin-subscription-plans"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-plans" },
      });
      if (error) throw error;
      return data as { plans: SubscriptionPlan[] };
    },
  });
}

export function useUpdatePlan() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (plan: Partial<SubscriptionPlan> & { id: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-plan", plan },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-subscription-plans"] });
      qc.invalidateQueries({ queryKey: ["public-subscription-plans"] });
      toast.success("Plan mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });
}
