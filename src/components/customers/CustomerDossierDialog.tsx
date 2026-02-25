import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { DollarSign, Wrench, ShoppingCart, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useCurrency } from "@/hooks/useCurrency";
import { useLanguage } from "@/contexts/LanguageContext";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerDossierDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  customer: Customer | null;
}

export function CustomerDossierDialog({ open, onOpenChange, customer }: CustomerDossierDialogProps) {
  const { format } = useCurrency();
  const { t } = useLanguage();
  const [repairs, setRepairs] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [warranties, setWarranties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open || !customer) return;
    setLoading(true);

    Promise.all([
      supabase.from("repairs").select("*").eq("customer_id", customer.id).order("created_at", { ascending: false }),
      supabase.from("sales").select("*, sale_items(id, quantity, unit_price)").eq("customer_id", customer.id).order("created_at", { ascending: false }),
      supabase.from("repairs").select("*, warranty_tickets(*)").eq("customer_id", customer.id).not("warranty_ticket_id", "is", null),
    ]).then(([repairsRes, salesRes, warrantyRes]) => {
      setRepairs(repairsRes.data || []);
      setSales(salesRes.data || []);
      setWarranties((warrantyRes.data || []).flatMap((r: any) => r.warranty_tickets || []));
      setLoading(false);
    });
  }, [open, customer]);

  if (!customer) return null;

  const totalRepairSpend = repairs.reduce((sum, r) => sum + Number(r.total_cost || 0), 0);
  const totalSalesSpend = sales.reduce((sum, s) => sum + Number(s.total_amount || 0), 0);
  const lifetimeSpend = totalRepairSpend + totalSalesSpend;

  const formatDate = (d: string) => new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" });

  const statusColors: Record<string, string> = {
    pending: "bg-warning/10 text-warning border-warning/20",
    in_progress: "bg-primary/10 text-primary border-primary/20",
    completed: "bg-success/10 text-success border-success/20",
    delivered: "bg-accent/10 text-accent border-accent/20",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {t("customers.dossier")} — {customer.name}
          </DialogTitle>
        </DialogHeader>

        {/* Lifetime Spend */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-primary/10 rounded-lg p-3 text-center">
            <DollarSign className="h-5 w-5 mx-auto text-primary mb-1" />
            <p className="text-lg font-bold font-mono-numbers">{format(lifetimeSpend)}</p>
            <p className="text-xs text-muted-foreground">{t("customers.lifetimeSpend")}</p>
          </div>
          <div className="bg-accent/10 rounded-lg p-3 text-center">
            <Wrench className="h-5 w-5 mx-auto text-accent mb-1" />
            <p className="text-lg font-bold">{repairs.length}</p>
            <p className="text-xs text-muted-foreground">{t("customers.repairHistory")}</p>
          </div>
          <div className="bg-success/10 rounded-lg p-3 text-center">
            <ShoppingCart className="h-5 w-5 mx-auto text-success mb-1" />
            <p className="text-lg font-bold">{sales.length}</p>
            <p className="text-xs text-muted-foreground">{t("customers.purchaseHistory")}</p>
          </div>
        </div>

        <Separator />

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : (
          <Tabs defaultValue="repairs" className="space-y-3">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="repairs"><Wrench className="h-3.5 w-3.5 mr-1" />{t("customers.repairHistory")}</TabsTrigger>
              <TabsTrigger value="purchases"><ShoppingCart className="h-3.5 w-3.5 mr-1" />{t("customers.purchaseHistory")}</TabsTrigger>
              <TabsTrigger value="warranties"><Shield className="h-3.5 w-3.5 mr-1" />{t("customers.activeWarranties")}</TabsTrigger>
            </TabsList>

            <TabsContent value="repairs" className="space-y-2 max-h-[300px] overflow-y-auto">
              {repairs.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">{t("common.noResults")}</p>
              ) : repairs.map((r) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{r.device_model}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(r.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={statusColors[r.status] || ""}>{r.status}</Badge>
                    <span className="font-mono-numbers text-sm font-medium">{format(Number(r.total_cost))}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="purchases" className="space-y-2 max-h-[300px] overflow-y-auto">
              {sales.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">{t("common.noResults")}</p>
              ) : sales.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{s.sale_items?.length || 0} article(s)</p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{s.payment_method}</Badge>
                    <span className="font-mono-numbers text-sm font-medium">{format(Number(s.total_amount))}</span>
                  </div>
                </div>
              ))}
            </TabsContent>

            <TabsContent value="warranties" className="space-y-2 max-h-[300px] overflow-y-auto">
              {warranties.length === 0 ? (
                <p className="text-center text-muted-foreground py-6 text-sm">{t("common.noResults")}</p>
              ) : warranties.map((w: any) => (
                <div key={w.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div>
                    <p className="font-medium text-sm">{w.return_reason}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(w.created_at)}</p>
                  </div>
                  <Badge className={statusColors[w.status] || ""}>{w.status}</Badge>
                </div>
              ))}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
