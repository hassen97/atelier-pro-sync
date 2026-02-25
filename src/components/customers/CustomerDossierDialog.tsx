import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Wrench, ShoppingCart, Shield, Phone, Mail, MapPin, DollarSign } from "lucide-react";
import { useCurrency } from "@/hooks/useCurrency";
import { useCustomerHistory } from "@/hooks/useCustomerHistory";
import type { Customer } from "@/hooks/useCustomers";

interface CustomerDossierDialogProps {
  customer: Customer | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusLabels: Record<string, string> = {
  pending: "En attente",
  in_progress: "En cours",
  completed: "Terminé",
  delivered: "Livré",
};

export function CustomerDossierDialog({ customer, open, onOpenChange }: CustomerDossierDialogProps) {
  const { format } = useCurrency();
  const { repairs, sales, warranties, lifetimeSpend, totalRepairSpend, totalSalesSpend, isLoading } = useCustomerHistory(customer?.id);

  if (!customer) return null;

  const initials = customer.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dossier Client</DialogTitle>
        </DialogHeader>

        {/* Customer Info Header */}
        <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
          <Avatar className="h-14 w-14">
            <AvatarFallback className="bg-primary/10 text-primary text-lg font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-bold">{customer.name}</h3>
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mt-1">
              {customer.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{customer.phone}</span>}
              {customer.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{customer.email}</span>}
              {customer.address && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{customer.address}</span>}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 rounded-lg bg-primary/5 border border-primary/10">
            <DollarSign className="h-4 w-4 mx-auto text-primary mb-1" />
            <div className="text-lg font-bold font-mono-numbers text-primary">{format(lifetimeSpend)}</div>
            <div className="text-[10px] text-muted-foreground">Total dépensé</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Wrench className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold font-mono-numbers">{repairs.length}</div>
            <div className="text-[10px] text-muted-foreground">Réparations</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <ShoppingCart className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
            <div className="text-lg font-bold font-mono-numbers">{sales.length}</div>
            <div className="text-[10px] text-muted-foreground">Achats</div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </div>
        ) : (
          <Tabs defaultValue="repairs" className="mt-2">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="repairs">
                <Wrench className="h-3.5 w-3.5 mr-1" />
                Réparations ({repairs.length})
              </TabsTrigger>
              <TabsTrigger value="sales">
                <ShoppingCart className="h-3.5 w-3.5 mr-1" />
                Achats ({sales.length})
              </TabsTrigger>
              <TabsTrigger value="warranties">
                <Shield className="h-3.5 w-3.5 mr-1" />
                Garanties ({warranties.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="repairs" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {repairs.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucune réparation</p>
              ) : (
                repairs.map((repair) => (
                  <div key={repair.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm truncate">{repair.device_model}</p>
                      <p className="text-xs text-muted-foreground truncate">{repair.problem_description}</p>
                      <p className="text-xs text-muted-foreground">{new Date(repair.deposit_date).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <Badge variant="outline" className="text-[10px] mb-1">
                        {statusLabels[repair.status] || repair.status}
                      </Badge>
                      <p className="text-sm font-bold font-mono-numbers">{format(Number(repair.total_cost))}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="sales" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {sales.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucun achat</p>
              ) : (
                sales.map((sale) => (
                  <div key={sale.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{sale.sale_items?.length || 0} article(s)</p>
                      <p className="text-xs text-muted-foreground">{new Date(sale.created_at).toLocaleDateString("fr-FR")}</p>
                      <Badge variant="outline" className="text-[10px]">
                        {sale.payment_method === "cash" ? "Espèces" : "Carte"}
                      </Badge>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-bold font-mono-numbers">{format(Number(sale.total_amount))}</p>
                    </div>
                  </div>
                ))
              )}
            </TabsContent>

            <TabsContent value="warranties" className="max-h-[300px] overflow-y-auto space-y-2 mt-3">
              {warranties.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">Aucune garantie active</p>
              ) : (
                warranties.map((warranty) => (
                  <div key={warranty.id} className="flex items-center justify-between p-3 rounded-lg border bg-card">
                    <div className="min-w-0">
                      <p className="font-medium text-sm">{warranty.return_reason}</p>
                      <p className="text-xs text-muted-foreground">{new Date(warranty.created_at).toLocaleDateString("fr-FR")}</p>
                    </div>
                    <Badge variant={warranty.status === "pending" ? "secondary" : "default"} className="text-[10px]">
                      {warranty.status === "pending" ? "En attente" : "En cours"}
                    </Badge>
                  </div>
                ))
              )}
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
