import {
  ShoppingCart,
  Wrench,
  Package,
  Users,
  TrendingUp,
  AlertTriangle,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock data for demonstration
const stats = {
  salesTotal: 15847.500,
  salesTrend: 12.5,
  repairsInProgress: 8,
  repairsCompleted: 45,
  stockAlerts: 3,
  customerDebts: 2450.000,
  supplierDebts: 8920.000,
  profit: 4235.750,
  profitTrend: 8.3,
};

const recentRepairs = [
  { id: "REP-001", customer: "Ahmed Ben Ali", device: "iPhone 14 Pro", issue: "Écran cassé", status: "in_progress", amount: 180.000 },
  { id: "REP-002", customer: "Fatma Trabelsi", device: "Samsung S23", issue: "Batterie", status: "completed", amount: 85.000 },
  { id: "REP-003", customer: "Mohamed Khelifi", device: "Huawei P30", issue: "Port charge", status: "pending", amount: 65.000 },
  { id: "REP-004", customer: "Sarra Bouazizi", device: "iPhone 13", issue: "Caméra", status: "completed", amount: 150.000 },
  { id: "REP-005", customer: "Karim Mejri", device: "Xiaomi 12", issue: "Écran + vitre", status: "in_progress", amount: 120.000 },
];

const stockAlerts = [
  { name: "Écran iPhone 14 Pro", quantity: 2, threshold: 5 },
  { name: "Batterie Samsung S23", quantity: 1, threshold: 3 },
  { name: "Connecteur charge USB-C", quantity: 3, threshold: 10 },
];

const topProducts = [
  { name: "Écran iPhone 13", sales: 24, revenue: 4320.000 },
  { name: "Batterie iPhone 12", sales: 18, revenue: 1620.000 },
  { name: "Protection écran", sales: 45, revenue: 675.000 },
  { name: "Coque silicone", sales: 38, revenue: 570.000 },
];

const statusConfig = {
  pending: { label: "En attente", icon: Clock, className: "bg-warning/10 text-warning border-warning/20" },
  in_progress: { label: "En cours", icon: Loader2, className: "bg-primary/10 text-primary border-primary/20" },
  completed: { label: "Terminé", icon: CheckCircle2, className: "bg-success/10 text-success border-success/20" },
  cancelled: { label: "Annulé", icon: XCircle, className: "bg-destructive/10 text-destructive border-destructive/20" },
};

export default function Dashboard() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Tableau de bord"
        description="Vue d'ensemble de votre activité"
      >
        <Button variant="outline" size="sm">
          Exporter
        </Button>
        <Button size="sm" className="bg-gradient-primary hover:opacity-90">
          + Nouvelle réparation
        </Button>
      </PageHeader>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Ventes du mois"
          value={formatCurrency(stats.salesTotal)}
          icon={ShoppingCart}
          trend={{ value: stats.salesTrend, label: "vs mois dernier" }}
          variant="success"
        />
        <StatCard
          title="Réparations en cours"
          value={stats.repairsInProgress}
          subtitle={`${stats.repairsCompleted} terminées ce mois`}
          icon={Wrench}
          variant="accent"
        />
        <StatCard
          title="Alertes stock"
          value={stats.stockAlerts}
          subtitle="Produits en rupture imminente"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Profit net"
          value={formatCurrency(stats.profit)}
          icon={TrendingUp}
          trend={{ value: stats.profitTrend, label: "vs mois dernier" }}
          variant="success"
        />
      </div>

      {/* Debts Overview */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="border-warning/30 bg-warning/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dettes clients</p>
                <p className="mt-1 text-xl font-bold font-mono-numbers text-warning">
                  {formatCurrency(stats.customerDebts)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-warning" />
                <ArrowUpRight className="h-4 w-4 text-warning" />
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-destructive/30 bg-destructive/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Dettes fournisseurs</p>
                <p className="mt-1 text-xl font-bold font-mono-numbers text-destructive">
                  {formatCurrency(stats.supplierDebts)}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Package className="h-5 w-5 text-destructive" />
                <ArrowDownRight className="h-4 w-4 text-destructive" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Repairs */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Réparations récentes</CardTitle>
                <CardDescription>Dernières fiches de réparation</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-primary">
                Voir tout →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {recentRepairs.map((repair) => {
                const status = statusConfig[repair.status as keyof typeof statusConfig];
                const StatusIcon = status.icon;
                return (
                  <div
                    key={repair.id}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={cn("flex items-center justify-center w-8 h-8 rounded-lg", status.className)}>
                        <StatusIcon className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{repair.customer}</p>
                        <p className="text-xs text-muted-foreground">
                          {repair.device} • {repair.issue}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <Badge variant="secondary" className={status.className}>
                        {status.label}
                      </Badge>
                      <span className="text-sm font-medium font-mono-numbers">
                        {formatCurrency(repair.amount)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Stock Alerts */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                <CardTitle className="text-base">Alertes stock</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {stockAlerts.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-lg bg-warning/5 border border-warning/20"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">
                      Seuil: {item.threshold} unités
                    </p>
                  </div>
                  <Badge variant="destructive" className="shrink-0">
                    {item.quantity} restant{item.quantity > 1 ? "s" : ""}
                  </Badge>
                </div>
              ))}
              <Button variant="outline" size="sm" className="w-full mt-2">
                Commander stock
              </Button>
            </CardContent>
          </Card>

          {/* Top Products */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Meilleures ventes</CardTitle>
              <CardDescription>Ce mois</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {topProducts.map((product, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{product.name}</p>
                      <p className="text-xs text-muted-foreground">{product.sales} ventes</p>
                    </div>
                  </div>
                  <span className="text-sm font-medium font-mono-numbers shrink-0">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
