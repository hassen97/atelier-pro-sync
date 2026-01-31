import {
  BarChart3,
  TrendingUp,
  Calendar,
  Package,
  ShoppingCart,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
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
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Mock chart data
const salesData = [
  { month: "Jan", ventes: 12500, réparations: 8200 },
  { month: "Fév", ventes: 11800, réparations: 9100 },
  { month: "Mar", ventes: 14200, réparations: 7800 },
  { month: "Avr", ventes: 13500, réparations: 10200 },
  { month: "Mai", ventes: 15800, réparations: 11500 },
  { month: "Jun", ventes: 14200, réparations: 9800 },
];

const topProducts = [
  { name: "Écran iPhone 13", sales: 24, revenue: 4320.000 },
  { name: "Batterie iPhone 12", sales: 18, revenue: 1620.000 },
  { name: "Protection écran", sales: 45, revenue: 675.000 },
  { name: "Coque silicone", sales: 38, revenue: 570.000 },
  { name: "Chargeur rapide", sales: 28, revenue: 700.000 },
  { name: "Câble USB-C", sales: 52, revenue: 416.000 },
  { name: "Écran Samsung S23", sales: 12, revenue: 2400.000 },
  { name: "Batterie Samsung", sales: 15, revenue: 825.000 },
];

const categoryData = [
  { name: "Écrans", value: 45, color: "hsl(217, 91%, 40%)" },
  { name: "Batteries", value: 25, color: "hsl(187, 72%, 41%)" },
  { name: "Accessoires", value: 20, color: "hsl(152, 69%, 40%)" },
  { name: "Connecteurs", value: 10, color: "hsl(38, 92%, 50%)" },
];

const repairStats = [
  { type: "Écran", count: 45, trend: 12 },
  { type: "Batterie", count: 32, trend: 8 },
  { type: "Port charge", count: 18, trend: -5 },
  { type: "Caméra", count: 12, trend: 15 },
  { type: "Haut-parleur", count: 8, trend: 3 },
];

export default function Statistics() {
  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Statistiques"
        description="Analyses et rapports détaillés"
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
        <Button variant="outline">
          Exporter PDF
        </Button>
      </PageHeader>

      {/* Sales Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Évolution des ventes et réparations
          </CardTitle>
          <CardDescription>Comparaison mensuelle (en DT)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="month" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                  formatter={(value: number) => formatCurrency(value)}
                />
                <Bar dataKey="ventes" fill="hsl(217, 91%, 40%)" radius={[4, 4, 0, 0]} />
                <Bar dataKey="réparations" fill="hsl(187, 72%, 41%)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-primary" />
              <span className="text-sm text-muted-foreground">Ventes</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-accent" />
              <span className="text-sm text-muted-foreground">Réparations</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Top Products */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Meilleures ventes
            </CardTitle>
            <CardDescription>Produits les plus vendus ce mois</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.slice(0, 6).map((product, i) => (
                <div
                  key={i}
                  className="flex items-center gap-3"
                >
                  <span className={cn(
                    "flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold",
                    i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.sales} unités</p>
                  </div>
                  <span className="font-semibold font-mono-numbers text-sm">
                    {formatCurrency(product.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Répartition par catégorie
            </CardTitle>
            <CardDescription>Distribution des ventes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                    formatter={(value: number) => `${value}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-4">
              {categoryData.map((cat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="text-sm text-muted-foreground">
                    {cat.name} ({cat.value}%)
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Repair Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="h-5 w-5" />
            Statistiques réparations
          </CardTitle>
          <CardDescription>Types de réparations les plus fréquents</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            {repairStats.map((stat, i) => (
              <div
                key={i}
                className="p-4 rounded-lg bg-muted/50 text-center"
              >
                <p className="text-2xl font-bold">{stat.count}</p>
                <p className="text-sm text-muted-foreground">{stat.type}</p>
                <div className={cn(
                  "flex items-center justify-center gap-1 mt-2 text-xs font-medium",
                  stat.trend >= 0 ? "text-success" : "text-destructive"
                )}>
                  <TrendingUp className={cn("h-3 w-3", stat.trend < 0 && "rotate-180")} />
                  {stat.trend >= 0 ? "+" : ""}{stat.trend}%
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
