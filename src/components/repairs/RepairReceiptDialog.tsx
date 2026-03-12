import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useCurrency } from "@/hooks/useCurrency";
import type { Repair } from "./RepairCard";
import { statusConfig } from "./RepairStatusSelect";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { generateThermalReceipt } from "@/lib/receiptPdf";
import { supabase } from "@/integrations/supabase/client";

interface RepairReceiptDialogProps {
  repair: Repair | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairReceiptDialog({ repair, open, onOpenChange }: RepairReceiptDialogProps) {
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();
  const [receiptMode, setReceiptMode] = useState<string>(settings.receipt_mode || "detailed");
  const [publicDomain, setPublicDomain] = useState<string>("");

  useEffect(() => {
    setReceiptMode(settings.receipt_mode || "detailed");
  }, [settings.receipt_mode]);

  useEffect(() => {
    supabase
      .from("platform_settings")
      .select("value")
      .eq("key", "public_site_domain")
      .maybeSingle()
      .then(({ data }) => {
        if (data?.value) setPublicDomain(data.value);
      });
  }, []);

  const handlePrint = async () => {
    if (!repair) return;
    const remaining = repair.total - repair.paid;
    let items: { name: string; qty: number; unitPrice: number; total: number }[] = [];

    if (receiptMode === "detailed") {
      items = repair.parts.map((p) => ({ name: p.name, qty: 1, unitPrice: p.cost, total: p.cost }));
      items.push({ name: "Main d'œuvre", qty: 1, unitPrice: repair.labor, total: repair.labor });
    }

    const token = repair.tracking_token || repair.id;
    const trackingUrl = `https://atelier-pro-sync.lovable.app/track/${token}`;
    await generateThermalReceipt({
      type: "repair",
      id: repair.id,
      date: new Date(repair.depositDate).toLocaleDateString("fr-TN"),
      time: new Date().toLocaleTimeString("fr-TN", { hour: "2-digit", minute: "2-digit" }),
      customer: { name: repair.customer, phone: repair.phone },
      device: repair.device,
      imei: repair.imei,
      problem: receiptMode === "simple" ? repair.issue : undefined,
      items,
      subtotal: repair.total,
      total: repair.total,
      paid: repair.paid,
      remaining,
      trackingUrl,
    }, settings, format);
  };

  if (!repair) return null;

  const remaining = repair.total - repair.paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Fiche de Réparation</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          <div className="text-center">
            <p className="font-bold text-lg">{settings.shop_name}</p>
            <p className="text-muted-foreground text-xs">{repair.id.slice(0, 8).toUpperCase()}</p>
          </div>
          <div className="space-y-1">
            <p><span className="text-muted-foreground">Client:</span> {repair.customer}</p>
            <p><span className="text-muted-foreground">Tél:</span> {repair.phone}</p>
            <p><span className="text-muted-foreground">Appareil:</span> {repair.device}</p>
            {repair.imei && <p><span className="text-muted-foreground">IMEI:</span> {repair.imei}</p>}
            <p><span className="text-muted-foreground">Problème:</span> {repair.issue}</p>
          </div>

          {receiptMode === "detailed" && (
            <div className="border-t pt-2 space-y-1">
              {repair.parts.map((p, i) => (
                <div key={i} className="flex justify-between text-xs">
                  <span>{p.name}</span><span className="font-mono-numbers">{format(p.cost)}</span>
                </div>
              ))}
              <div className="flex justify-between text-xs">
                <span>Main d'œuvre</span><span className="font-mono-numbers">{format(repair.labor)}</span>
              </div>
            </div>
          )}

          <div className="border-t pt-2">
            <div className="flex justify-between font-bold"><span>Total</span><span className="font-mono-numbers">{format(repair.total)}</span></div>
            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Payé</span><span className="text-success">{format(repair.paid)}</span></div>
            {remaining > 0 && <div className="flex justify-between text-xs"><span className="text-muted-foreground">Reste</span><span className="text-destructive">{format(remaining)}</span></div>}
          </div>

          <div className="space-y-2 pt-2 border-t">
            <Label className="text-xs">Mode reçu</Label>
            <Select value={receiptMode} onValueChange={setReceiptMode}>
              <SelectTrigger className="h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="detailed">Reçu détaillé (pièces + main d'œuvre)</SelectItem>
                <SelectItem value="simple">Reçu simple (total seulement)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={handlePrint} size="sm" className="w-full mt-2">
            <Printer className="h-4 w-4 mr-2" />Imprimer PDF
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
