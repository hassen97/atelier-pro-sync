import { useState, useEffect, useCallback } from "react";

export interface NotificationSettings {
  lowStockAlerts: boolean;
  paymentReminders: boolean;
}

const STORAGE_KEY = "notification_settings";

const defaultSettings: NotificationSettings = {
  lowStockAlerts: true,
  paymentReminders: true,
};

export function useNotificationSettings() {
  const [settings, setSettings] = useState<NotificationSettings>(defaultSettings);
  const [loading, setLoading] = useState(true);

  // Load settings from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setSettings({ ...defaultSettings, ...parsed });
      } catch (e) {
        console.error("Error parsing notification settings:", e);
      }
    }
    setLoading(false);
  }, []);

  // Save settings to localStorage whenever they change
  const saveSettings = useCallback((newSettings: Partial<NotificationSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    settings,
    loading,
    saveSettings,
  };
}
