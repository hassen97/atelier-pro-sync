import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ShopSettings {
  id?: string;
  shop_name: string;
  currency: string;
  country: string;
  tax_rate: number;
  tax_enabled: boolean;
  stock_alert_threshold: number;
  brand_color: string;
  language: string;
  logo_url: string | null;
  address: string | null;
  phone: string | null;
  whatsapp_phone: string | null;
  email: string | null;
  receipt_terms: string | null;
  inventory_locked: boolean;
}

const defaultSettings: ShopSettings = {
  shop_name: "Mon Atelier",
  currency: "TND",
  country: "TN",
  tax_rate: 19,
  tax_enabled: true,
  stock_alert_threshold: 5,
  brand_color: "blue",
  language: "fr",
  logo_url: null,
  address: null,
  phone: null,
  whatsapp_phone: null,
  email: null,
  receipt_terms: null,
  inventory_locked: false,
};

export function useShopSettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<ShopSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("shop_settings")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setSettings({
          id: data.id,
          shop_name: data.shop_name,
          currency: data.currency,
          country: data.country || "TN",
          tax_rate: Number(data.tax_rate),
          tax_enabled: data.tax_enabled ?? true,
          stock_alert_threshold: data.stock_alert_threshold,
          brand_color: data.brand_color || "blue",
          language: data.language || "fr",
          logo_url: data.logo_url || null,
          address: (data as any).address || null,
          phone: (data as any).phone || null,
          whatsapp_phone: (data as any).whatsapp_phone || null,
          email: (data as any).email || null,
          receipt_terms: (data as any).receipt_terms || null,
          inventory_locked: (data as any).inventory_locked ?? false,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
      toast.error("Erreur lors du chargement des paramètres");
    } finally {
      setLoading(false);
    }
  };

  const saveSettings = async (newSettings: Partial<ShopSettings>) => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return false;
    }

    try {
      setSaving(true);
      const updatedSettings = { ...settings, ...newSettings };

      if (settings.id) {
        // Update existing settings
        const { error } = await supabase
          .from("shop_settings")
          .update({
            shop_name: updatedSettings.shop_name,
            currency: updatedSettings.currency,
            country: updatedSettings.country,
            tax_rate: updatedSettings.tax_rate,
            tax_enabled: updatedSettings.tax_enabled,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
            brand_color: updatedSettings.brand_color,
            language: updatedSettings.language,
            logo_url: updatedSettings.logo_url,
            address: updatedSettings.address,
            phone: updatedSettings.phone,
            whatsapp_phone: updatedSettings.whatsapp_phone,
            email: updatedSettings.email,
            receipt_terms: updatedSettings.receipt_terms,
            inventory_locked: updatedSettings.inventory_locked,
            updated_at: new Date().toISOString(),
          } as any)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        // Create new settings
        const { data, error } = await supabase
          .from("shop_settings")
          .insert({
            user_id: user.id,
            shop_name: updatedSettings.shop_name,
            currency: updatedSettings.currency,
            country: updatedSettings.country,
            tax_rate: updatedSettings.tax_rate,
            tax_enabled: updatedSettings.tax_enabled,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
            brand_color: updatedSettings.brand_color,
            language: updatedSettings.language,
            logo_url: updatedSettings.logo_url,
            address: updatedSettings.address,
            phone: updatedSettings.phone,
            whatsapp_phone: updatedSettings.whatsapp_phone,
            email: updatedSettings.email,
            receipt_terms: updatedSettings.receipt_terms,
            inventory_locked: updatedSettings.inventory_locked,
          } as any)
          .select()
          .single();

        if (error) throw error;
        updatedSettings.id = data.id;
      }

      setSettings(updatedSettings);
      toast.success("Paramètres enregistrés avec succès");
      return true;
    } catch (error) {
      console.error("Error saving settings:", error);
      toast.error("Erreur lors de l'enregistrement");
      return false;
    } finally {
      setSaving(false);
    }
  };

  return {
    settings,
    loading,
    saving,
    saveSettings,
    refetch: fetchSettings,
  };
}
