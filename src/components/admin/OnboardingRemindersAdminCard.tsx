import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Mail, Users, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const MAX_REMINDERS = 2;

export function OnboardingRemindersAdminCard() {
  const [loading, setLoading] = useState(true);
  const [eligibleCount, setEligibleCount] = useState(0);
  const [withEmailCount, setWithEmailCount] = useState(0);
  const [sending, setSending] = useState(false);

  const loadStats = async () => {
    setLoading(true);
    try {
      // Count shop owners with onboarding incomplete + remaining reminders
      const { data: settings } = await supabase
        .from("shop_settings")
        .select("user_id, onboarding_reminders_sent")
        .eq("onboarding_completed", false)
        .lt("onboarding_reminders_sent", MAX_REMINDERS);

      const userIds = (settings ?? []).map((s: any) => s.user_id);
      if (userIds.length === 0) {
        setEligibleCount(0);
        setWithEmailCount(0);
        return;
      }

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds)
        .eq("role", "super_admin");

      const ownerIds = new Set((roles ?? []).map((r: any) => r.user_id));
      setEligibleCount(ownerIds.size);

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, email")
        .in("user_id", Array.from(ownerIds));

      const withEmail = (profiles ?? []).filter(
        (p: any) => p.email && p.email.includes("@")
      ).length;
      setWithEmailCount(withEmail);
    } catch (e) {
      console.error("[OnboardingReminders] loadStats:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, []);

  const sendReminders = async () => {
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "send-onboarding-reminder",
        { body: { mode: "manual" } }
      );
      if (error) throw error;
      const queued = (data as any)?.queued ?? 0;
      const skipped = (data as any)?.skipped ?? 0;
      toast.success(
        `${queued} email${queued > 1 ? "s" : ""} en file d'attente${skipped > 0 ? ` · ${skipped} ignoré${skipped > 1 ? "s" : ""}` : ""}`
      );
      await loadStats();
    } catch (e: any) {
      console.error("[OnboardingReminders] send:", e);
      toast.error(e?.message ?? "Erreur lors de l'envoi");
    } finally {
      setSending(false);
    }
  };

  return (
    <Card className="admin-glass-card border-white/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Mail className="h-5 w-5 text-violet-400" />
          Rappels de configuration boutique
        </CardTitle>
        <CardDescription className="text-slate-400">
          Envoyer un email aux propriétaires qui n'ont pas terminé la configuration
          de leur atelier. Une relance automatique tourne aussi chaque jour
          (J+2 et J+7 après inscription, max 2 rappels par compte).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Users className="h-3.5 w-3.5" /> Propriétaires concernés
            </div>
            <p className="mt-1 text-2xl font-semibold text-white">
              {loading ? "—" : eligibleCount}
            </p>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Mail className="h-3.5 w-3.5" /> Avec email valide
            </div>
            <p className="mt-1 text-2xl font-semibold text-violet-300">
              {loading ? "—" : withEmailCount}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={loadStats}
            disabled={loading}
            className="border-white/10 text-slate-300 hover:bg-white/5"
          >
            {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
            Rafraîchir
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                size="sm"
                disabled={sending || withEmailCount === 0}
                className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white hover:from-violet-400 hover:to-fuchsia-400"
              >
                {sending ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Envoyer rappel à {withEmailCount} propriétaire{withEmailCount > 1 ? "s" : ""}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Confirmer l'envoi des rappels</AlertDialogTitle>
                <AlertDialogDescription>
                  Un email de rappel va être envoyé à <b>{withEmailCount}</b> propriétaire
                  {withEmailCount > 1 ? "s" : ""} dont la boutique n'est pas configurée.
                  Les comptes ayant déjà reçu un rappel dans les 3 derniers jours
                  seront ignorés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={sendReminders}>
                  Envoyer maintenant
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </CardContent>
    </Card>
  );
}
