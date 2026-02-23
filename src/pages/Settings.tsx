import { useState, useEffect } from "react";
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
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

export default function Settings() {
  const { settings, loading, saving, saveSettings } = useShopSettingsContext();
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
  
  const [shopName, setShopName] = useState("");
  const [shopCountry, setShopCountry] = useState("TN");
  const [shopCurrency, setShopCurrency] = useState("TND");
  const [taxRate, setTaxRate] = useState("");
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [stockThreshold, setStockThreshold] = useState("");
  
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
    });
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
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general">Général</TabsTrigger>
          <TabsTrigger value="categories">
            <Tag className="h-3.5 w-3.5 mr-1" />
            Catégories
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
                Numéro de téléphone et WhatsApp
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
