import { useRef } from "react";
import { Printer } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useCurrency } from "@/hooks/useCurrency";
import type { Repair } from "./RepairCard";
import { statusConfig } from "./RepairStatusSelect";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";

interface RepairReceiptDialogProps {
  repair: Repair | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RepairReceiptDialog({ repair, open, onOpenChange }: RepairReceiptDialogProps) {
  const receiptRef = useRef<HTMLDivElement>(null);
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  const handlePrint = () => {
    if (receiptRef.current) {
      const printContent = receiptRef.current.innerHTML;
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(`<!DOCTYPE html><html><head><title>Fiche de Réparation - ${repair?.id}</title><style>* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: system-ui, -apple-system, sans-serif; padding: 20px; max-width: 400px; margin: 0 auto; } .receipt { padding: 20px; } .header { text-align: center; margin-bottom: 20px; } .title { font-size: 24px; font-weight: bold; } .subtitle { color: #666; font-size: 14px; } .section { margin: 16px 0; } .section-title { font-weight: 600; margin-bottom: 8px; border-bottom: 1px solid #ddd; padding-bottom: 4px; } .row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 14px; } .label { color: #666; } .value { font-weight: 500; } .total-section { margin-top: 20px; padding-top: 12px; border-top: 2px solid #000; } .total-row { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; } .parts-list { margin-left: 16px; } .parts-item { display: flex; justify-content: space-between; font-size: 13px; padding: 2px 0; } .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #666; } .status { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; background: #f0f0f0; } @media print { body { padding: 0; } }</style></head><body>${printContent}</body></html>`);
        printWindow.document.close(); printWindow.focus(); printWindow.print(); printWindow.close();
      }
    }
  };

  if (!repair) return null;

  const status = statusConfig[repair.status];
  const remaining = repair.total - repair.paid;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Fiche de Réparation</span>
            <Button onClick={handlePrint} size="sm"><Printer className="h-4 w-4 mr-2" />Imprimer</Button>
          </DialogTitle>
        </DialogHeader>

        <div ref={receiptRef} className="receipt">
          <div className="header text-center mb-4">
            <div className="title text-2xl font-bold">{settings.shop_name}</div>
            <div className="subtitle text-muted-foreground text-sm">Fiche de Réparation</div>
          </div>

          <div className="section">
            <div className="flex justify-between items-center mb-2">
              <span className="font-mono text-lg font-bold">{repair.id}</span>
              <span className="status px-3 py-1 rounded-full text-xs bg-muted">{status.label}</span>
            </div>
          </div>

          <Separator className="my-3" />
          <div className="section">
            <div className="section-title font-semibold mb-2">Client</div>
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Nom</span><span className="value font-medium">{repair.customer}</span></div>
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Téléphone</span><span className="value font-medium">{repair.phone}</span></div>
          </div>

          <Separator className="my-3" />
          <div className="section">
            <div className="section-title font-semibold mb-2">Appareil</div>
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Modèle</span><span className="value font-medium">{repair.device}</span></div>
            {repair.imei && <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">IMEI</span><span className="value font-medium font-mono text-xs">{repair.imei}</span></div>}
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Problème</span><span className="value font-medium">{repair.issue}</span></div>
            {repair.diagnosis && <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Diagnostic</span><span className="value font-medium">{repair.diagnosis}</span></div>}
          </div>

          <Separator className="my-3" />
          <div className="section">
            <div className="section-title font-semibold mb-2">Dates</div>
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Dépôt</span><span className="value font-medium">{new Date(repair.depositDate).toLocaleDateString("fr-TN")}</span></div>
            {repair.estimatedDate && <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Estimée</span><span className="value font-medium">{new Date(repair.estimatedDate).toLocaleDateString("fr-TN")}</span></div>}
            {repair.deliveredDate && <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Livrée</span><span className="value font-medium">{new Date(repair.deliveredDate).toLocaleDateString("fr-TN")}</span></div>}
          </div>

          <Separator className="my-3" />
          <div className="section">
            <div className="section-title font-semibold mb-2">Tarification</div>
            {repair.parts.length > 0 && (
              <div className="parts-list ml-2 mb-2">
                {repair.parts.map((part, index) => (
                  <div key={index} className="parts-item flex justify-between text-sm py-0.5">
                    <span className="text-muted-foreground">{part.name}</span>
                    <span>{format(part.cost)}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Main d'œuvre</span><span className="value font-medium">{format(repair.labor)}</span></div>
          </div>

          <div className="total-section mt-4 pt-3 border-t-2 border-foreground">
            <div className="total-row flex justify-between text-base font-bold"><span>Total</span><span>{format(repair.total)}</span></div>
            <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Payé</span><span className="value text-success font-medium">{format(repair.paid)}</span></div>
            {remaining > 0 && <div className="row flex justify-between text-sm py-1"><span className="label text-muted-foreground">Reste à payer</span><span className="value text-destructive font-medium">{format(remaining)}</span></div>}
          </div>

          <div className="footer text-center mt-6 text-xs text-muted-foreground">
            <p>Merci pour votre confiance !</p>
            <p className="mt-1">{settings.shop_name}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
