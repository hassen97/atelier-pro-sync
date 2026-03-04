import { useState, useRef, useCallback } from "react";
import { Search, Plus, Package, AlertTriangle, MoreHorizontal, Download, History, Zap } from "lucide-react";
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
import { ProductSheet, ProductSheetRef } from "@/components/inventory/ProductSheet";
import { SmartScanBar, SmartScanBarRef } from "@/components/inventory/SmartScanBar";
import { VariationMatrixDialog } from "@/components/inventory/VariationMatrixDialog";
import { InventoryUnlockDialog } from "@/components/inventory/InventoryUnlockDialog";
import { ActivityLogTab } from "@/components/inventory/ActivityLogTab";
import { useInventoryAccess } from "@/hooks/useInventoryAccess";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";

interface ProductWithCategory {
  id: string; name: string; sku: string | null; barcodes: string[]; description: string | null;
  cost_price: number; sell_price: number; quantity: number; min_quantity: number;
  category?: { id: string; name: string } | null;
  category_id?: string | null;
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  
  // Edit dialog (existing products)
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductWithCategory | null>(null);
  
  // New product sheet
  const [sheetOpen, setSheetOpen] = useState(false);
  const [prefillBarcode, setPrefillBarcode] = useState<string | undefined>();
  
  // Matrix dialog
  const [matrixOpen, setMatrixOpen] = useState(false);
  
  // Unlock dialog
  const [unlockDialogOpen, setUnlockDialogOpen] = useState(false);
  
  // Pulse animation
  const [pulsedProductId, setPulsedProductId] = useState<string | null>(null);

