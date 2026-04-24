import { useLatestAnnouncement, useMarkAnnouncementRead } from "@/hooks/useAnnouncements";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Bug, Megaphone } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

function useVerificationGate() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["whats-new-verification-gate", user?.id],
    queryFn: async () => {
      if (!user) return { blocked: false };
      const { data } = await supabase
        .from("profiles")
        .select("verification_status, verification_requested_at")
        .eq("user_id", user.id)
        .maybeSingle();
      // Block the announcement modal while the user is in the required
      // verification gate (pending and has not yet submitted the form).
      const blocked =
        data?.verification_status === "pending_verification" &&
        !data?.verification_requested_at;
      return { blocked };
    },
    enabled: !!user,
    staleTime: 30_000,
  });
}

export function WhatsNewModal() {
  const { data: announcement } = useLatestAnnouncement();
  const markRead = useMarkAnnouncementRead();
  const { data: gate } = useVerificationGate();

  if (!announcement) return null;
  if (gate?.blocked) return null;

  const handleClose = () => {
    markRead.mutate(announcement.id);
  };

  return (
    <Dialog open={!!announcement} onOpenChange={(open) => { if (!open) handleClose(); }}>
      <DialogContent className="max-w-[90vw] sm:max-w-md mx-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <DialogTitle>
              {announcement.target_user_id ? "📬 Message de l'équipe" : "🎉 Quoi de neuf ?"}
            </DialogTitle>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <h3 className="font-semibold text-foreground">{announcement.title}</h3>
          
          {announcement.new_features && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
                <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  Nouvelles fonctionnalités
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-5">
                {announcement.new_features}
              </p>
            </div>
          )}

          {announcement.changes_fixes && (
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <Bug className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                  Changements / Corrections
                </span>
              </div>
              <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-5">
                {announcement.changes_fixes}
              </p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleClose} className="w-full">
            Compris, merci !
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
