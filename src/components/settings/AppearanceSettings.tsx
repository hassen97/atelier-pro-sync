import { useState, useRef } from "react";
import { Palette, Upload, Trash2, Loader2, Save, Languages, Image } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_PRESETS = [
  { name: "Neon Blue", value: "blue", hsl: "217 91% 40%", hslDark: "217 91% 60%" },
  { name: "Emerald Green", value: "emerald", hsl: "152 69% 40%", hslDark: "152 69% 50%" },
  { name: "Crimson Red", value: "crimson", hsl: "0 72% 51%", hslDark: "0 72% 60%" },
  { name: "Amethyst Purple", value: "purple", hsl: "271 76% 53%", hslDark: "271 76% 63%" },
];

function hexToHsl(hex: string): string | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

export function AppearanceSettings() {
  const { settings, saving, saveSettings } = useShopSettingsContext();
  const { language, setLanguage, t } = useLanguage();
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedColor, setSelectedColor] = useState((settings as any).brand_color || "blue");
  const [customHex, setCustomHex] = useState("");
  const [uploading, setUploading] = useState(false);
  const [logoUrl, setLogoUrl] = useState((settings as any).logo_url || "");

  const handleColorSelect = (color: string) => {
    setSelectedColor(color);
    setCustomHex("");
    applyColor(color);
    saveSettings({ brand_color: color } as any);
  };

  const handleHexApply = () => {
    const hsl = hexToHsl(customHex);
    if (!hsl) {
      toast.error("Code hex invalide");
      return;
    }
    setSelectedColor("custom");
    applyColor("custom", hsl);
    saveSettings({ brand_color: `custom:${customHex}` } as any);
  };

  const applyColor = (color: string, customHsl?: string) => {
    const root = document.documentElement;
    const preset = COLOR_PRESETS.find((p) => p.value === color);
    if (preset) {
      root.style.setProperty("--primary", preset.hsl);
      root.style.setProperty("--ring", preset.hsl);
    } else if (customHsl) {
      root.style.setProperty("--primary", customHsl);
      root.style.setProperty("--ring", customHsl);
    }
  };

  // Apply saved color on mount
  useState(() => {
    const saved = (settings as any).brand_color;
    if (saved && saved !== "blue") {
      if (saved.startsWith("custom:")) {
        const hex = saved.replace("custom:", "");
        const hsl = hexToHsl(hex);
        if (hsl) applyColor("custom", hsl);
        setCustomHex(hex);
        setSelectedColor("custom");
      } else {
        applyColor(saved);
      }
    }
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Veuillez sélectionner une image");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error("L'image ne doit pas dépasser 2 Mo");
      return;
    }

    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `${user.id}/logo.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("shop-logos")
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error("Erreur lors du téléchargement");
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from("shop-logos").getPublicUrl(path);
    const url = urlData.publicUrl + "?t=" + Date.now();
    setLogoUrl(url);
    await saveSettings({ logo_url: url } as any);
    toast.success("Logo mis à jour");
    setUploading(false);
  };

  const handleRemoveLogo = async () => {
    setLogoUrl("");
    await saveSettings({ logo_url: "" } as any);
    toast.success("Logo supprimé");
  };

  return (
    <div className="space-y-6">
      {/* Language */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Languages className="h-5 w-5" />
            {t("settings.language")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={language} onValueChange={(val) => setLanguage(val as "fr" | "en")}>
            <SelectTrigger className="w-full sm:w-64">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fr">🇫🇷 Français</SelectItem>
              <SelectItem value="en">🇬🇧 English</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Brand Color */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            {t("settings.brandColor")}
          </CardTitle>
          <CardDescription>{t("settings.brandColorDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {COLOR_PRESETS.map((preset) => (
              <button
                key={preset.value}
                onClick={() => handleColorSelect(preset.value)}
                className={cn(
                  "flex flex-col items-center gap-2 p-3 rounded-lg border-2 transition-all",
                  selectedColor === preset.value
                    ? "border-primary ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                )}
              >
                <div
                  className="w-10 h-10 rounded-full shadow-sm"
                  style={{ backgroundColor: `hsl(${preset.hsl})` }}
                />
                <span className="text-xs font-medium">{preset.name}</span>
              </button>
            ))}
          </div>

          <div className="flex gap-2 items-end">
            <div className="flex-1 space-y-1">
              <Label>Code Hex personnalisé</Label>
              <Input
                placeholder="#1A73E8"
                value={customHex}
                onChange={(e) => setCustomHex(e.target.value)}
                maxLength={7}
              />
            </div>
            <Button variant="outline" onClick={handleHexApply} disabled={!customHex}>
              Appliquer
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logo Upload */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5" />
            {t("settings.shopLogo")}
          </CardTitle>
          <CardDescription>{t("settings.shopLogoDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleLogoUpload}
          />

          {logoUrl ? (
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-lg border overflow-hidden bg-muted flex items-center justify-center">
                <img src={logoUrl} alt="Shop logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                  {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                  {t("settings.uploadLogo")}
                </Button>
                <Button variant="ghost" size="sm" onClick={handleRemoveLogo} className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4 mr-2" />
                  {t("settings.removeLogo")}
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              {uploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
              {t("settings.uploadLogo")}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
