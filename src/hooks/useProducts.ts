import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Tables, TablesInsert, TablesUpdate } from "@/integrations/supabase/types";

export type Product = Tables<"products">;
export type ProductInsert = TablesInsert<"products">;
export type ProductUpdate = TablesUpdate<"products">;

export function useProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["products", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq("user_id", user.id)
        .order("name");

      if (error) throw error;
      return data;
    },
    enabled: !!user,
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
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;
      return data;
    },
    enabled: !!user && !!id,
  });
}

export function useCreateProduct() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (product: Omit<ProductInsert, "user_id">) => {
      if (!user) throw new Error("Non authentifié");

      const { data, error } = await supabase
        .from("products")
        .insert({ ...product, user_id: user.id })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
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
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", data.id] });
      toast.success("Produit mis à jour");
    },
    onError: (error) => {
      console.error("Error updating product:", error);
      toast.error("Erreur lors de la mise à jour");
    },
  });
}

export function useUpdateProductStock() {
  const queryClient = useQueryClient();

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Stock mis à jour");
    },
    onError: (error) => {
      console.error("Error updating stock:", error);
      toast.error("Erreur lors de la mise à jour du stock");
    },
  });
}

export function useDeleteProduct() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Produit supprimé");
    },
    onError: (error) => {
      console.error("Error deleting product:", error);
      toast.error("Erreur lors de la suppression");
    },
  });
}

export function useLowStockProducts() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["products-low-stock", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .lte("quantity", supabase.rpc ? 5 : 5); // Default threshold

      if (error) throw error;
      
      // Filter products where quantity <= min_quantity
      return (data as Product[]).filter(p => p.quantity <= p.min_quantity);
    },
    enabled: !!user,
  });
}
