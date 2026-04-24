import { useState, useEffect, useCallback, useRef } from "react";
import { AlertTriangle, ShieldCheck, Clock, Loader2, MessageCircle, CheckCircle, PartyPopper } from "lucide-react";
import confetti from "canvas-confetti";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export function VerificationBanner() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [timeLeft, setTimeLeft] = useState("");
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");
  const confettiFired = useRef(false);

  // Form fields
  const [shopName, setShopName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [phone, setPhone] = useState("");
  const [city, setCity] = useState("");
  const [address, setAddress] = useState("");
  const [googleMapsUrl, setGoogleMapsUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [messageToAdmin, setMessageToAdmin] = useState("");

  const fetchProfile = useCallback(async () => {
    if (!user) return;

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
  }, [user]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "admin_whatsapp")
      .single()
      .then(({ data }) => {
        if (data?.value) setAdminWhatsapp(data.value);
      });
  }, []);

  // On first login: set verification_deadline if null + pending
  useEffect(() => {
    if (!user || !profile) return;
    if (profile.verification_status !== "pending_verification") return;
    if (profile.verification_deadline) return; // already set

    const newDeadline = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();
    supabase
      .from("profiles")
      .update({ verification_deadline: newDeadline } as any)
      .eq("user_id", user.id)
      .then(() => {
        setProfile((prev: any) => prev ? { ...prev, verification_deadline: newDeadline } : prev);
      });
  }, [user, profile?.verification_status, profile?.verification_deadline]);

  // Countdown timer
  useEffect(() => {
    if (!profile?.verification_deadline || profile?.verification_status !== "pending_verification") {
      return;
    }

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

  const handleSubmit = async () => {
    if (!user) return;
    if (!shopName.trim() || !ownerName.trim() || !phone.trim() || !city.trim() || !address.trim()) {
      toast.error("Veuillez remplir tous les champs obligatoires");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("verification_requests" as any)
        .insert({
          user_id: user.id,
          shop_name: shopName.trim(),
          owner_name: ownerName.trim(),
          phone: phone.trim(),
          city: city.trim(),
          address: address.trim(),
          google_maps_url: googleMapsUrl.trim() || null,
          facebook_url: facebookUrl.trim() || null,
          instagram_url: instagramUrl.trim() || null,
          shop_description: shopDescription.trim() || null,
          message_to_admin: messageToAdmin.trim() || null,
        } as any);

      if (error) throw error;

      // Update profile verification_requested_at
      await supabase
        .from("profiles")
        .update({ verification_requested_at: new Date().toISOString() } as any)
        .eq("user_id", user.id);

      // Pre-fill shop settings with submitted data
      const { data: existingSettings } = await supabase
        .from("shop_settings")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      const settingsPayload = {
        shop_name: shopName.trim(),
        phone: phone.trim(),
        address: address.trim(),
        google_maps_url: googleMapsUrl.trim() || null,
      };

      if (existingSettings?.id) {
        await supabase
          .from("shop_settings")
          .update({ ...settingsPayload, updated_at: new Date().toISOString() } as any)
          .eq("id", existingSettings.id);
      } else {
        await supabase
          .from("shop_settings")
          .insert({ user_id: user.id, ...settingsPayload } as any);
      }

      toast.success("Demande de vérification envoyée avec succès !");
      await fetchProfile();
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  // Confetti on first verification
  useEffect(() => {
    if (profile?.verification_status === "verified" && !confettiFired.current) {
      confettiFired.current = true;
      const hasSeenConfetti = localStorage.getItem("verification_confetti_seen");
      if (!hasSeenConfetti) {
        localStorage.setItem("verification_confetti_seen", "true");
        confetti({ particleCount: 150, spread: 100, origin: { y: 0.4 } });
      }
    }
  }, [profile?.verification_status]);

  if (!isOwner || !profile || profile.verification_status === "verified") return null;

  const hasSubmitted = !!profile.verification_requested_at;

  // STATE 1: Hovering popup over blurred dashboard (before submission)
  if (profile.verification_status === "pending_verification" && !hasSubmitted) {
    return <VerificationPopup
      timeLeft={timeLeft}
      shopName={shopName} setShopName={setShopName}
      ownerName={ownerName} setOwnerName={setOwnerName}
      phone={phone} setPhone={setPhone}
      city={city} setCity={setCity}
      address={address} setAddress={setAddress}
      googleMapsUrl={googleMapsUrl} setGoogleMapsUrl={setGoogleMapsUrl}
      facebookUrl={facebookUrl} setFacebookUrl={setFacebookUrl}
      instagramUrl={instagramUrl} setInstagramUrl={setInstagramUrl}
      shopDescription={shopDescription} setShopDescription={setShopDescription}
      messageToAdmin={messageToAdmin} setMessageToAdmin={setMessageToAdmin}
      loading={loading}
      adminWhatsapp={adminWhatsapp}
      onSubmit={handleSubmit}
    />;
  }

  // STATE 2: Non-blocking amber banner (after submission, waiting for admin)
  if (profile.verification_status === "pending_verification" && hasSubmitted) {
    return (
      <div className="bg-amber-500/10 border-b border-amber-500/20 px-4 py-3">
        <div className="flex items-center justify-between flex-wrap gap-2 max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Clock className="h-5 w-5 text-amber-400 shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-300">
                Demande de vérification en cours d'examen
              </p>
              <p className="text-xs text-amber-400/80">
                Votre demande a été envoyée. Suspension automatique dans : <span className="font-mono font-bold text-amber-300">{timeLeft}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-emerald-400" />
            <span className="text-xs text-emerald-400">Demande envoyée</span>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
