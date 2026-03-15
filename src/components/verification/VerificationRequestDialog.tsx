import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, MessageCircle, ShieldCheck, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useEffect } from "react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alreadyRequested: boolean;
}

export function VerificationRequestDialog({ open, onOpenChange, alreadyRequested }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(alreadyRequested);
  const [adminWhatsapp, setAdminWhatsapp] = useState("");

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

      setSubmitted(true);
      toast.success("Demande de vérification envoyée avec succès !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'envoi");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            Demande de vérification
          </DialogTitle>
        </DialogHeader>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-emerald-500 mx-auto" />
            <div>
              <h3 className="font-semibold text-lg">Demande envoyée !</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Votre demande de vérification est en cours d'examen par l'administration.
                Vous serez notifié une fois votre compte vérifié.
              </p>
            </div>
            {adminWhatsapp && (
              <a
                href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bonjour, j'ai soumis une demande de vérification pour mon compte RepairPro. Merci de bien vouloir la traiter.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Contacter l'administration via WhatsApp
              </a>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Nom du magasin *</Label>
                <Input value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder="Mon Atelier" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Nom du propriétaire *</Label>
                <Input value={ownerName} onChange={(e) => setOwnerName(e.target.value)} placeholder="Ahmed Ben Ali" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Numéro de téléphone *</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+216 XX XXX XXX" type="tel" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Ville *</Label>
                <Input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tunis" />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Adresse du magasin *</Label>
              <Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="123 Rue de la République" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Lien Google Maps (optionnel)</Label>
              <Input value={googleMapsUrl} onChange={(e) => setGoogleMapsUrl(e.target.value)} placeholder="https://maps.google.com/..." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-sm">Page Facebook (optionnel)</Label>
                <Input value={facebookUrl} onChange={(e) => setFacebookUrl(e.target.value)} placeholder="https://facebook.com/..." />
              </div>
              <div className="space-y-1.5">
                <Label className="text-sm">Page Instagram (optionnel)</Label>
                <Input value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} placeholder="https://instagram.com/..." />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Description du magasin (optionnel)</Label>
              <Textarea value={shopDescription} onChange={(e) => setShopDescription(e.target.value)} placeholder="Décrivez votre activité..." rows={2} />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">Message pour l'administration</Label>
              <Textarea value={messageToAdmin} onChange={(e) => setMessageToAdmin(e.target.value)} placeholder="Un message pour l'admin..." rows={2} />
            </div>

            {adminWhatsapp && (
              <a
                href={`https://wa.me/${adminWhatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bonjour, je souhaite vérifier mon compte RepairPro.")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-lg text-sm font-medium text-emerald-600 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                <MessageCircle className="h-4 w-4" />
                Contacter l'administration via WhatsApp
              </a>
            )}
          </div>
        )}

        {!submitted && (
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Envoi...</> : "Soumettre la demande"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
