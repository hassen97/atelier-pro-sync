import { useState, useRef, useCallback } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, Loader2, ScanBarcode, Wrench, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { useRepairs } from "@/hooks/useRepairs";
import { useCreateSale } from "@/hooks/useSales";
import { useCreateCustomer } from "@/hooks/useCustomers";
import { useUpdateRepairStatus } from "@/hooks/useRepairs";
import { CustomerCombobox } from "@/components/customers/CustomerCombobox";
import { CustomerDialog } from "@/components/customers/CustomerDialog";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
// Dynamic import to prevent jsPDF from crashing the module
import { toast } from "sonner";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  maxStock: number;
  type: "product" | "repair";
}

export default function POS() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const [scanFlash, setScanFlash] = useState(false);
  const scanRef = useRef<HTMLInputElement>(null);
  const beepRef = useRef<AudioContext | null>(null);

  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: rawRepairs = [], isLoading: repairsLoading } = useRepairs();
  const createSale = useCreateSale();
  const createCustomer = useCreateCustomer();
  const updateRepairStatus = useUpdateRepairStatus();
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  // Completed repairs only
  const completedRepairs = (rawRepairs || []).filter((r: any) => r.status === "completed");

  const categories = [...new Set(products.map((p: any) => p.category?.name).filter(Boolean))];

  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.sku && p.sku.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const playBeep = useCallback(() => {
    try {
      if (!beepRef.current) beepRef.current = new AudioContext();
      const ctx = beepRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 1200;
      gain.gain.value = 0.15;
      osc.start();
      osc.stop(ctx.currentTime + 0.1);
    } catch {}
  }, []);

  const flashGreen = useCallback(() => {
    setScanFlash(true);
    setTimeout(() => setScanFlash(false), 400);
  }, []);

  const handleScan = (value: string) => {
    if (!value.trim()) return;
    const product = products.find((p: any) => p.sku && p.sku.toLowerCase() === value.trim().toLowerCase());
    if (product) {
      addToCart(product);
      playBeep();
      flashGreen();
    } else {
      toast.error(`Produit non trouvé: ${value}`);
    }
    setScanInput("");
    scanRef.current?.focus();
  };

  const addToCart = (product: any) => {
    if (product.quantity <= 0) return;
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id && item.type === "product");
      if (existing) {
        if (existing.quantity >= product.quantity) return prev;
        return prev.map((item) =>
          item.id === product.id && item.type === "product" ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.sell_price, originalPrice: product.sell_price, quantity: 1, maxStock: product.quantity, type: "product" as const }];
    });
  };

  const addRepairToCart = (repair: any) => {
    const already = cart.find((item) => item.id === repair.id && item.type === "repair");
    if (already) return;
    const remaining = repair.total_cost - repair.amount_paid;
    if (remaining <= 0) {
      toast.info("Cette réparation est déjà entièrement payée");
      return;
    }
    setCart((prev) => [...prev, {
      id: repair.id,
      name: `Réparation: ${repair.device_model}`,
      price: remaining,
      originalPrice: remaining,
      quantity: 1,
      maxStock: 1,
      type: "repair" as const,
    }]);
    if (repair.customer_id && !selectedCustomerId) {
      setSelectedCustomerId(repair.customer_id);
    }
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
          if (item.type === "repair") return item; // Can't change repair qty
          const newQuantity = item.quantity + delta;
          if (newQuantity > item.maxStock) return item;
          return { ...item, quantity: Math.max(0, newQuantity) };
        })
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateItemPrice = (id: string, newPrice: number) => {
    setCart((prev) => prev.map((item) => item.id === id ? { ...item, price: newPrice } : item));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = settings.tax_enabled ? settings.tax_rate / 100 : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const clearCart = () => setCart([]);

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0) return;

    const productItems = cart.filter((i) => i.type === "product");
    const repairItems = cart.filter((i) => i.type === "repair");

    // Create sale for products
    if (productItems.length > 0) {
      const productSubtotal = productItems.reduce((s, i) => s + i.price * i.quantity, 0);
      const productTax = productSubtotal * taxRate;
      await createSale.mutateAsync({
        customer_id: selectedCustomerId || null,
        payment_method: paymentMethod,
        total_amount: productSubtotal + productTax,
        amount_paid: productSubtotal + productTax,
        items: productItems.map((item) => ({ product_id: item.id, quantity: item.quantity, unit_price: item.price })),
      });
    }

    // Mark repairs as delivered
    for (const repairItem of repairItems) {
      await updateRepairStatus.mutateAsync({ id: repairItem.id, status: "delivered" });
    }

    // Generate receipt via dynamic import
    try {
      const { generateThermalReceipt } = await import("@/lib/receiptPdf");
      await generateThermalReceipt({
        type: repairItems.length > 0 && productItems.length === 0 ? "repair" : "sale",
        id: Date.now().toString(36),
        date: new Date().toLocaleDateString("fr-TN"),
        items: cart.map((i) => ({ name: i.name, qty: i.quantity, unitPrice: i.price, total: i.price * i.quantity })),
        subtotal,
        taxRate: settings.tax_enabled ? settings.tax_rate : undefined,
        taxAmount: settings.tax_enabled ? tax : undefined,
        total,
        paid: total,
        remaining: 0,
        paymentMethod,
      }, settings, format);
    } catch (e) {
      console.error("Receipt generation error:", e);
    }

    clearCart();
    setSelectedCustomerId("");
  };

  if (productsLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] animate-fade-in">
        <PageHeader title="Point de Vente" description="Encaissement et ventes" />
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100%-5rem)]">
          <div className="lg:col-span-2"><Skeleton className="h-10 w-full mb-4" /><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-24" />)}</div></div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] animate-fade-in">
      <PageHeader title="Point de Vente" description="Encaissement et ventes" />

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100%-5rem)]">
        {/* Products & Repairs Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <Tabs defaultValue="products" className="flex flex-col flex-1 min-h-0">
            <TabsList className="mb-3 w-fit">
              <TabsTrigger value="products">Produits</TabsTrigger>
              <TabsTrigger value="repairs" className="gap-1.5">
                <Wrench className="h-3.5 w-3.5" />
                Réparations terminées
                {completedRepairs.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-[10px]">{completedRepairs.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="space-y-3 mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Rechercher un produit..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-9" />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant={selectedCategory === null ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(null)}>Tout</Button>
                  {categories.map((cat) => (
                    <Button key={cat} variant={selectedCategory === cat ? "default" : "outline"} size="sm" onClick={() => setSelectedCategory(cat)}>{cat}</Button>
                  ))}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {filteredProducts.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">
                    {products.length === 0 ? "Aucun produit dans l'inventaire." : "Aucun produit trouvé."}
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((product: any) => (
                      <Card key={product.id} className={cn("cursor-pointer transition-all hover:shadow-soft hover:border-primary/30", product.quantity <= 0 && "opacity-50 cursor-not-allowed")} onClick={() => addToCart(product)}>
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                            <Badge variant={product.quantity <= 0 ? "destructive" : "outline"} className="text-[10px] shrink-0 ml-2">{product.quantity}</Badge>
                          </div>
                          <div className="flex justify-between items-center">
                            <Badge variant="secondary" className="text-xs">{product.category?.name || "Sans catégorie"}</Badge>
                            <span className="font-bold font-mono-numbers text-primary">{format(product.sell_price)}</span>
                          </div>
                          {product.sku && <p className="text-[10px] font-mono text-muted-foreground mt-1">SKU: {product.sku}</p>}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="repairs" className="flex flex-col flex-1 min-h-0 mt-0">
              <div className="flex-1 overflow-auto">
                {completedRepairs.length === 0 ? (
                  <div className="flex items-center justify-center h-32 text-muted-foreground">Aucune réparation terminée en attente d'encaissement.</div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2">
                    {completedRepairs.map((repair: any) => {
                      const remaining = repair.total_cost - repair.amount_paid;
                      const inCart = cart.some((i) => i.id === repair.id && i.type === "repair");
                      return (
                        <Card key={repair.id} className={cn("cursor-pointer transition-all hover:shadow-soft", inCart && "border-primary ring-1 ring-primary/20", remaining <= 0 && "opacity-60")} onClick={() => addRepairToCart(repair)}>
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-sm">{repair.device_model}</p>
                                <p className="text-xs text-muted-foreground">{repair.customer?.name || "Client inconnu"}</p>
                              </div>
                              <Badge className="bg-success/10 text-success border-success/20 text-[10px]">
                                <CheckCircle2 className="h-3 w-3 mr-1" />Terminé
                              </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{repair.problem_description}</p>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-muted-foreground">Total: {format(repair.total_cost)}</span>
                              {remaining > 0 ? (
                                <Badge variant="destructive" className="text-[10px]">Reste: {format(remaining)}</Badge>
                              ) : (
                                <Badge className="bg-success/10 text-success text-[10px]">Payé</Badge>
                              )}
                            </div>
                            {inCart && <p className="text-[10px] text-primary font-medium mt-1">✓ Ajouté au panier</p>}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>

        {/* Cart Section */}
        <Card className={cn("flex flex-col min-h-0 transition-all", scanFlash && "ring-2 ring-success/60 bg-success/5")}>
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />Panier</CardTitle>
              {cart.length > 0 && <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">Vider</Button>}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
            {/* Barcode scan input */}
            <div className="relative mb-3">
              <ScanBarcode className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                ref={scanRef}
                placeholder="Scanner code-barres / SKU..."
                value={scanInput}
                onChange={(e) => setScanInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleScan(scanInput); } }}
                className="pl-9 font-mono text-sm"
              />
            </div>

            <div className="mb-3">
              <CustomerCombobox value={selectedCustomerId} onValueChange={setSelectedCustomerId} onAddNew={() => setCustomerDialogOpen(true)} />
            </div>

            <div className="flex-1 overflow-auto space-y-2 min-h-0">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">Panier vide</div>
              ) : (
                cart.map((item) => (
                  <div key={`${item.type}-${item.id}`} className={cn("flex flex-col gap-1 p-2 rounded-lg bg-muted/50", item.type === "repair" && "border-l-2 border-primary")}>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                        {item.type === "repair" && <span className="text-[10px] text-primary">Réparation</span>}
                      </div>
                      <div className="flex items-center gap-1">
                        {item.type === "product" && (
                          <>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}><Minus className="h-3 w-3" /></Button>
                            <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                            <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.maxStock}><Plus className="h-3 w-3" /></Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.type === "product" ? (
                        <Input type="number" step="0.001" min="0" value={item.price} onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)} className="w-24 h-7 text-xs text-right font-mono-numbers" />
                      ) : (
                        <span className="text-xs font-mono-numbers">{format(item.price)}</span>
                      )}
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      <span className="text-xs font-medium font-mono-numbers ml-auto">{format(item.price * item.quantity)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 pt-3 space-y-2">
              <Separator />
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Sous-total</span><span className="font-mono-numbers">{format(subtotal)}</span></div>
              {settings.tax_enabled && <div className="flex justify-between text-sm"><span className="text-muted-foreground">TVA ({settings.tax_rate}%)</span><span className="font-mono-numbers">{format(tax)}</span></div>}
              <Separator />
              <div className="flex justify-between text-lg font-bold"><span>Total</span><span className="font-mono-numbers text-primary">{format(total)}</span></div>
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="h-12" disabled={cart.length === 0 || createSale.isPending} onClick={() => handlePayment("card")}>
                  {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CreditCard className="h-4 w-4 mr-2" />Carte</>}
                </Button>
                <Button className="h-12 bg-gradient-success hover:opacity-90" disabled={cart.length === 0 || createSale.isPending} onClick={() => handlePayment("cash")}>
                  {createSale.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Banknote className="h-4 w-4 mr-2" />Espèces</>}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <CustomerDialog
        open={customerDialogOpen}
        onOpenChange={setCustomerDialogOpen}
        onSubmit={async (data) => {
          const newCustomer = await createCustomer.mutateAsync({ name: data.name, phone: data.phone, email: data.email, address: data.address, notes: data.notes });
          setSelectedCustomerId(newCustomer.id);
          setCustomerDialogOpen(false);
        }}
        isLoading={createCustomer.isPending}
      />
    </div>
  );
}
