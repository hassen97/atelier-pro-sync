import { usePaymentGateways, useToggleGateway } from "@/hooks/usePaymentGateways";
import { Switch } from "@/components/ui/switch";
import { Loader2, CreditCard, Landmark, Smartphone, Globe } from "lucide-react";

const gatewayIcons: Record<string, any> = {
  stripe: CreditCard,
  konnect: Globe,
  flouci: Smartphone,
  bank_transfer: Landmark,
};

export function AdminPaymentGatewaysView() {
  const { data, isLoading } = usePaymentGateways();
  const toggleGateway = useToggleGateway();

  if (isLoading) {
    return <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" /></div>;
  }

  const gateways = data?.gateways || [];

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-white">Passerelles de Paiement</h2>
      <div className="space-y-3">
        {gateways.map((gw) => {
          const Icon = gatewayIcons[gw.gateway_key] || CreditCard;
          return (
            <div key={gw.id} className="admin-glass-card rounded-xl p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center">
                  <Icon className="h-5 w-5 text-[#00D4FF]" />
                </div>
                <div>
                  <h3 className="text-white font-medium text-sm">{gw.gateway_name}</h3>
                  <p className="text-slate-500 text-xs">{gw.description}</p>
                </div>
              </div>
              <Switch
                checked={gw.is_enabled}
                onCheckedChange={(checked) => toggleGateway.mutate({ gatewayId: gw.id, enabled: checked })}
                disabled={toggleGateway.isPending}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
