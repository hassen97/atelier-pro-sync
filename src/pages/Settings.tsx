import { useState, useEffect, useRef } from "react";
import {
  Store,
  Save,
  Database,
  Shield,
  Bell,
  Users,
  Download,
  Upload,
  Cloud,
  HardDrive,
  RefreshCw,
  AlertTriangle,
  Loader2,
  Key,
  Tag,
  Globe,
  Phone,
  Mail,
  Palette,
  Image,
  Trash2,
  Languages,
  Lock,
  Copy,
 } from "lucide-react";
import { Receipt } from "lucide-react";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { useNotificationSettings } from "@/hooks/useNotificationSettings";
import { useBackup } from "@/hooks/useBackup";
import { useSecuritySettings } from "@/hooks/useSecuritySettings";
import { ResetDataDialog } from "@/components/settings/ResetDataDialog";
import { CategoriesSettings } from "@/components/settings/CategoriesSettings";
import { TeamManagement } from "@/components/settings/TeamManagement";
import { TaskManagement } from "@/components/settings/TaskManagement";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { countries, currencies, getCurrencyForCountry } from "@/data/countries";
import { BRAND_COLOR_PRESETS, useBrandTheme } from "@/contexts/BrandThemeContext";
import { useI18n } from "@/contexts/I18nContext";

