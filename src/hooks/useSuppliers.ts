import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Supplier = Tables<"suppliers">;
export type SupplierInsert = TablesInsert<"suppliers">;
export type SupplierUpdate = TablesUpdate<"suppliers">;

export interface SupplierTransaction {
  id: string;
  user_id: string;
  supplier_id: string;
  type: "purchase" | "payment";
  description: string | null;
  amount: number;
  running_balance: number;
  proof_url: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface SupplierPurchase {
  id: string;
  user_id: string;
  supplier_id: string;
  transaction_id: string | null;
  product_id: string | null;
  item_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  created_at: string;
}

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

export function useSupplierTransactions(supplierId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["supplier-transactions", supplierId],
    queryFn: async () => {
      if (!supplierId || !user) return [];

      const { data, error } = await supabase
        .from("supplier_transactions" as any)
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return (data || []) as SupplierTransaction[];
    },
    enabled: !!supplierId && !!user,
  });
}

export function useSupplierPurchases(supplierId: string | null) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["supplier-purchases", supplierId],
    queryFn: async () => {
      if (!supplierId || !user) return [];

      const { data, error } = await supabase
        .from("supplier_purchases" as any)
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as SupplierPurchase[];
    },
    enabled: !!supplierId && !!user,
  });
}

export function useCreateSupplierTransaction() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (transaction: {
      supplier_id: string;
      type: "purchase" | "payment";
      description?: string;
      amount: number;
      proof_url?: string;
      status?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("supplier_transactions" as any)
        .insert({
          ...transaction,
          user_id: user.id,
          running_balance: 0,
          status: transaction.status || (transaction.type === "payment" ? "paid" : "pending"),
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-transactions", vars.supplier_id] });
    },
  });
}

export function useCreateSupplierPurchase() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (purchase: {
      supplier_id: string;
      transaction_id?: string;
      product_id?: string;
      item_name: string;
      quantity: number;
      unit_price: number;
      total_price: number;
    }) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("supplier_purchases" as any)
        .insert({ ...purchase, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["supplier-purchases", vars.supplier_id] });
    },
  });
}

export function useRecalculateSupplierBalance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (supplierId: string) => {
      // Get all transactions for this supplier
      const { data: transactions, error: txError } = await supabase
        .from("supplier_transactions" as any)
        .select("*")
        .eq("supplier_id", supplierId)
        .order("created_at", { ascending: true });

      if (txError) throw txError;

      // Recalculate running balance
      let runningBalance = 0;
      const updates: { id: string; running_balance: number }[] = [];

      for (const tx of (transactions || []) as SupplierTransaction[]) {
        if (tx.type === "purchase") {
          runningBalance -= tx.amount; // purchases increase debt (negative balance)
        } else {
          runningBalance += tx.amount; // payments reduce debt
        }
        updates.push({ id: tx.id, running_balance: runningBalance });
      }

      // Update running balances
      for (const update of updates) {
        await supabase
          .from("supplier_transactions" as any)
          .update({ running_balance: update.running_balance })
          .eq("id", update.id);
      }

      // Update supplier balance to match
      const finalBalance = runningBalance;
      const { error: supplierError } = await supabase
        .from("suppliers")
        .update({ balance: finalBalance, updated_at: new Date().toISOString() })
        .eq("id", supplierId);

      if (supplierError) throw supplierError;
      return finalBalance;
    },
    onSuccess: (_, supplierId) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-transactions", supplierId] });
      toast.success("Solde recalculé avec succès");
    },
    onError: () => {
      toast.error("Erreur lors du recalcul");
    },
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
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      id,
      amount,
      proofUrl,
      description,
    }: {
      id: string;
      amount: number;
      proofUrl?: string;
      description?: string;
    }) => {
      if (!user) throw new Error("Non authentifié");

      // Get current balance
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

      // Log transaction
      await supabase.from("supplier_transactions" as any).insert({
        user_id: user.id,
        supplier_id: id,
        type: "payment",
        description: description || "Paiement enregistré",
        amount: Math.abs(amount),
        running_balance: newBalance,
        proof_url: proofUrl || null,
        status: "paid",
      });

      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-transactions", data?.id] });
      toast.success("Paiement enregistré");
    },
    onError: (error) => {
      console.error("Error updating balance:", error);
      toast.error("Erreur lors de l'enregistrement du paiement");
    },
  });
}
