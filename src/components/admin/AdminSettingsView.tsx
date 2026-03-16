import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Loader2, Save, MessageCircle, UserCheck, Globe, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function AdminSettingsView() {
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const [autoConfirm, setAutoConfirm] = useState(false);
  const [publicDomain, setPublicDomain] = useState("");
  const [safeMode, setSafeMode] = useState(false);
  const [loading, setLoading] = useState(true);
  const [savingWhatsapp, setSavingWhatsapp] = useState(false);
  const [savingAutoConfirm, setSavingAutoConfirm] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [savingSafeMode, setSavingSafeMode] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("platform_settings" as any)
      .select("key, value");
    
    if (data) {
      (data as any[]).forEach((row: any) => {
        if (row.key === "admin_whatsapp") setAdminWhatsapp(row.value || "");
        if (row.key === "auto_confirm_signups") setAutoConfirm(row.value === "true");
        if (row.key === "public_site_domain") setPublicDomain(row.value || "");
      });
    }
    setLoading(false);
  };

  const saveSetting = async (key: string, value: string, setSaving: (v: boolean) => void) => {
    setSaving(true);
    const { error } = await supabase
      .from("platform_settings" as any)
      .update({ value, updated_at: new Date().toISOString() } as any)
      .eq("key", key);
    
    if (error) {
      toast.error("Erreur lors de la sauvegarde");
    } else {
      toast.success("Paramètre mis à jour");
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-white">Paramètres de la plateforme</h2>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <MessageCircle className="h-5 w-5 text-emerald-400" />
            WhatsApp Admin
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ce numéro sera affiché comme contact sur les pages de connexion et d'inscription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">Numéro WhatsApp</Label>
            <Input
              type="tel"
              placeholder="+216 XX XXX XXX"
              value={adminWhatsapp}
              onChange={(e) => setAdminWhatsapp(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => saveSetting("admin_whatsapp", adminWhatsapp.trim(), setSavingWhatsapp)}
            disabled={savingWhatsapp}
            className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
          >
            {savingWhatsapp ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <Globe className="h-5 w-5 text-violet-400" />
            Domaine public du site
          </CardTitle>
          <CardDescription className="text-slate-400">
            Ce domaine sera utilisé pour générer les QR codes de suivi des réparations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-slate-300">URL du domaine</Label>
            <Input
              type="url"
              placeholder="https://www.getheavencoin.com"
              value={publicDomain}
              onChange={(e) => setPublicDomain(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-slate-500"
            />
          </div>
          <Button
            onClick={() => saveSetting("public_site_domain", publicDomain.trim().replace(/\/+$/, ""), setSavingDomain)}
            disabled={savingDomain}
            className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
          >
            {savingDomain ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Enregistrer
          </Button>
        </CardContent>
      </Card>

      <Card className="admin-glass-card border-white/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-white">
            <UserCheck className="h-5 w-5 text-[#00D4FF]" />
            Confirmation des inscriptions
          </CardTitle>
          <CardDescription className="text-slate-400">
            Lorsque activé, les nouveaux comptes seront automatiquement approuvés sans validation manuelle
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-white">Auto-confirmation</p>
              <p className="text-sm text-slate-400">
                {autoConfirm 
                  ? "Les nouveaux comptes sont automatiquement activés" 
                  : "Les nouveaux comptes nécessitent une approbation manuelle"}
              </p>
            </div>
            <Switch
              checked={autoConfirm}
              onCheckedChange={(checked) => {
                setAutoConfirm(checked);
                saveSetting("auto_confirm_signups", checked ? "true" : "false", setSavingAutoConfirm);
              }}
              disabled={savingAutoConfirm}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
