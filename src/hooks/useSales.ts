import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

export type Sale = Tables<"sales">;
export type SaleInsert = TablesInsert<"sales">;
export type SaleItem = Tables<"sale_items">;
export type SaleItemInsert = TablesInsert<"sale_items">;

interface CreateSaleParams {
  customer_id?: string | null;
  payment_method: string;
  total_amount: number;
  amount_paid: number;
  notes?: string;
  items: {
    product_id: string;
    quantity: number;
    unit_price: number;
  }[];
}

export function useSales() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["sales", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];
      
      const { data, error } = await supabase
        .from("sales")
        .select(`
          *,
          customer:customers(id, name),
          sale_items(id, product_id, quantity, unit_price)
        `)
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
    enabled: !!effectiveUserId,
  });
}

export function useCreateSale() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ items, ...saleData }: CreateSaleParams) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      // Create the sale
      const { data: sale, error: saleError } = await supabase
        .from("sales")
        .insert({
          ...saleData,
          user_id: effectiveUserId,
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items
      const saleItems = items.map((item) => ({
        sale_id: sale.id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: item.unit_price,
      }));

      const { error: itemsError } = await supabase
        .from("sale_items")
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Update product quantities
      for (const item of items) {
        const { data: product } = await supabase
          .from("products")
          .select("quantity")
          .eq("id", item.product_id)
          .single();
        
        if (product) {
          await supabase
            .from("products")
            .update({ 
              quantity: product.quantity - item.quantity,
              updated_at: new Date().toISOString()
            })
            .eq("id", item.product_id);
        }
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
      toast.success("Vente enregistrée avec succès");
    },
    onError: (error) => {
      console.error("Error creating sale:", error);
      toast.error("Erreur lors de l'enregistrement de la vente");
    },
  });
}

export function useUpdateSale() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; amount_paid?: number }) => {
      const { data, error } = await supabase
        .from("sales")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      queryClient.invalidateQueries({ queryKey: ["profit"] });
    },
    onError: (error) => {
      console.error("Error updating sale:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}
