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

interface VerificationPopupProps {
  timeLeft: string;
  shopName: string; setShopName: (v: string) => void;
  ownerName: string; setOwnerName: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  city: string; setCity: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  googleMapsUrl: string; setGoogleMapsUrl: (v: string) => void;
  facebookUrl: string; setFacebookUrl: (v: string) => void;
  instagramUrl: string; setInstagramUrl: (v: string) => void;
  shopDescription: string; setShopDescription: (v: string) => void;
  messageToAdmin: string; setMessageToAdmin: (v: string) => void;
  loading: boolean;
  adminWhatsapp: string;
  onSubmit: () => void;
}

function VerificationPopup({
  timeLeft, shopName, setShopName, ownerName, setOwnerName, phone, setPhone,
  city, setCity, address, setAddress, googleMapsUrl, setGoogleMapsUrl,
  facebookUrl, setFacebookUrl, instagramUrl, setInstagramUrl,
  shopDescription, setShopDescription, messageToAdmin, setMessageToAdmin,
  loading, adminWhatsapp, onSubmit,
}: VerificationPopupProps) {
  // Lock body scroll while popup is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg sm:max-w-2xl max-h-[92vh] flex flex-col rounded-2xl border border-red-900/50 bg-zinc-900/95 shadow-2xl overflow-hidden animate-scale-in">
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-gradient-to-b from-red-950/95 to-zinc-900/95 backdrop-blur-sm border-b border-red-900/40 px-4 py-3 sm:px-6 sm:py-4">
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-full bg-red-500/20 border border-red-500/40 shrink-0">
              <ShieldCheck className="h-5 w-5 sm:h-6 sm:w-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold text-red-300 leading-tight">
                Vérification Requise
              </h1>
              <div className="mt-1 inline-flex items-center gap-1.5 text-xs text-red-300/90">
                <Clock className="h-3 w-3 shrink-0" />
                <span>Suspension dans :</span>
                <span className="font-mono font-bold text-red-200">{timeLeft}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div
          className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5 space-y-3 sm:space-y-4"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <p className="text-xs sm:text-sm text-zinc-400">
            Votre compte doit être vérifié avant de pouvoir accéder à la plateforme. Remplissez le formulaire ci-dessous.
          </p>

          <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100 pt-1">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            Informations de la boutique
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Nom du magasin *</Label>
              <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Mon Atelier" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Nom du propriétaire *</Label>
              <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ahmed Ben Ali" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Téléphone *</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" type="tel" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Ville *</Label>
              <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tunis" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-300">Adresse du magasin *</Label>
            <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Rue de la République" className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-300">Lien Google Maps (optionnel)</Label>
            <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Facebook (optionnel)</Label>
              <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-zinc-300">Instagram (optionnel)</Label>
              <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 h-9 text-sm" />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-300">Description du magasin (optionnel)</Label>
            <Textarea value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} placeholder="Décrivez votre activité..." rows={2} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm resize-none" />
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-zinc-300">Message pour l'administration</Label>
            <Textarea value={messageToAdmin} onChange={(e) => setMessageToAdmin(e.target.value)} placeholder="Un message pour l'admin..." rows={2} className="bg-zinc-800 border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm resize-none" />
          </div>

          {adminWhatsapp && (
            <a
              href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bonjour, je souhaite vérifier mon compte RepairPro.")}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full py-2 rounded-lg text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
            >
              <MessageCircle className="h-3.5 w-3.5" />
              Contacter via WhatsApp
            </a>
          )}
        </div>

        {/* Sticky Footer */}
        <div className="sticky bottom-0 z-10 bg-zinc-900/95 backdrop-blur-sm border-t border-red-900/40 px-4 py-3 sm:px-6 sm:py-4">
          <Button
            onClick={onSubmit}
            disabled={loading}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2.5 sm:py-3 text-sm sm:text-base"
            size="lg"
          >
            {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi en cours...</> : (
              <><ShieldCheck className="h-4 w-4 mr-2" />Soumettre la demande</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
