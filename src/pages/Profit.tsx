import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Wrench,
  Receipt,
  ArrowUpRight,
  ArrowDownRight,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock profit data
const profitData = {
  revenue: {
    sales: 12450.000,
    repairs: 8750.000,
    total: 21200.000,
  },
  expenses: {
    stock: 8500.000,
    fixed: 2500.000,
    other: 850.000,
    total: 11850.000,
  },
  profit: 9350.000,
  profitMargin: 44.1,
};

const productMargins = [
  { name: "Écran iPhone 14 Pro", cost: 220.000, price: 280.000, margin: 27.3, sales: 8 },
  { name: "Écran iPhone 13", cost: 140.000, price: 180.000, margin: 28.6, sales: 12 },
  { name: "Batterie iPhone 12", cost: 30.000, price: 45.000, margin: 50.0, sales: 18 },
  { name: "Protection écran", cost: 5.000, price: 15.000, margin: 200.0, sales: 45 },
  { name: "Coque silicone", cost: 4.000, price: 12.000, margin: 200.0, sales: 38 },
];

const repairMargins = [
  { type: "Remplacement écran iPhone", avgRevenue: 200.000, avgCost: 160.000, margin: 25.0, count: 15 },
  { type: "Remplacement batterie", avgRevenue: 60.000, avgCost: 35.000, margin: 71.4, count: 22 },
  { type: "Réparation port charge", avgRevenue: 45.000, avgCost: 15.000, margin: 200.0, count: 12 },
  { type: "Réparation caméra", avgRevenue: 120.000, avgCost: 85.000, margin: 41.2, count: 8 },
];

export default function Profit() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Profit & Comptabilité"
        description="Analyse des revenus, dépenses et marges"
      >
        <Select defaultValue="month">
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="week">Cette semaine</SelectItem>
            <SelectItem value="month">Ce mois</SelectItem>
            <SelectItem value="quarter">Ce trimestre</SelectItem>
            <SelectItem value="year">Cette année</SelectItem>
          </SelectContent>
        </Select>
      </PageHeader>

      {/* Main Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Chiffre d'affaires"
          value={formatCurrency(profitData.revenue.total)}
          icon={TrendingUp}
          trend={{ value: 15.2, label: "vs mois dernier" }}
          variant="success"
        />
        <StatCard
          title="Dépenses totales"
          value={formatCurrency(profitData.expenses.total)}
          icon={TrendingDown}
          variant="destructive"
        />
        <StatCard
          title="Bénéfice net"
          value={formatCurrency(profitData.profit)}
          icon={DollarSign}
          trend={{ value: 12.8, label: "vs mois dernier" }}
          variant="success"
        />
        <StatCard
          title="Marge bénéficiaire"
          value={`${profitData.profitMargin}%`}
          icon={TrendingUp}
          variant="accent"
        />
      </div>

      {/* Revenue & Expenses Breakdown */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Revenue */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowUpRight className="h-5 w-5 text-success" />
              Revenus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-3">
                <ShoppingCart className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Ventes produits</p>
                  <p className="text-sm text-muted-foreground">Accessoires et pièces</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-success">
                +{formatCurrency(profitData.revenue.sales)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-success/5 border border-success/20">
              <div className="flex items-center gap-3">
                <Wrench className="h-5 w-5 text-success" />
                <div>
                  <p className="font-medium">Réparations</p>
                  <p className="text-sm text-muted-foreground">Main d'œuvre et services</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-success">
                +{formatCurrency(profitData.revenue.repairs)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total revenus</span>
                <span className="font-bold font-mono-numbers text-lg text-success">
                  {formatCurrency(profitData.revenue.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ArrowDownRight className="h-5 w-5 text-destructive" />
              Dépenses
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Achats stock</p>
                  <p className="text-sm text-muted-foreground">Pièces et accessoires</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-destructive">
                -{formatCurrency(profitData.expenses.stock)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-destructive/5 border border-destructive/20">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-destructive" />
                <div>
                  <p className="font-medium">Charges fixes</p>
                  <p className="text-sm text-muted-foreground">Loyer, électricité, etc.</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers text-destructive">
                -{formatCurrency(profitData.expenses.fixed)}
              </span>
            </div>
            <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
              <div className="flex items-center gap-3">
                <Receipt className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Autres dépenses</p>
                  <p className="text-sm text-muted-foreground">Marketing, divers</p>
                </div>
              </div>
              <span className="font-bold font-mono-numbers">
                -{formatCurrency(profitData.expenses.other)}
              </span>
            </div>
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Total dépenses</span>
                <span className="font-bold font-mono-numbers text-lg text-destructive">
                  {formatCurrency(profitData.expenses.total)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Margins Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Product Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marges par produit</CardTitle>
            <CardDescription>Top 5 produits vendus</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {productMargins.map((product, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{product.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(product.cost)} → {formatCurrency(product.price)} • {product.sales} ventes
                  </p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 ml-3",
                    product.margin >= 100
                      ? "bg-success/10 text-success border-success/20"
                      : product.margin >= 50
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  +{product.margin.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Repair Margins */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Marges par type de réparation</CardTitle>
            <CardDescription>Analyse de rentabilité</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {repairMargins.map((repair, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{repair.type}</p>
                  <p className="text-xs text-muted-foreground">
                    Moy: {formatCurrency(repair.avgRevenue)} • Coût: {formatCurrency(repair.avgCost)} • {repair.count} réparations
                  </p>
                </div>
                <Badge
                  className={cn(
                    "shrink-0 ml-3",
                    repair.margin >= 100
                      ? "bg-success/10 text-success border-success/20"
                      : repair.margin >= 50
                      ? "bg-accent/10 text-accent border-accent/20"
                      : "bg-warning/10 text-warning border-warning/20"
                  )}
                >
                  +{repair.margin.toFixed(0)}%
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