export default function Settings() {
  const { settings, loading, saving, saveSettings } = useShopSettingsContext();
  const { inventoryLocked, toggleInventoryLock, generateCode, generating, generatedCode } = useInventoryAccess();
  const { settings: notifSettings, saveSettings: saveNotifSettings, permissionStatus, requestBrowserPermission } = useNotificationSettings();
  const { 
    settings: backupSettings, 
    syncing, 
    saveSettings: saveBackupSettings, 
    exportJSON, 
    exportSQL, 
    exportExcel,
    restoreFromFile, 
    syncNow 
  } = useBackup();

  const {
    settings: securitySettings,
    resetting,
    saveSettings: saveSecuritySettings,
    resetAllData,
  } = useSecuritySettings();

  const { updatePassword, user } = useAuth();
  const { applyColor } = useBrandTheme();
  const { language, setLanguage, t } = useI18n();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [brandColor, setBrandColor] = useState("blue");
  const [customHex, setCustomHex] = useState("");
  
  const [shopName, setShopName] = useState("");
  const [shopCountry, setShopCountry] = useState("TN");
  const [shopCurrency, setShopCurrency] = useState("TND");
  const [taxRate, setTaxRate] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [stockThreshold, setStockThreshold] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopWhatsapp, setShopWhatsapp] = useState("");
  const [shopEmail, setShopEmail] = useState("");
  const [receiptTerms, setReceiptTerms] = useState("");
  const [receiptMode, setReceiptMode] = useState("detailed");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [warrantyDays, setWarrantyDays] = useState("30");
  const [showPaymentOnTracking, setShowPaymentOnTracking] = useState(false);
  const [storeHours, setStoreHours] = useState("");
  
  // Phone / WhatsApp state
  const [profilePhone, setProfilePhone] = useState("");
  const [profileWhatsapp, setProfileWhatsapp] = useState("");
  const [useSameWhatsapp, setUseSameWhatsapp] = useState(true);
  const [savingPhone, setSavingPhone] = useState(false);
  const [profileEmail, setProfileEmail] = useState("");

  // Password change state
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handlePasswordChange = async () => {
    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    setChangingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        toast.error("Erreur lors du changement de mot de passe");
      } else {
        toast.success("Mot de passe modifié avec succès");
        setNewPassword("");
        setConfirmPassword("");
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Sync local state with loaded settings
  useEffect(() => {
    if (!loading) {
      setShopName(settings.shop_name);
      setShopCountry(settings.country || "TN");
      setShopCurrency(settings.currency || "TND");
      setTaxRate(String(settings.tax_rate));
      setTaxEnabled(settings.tax_enabled);
      setStockThreshold(String(settings.stock_alert_threshold));
      setBrandColor(settings.brand_color || "blue");
      setShopAddress(settings.address || "");
      setShopPhone(settings.phone || "");
      setShopWhatsapp(settings.whatsapp_phone || "");
      setShopEmail(settings.email || "");
      setReceiptTerms(settings.receipt_terms || "");
      setReceiptMode(settings.receipt_mode || "detailed");
    }
  }, [loading, settings]);

  // Load phone/whatsapp from profile
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("phone, whatsapp_phone, email")
      .eq("user_id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setProfilePhone(data.phone || "");
          setProfileWhatsapp((data as any).whatsapp_phone || "");
          setProfileEmail((data as any).email || "");
          const same = !data.phone || (data as any).whatsapp_phone === data.phone || !(data as any).whatsapp_phone;
          setUseSameWhatsapp(same);
        }
      });
  }, [user]);

  const handleSavePhone = async () => {
    if (!user) return;
    setSavingPhone(true);
    const whatsappPhone = useSameWhatsapp ? profilePhone.trim() : (profileWhatsapp.trim() || null);
    const { error } = await supabase
      .from("profiles")
      .update({
        phone: profilePhone.trim(),
        whatsapp_phone: whatsappPhone,
        email: profileEmail.trim() || null,
      } as any)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Coordonnées mises à jour");
    }
    setSavingPhone(false);
  };

  const handleSaveGeneralSettings = async () => {
    await saveSettings({
      shop_name: shopName,
      country: shopCountry,
      currency: shopCurrency,
      tax_rate: parseFloat(taxRate) || 19,
      tax_enabled: taxEnabled,
      stock_alert_threshold: parseInt(stockThreshold) || 5,
      address: shopAddress.trim() || null,
      phone: shopPhone.trim() || null,
      whatsapp_phone: shopWhatsapp.trim() || null,
      email: shopEmail.trim() || null,
      receipt_terms: receiptTerms.trim() || null,
      receipt_mode: receiptMode,
    });
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop volumineux (max 2 MB)");
      return;
    }
    setUploadingLogo(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${user.id}/logo.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("shop-logos")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("shop-logos").getPublicUrl(path);
      const logoUrl = urlData.publicUrl + "?t=" + Date.now();
      await saveSettings({ logo_url: logoUrl });
      toast.success("Logo mis à jour");
    } catch (err) {
      console.error(err);
      toast.error("Erreur lors du téléchargement du logo");
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleRemoveLogo = async () => {
    await saveSettings({ logo_url: null });
    toast.success("Logo supprimé");
  };

  const handleBrandColorChange = async (color: string) => {
    setBrandColor(color);
    applyColor(color);
    await saveSettings({ brand_color: color });
  };

  const formatLastSyncTime = (time: string | null) => {
    if (!time) return "Jamais";
    const date = new Date(time);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return "À l'instant";
    if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? "s" : ""}`;
    if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} heure${Math.floor(diffMins / 60) > 1 ? "s" : ""}`;
    return date.toLocaleDateString("fr-FR");
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Paramètres" description="Configuration du système" />
        <div className="space-y-6">
          <Skeleton className="h-[400px] w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Paramètres"
        description="Configuration du système"
      />

      <Tabs defaultValue="general" className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">{t("settings.general")}</TabsTrigger>
          <TabsTrigger value="preferences">
            <Palette className="h-3.5 w-3.5 mr-1" />
            {t("settings.preferences")}
          </TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-3.5 w-3.5 mr-1" />
            {t("settings.categories")}
          </TabsTrigger>
          <TabsTrigger value="backup">Sauvegarde</TabsTrigger>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="security">Sécurité</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Store className="h-5 w-5" />
                Informations du magasin
              </CardTitle>
              <CardDescription>
                Configurez les informations de base de votre atelier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="shopName">Nom du magasin</Label>
                  <Input
                    id="shopName"
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Pays</Label>
                  <Select value={shopCountry} onValueChange={(val) => {
                    setShopCountry(val);
                    const curr = getCurrencyForCountry(val);
                    if (curr) setShopCurrency(curr.code);
                  }}>
                    <SelectTrigger id="country">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.flag} {c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Devise</Label>
                  <Select value={shopCurrency} onValueChange={setShopCurrency}>
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currencies.map((c) => (
                        <SelectItem key={c.code} value={c.code}>{c.symbol} - {c.name} ({c.code})</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="taxRate">Taux TVA (%)</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      id="taxRate"
                      type="number"
                      value={taxRate}
                      onChange={(e) => setTaxRate(e.target.value)}
                      disabled={!taxEnabled}
                      className={!taxEnabled ? "opacity-50" : ""}
                    />
                    <div className="flex items-center gap-2 shrink-0">
                      <Switch
                        id="taxEnabled"
                        checked={taxEnabled}
                        onCheckedChange={setTaxEnabled}
                      />
                      <Label htmlFor="taxEnabled" className="text-sm cursor-pointer whitespace-nowrap">
                        Activer TVA
                      </Label>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {taxEnabled ? "La TVA sera appliquée aux ventes" : "TVA désactivée pour les ventes"}
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stockThreshold">Seuil alerte stock</Label>
                  <Input
                    id="stockThreshold"
                    type="number"
                    value={stockThreshold}
                    onChange={(e) => setStockThreshold(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={handleSaveGeneralSettings}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Protection de l'inventaire
              </CardTitle>
              <CardDescription>
                Empêcher les employés de modifier l'inventaire sans autorisation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Protéger l'inventaire</p>
                  <p className="text-sm text-muted-foreground">
                    Les employés devront entrer un code temporaire pour modifier les produits
                  </p>
                </div>
                <Switch
                  checked={inventoryLocked}
                  onCheckedChange={toggleInventoryLock}
                />
              </div>
              {inventoryLocked && (
                <>
                  <Separator />
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      onClick={generateCode}
                      disabled={generating}
                      className="gap-2"
                    >
                      {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Key className="h-4 w-4" />}
                      Générer un code temporaire
                    </Button>
                    {generatedCode && (
                      <div className="p-4 rounded-lg border bg-muted/50 space-y-2">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl font-mono font-bold tracking-[0.3em]">{generatedCode.code}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedCode.code);
                              toast.success("Code copié !");
                            }}
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Expire le {new Date(generatedCode.expires_at).toLocaleString("fr-FR")}
                        </p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Coordonnées du magasin
              </CardTitle>
              <CardDescription>
                Ces informations apparaîtront sur vos reçus et factures
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="shopAddress">Adresse</Label>
                <Input
                  id="shopAddress"
                  value={shopAddress}
                  onChange={(e) => setShopAddress(e.target.value)}
                  placeholder="Adresse du magasin"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="shopPhoneNum">Téléphone</Label>
                  <Input
                    id="shopPhoneNum"
                    value={shopPhone}
                    onChange={(e) => setShopPhone(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopWhatsappNum">WhatsApp</Label>
                  <Input
                    id="shopWhatsappNum"
                    value={shopWhatsapp}
                    onChange={(e) => setShopWhatsapp(e.target.value)}
                    placeholder="+216 XX XXX XXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="shopEmailAddr">Email</Label>
                  <Input
                    id="shopEmailAddr"
                    type="email"
                    value={shopEmail}
                    onChange={(e) => setShopEmail(e.target.value)}
                    placeholder="contact@monmagasin.com"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptTerms" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Conditions / Garantie (reçu)
                </Label>
                <Textarea
                  id="receiptTerms"
                  value={receiptTerms}
                  onChange={(e) => setReceiptTerms(e.target.value)}
                  placeholder={"Garantie de 90 jours sur toutes les pièces.\nLes appareils non récupérés après 30 jours\nne sont plus sous notre responsabilité.\nMerci pour votre confiance !"}
                  rows={4}
                />
                <p className="text-xs text-muted-foreground">
                  Ce texte apparaîtra en bas de vos reçus. Laissez vide pour utiliser le texte par défaut.
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="receiptMode" className="flex items-center gap-2">
                  <Receipt className="h-4 w-4" />
                  Mode reçu par défaut
                </Label>
                <Select value={receiptMode} onValueChange={setReceiptMode}>
                  <SelectTrigger id="receiptMode">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="detailed">Reçu détaillé (pièces + main d'œuvre)</SelectItem>
                    <SelectItem value="simple">Reçu simple (total seulement)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Le mode simple n'affiche que la description et le total, sans détailler les prix des pièces et main d'œuvre.
                </p>
              </div>
              <Button 
                className="bg-gradient-primary hover:opacity-90"
                onClick={handleSaveGeneralSettings}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {saving ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Alertes stock faible</p>
                  <p className="text-sm text-muted-foreground">
                    Recevoir une notification quand le stock est bas
                  </p>
                </div>
                <Switch 
                  checked={notifSettings.lowStockAlerts}
                  onCheckedChange={(checked) => saveNotifSettings({ lowStockAlerts: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Rappels paiements</p>
                  <p className="text-sm text-muted-foreground">
                    Notification pour les créances clients
                  </p>
                </div>
                <Switch 
                  checked={notifSettings.paymentReminders}
                  onCheckedChange={(checked) => saveNotifSettings({ paymentReminders: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <p className="font-medium">Notifications navigateur</p>
                  <p className="text-sm text-muted-foreground">
                    Recevoir les alertes sur votre appareil
                  </p>
                  <Badge
                    variant={
                      permissionStatus === "granted" ? "default" :
                      permissionStatus === "denied" ? "destructive" : "secondary"
                    }
                    className={
                      permissionStatus === "granted" ? "bg-success/10 text-success border-success/20" :
                      permissionStatus === "denied" ? "" : ""
                    }
                  >
                    {permissionStatus === "granted" ? "Autorisé" :
                     permissionStatus === "denied" ? "Bloqué" :
                     permissionStatus === "unsupported" ? "Non supporté" : "Non demandé"}
                  </Badge>
                  {permissionStatus === "denied" && (
                    <p className="text-xs text-destructive">
                      Modifiez l'autorisation dans les paramètres de votre navigateur
                    </p>
                  )}
                </div>
                <Switch
                  checked={notifSettings.browserNotifications}
                  disabled={permissionStatus === "unsupported"}
                  onCheckedChange={async (checked) => {
                    if (checked) {
                      const granted = await requestBrowserPermission();
                      if (granted) {
                        saveNotifSettings({ browserNotifications: true });
                      }
                    } else {
                      saveNotifSettings({ browserNotifications: false });
                    }
                  }}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences - Appearance, Logo, Brand Color, Language */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Logo Upload */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Image className="h-5 w-5" />
                {t("settings.shopLogo")}
              </CardTitle>
              <CardDescription>{t("settings.logoHint")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                {settings.logo_url ? (
                  <img src={settings.logo_url} alt="Logo" className="w-16 h-16 rounded-lg object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center border border-dashed">
                    <Image className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={uploadingLogo}
                  >
                    {uploadingLogo ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                    {t("settings.uploadLogo")}
                  </Button>
                  {settings.logo_url && (
                    <Button variant="ghost" size="sm" className="text-destructive" onClick={handleRemoveLogo}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("settings.removeLogo")}
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Brand Color */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t("settings.brandColor")}
              </CardTitle>
              <CardDescription>{t("settings.appearanceDesc")}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {BRAND_COLOR_PRESETS.map((preset) => (
                  <button
                    key={preset.name}
                    onClick={() => handleBrandColorChange(preset.hex)}
                    className={cn(
                      "flex flex-col items-center gap-1.5 p-2 rounded-lg border-2 transition-all hover:scale-105",
                      brandColor === preset.hex || brandColor === preset.name.toLowerCase()
                        ? "border-foreground shadow-soft"
                        : "border-transparent hover:border-muted-foreground/30"
                    )}
                  >
                    <div
                      className="w-10 h-10 rounded-full shadow-sm"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{preset.name}</span>
                  </button>
                ))}
              </div>
              <Separator />
              <div className="flex items-center gap-3">
                <Label htmlFor="customHex" className="shrink-0">Code Hex</Label>
                <Input
                  id="customHex"
                  placeholder="#1447b3"
                  value={customHex}
                  onChange={(e) => setCustomHex(e.target.value)}
                  className="max-w-[140px] font-mono"
                />
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!customHex.match(/^#[0-9a-fA-F]{6}$/)}
                  onClick={() => {
                    handleBrandColorChange(customHex);
                    setCustomHex("");
                  }}
                >
                  Appliquer
                </Button>
                {customHex.match(/^#[0-9a-fA-F]{6}$/) && (
                  <div className="w-8 h-8 rounded-full border" style={{ backgroundColor: customHex }} />
                )}
              </div>
            </CardContent>
          </Card>

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
                <SelectTrigger className="max-w-[200px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="fr">🇫🇷 Français</SelectItem>
                  <SelectItem value="en">🇬🇧 English</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Categories Settings */}
        <TabsContent value="categories" className="space-y-6">
          <CategoriesSettings />
        </TabsContent>

        {/* Backup Settings */}
        <TabsContent value="backup" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Local Backup */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Sauvegarde locale
                </CardTitle>
                <CardDescription>
                  Exportez vos données sur votre appareil
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Sauvegarde automatique</p>
                    <p className="text-sm text-muted-foreground">
                      Sauvegarde quotidienne automatique
                    </p>
                  </div>
                  <Switch
                    checked={backupSettings.autoBackup}
                    onCheckedChange={(checked) => saveBackupSettings({ autoBackup: checked })}
                  />
                </div>
                <Separator />
                <div className="space-y-3">
                  <Button variant="outline" className="w-full" onClick={exportJSON}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger sauvegarde (JSON)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportSQL}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger sauvegarde (SQL)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={exportExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger sauvegarde (Excel)
                  </Button>
                  <Button variant="outline" className="w-full" onClick={restoreFromFile}>
                    <Upload className="h-4 w-4 mr-2" />
                    Restaurer depuis fichier
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Cloud Backup */}
            <Card className="border-primary/30">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Cloud className="h-5 w-5 text-primary" />
                    Sauvegarde Cloud
                  </CardTitle>
                  <Badge className={backupSettings.cloudSync ? "bg-success/10 text-success border-success/20" : "bg-muted text-muted-foreground"}>
                    {backupSettings.cloudSync ? "Activé" : "Désactivé"}
                  </Badge>
                </div>
                <CardDescription>
                  Synchronisation automatique sécurisée
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Synchronisation auto</p>
                    <p className="text-sm text-muted-foreground">
                      Sync toutes les 5 minutes
                    </p>
                  </div>
                  <Switch
                    checked={backupSettings.cloudSync}
                    onCheckedChange={(checked) => saveBackupSettings({ cloudSync: checked })}
                  />
                </div>
                <Separator />
                <div className="p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Dernière sync:</span>
                    <span className="font-medium">{formatLastSyncTime(backupSettings.lastSyncTime)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Statut:</span>
                    <span className={`font-medium flex items-center gap-1 ${backupSettings.cloudSync ? "text-success" : "text-muted-foreground"}`}>
                      {backupSettings.cloudSync && (
                        <span className="w-2 h-2 rounded-full bg-success animate-pulse" />
                      )}
                      {backupSettings.cloudSync ? "Auto-sync activé" : "Manuel uniquement"}
                    </span>
                  </div>
                </div>
                <Button 
                  className="w-full bg-gradient-primary hover:opacity-90"
                  onClick={syncNow}
                  disabled={syncing}
                >
                  {syncing ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="h-4 w-4 mr-2" />
                  )}
                  {syncing ? "Synchronisation..." : "Synchroniser maintenant"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Users Settings */}
        <TabsContent value="users" className="space-y-6">
          <TeamManagement />
          <TaskManagement />
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          {/* Password Change Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                Mon compte
              </CardTitle>
              <CardDescription>
                Modifier votre mot de passe
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="newPassword">Nouveau mot de passe</Label>
                  <Input
                    id="newPassword"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>
              <Button 
                onClick={handlePasswordChange}
                disabled={changingPassword || !newPassword || !confirmPassword}
              >
                {changingPassword ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Key className="h-4 w-4 mr-2" />
                )}
                {changingPassword ? "Modification..." : "Modifier le mot de passe"}
              </Button>
            </CardContent>
          </Card>

          {/* Phone / WhatsApp Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Phone className="h-5 w-5" />
                Coordonnées
              </CardTitle>
              <CardDescription>
                Numéro de téléphone, WhatsApp et email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="profilePhone">Numéro de téléphone</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profilePhone"
                    type="tel"
                    placeholder="+216 XX XXX XXX"
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="same-whatsapp-settings"
                  checked={useSameWhatsapp}
                  onCheckedChange={(checked) => setUseSameWhatsapp(!!checked)}
                />
                <Label htmlFor="same-whatsapp-settings" className="text-sm cursor-pointer">
                  Utiliser ce numéro pour WhatsApp
                </Label>
              </div>

              {!useSameWhatsapp && (
                <div className="space-y-2 animate-fade-in">
                  <Label htmlFor="profileWhatsapp">Numéro WhatsApp</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="profileWhatsapp"
                      type="tel"
                      placeholder="+216 XX XXX XXX"
                      value={profileWhatsapp}
                      onChange={(e) => setProfileWhatsapp(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="profileEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="profileEmail"
                    type="email"
                    placeholder="exemple@email.com"
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <Button
                onClick={handleSavePhone}
                disabled={savingPhone}
              >
                {savingPhone ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                {savingPhone ? "Enregistrement..." : "Enregistrer les coordonnées"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Sécurité
              </CardTitle>
              <CardDescription>
                Paramètres de sécurité et chiffrement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Chiffrement des sauvegardes</p>
                  <p className="text-sm text-muted-foreground">
                    Protéger les sauvegardes avec un mot de passe
                  </p>
                </div>
                <Switch 
                  checked={securitySettings.encryptBackups}
                  onCheckedChange={(checked) => saveSecuritySettings({ encryptBackups: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Journal d'activité</p>
                  <p className="text-sm text-muted-foreground">
                    Enregistrer toutes les actions utilisateurs
                  </p>
                </div>
                <Switch 
                  checked={securitySettings.activityLog}
                  onCheckedChange={(checked) => saveSecuritySettings({ activityLog: checked })}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium">Mode hors ligne</p>
                  <p className="text-sm text-muted-foreground">
                    Fonctionnement sans connexion internet
                  </p>
                </div>
                <Switch 
                  checked={securitySettings.offlineMode}
                  onCheckedChange={(checked) => saveSecuritySettings({ offlineMode: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/30 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-warning shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-warning">Zone dangereuse</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cette action est irréversible et supprimera toutes vos données (produits, clients, réparations, ventes, factures, etc.)
                  </p>
                  <div className="flex gap-2 mt-3">
                    <ResetDataDialog onConfirm={resetAllData} isResetting={resetting} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
