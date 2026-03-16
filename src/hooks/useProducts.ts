import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEffectiveUserId } from "@/hooks/useTeam";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products"> & { barcodes: string[] };
export type ProductInsert = TablesInsert<"products"> & { barcodes?: string[] };
export type ProductUpdate = TablesUpdate<"products"> & { barcodes?: string[] };

const PRODUCTS_PAGE_SIZE = 50;

/** Paginated product list with targeted column selection. */
export function useProducts(page = 0) {
  const effectiveUserId = useEffectiveUserId();
  const from = page * PRODUCTS_PAGE_SIZE;
  const to = from + PRODUCTS_PAGE_SIZE - 1;

  return useQuery({
    queryKey: ["products", effectiveUserId, page],
    queryFn: async () => {
      if (!effectiveUserId) return { data: [], count: 0 };

      const { data, error, count } = await supabase
        .from("products")
        .select(
          `id, name, sku, barcodes, description, cost_price, sell_price,
           quantity, min_quantity, category_id,
           category:categories(id, name)`,
          { count: "exact" }
        )
        .eq("user_id", effectiveUserId)
        .order("name")
        .range(from, to);

      if (error) throw error;
      return { data: (data ?? []) as (typeof data[0] & { barcodes: string[] })[], count: count ?? 0 };
    },
    enabled: !!effectiveUserId,
    placeholderData: (prev) => prev,
  });
}

/** Fetch ALL products (no pagination) — used for dropdowns/comboboxes */
export function useAllProducts() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["products-all", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, sku, barcodes, sell_price, cost_price, quantity, min_quantity, category_id, category:categories(id, name)")
        .eq("user_id", effectiveUserId)
        .order("name");

      if (error) throw error;
      return (data ?? []) as (typeof data[0] & { barcodes: string[] })[];
    },
    enabled: !!effectiveUserId,
    staleTime: 2 * 60 * 1000, // 2 min for dropdowns
  });
}

export function useProduct(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["product", id],
    queryFn: async () => {
      if (!user || !id) return null;

      const { data, error } = await supabase
        .from("products")
        .select(`*, category:categories(id, name)`)
        .eq("id", id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, "user_id">) => {
      if (!effectiveUserId) throw new Error("Non authentifié");

      const { barcodes, ...rest } = product as any;
      const { data, error } = await supabase
        .from("products")
        .insert({ ...rest, barcodes: barcodes || [], user_id: effectiveUserId })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit créé avec succès");
    },
    onError: (error) => {
      console.error("Error creating product:", error);
      toast.error("Erreur lors de la création du produit");
    },
  });
}

export function useUpdateProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ id, ...updates }: ProductUpdate & { id: string }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic update
    onMutate: async ({ id, ...updates }) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p: any) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la mise à jour");
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit mis à jour");
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async ({ id, quantity }: { id: string; quantity: number }) => {
      const { data, error } = await supabase
        .from("products")
        .update({ quantity, updated_at: new Date().toISOString() })
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Optimistic stock update
    onMutate: async ({ id, quantity }) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.map((p: any) =>
              p.id === id ? { ...p, quantity } : p
            ),
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la mise à jour du stock");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();
  const effectiveUserId = useEffectiveUserId();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      return id;
    },
    // Optimistic remove
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ["products", effectiveUserId] });
      const previousData = queryClient.getQueriesData({ queryKey: ["products", effectiveUserId] });

      queryClient.setQueriesData(
        { queryKey: ["products", effectiveUserId] },
        (old: any) => {
          if (!old?.data) return old;
          return {
            ...old,
            data: old.data.filter((p: any) => p.id !== id),
            count: (old.count ?? 1) - 1,
          };
        }
      );
      return { previousData };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousData) {
        context.previousData.forEach(([key, value]) => {
          queryClient.setQueryData(key, value);
        });
      }
      toast.error("Erreur lors de la suppression");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-all"] });
      queryClient.invalidateQueries({ queryKey: ["low-stock-alerts"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Produit supprimé");
    },
  });
}

export function useLowStockProducts() {
  const effectiveUserId = useEffectiveUserId();

  return useQuery({
    queryKey: ["products-low-stock", effectiveUserId],
    queryFn: async () => {
      if (!effectiveUserId) return [];

      const { data, error } = await supabase
        .from("products")
        .select("id, name, quantity, min_quantity")
        .eq("user_id", effectiveUserId)
        .lte("quantity", 5);

      if (error) throw error;

      return (data as Pick<Product, "id" | "name" | "quantity" | "min_quantity">[]).filter(
        (p) => p.quantity <= p.min_quantity
      );
    },
    enabled: !!effectiveUserId,
  });
}
