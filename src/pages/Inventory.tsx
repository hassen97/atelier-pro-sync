import { useState, useRef } from "react";
import { Search, Plus, Package, AlertTriangle, MoreHorizontal, Download, Upload, ScanBarcode, Lock, Unlock, History } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUpdateProductStock } from "@/hooks/useProducts";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { InventoryUnlockDialog } from "@/components/inventory/InventoryUnlockDialog";
import { ActivityLogTab } from "@/components/inventory/ActivityLogTab";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { toast } from "sonner";

interface ProductWithCategory {
  id: string; name: string; sku: string | null; description: string | null;
  cost_price: number; sell_price: number; quantity: number; min_quantity: number;
  category?: { id: string; name: string } | null;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);

  const { data: rawProducts = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateProductStock();
  const { format } = useCurrency();
  const { isLocked, isEmployee, inventoryLocked, verifyCode, verifying, unlocked } = useInventoryAccess();

  useRealtimeSubscription({ tables: ["products"], queryKeys: [["products"], ["low-stock-alerts"], ["dashboard-stats"]] });

  const products = (rawProducts as ProductWithCategory[]).map((p) => ({
    id: p.id, name: p.name, category: p.category?.name || "Non catégorisé", sku: p.sku || "",
    cost: Number(p.cost_price) || 0, price: Number(p.sell_price) || 0, stock: p.quantity || 0, threshold: p.min_quantity || 5, _original: p,
  }));

  const categories = ["Tous", ...new Set(products.map((p) => p.category))];

  const filteredInventory = products.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) || item.sku.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Tous" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalItems = products.length;
  const totalValue = products.reduce((sum, item) => sum + item.cost * item.stock, 0);
  const lowStockItems = products.filter((item) => item.stock <= item.threshold).length;
  const outOfStockItems = products.filter((item) => item.stock === 0).length;

  const handleNewProduct = () => { setEditingProduct(null); setDialogOpen(true); };
  const handleEdit = (product: ProductWithCategory) => { setEditingProduct(product); setDialogOpen(true); };
  const handleDelete = (id: string, name: string) => { if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} ?`)) deleteProduct.mutate(id); };

  const handleAdjustStock = (id: string, name: string, currentStock: number) => {
    const newStock = prompt(`Nouveau stock pour ${name}:`, String(currentStock));
    if (newStock !== null) { const qty = parseInt(newStock); if (!isNaN(qty) && qty >= 0) updateStock.mutate({ id, quantity: qty }); else toast.error("Quantité invalide"); }
  };

  const [scanStockInput, setScanStockInput] = useState("");
  const handleScanStock = (value: string) => {
    if (!value.trim()) return;
    const product = products.find((p) => p.sku === value.trim());
    if (product) {
      updateStock.mutate({ id: product.id, quantity: product.stock + 1 });
      toast.success(`+1 ${product.name} (Stock: ${product.stock + 1})`);
    } else {
      toast.error(`SKU non trouvé: ${value}`);
    }
    setScanStockInput("");
  };

  const handleSubmit = async (data: { name: string; sku?: string; description?: string; category_id?: string; cost_price: number; sell_price: number; quantity: number; min_quantity: number }) => {
    const submitData = { ...data, category_id: data.category_id || null };
    if (editingProduct) await updateProduct.mutateAsync({ id: editingProduct.id, ...submitData });
    else await createProduct.mutateAsync(submitData);
    setDialogOpen(false); setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion du Stock" description="Inventaire des produits, pièces et accessoires" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Gestion du Stock" description="Inventaire des produits, pièces et accessoires">
        {isLocked && (
          <Button variant="outline" onClick={() => setUnlockDialogOpen(true)} className="gap-2">
            <Lock className="h-4 w-4" />
            Déverrouiller
          </Button>
        )}
        {isEmployee && inventoryLocked && unlocked && (
          <Badge variant="outline" className="bg-success/10 text-success border-success/20 gap-1">
            <Unlock className="h-3 w-3" />
            Déverrouillé
          </Badge>
        )}
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />Exporter</Button>
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewProduct} disabled={isLocked}>
          <Plus className="h-4 w-4 mr-2" />Nouveau produit
        </Button>
      </PageHeader>

      <Tabs defaultValue="stock" className="space-y-6">
        <TabsList>
          <TabsTrigger value="stock" className="gap-1.5">
            <Package className="h-4 w-4" />
            Stock
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-1.5">
            <History className="h-4 w-4" />
            Historique
          </TabsTrigger>
        </TabsList>

        <TabsContent value="stock" className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard title="Total produits" value={totalItems} icon={Package} variant="default" />
            <StatCard title="Valeur du stock" value={format(totalValue)} icon={Package} variant="accent" />
            <StatCard title="Stock faible" value={lowStockItems} subtitle="Sous le seuil d'alerte" icon={AlertTriangle} variant="warning" />
            <StatCard title="Rupture de stock" value={outOfStockItems} icon={AlertTriangle} variant="destructive" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Rechercher par nom ou SKU..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
            </div>
            <div className="relative w-full sm:w-56">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Scanner +1 stock..."
                value={scanStockInput}
                onChange={(e) => setScanStockInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScanStock(scanStockInput); } }}
                className="pl-9 font-mono text-sm"
                disabled={isLocked}
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
            </Select>
            <Button variant="outline"><Upload className="h-4 w-4 mr-2" />Importer</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead><TableHead>SKU</TableHead><TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Coût</TableHead><TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Marge</TableHead><TableHead className="text-center">Stock</TableHead><TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{products.length === 0 ? "Aucun produit enregistré. Cliquez sur 'Nouveau produit' pour commencer." : "Aucun produit trouvé"}</TableCell></TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const margin = item.cost > 0 ? ((item.price - item.cost) / item.cost) * 100 : 0;
                      const isLowStock = item.stock <= item.threshold;
                      const isOutOfStock = item.stock === 0;
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">{item.sku || "-"}</TableCell>
                          <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                          <TableCell className="text-right font-mono-numbers">{format(item.cost)}</TableCell>
                          <TableCell className="text-right font-mono-numbers">{format(item.price)}</TableCell>
                          <TableCell className="text-right"><span className="text-success font-medium">+{margin.toFixed(0)}%</span></TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn("font-mono", isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20", isLowStock && !isOutOfStock && "bg-warning/10 text-warning border-warning/20", !isLowStock && "bg-success/10 text-success border-success/20")}>{item.stock}</Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLocked}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleEdit(item._original)}>Modifier</DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleAdjustStock(item.id, item.name, item.stock)}>Ajuster stock</DropdownMenuItem>
                                <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id, item.name)}>Supprimer</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <ActivityLogTab />
        </TabsContent>
      </Tabs>

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} onSubmit={handleSubmit} isLoading={createProduct.isPending || updateProduct.isPending} />
      <InventoryUnlockDialog open={unlockDialogOpen} onOpenChange={setUnlockDialogOpen} onVerify={verifyCode} verifying={verifying} />
    </div>
  );
}
