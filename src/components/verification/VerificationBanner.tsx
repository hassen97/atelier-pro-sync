import { useState, useEffect, useCallback } from "react";
import { AlertTriangle, ShieldCheck, Clock, Loader2, MessageCircle, CheckCircle } from "lucide-react";
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

  // Countdown timer
  useEffect(() => {
    if (!profile?.verification_deadline || profile?.verification_status !== "pending_verification") {
      if (profile?.verification_status === "pending_verification" && !profile?.verification_deadline) {
        setTimeLeft("--:--:--");
      }
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

  if (!isOwner || !profile || profile.verification_status === "verified") return null;

  const hasSubmitted = !!profile.verification_requested_at;

  // STATE 1: Full-screen blocking overlay (before submission)
  if (profile.verification_status === "pending_verification" && !hasSubmitted) {
    return (
      <div className="fixed inset-0 z-[100] bg-gradient-to-b from-red-950 via-red-900/98 to-zinc-950 overflow-y-auto">
        <div className="min-h-full flex items-start sm:items-center justify-center px-3 py-4 sm:p-6">
          <div className="w-full max-w-2xl">
            {/* Header */}
            <div className="text-center mb-4 sm:mb-6">
              <div className="inline-flex items-center justify-center w-12 h-12 sm:w-16 sm:h-16 rounded-full bg-red-500/20 border-2 border-red-500/40 mb-3 sm:mb-4">
                <ShieldCheck className="h-6 w-6 sm:h-8 sm:w-8 text-red-400" />
              </div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-red-400">
                Vérification Requise
              </h1>
              <p className="text-red-300/80 mt-1.5 sm:mt-2 text-xs sm:text-sm md:text-base">
                Votre compte doit être vérifié avant de pouvoir accéder à la plateforme.
              </p>
              <div className="mt-3 sm:mt-4 inline-flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full bg-red-500/15 border border-red-500/30">
                <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-400" />
                <span className="text-xs sm:text-sm text-red-300">Suspension dans :</span>
                <span className="font-mono font-bold text-red-200 text-sm sm:text-lg">{timeLeft}</span>
              </div>
            </div>

            {/* Form Card */}
            <div className="bg-zinc-900/80 backdrop-blur-sm border border-red-900/50 rounded-xl p-4 sm:p-6 md:p-8 space-y-3 sm:space-y-4">
              <h2 className="text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 shrink-0" />
                Remplissez le formulaire de vérification
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Nom du magasin *</Label>
                  <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Mon Atelier" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Nom du propriétaire *</Label>
                  <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ahmed Ben Ali" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Numéro de téléphone *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" type="tel" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Ville *</Label>
                  <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tunis" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs sm:text-sm text-zinc-300">Adresse du magasin *</Label>
                <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Rue de la République" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs sm:text-sm text-zinc-300">Lien Google Maps (optionnel)</Label>
                <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Page Facebook (optionnel)</Label>
                  <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs sm:text-sm text-zinc-300">Page Instagram (optionnel)</Label>
                  <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 sm:h-10 text-sm" />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs sm:text-sm text-zinc-300">Description du magasin (optionnel)</Label>
                <Textarea value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} placeholder="Décrivez votre activité..." rows={2} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs sm:text-sm text-zinc-300">Message pour l'administration</Label>
                <Textarea value={messageToAdmin} onChange={(e) => setMessageToAdmin(e.target.value)} placeholder="Un message pour l'admin..." rows={2} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm" />
              </div>

              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base"
                size="lg"
              >
                {loading ? <><Loader2 className="h-4 w-4 sm:h-5 sm:w-5 mr-2 animate-spin" />Envoi en cours...</> : (
                  <><ShieldCheck className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />Soumettre la demande</>
                )}
              </Button>

              {adminWhatsapp && (
                <a
                  href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bonjour, je souhaite vérifier mon compte RepairPro.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <MessageCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                  Contacter via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    );
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
