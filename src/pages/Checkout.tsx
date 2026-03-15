import { useState, useRef } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { usePublicPlans } from "@/hooks/useSubscriptionPlans";
import { useEnabledGateways, useCreateOrder } from "@/hooks/useCheckout";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Check, Upload, Loader2, Smartphone, CreditCard,
  Landmark, Globe, Bitcoin, Image, ChevronRight
} from "lucide-react";

const gatewayIcons: Record<string, any> = {
  stripe: CreditCard,
  konnect: Globe,
  flouci: Smartphone,
  bank_transfer: Landmark,
  d17: Smartphone,
  usdt: Bitcoin,
  binance_pay: Bitcoin,
};

export default function Checkout() {
  const [params] = useSearchParams();
  const planId = params.get("plan");
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: plans } = usePublicPlans();
  const { data: gateways, isLoading: gatewaysLoading } = useEnabledGateways();
  const createOrder = useCreateOrder();

  const [selectedGateway, setSelectedGateway] = useState<string | null>(null);
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const plan = plans?.find(p => p.id === planId);
  const gateway = gateways?.find(g => g.gateway_key === selectedGateway);

  if (!user) {
    return <Navigate to={`/auth?redirect=${encodeURIComponent(`/checkout?plan=${planId}`)}`} replace />;
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "hsl(222 47% 6%)" }}>
        <div className="text-center">
          <p style={{ color: "hsl(240 5% 55%)" }}>Plan introuvable</p>
          <Link to="/" className="text-sm mt-4 inline-block" style={{ color: "hsl(217 91% 60%)" }}>
            ← Retour
          </Link>
        </div>
      </div>
    );
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Fichier trop volumineux (max 5MB)");
        return;
      }
      setProofFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleSubmit = () => {
    if (!selectedGateway || !proofFile) return;
    createOrder.mutate({
      planId: plan.id,
      gatewayKey: selectedGateway,
      amount: plan.price,
      currency: plan.currency,
      proofFile,
    }, {
      onSuccess: () => {
        navigate("/dashboard");
      },
    });
  };

  const configLabels: Record<string, string> = {
    bank_name: "Banque",
    account_name: "Titulaire du compte",
    rib: "RIB",
    iban: "IBAN",
    phone_number: "Numéro de téléphone",
    d17_name: "Nom du titulaire",
    wallet_address: "Adresse du wallet",
    network: "Réseau",
    binance_id: "Binance Pay ID",
    binance_username: "Nom d'utilisateur Binance",
    merchant_id: "Merchant ID",
  };

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, hsl(222 47% 6%), hsl(222 47% 10%))" }}>
      <div className="mx-auto max-w-2xl px-4 py-8 sm:py-16">
        {/* Header */}
        <div className="mb-8">
          <Link to="/" className="inline-flex items-center gap-2 text-sm mb-6" style={{ color: "hsl(240 5% 55%)" }}>
            <ArrowLeft className="h-4 w-4" /> Retour
          </Link>
          <h1 className="text-2xl font-bold" style={{ color: "hsl(0 0% 95%)" }}>Finaliser votre abonnement</h1>
        </div>

        {/* Plan summary */}
        <div className="rounded-xl p-5 mb-8" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold" style={{ color: "hsl(0 0% 95%)" }}>{plan.name}</h3>
              <p className="text-sm" style={{ color: "hsl(240 5% 50%)" }}>{plan.description}</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold" style={{ color: "hsl(217 91% 60%)" }}>
                {plan.price} {plan.currency}
              </span>
              {plan.period && <span className="text-sm ml-1" style={{ color: "hsl(240 5% 45%)" }}>{plan.period}</span>}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {plan.features.slice(0, 4).map((f, i) => (
              <Badge key={i} variant="secondary" className="text-xs" style={{ background: "hsla(217, 91%, 60%, 0.1)", color: "hsl(217 91% 70%)", border: "none" }}>
                <Check className="h-3 w-3 mr-1" /> {f}
              </Badge>
            ))}
          </div>
        </div>

        {/* Step 1: Select payment method */}
        <div className="mb-8">
          <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>1</span>
            Choisir le mode de paiement
          </h2>
          
          {gatewaysLoading ? (
            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin" style={{ color: "hsl(217 91% 60%)" }} /></div>
          ) : !gateways?.length ? (
            <p className="text-sm py-4" style={{ color: "hsl(240 5% 45%)" }}>Aucun mode de paiement disponible pour le moment.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {gateways.map((gw) => {
                const Icon = gatewayIcons[gw.gateway_key] || CreditCard;
                const isSelected = selectedGateway === gw.gateway_key;
                return (
                  <button
                    key={gw.id}
                    onClick={() => setSelectedGateway(gw.gateway_key)}
                    className="flex items-center gap-3 rounded-xl p-4 text-left transition-all"
                    style={{
                      background: isSelected ? "hsla(217, 91%, 60%, 0.1)" : "hsla(0, 0%, 100%, 0.03)",
                      border: `1px solid ${isSelected ? "hsl(217 91% 55%)" : "hsla(0, 0%, 100%, 0.08)"}`,
                    }}
                  >
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: "hsla(217, 91%, 60%, 0.1)" }}>
                      <Icon className="h-5 w-5" style={{ color: "hsl(217 91% 65%)" }} />
                    </div>
                    <div className="flex-1">
                      <span className="font-medium text-sm" style={{ color: "hsl(0 0% 95%)" }}>{gw.gateway_name}</span>
                      {gw.description && <p className="text-xs" style={{ color: "hsl(240 5% 45%)" }}>{gw.description}</p>}
                    </div>
                    {isSelected && <Check className="h-5 w-5" style={{ color: "hsl(217 91% 60%)" }} />}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Step 2: Payment details */}
        {selectedGateway && gateway && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>2</span>
              Informations de paiement
            </h2>
            
            <div className="rounded-xl p-5" style={{ background: "hsla(0, 0%, 100%, 0.03)", border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
              {gateway.config && Object.keys(gateway.config).length > 0 ? (
                <div className="space-y-3">
                  <p className="text-sm mb-4" style={{ color: "hsl(240 5% 55%)" }}>
                    Effectuez votre paiement de <strong style={{ color: "hsl(217 91% 60%)" }}>{plan.price} {plan.currency}</strong> en utilisant les informations suivantes :
                  </p>
                  {Object.entries(gateway.config).filter(([_, v]) => v).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid hsla(0, 0%, 100%, 0.05)" }}>
                      <span className="text-sm" style={{ color: "hsl(240 5% 50%)" }}>{configLabels[key] || key}</span>
                      <span className="text-sm font-mono font-medium select-all" style={{ color: "hsl(0 0% 95%)" }}>{value as string}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm" style={{ color: "hsl(240 5% 45%)" }}>
                  Les informations de paiement ne sont pas encore configurées. Contactez l'administrateur.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Upload proof */}
        {selectedGateway && (
          <div className="mb-8 animate-in fade-in slide-in-from-bottom-4">
            <h2 className="text-lg font-semibold mb-4" style={{ color: "hsl(0 0% 95%)" }}>
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-2" style={{ background: "hsl(217 91% 55%)", color: "white" }}>3</span>
              Capture d'écran du paiement
            </h2>
            
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            
            {previewUrl ? (
              <div className="rounded-xl overflow-hidden relative" style={{ border: "1px solid hsla(0, 0%, 100%, 0.08)" }}>
                <img src={previewUrl} alt="Preuve de paiement" className="w-full max-h-64 object-contain" style={{ background: "hsla(0, 0%, 0%, 0.3)" }} />
                <button
                  onClick={() => fileRef.current?.click()}
                  className="absolute bottom-3 right-3 rounded-lg px-3 py-1.5 text-xs font-medium"
                  style={{ background: "hsla(0, 0%, 0%, 0.6)", color: "white", backdropFilter: "blur(8px)" }}
                >
                  Changer l'image
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full rounded-xl p-8 flex flex-col items-center gap-3 transition-colors"
                style={{ background: "hsla(0, 0%, 100%, 0.02)", border: "2px dashed hsla(0, 0%, 100%, 0.1)" }}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center" style={{ background: "hsla(217, 91%, 60%, 0.1)" }}>
                  <Upload className="h-5 w-5" style={{ color: "hsl(217 91% 60%)" }} />
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium" style={{ color: "hsl(0 0% 85%)" }}>Cliquez pour télécharger</p>
                  <p className="text-xs mt-1" style={{ color: "hsl(240 5% 40%)" }}>PNG, JPG jusqu'à 5MB</p>
                </div>
              </button>
            )}
          </div>
        )}

        {/* Submit */}
        {selectedGateway && (
          <Button
            onClick={handleSubmit}
            disabled={!proofFile || createOrder.isPending}
            className="w-full h-12 rounded-full text-sm font-medium"
            style={{ background: proofFile ? "linear-gradient(135deg, hsl(217 91% 55%), hsl(217 91% 40%))" : "hsla(0, 0%, 100%, 0.05)", color: proofFile ? "white" : "hsl(240 5% 40%)" }}
          >
            {createOrder.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <ChevronRight className="h-4 w-4 mr-2" />
            )}
            Envoyer le paiement pour vérification
          </Button>
        )}
      </div>
    </div>
  );
}
