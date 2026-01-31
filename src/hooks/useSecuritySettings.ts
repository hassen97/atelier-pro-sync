import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface SecuritySettings {
  encryptBackups: boolean;
  activityLog: boolean;
  offlineMode: boolean;
}

const STORAGE_KEY = "security_settings";

const defaultSettings: SecuritySettings = {
  encryptBackups: true,
  activityLog: true,
  offlineMode: true,
};

export function useSecuritySettings() {
  const [settings, setSettings] = useState<SecuritySettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [resetting, setResetting] = useState(false);
  const { user } = useAuth();

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Error parsing security settings:", e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: Partial<SecuritySettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
    toast.success("Paramètre de sécurité mis à jour");
  }, []);

  // Reset all user data (DANGER ZONE)
  const resetAllData = useCallback(async () => {
    if (!user) {
      toast.error("Non authentifié");
      return false;
    }

    setResetting(true);
    
    try {
      // Get all repair IDs for this user first
      const { data: repairIds } = await supabase
        .from("repairs")
        .select("id")
        .eq("user_id", user.id);
      
      // Get all sale IDs for this user
      const { data: saleIds } = await supabase
        .from("sales")
        .select("id")
        .eq("user_id", user.id);

      // Delete repair parts first
      if (repairIds && repairIds.length > 0) {
        const { error: repairPartsError } = await supabase
          .from("repair_parts")
          .delete()
          .in("repair_id", repairIds.map(r => r.id));
        if (repairPartsError) console.error("Error deleting repair parts:", repairPartsError);
      }
      
      // Delete sale items
      if (saleIds && saleIds.length > 0) {
        const { error: saleItemsError } = await supabase
          .from("sale_items")
          .delete()
          .in("sale_id", saleIds.map(s => s.id));
        if (saleItemsError) console.error("Error deleting sale items:", saleItemsError);
      }

      // Delete repairs
      const { error: repairsError } = await supabase
        .from("repairs")
        .delete()
        .eq("user_id", user.id);

      // Delete sales
      const { error: salesError } = await supabase
        .from("sales")
        .delete()
        .eq("user_id", user.id);

      // Delete invoices
      const { error: invoicesError } = await supabase
        .from("invoices")
        .delete()
        .eq("user_id", user.id);

      // Delete expenses
      const { error: expensesError } = await supabase
        .from("expenses")
        .delete()
        .eq("user_id", user.id);

      // Delete products
      const { error: productsError } = await supabase
        .from("products")
        .delete()
        .eq("user_id", user.id);

      // Delete categories
      const { error: categoriesError } = await supabase
        .from("categories")
        .delete()
        .eq("user_id", user.id);

      // Delete customers
      const { error: customersError } = await supabase
        .from("customers")
        .delete()
        .eq("user_id", user.id);

      // Delete suppliers
      const { error: suppliersError } = await supabase
        .from("suppliers")
        .delete()
        .eq("user_id", user.id);

      // Check for errors
      const errors = [
        repairsError,
        salesError,
        invoicesError,
        expensesError,
        productsError,
        categoriesError,
        customersError,
        suppliersError,
      ].filter(Boolean);

      if (errors.length > 0) {
        console.error("Errors during reset:", errors);
        toast.error("Certaines données n'ont pas pu être supprimées");
        return false;
      }

      // Clear localStorage notifications
      localStorage.removeItem("app_notifications");
      
      toast.success("Toutes les données ont été réinitialisées");
      
      // Refresh the page to reset all state
      window.location.reload();
      
      return true;
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Erreur lors de la réinitialisation");
      return false;
    } finally {
      setResetting(false);
    }
  }, [user]);

  return {
    settings,
    loading,
    resetting,
    saveSettings,
    resetAllData,
  };
}
