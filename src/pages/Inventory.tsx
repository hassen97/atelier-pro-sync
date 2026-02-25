import { useState, useRef, useCallback } from "react";
import { Search, Plus, Package, AlertTriangle, MoreHorizontal, Download, Upload, ScanBarcode } from "lucide-react";
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
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts, useCreateProduct, useUpdateProduct, useDeleteProduct, useUpdateProductStock } from "@/hooks/useProducts";
import { useRealtimeSubscription } from "@/hooks/useRealtimeSubscription";
import { ProductDialog } from "@/components/inventory/ProductDialog";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const [scanInput, setScanInput] = useState("");
  const scanInputRef = useRef<HTMLInputElement>(null);

  const { data: rawProducts = [], isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const updateStock = useUpdateProductStock();
  const { format } = useCurrency();
  const { t } = useLanguage();

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

  const handleScanAdd = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter" || !scanInput.trim()) return;
    const scannedSku = scanInput.trim();
    const found = products.find((p) => p.sku.toLowerCase() === scannedSku.toLowerCase());
    if (found) {
      updateStock.mutate({ id: found.id, quantity: found.stock + 1 });
      toast.success(`${found.name} ${t("inventory.scanned")}`);
    } else {
      toast.error(`SKU "${scannedSku}" non trouvé`);
    }
    setScanInput("");
  }, [scanInput, products, updateStock, t]);

  const handleSubmit = async (data: { name: string; sku?: string; description?: string; category_id?: string; cost_price: number; sell_price: number; quantity: number; min_quantity: number }) => {
    const submitData = { ...data, category_id: data.category_id || null };
    if (editingProduct) await updateProduct.mutateAsync({ id: editingProduct.id, ...submitData });
    else await createProduct.mutateAsync(submitData);
    setDialogOpen(false); setEditingProduct(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title={t("inventory.title")} description={t("inventory.description")} />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title={t("inventory.title")} description={t("inventory.description")}>
        <Button variant="outline"><Download className="h-4 w-4 mr-2" />{t("action.export")}</Button>
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewProduct}><Plus className="h-4 w-4 mr-2" />{t("inventory.newProduct")}</Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title={t("inventory.totalProducts")} value={totalItems} icon={Package} variant="default" />
        <StatCard title={t("inventory.stockValue")} value={format(totalValue)} icon={Package} variant="accent" />
        <StatCard title={t("inventory.lowStock")} value={lowStockItems} icon={AlertTriangle} variant="warning" />
        <StatCard title={t("inventory.outOfStock")} value={outOfStockItems} icon={AlertTriangle} variant="destructive" />
      </div>

      {/* Barcode Scan Input */}
      <div className="relative">
        <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          ref={scanInputRef}
          placeholder={t("inventory.scanToAdd")}
          value={scanInput}
          onChange={(e) => setScanInput(e.target.value)}
          onKeyDown={handleScanAdd}
          className="pl-9 border-primary/30 focus:border-primary"
        />
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t("inventory.searchBySku")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder={t("inventory.category")} /></SelectTrigger>
          <SelectContent>{categories.map((cat) => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}</SelectContent>
        </Select>
        <Button variant="outline"><Upload className="h-4 w-4 mr-2" />{t("action.import")}</Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("inventory.product")}</TableHead><TableHead>{t("inventory.sku")}</TableHead><TableHead>{t("inventory.category")}</TableHead>
                <TableHead className="text-right">{t("inventory.cost")}</TableHead><TableHead className="text-right">{t("inventory.sellPrice")}</TableHead>
                <TableHead className="text-right">{t("inventory.margin")}</TableHead><TableHead className="text-center">{t("inventory.stock")}</TableHead><TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInventory.length === 0 ? (
                <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">{products.length === 0 ? t("common.noResults") : t("common.noResults")}</TableCell></TableRow>
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
                          <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(item._original)}>{t("action.edit")}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAdjustStock(item.id, item.name, item.stock)}>{t("inventory.adjustStock")}</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(item.id, item.name)}>{t("action.delete")}</DropdownMenuItem>
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

      <ProductDialog open={dialogOpen} onOpenChange={setDialogOpen} product={editingProduct} onSubmit={handleSubmit} isLoading={createProduct.isPending || updateProduct.isPending} />
    </div>
  );
}
