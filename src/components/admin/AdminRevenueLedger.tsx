import { useState } from "react";
import { useAdminOrders } from "@/hooks/useAdminOrders";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { Loader2, DollarSign, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const statusColors: Record<string, string> = {
  pending: "bg-amber-500/15 text-amber-400 border-amber-500/30",
  approved: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  rejected: "bg-red-500/15 text-red-400 border-red-500/30",
};

export function AdminRevenueLedger() {
  const { data: orders = [], isLoading } = useAdminOrders();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [gatewayFilter, setGatewayFilter] = useState<string>("all");

  const filtered = orders.filter((o: any) => {
    if (statusFilter !== "all" && o.status !== statusFilter) return false;
    if (gatewayFilter !== "all" && o.gateway_key !== gatewayFilter) return false;
    return true;
  });

  const totalApproved = orders
    .filter((o: any) => o.status === "approved")
    .reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

  const totalPending = orders
    .filter((o: any) => o.status === "pending")
    .reduce((s: number, o: any) => s + Number(o.amount || 0), 0);

  const gateways = [...new Set(orders.map((o: any) => o.gateway_key))];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-[#00D4FF]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <h2 className="text-lg font-semibold text-white flex items-center gap-2">
        <DollarSign className="h-5 w-5 text-emerald-400" />
        Livre de Revenus
      </h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="admin-glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400">Revenus Approuvés</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono-numbers">{totalApproved.toFixed(2)} DT</p>
        </div>
        <div className="admin-glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400">En Attente</p>
          <p className="text-2xl font-bold text-amber-400 font-mono-numbers">{totalPending.toFixed(2)} DT</p>
        </div>
        <div className="admin-glass-card rounded-xl p-4">
          <p className="text-xs text-slate-400">Total Commandes</p>
          <p className="text-2xl font-bold text-white font-mono-numbers">{orders.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap items-center">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs">
            <SelectValue placeholder="Statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous statuts</SelectItem>
            <SelectItem value="pending">En attente</SelectItem>
            <SelectItem value="approved">Approuvé</SelectItem>
            <SelectItem value="rejected">Rejeté</SelectItem>
          </SelectContent>
        </Select>
        <Select value={gatewayFilter} onValueChange={setGatewayFilter}>
          <SelectTrigger className="w-36 bg-white/5 border-white/10 text-white text-xs">
            <SelectValue placeholder="Méthode" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Toutes méthodes</SelectItem>
            {gateways.map((g: string) => (
              <SelectItem key={g} value={g}>{g}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Date</TableHead>
              <TableHead className="text-slate-400 text-xs">Utilisateur</TableHead>
              <TableHead className="text-slate-400 text-xs">Plan</TableHead>
              <TableHead className="text-slate-400 text-xs">Méthode</TableHead>
              <TableHead className="text-slate-400 text-xs">Montant</TableHead>
              <TableHead className="text-slate-400 text-xs">Statut</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((order: any) => (
              <TableRow key={order.id} className="border-white/5 hover:bg-white/5">
                <TableCell className="text-xs text-slate-300">
                  {format(new Date(order.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                </TableCell>
                <TableCell>
                  <div>
                    <span className="text-sm text-white">{order.user_full_name || "—"}</span>
                    {order.user_username && <p className="text-xs text-slate-500">@{order.user_username}</p>}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-white">{order.plan_name || "—"}</TableCell>
                <TableCell className="text-xs text-slate-400 uppercase">{order.gateway_key}</TableCell>
                <TableCell className="text-sm text-white font-mono-numbers">{Number(order.amount).toFixed(2)} {order.currency}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={`text-[10px] ${statusColors[order.status] || "text-slate-400"}`}>
                    {order.status === "pending" ? "En attente" : order.status === "approved" ? "Approuvé" : "Rejeté"}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-slate-500 py-8">
                  Aucune commande trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
