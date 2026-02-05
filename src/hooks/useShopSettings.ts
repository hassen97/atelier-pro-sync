import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface ShopSettings {
  id?: string;
  shop_name: string;
  currency: string;
  tax_rate: number;
  tax_enabled: boolean;
  stock_alert_threshold: number;
}

const defaultSettings: ShopSettings = {
  shop_name: "Mon Atelier",
  currency: "TND",
  tax_rate: 19,
  tax_enabled: true,
  stock_alert_threshold: 5,
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
          tax_rate: Number(data.tax_rate),
          tax_enabled: data.tax_enabled ?? true,
          stock_alert_threshold: data.stock_alert_threshold,
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
            tax_rate: updatedSettings.tax_rate,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
            updated_at: new Date().toISOString(),
          })
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
            tax_rate: updatedSettings.tax_rate,
            stock_alert_threshold: updatedSettings.stock_alert_threshold,
          })
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
