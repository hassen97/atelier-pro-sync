import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Package,
  AlertTriangle,
  ArrowUpDown,
  MoreHorizontal,
  Download,
  Upload,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock inventory data
const inventory = [
  { id: "1", name: "Écran iPhone 14 Pro", category: "Écrans", sku: "ECR-IP14P", cost: 220.000, price: 280.000, stock: 5, threshold: 5 },
  { id: "2", name: "Écran iPhone 13", category: "Écrans", sku: "ECR-IP13", cost: 140.000, price: 180.000, stock: 8, threshold: 5 },
  { id: "3", name: "Écran iPhone 12", category: "Écrans", sku: "ECR-IP12", cost: 120.000, price: 160.000, stock: 12, threshold: 5 },
  { id: "4", name: "Batterie iPhone 14", category: "Batteries", sku: "BAT-IP14", cost: 35.000, price: 55.000, stock: 15, threshold: 10 },
  { id: "5", name: "Batterie iPhone 13", category: "Batteries", sku: "BAT-IP13", cost: 30.000, price: 45.000, stock: 18, threshold: 10 },
  { id: "6", name: "Batterie Samsung S23", category: "Batteries", sku: "BAT-SS23", cost: 40.000, price: 55.000, stock: 1, threshold: 5 },
  { id: "7", name: "Connecteur charge iPhone", category: "Connecteurs", sku: "CON-IPC", cost: 15.000, price: 35.000, stock: 25, threshold: 10 },
  { id: "8", name: "Connecteur charge USB-C", category: "Connecteurs", sku: "CON-USBC", cost: 8.000, price: 25.000, stock: 3, threshold: 10 },
  { id: "9", name: "Protection écran", category: "Accessoires", sku: "ACC-PE", cost: 5.000, price: 15.000, stock: 50, threshold: 20 },
  { id: "10", name: "Coque silicone", category: "Accessoires", sku: "ACC-CS", cost: 4.000, price: 12.000, stock: 40, threshold: 15 },
];

const categories = ["Tous", "Écrans", "Batteries", "Connecteurs", "Accessoires"];

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");

  const filteredInventory = inventory.filter((item) => {
    const matchesSearch = 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItems = inventory.length;
  const totalValue = inventory.reduce((sum, item) => sum + item.cost * item.stock, 0);
  const lowStockItems = inventory.filter((item) => item.stock <= item.threshold).length;
  const outOfStockItems = inventory.filter((item) => item.stock === 0).length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion du Stock"
        description="Inventaire des produits, pièces et accessoires"
      >
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter
        </Button>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau produit
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total produits"
          value={totalItems}
          icon={Package}
          variant="default"
        />
        <StatCard
          title="Valeur du stock"
          value={formatCurrency(totalValue)}
          icon={Package}
          variant="accent"
        />
        <StatCard
          title="Stock faible"
          value={lowStockItems}
          subtitle="Sous le seuil d'alerte"
          icon={AlertTriangle}
          variant="warning"
        />
        <StatCard
          title="Rupture de stock"
          value={outOfStockItems}
          icon={AlertTriangle}
          variant="destructive"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom ou SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Upload className="h-4 w-4 mr-2" />
          Importer
        </Button>
      </div>

      {/* Inventory Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produit</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Coût</TableHead>
                <TableHead className="text-right">Prix vente</TableHead>
                <TableHead className="text-right">Marge</TableHead>
                <TableHead className="text-center">Stock</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.map((item) => {
                const margin = ((item.price - item.cost) / item.cost) * 100;
                const isLowStock = item.stock <= item.threshold;
                const isOutOfStock = item.stock === 0;

                return (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {item.sku}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{item.category}</Badge>
                    </TableCell>
                    <TableCell className="text-right font-mono-numbers">
                      {formatCurrency(item.cost)}
                    </TableCell>
                    <TableCell className="text-right font-mono-numbers">
                      {formatCurrency(item.price)}
                    </TableCell>
                    <TableCell className="text-right">
                      <span className="text-success font-medium">
                        +{margin.toFixed(0)}%
                      </span>
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        className={cn(
                          "font-mono",
                          isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20",
                          isLowStock && !isOutOfStock && "bg-warning/10 text-warning border-warning/20",
                          !isLowStock && "bg-success/10 text-success border-success/20"
                        )}
                      >
                        {item.stock}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>Modifier</DropdownMenuItem>
                          <DropdownMenuItem>Ajuster stock</DropdownMenuItem>
                          <DropdownMenuItem>Historique</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