  const { data: rawProducts = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateProductStock();
  const { format } = useCurrency();
  const { isLocked, isEmployee, inventoryLocked, verifyCode, verifying, unlocked } = useInventoryAccess();

  const scanBarRef = useRef<SmartScanBarRef>(null);
  const sheetRef = useRef<ProductSheetRef>(null);

  useRealtimeSubscription({ tables: ["products"], queryKeys: [["products"], ["low-stock-alerts"], ["dashboard-stats"]] });

  const products = (rawProducts as ProductWithCategory[]).map((p) => ({
    id: p.id,
    name: p.name,
    category: p.category?.name || "Non catégorisé",
    sku: p.sku || "",
    barcodes: p.barcodes || (p.sku ? [p.sku] : []),
    cost: Number(p.cost_price) || 0,
    price: Number(p.sell_price) || 0,
    stock: p.quantity || 0,
    threshold: p.min_quantity || 5,
    _original: p,
  }));

  const categories = ["Tous", ...new Set(products.map((p) => p.category))];

  const filteredInventory = (() => {
    let list = products.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.barcodes.some((b) => b.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "Tous" || item.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Pulsed product always first
    if (pulsedProductId) {
      const idx = list.findIndex((p) => p.id === pulsedProductId);
      if (idx > 0) {
        const [item] = list.splice(idx, 1);
        list = [item, ...list];
      }
    }
    return list;
  })();

  const totalItems = products.length;
  const totalStockUnits = products.reduce((sum, item) => sum + item.stock, 0);
  const totalValue = products.reduce((sum, item) => sum + item.cost * item.stock, 0);
  const lowStockItems = products.filter((item) => item.stock <= item.threshold).length;
  const outOfStockItems = products.filter((item) => item.stock === 0).length;

  const returnFocusToScanBar = useCallback(() => {
    setTimeout(() => scanBarRef.current?.focus(), 50);
  }, []);

  const handleNewProduct = () => {
    setPrefillBarcode(undefined);
    setSheetOpen(true);
  };

  const handleEdit = (product: ProductWithCategory) => {
    setEditingProduct(product);
    setEditDialogOpen(true);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} ?`)) {
      deleteProduct.mutate(id);
    }
  };

  const handleAdjustStock = (id: string, name: string, currentStock: number) => {
    const newStock = prompt(`Nouveau stock pour ${name}:`, String(currentStock));
    if (newStock !== null) {
      const qty = parseInt(newStock);
      if (!isNaN(qty) && qty >= 0) updateStock.mutate({ id, quantity: qty });
      else toast.error("Quantité invalide");
    }
    returnFocusToScanBar();
  };

  // Smart Scan callbacks
  const handleProductScanned = useCallback((productId: string, _name: string, _newStock: number) => {
    setPulsedProductId(productId);
    setTimeout(() => setPulsedProductId(null), 1400);
  }, []);

  const handleUnknownBarcode = useCallback((barcode: string) => {
    setPrefillBarcode(barcode);
    setSheetOpen(true);
  }, []);

  const handleStockIncrement = useCallback((id: string, quantity: number) => {
    updateStock.mutate({ id, quantity });
  }, [updateStock]);

  // Sheet submit (new product)
  const handleSheetSubmit = async (data: any) => {
    await createProduct.mutateAsync(data);
    setSheetOpen(false);
    setPrefillBarcode(undefined);
    returnFocusToScanBar();
  };

  // Edit dialog submit
  const handleEditSubmit = async (data: any) => {
    if (editingProduct) {
      await updateProduct.mutateAsync({ id: editingProduct.id, ...data });
    }
    setEditDialogOpen(false);
    setEditingProduct(null);
    returnFocusToScanBar();
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
        <Button
          variant="outline"
          onClick={() => setMatrixOpen(true)}
          disabled={isLocked}
          className="gap-2 border-warning/30 text-warning hover:bg-warning/10"
        >
          <Zap className="h-4 w-4" />
          Générateur
        </Button>
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
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <StatCard title="Total produits" value={totalItems} icon={Package} variant="default" />
            <StatCard title="Unités en stock" value={totalStockUnits} icon={Package} variant="success" />
            <StatCard title="Valeur du stock" value={format(totalValue)} icon={Package} variant="accent" />
            <StatCard title="Stock faible" value={lowStockItems} subtitle="Sous le seuil d'alerte" icon={AlertTriangle} variant="warning" />
            <StatCard title="Rupture de stock" value={outOfStockItems} icon={AlertTriangle} variant="destructive" />
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par nom, SKU ou code-barres..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Smart Scan Bar */}
            <SmartScanBar
              ref={scanBarRef}
              products={products}
              isLocked={isLocked}
              onProductScanned={handleProductScanned}
              onUnknownBarcode={handleUnknownBarcode}
              onStockIncrement={handleStockIncrement}
            />

            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Catégorie" /></SelectTrigger>
              <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produit</TableHead>
                    <TableHead>Codes-barres</TableHead>
                    <TableHead>Catégorie</TableHead>
                    <TableHead className="text-right">Coût</TableHead>
                    <TableHead className="text-right">Prix vente</TableHead>
                    <TableHead className="text-right">Marge</TableHead>
                    <TableHead className="text-center">Stock</TableHead>
                    <TableHead className="w-12"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        {products.length === 0
                          ? "Aucun produit enregistré. Cliquez sur 'Nouveau produit' pour commencer."
                          : "Aucun produit trouvé"}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredInventory.map((item) => {
                      const margin = item.cost > 0 && isFinite(item.cost) && isFinite(item.price) ? ((item.price - item.cost) / item.cost) * 100 : 0;
                      const isLowStock = item.stock <= item.threshold;
                      const isOutOfStock = item.stock === 0;
                      const isPulsed = item.id === pulsedProductId;
                      return (
                        <TableRow
                          key={item.id}
                          className={cn(isPulsed && "animate-neon-pulse")}
                        >
                          <TableCell className="font-medium">{item.name}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {item.barcodes.length > 0 ? (
                                item.barcodes.map((b) => (
                                  <span key={b} className="font-mono text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                                    {b}
                                  </span>
                                ))
                              ) : item.sku ? (
                                <span className="font-mono text-xs text-muted-foreground">{item.sku}</span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell><Badge variant="secondary">{item.category}</Badge></TableCell>
                          <TableCell className="text-right font-mono-numbers">{format(item.cost)}</TableCell>
                          <TableCell className="text-right font-mono-numbers">{format(item.price)}</TableCell>
                          <TableCell className="text-right">
                            <span className="text-success font-medium">+{margin.toFixed(0)}%</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge className={cn(
                              "font-mono",
                              isOutOfStock && "bg-destructive/10 text-destructive border-destructive/20",
                              isLowStock && !isOutOfStock && "bg-warning/10 text-warning border-warning/20",
                              !isLowStock && "bg-success/10 text-success border-success/20"
                            )}>
                              {item.stock}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8" disabled={isLocked}>
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
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

      {/* New Product Sheet (slide-over) */}
      <ProductSheet
        ref={sheetRef}
        open={sheetOpen}
        onOpenChange={(open) => {
          setSheetOpen(open);
          if (!open) {
            setPrefillBarcode(undefined);
            returnFocusToScanBar();
          }
        }}
        prefillBarcode={prefillBarcode}
        onSubmit={handleSheetSubmit}
        isLoading={createProduct.isPending}
        onSaved={returnFocusToScanBar}
      />

      {/* Edit Dialog (existing products) */}
      <ProductDialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          setEditDialogOpen(open);
          if (!open) returnFocusToScanBar();
        }}
        product={editingProduct}
        onSubmit={handleEditSubmit}
        isLoading={updateProduct.isPending}
      />

      {/* Variation Matrix */}
      <VariationMatrixDialog
        open={matrixOpen}
        onOpenChange={(open) => {
          setMatrixOpen(open);
          if (!open) returnFocusToScanBar();
        }}
        onSaved={returnFocusToScanBar}
      />

      {/* Unlock Dialog */}
      <InventoryUnlockDialog
        open={unlockDialogOpen}
        onOpenChange={setUnlockDialogOpen}
        onVerify={verifyCode}
        verifying={verifying}
      />
    </div>
  );
}
