import { useState, useEffect } from "react";
import { AlertTriangle, ShieldCheck, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { VerificationRequestDialog } from "./VerificationRequestDialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export function VerificationBanner() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [showDialog, setShowDialog] = useState(false);
  const [isOwner, setIsOwner] = useState(false);

  useEffect(() => {
    if (!user) return;

    const fetchProfile = async () => {
      const { data: role } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .single();

      if (role?.role !== "super_admin") {
        setIsOwner(false);
        return;
      }
      setIsOwner(true);

      const { data } = await supabase
        .from("profiles")
        .select("verification_status, verification_deadline, verification_requested_at")
        .eq("user_id", user.id)
        .single();

      setProfile(data);
    };

    fetchProfile();
  }, [user]);

  // Countdown timer
  useEffect(() => {
    if (!profile?.verification_deadline || profile?.verification_status !== "pending_verification") return;

    const updateTimer = () => {
      const deadline = new Date(profile.verification_deadline).getTime();
      const now = Date.now();
      const diff = deadline - now;

      if (diff <= 0) {
        setTimeLeft("00:00:00");
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setTimeLeft(
        `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`
      );
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [profile]);

  if (!isOwner || !profile || profile.verification_status === "verified") return null;

  if (profile.verification_status === "pending_verification") {
    return (
      <>
        <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-2 max-w-7xl mx-auto">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-300">
                  Attention : Compte non vérifié
                </p>
                <p className="text-xs text-amber-400/80">
                  Votre compte sera suspendu dans : <span className="font-mono font-bold text-amber-300">{timeLeft}</span>
                  {" — "}Veuillez soumettre une demande de vérification.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              onClick={() => setShowDialog(true)}
              className="bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30"
            >
              <ShieldCheck className="h-4 w-4 mr-1.5" />
              {profile.verification_requested_at ? "Demande envoyée" : "Demander la vérification"}
            </Button>
          </div>
        </div>
        <VerificationRequestDialog open={showDialog} onOpenChange={setShowDialog} alreadyRequested={!!profile.verification_requested_at} />
      </>
    );
  }

  return null;
}
