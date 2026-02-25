import { useState } from "react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, Plus, Clock, CheckCircle2, XCircle, Wrench } from "lucide-react";
import { useWarrantyTickets } from "@/hooks/useWarranty";
import { WarrantyDialog } from "@/components/repairs/WarrantyDialog";
import { DefectivePartsList } from "@/components/repairs/DefectivePartsList";
import { useCurrency } from "@/hooks/useCurrency";

const ticketStatusConfig: Record<string, { label: string; icon: any; className: string }> = {
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  resolved: { label: "Résolu", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulé", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

const reasonLabels: Record<string, string> = {
  supplier_defect: "Défaut fournisseur",
  tech_error: "Erreur technique",
  customer_damage: "Dommage client",
};

export default function Warranty() {
  const { data: tickets = [], isLoading } = useWarrantyTickets();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { format } = useCurrency();

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Garantie & Retours" description="Gestion des tickets de garantie et pièces défectueuses" />
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Garantie & Retours" description="Gestion des tickets de garantie et pièces défectueuses">
        <Button size="sm" className="bg-orange-500 hover:bg-orange-600 text-white" onClick={() => setDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau ticket
        </Button>
      </PageHeader>

      {/* Warranty Tickets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Shield className="h-4 w-4 text-orange-500" />
            Tickets de garantie
          </CardTitle>
        </CardHeader>
        <CardContent>
          {(tickets as any[]).length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Aucun ticket de garantie</p>
            </div>
          ) : (
            <div className="space-y-3">
              {(tickets as any[]).map((ticket: any) => {
                const status = ticketStatusConfig[ticket.status] || ticketStatusConfig.pending;
                const StatusIcon = status.icon;
                const repair = ticket.original_repair;
                return (
                  <div key={ticket.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`flex items-center justify-center w-9 h-9 rounded-lg ${status.className}`}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">
                          {repair?.device_model || "Réparation"} — {repair?.customer?.name || "Client anonyme"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {reasonLabels[ticket.return_reason] || ticket.return_reason}
                          {ticket.action_taken && ` • ${ticket.action_taken}`}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(ticket.created_at).toLocaleDateString("fr-FR")}
                          {repair?.customer?.phone && ` • ${repair.customer.phone}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                      <span className="text-sm font-medium font-mono-numbers">
                        {format(Number(ticket.total_cost) || 0)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Defective Parts */}
      <DefectivePartsList />

      <WarrantyDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}
