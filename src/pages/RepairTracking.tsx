import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Phone, MessageCircle, CheckCircle2, Clock, Wrench, Package, Star, Truck } from "lucide-react";

interface RepairTrackingData {
  id: string;
  tracking_token: string;
  device_model: string;
  problem_description: string;
  status: string;
  deposit_date: string;
  delivery_date: string | null;
  customer_name: string;
  shop_name: string;
  shop_phone: string | null;
  shop_whatsapp: string | null;
  brand_color: string;
}

const STATUS_STEPS = [
  { key: "pending", label: "En attente", icon: Clock, message: "Votre appareil a bien été reçu et est en attente de diagnostic. Nous vous contactons dès que possible." },
  { key: "in_progress", label: "En réparation", icon: Wrench, message: "Votre appareil est actuellement en cours de réparation par notre technicien. Merci pour votre patience." },
  { key: "completed", label: "Prêt à récupérer", icon: CheckCircle2, message: "Votre appareil est réparé et prêt à être récupéré. Venez nous rendre visite !" },
  { key: "delivered", label: "Livré", icon: Star, message: "Votre appareil vous a été remis. Merci de votre confiance !" },
];

const COLOR_MAP: Record<string, string> = {
  "neon blue": "#1447b3",
  "emerald green": "#1f9d55",
  "crimson red": "#e02424",
  "amethyst purple": "#7c3aed",
  "sunset orange": "#f97316",
  "teal": "#1d8c9e",
  "blue": "#1447b3",
};

function getBrandHex(brandColor: string): string {
  return COLOR_MAP[brandColor?.toLowerCase()] ?? (brandColor?.startsWith("#") ? brandColor : "#1447b3");
}

export default function RepairTracking() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<RepairTrackingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!token) { setNotFound(true); setLoading(false); return; }
    supabase
      .rpc("get_repair_by_token", { p_token: token })
      .then(({ data: result, error }) => {
        if (error || !result) { setNotFound(true); }
        else { setData(result as unknown as RepairTrackingData); }
        setLoading(false);
      });
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-blue-500 border-t-transparent animate-spin" />
          <p className="text-gray-500 text-sm">Chargement du suivi...</p>
        </div>
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="text-center max-w-sm">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Package className="w-8 h-8 text-red-400" />
          </div>
          <h1 className="text-xl font-bold text-gray-800 mb-2">Réparation introuvable</h1>
          <p className="text-gray-500 text-sm">Veuillez vérifier votre QR code ou contacter l'atelier.</p>
        </div>
      </div>
    );
  }

  const brandHex = getBrandHex(data.brand_color);
  const currentStepIndex = STATUS_STEPS.findIndex((s) => s.key === data.status);
  const currentStep = STATUS_STEPS[currentStepIndex] ?? STATUS_STEPS[0];
  const CurrentIcon = currentStep.icon;
  const progressPercent = ((currentStepIndex + 1) / STATUS_STEPS.length) * 100;

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="text-white px-4 pt-10 pb-8" style={{ background: `linear-gradient(135deg, ${brandHex}, ${brandHex}cc)` }}>
        <div className="max-w-md mx-auto">
          <p className="text-white/70 text-xs uppercase tracking-widest mb-1">Suivi de réparation</p>
          <h1 className="text-2xl font-bold">{data.shop_name}</h1>
          <p className="text-white/80 text-sm mt-1">Bonjour {data.customer_name} 👋</p>
          <p className="text-white/50 text-xs mt-2 font-mono">Réf: {data.id.slice(0, 8).toUpperCase()}</p>
        </div>
      </div>

      <div className="max-w-md mx-auto px-4 -mt-4 pb-10 space-y-4">

        {/* Status card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: `${brandHex}15` }}>
              <CurrentIcon className="w-6 h-6" style={{ color: brandHex }} />
            </div>
            <div>
              <p className="text-xs text-gray-400 uppercase tracking-wide">Statut actuel</p>
              <p className="font-bold text-gray-900 text-lg">{currentStep.label}</p>
            </div>
          </div>

          <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
            {currentStep.message}
          </p>

          {/* Progress bar */}
          <div className="mt-5">
            <div className="flex justify-between mb-2">
              {STATUS_STEPS.map((step, i) => {
                const StepIcon = step.icon;
                const isDone = i <= currentStepIndex;
                return (
                  <div key={step.key} className="flex flex-col items-center gap-1" style={{ width: "22%" }}>
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                      style={{
                        background: isDone ? brandHex : "#e5e7eb",
                        color: isDone ? "white" : "#9ca3af",
                      }}
                    >
                      <StepIcon className="w-4 h-4" />
                    </div>
                    <span className="text-[9px] text-center leading-tight text-gray-500 font-medium">{step.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full mt-1">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%`, background: brandHex }}
              />
            </div>
          </div>
        </div>

        {/* Device info */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
          <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Détails de la réparation</h2>
          <div className="space-y-3">
            <Row label="Appareil" value={data.device_model} />
            <Row label="Problème déclaré" value={data.problem_description} />
            <Row label="Date de dépôt" value={formatDate(data.deposit_date)} />
            {data.delivery_date && (
              <Row label="Date de livraison" value={formatDate(data.delivery_date)} highlight />
            )}
            <Row label="N° de réparation" value={data.id.slice(0, 8).toUpperCase()} mono />
          </div>
        </div>

        {/* Contact shop */}
        {(data.shop_phone || data.shop_whatsapp) && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">Contacter l'atelier</h2>
            <div className="flex flex-col gap-2">
              {data.shop_whatsapp && (
                <a
                  href={`https://wa.me/${data.shop_whatsapp.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-white text-sm font-medium"
                  style={{ background: "#25d366" }}
                >
                  <MessageCircle className="w-5 h-5" />
                  WhatsApp : {data.shop_whatsapp}
                </a>
              )}
              {data.shop_phone && (
                <a
                  href={`tel:${data.shop_phone}`}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border border-gray-200 text-gray-700"
                >
                  <Phone className="w-5 h-5" />
                  Appeler : {data.shop_phone}
                </a>
              )}
            </div>
          </div>
        )}

        <p className="text-center text-xs text-gray-400 pb-4">
          Propulsé par <span className="font-semibold">AtelierProSync</span>
        </p>
      </div>
    </div>
  );
}

function Row({ label, value, highlight, mono }: { label: string; value: string; highlight?: boolean; mono?: boolean }) {
  return (
    <div className="flex justify-between items-start gap-2">
      <span className="text-sm text-gray-400 shrink-0">{label}</span>
      <span className={`text-sm text-right font-medium ${highlight ? "text-green-600" : "text-gray-800"} ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
