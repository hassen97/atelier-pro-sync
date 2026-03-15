import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, Crown, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

const statusLabels: Record<string, { label: string; class: string }> = {
  pending: { label: "En attente", class: "bg-amber-100 text-amber-700 border-amber-200" },
  approved: { label: "Approuvé", class: "bg-emerald-100 text-emerald-700 border-emerald-200" },
  rejected: { label: "Rejeté", class: "bg-red-100 text-red-700 border-red-200" },
};

export function SubscriptionTab() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [currentPlan, setCurrentPlan] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);

    // Get latest approved subscription order -> current plan
    const { data: approvedOrder } = await supabase
      .from("subscription_orders")
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    // Also check shop_subscriptions for admin-assigned plans
    const { data: adminSub } = await supabase
      .from("shop_subscriptions" as any)
      .select("*, plan:subscription_plans(*)")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (adminSub) {
      setCurrentPlan({
        name: (adminSub as any).plan?.name || "Plan personnalisé",
        expires_at: (adminSub as any).expires_at,
        source: "admin",
      });
    } else if (approvedOrder) {
      setCurrentPlan({
        name: (approvedOrder as any).plan?.name || "Plan",
        expires_at: null,
        source: "payment",
      });
    } else {
      setCurrentPlan({ name: "Gratuit", expires_at: null, source: "default" });
    }

    // Get payment history
    const { data: orderHistory } = await supabase
      .from("subscription_orders")
      .select("*, plan:subscription_plans(name)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    setOrders(orderHistory || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-500" />
            Plan Actuel
          </CardTitle>
          <CardDescription>Votre abonnement en cours</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p className="text-2xl font-bold text-foreground">{currentPlan?.name}</p>
              {currentPlan?.expires_at && (
                <p className="text-sm text-muted-foreground">
                  Expire le {format(new Date(currentPlan.expires_at), "dd MMMM yyyy", { locale: fr })}
                </p>
              )}
              {currentPlan?.source === "admin" && (
                <Badge variant="outline" className="mt-1 text-xs">Attribué par l'administrateur</Badge>
              )}
            </div>
            <Button onClick={() => navigate("/checkout")} variant="outline" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Changer de plan
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Historique des paiements
          </CardTitle>
        </CardHeader>
        <CardContent>
          {orders.length === 0 ? (
            <p className="text-muted-foreground text-sm text-center py-6">Aucun paiement enregistré</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Montant</TableHead>
                  <TableHead>Méthode</TableHead>
                  <TableHead>Statut</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => {
                  const statusInfo = statusLabels[order.status] || { label: order.status, class: "" };
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="text-sm">
                        {format(new Date(order.created_at), "dd/MM/yyyy", { locale: fr })}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{order.plan?.name || "—"}</TableCell>
                      <TableCell className="text-sm font-mono-numbers">{Number(order.amount).toFixed(2)} {order.currency}</TableCell>
                      <TableCell className="text-sm uppercase text-muted-foreground">{order.gateway_key}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${statusInfo.class}`}>
                          {statusInfo.label}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
