import { createContext, useContext, ReactNode, useState, useEffect, useCallback } from "react";
import { Language, t as translate } from "@/i18n/translations";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const { settings, saveSettings } = useShopSettingsContext();
  const [language, setLanguageState] = useState<Language>(
    ((settings as any).language as Language) || "fr"
  );

  useEffect(() => {
    const lang = (settings as any).language;
    if (lang && (lang === "fr" || lang === "en")) {
      setLanguageState(lang);
    }
  }, [settings]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
    saveSettings({ language: lang } as any);
  }, [saveSettings]);

  const t = useCallback((key: string) => translate(key, language), [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider");
  }
  return context;
}
