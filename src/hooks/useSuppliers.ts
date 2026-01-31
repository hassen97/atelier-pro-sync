import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Supplier = Tables<"suppliers">;
export type SupplierInsert = TablesInsert<"suppliers">;
export type SupplierUpdate = TablesUpdate<"suppliers">;

export function useSuppliers() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["suppliers", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
}

export function useCreateSupplier() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (supplier: Omit<SupplierInsert, "user_id">) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("suppliers")
        .insert({ ...supplier, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fournisseur créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating supplier:", error);
      toast.error("Erreur lors de la création");
    },
  });
}

export function useUpdateSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: SupplierUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("suppliers")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fournisseur mis à jour");
    },
    onError: (error) => {
      console.error("Error updating supplier:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useDeleteSupplier() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Fournisseur supprimé");
    },
    onError: (error) => {
      console.error("Error deleting supplier:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useUpdateSupplierBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, amount }: { id: string; amount: number }) => {
      // First get current balance
      const { data: supplier, error: fetchError } = await supabase
        .from("suppliers")
        .select("balance")
        .eq("id", id)
        .single();

      if (fetchError) throw fetchError;

      const newBalance = Number(supplier.balance) + amount;

      const { data, error } = await supabase
        .from("suppliers")
        .update({ balance: newBalance, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Paiement enregistré");
    },
    onError: (error) => {
      console.error("Error updating balance:", error);
      toast.error("Erreur lors de l'enregistrement du paiement");
    },
  });
}
