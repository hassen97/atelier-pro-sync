import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, User, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useCurrency } from "@/hooks/useCurrency";
import { useProducts } from "@/hooks/useProducts";
import { useCreateSale } from "@/hooks/useSales";
import { useCustomers } from "@/hooks/useCustomers";
import { useShopSettingsContext } from "@/contexts/ShopSettingsContext";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

interface CartItem {
  id: string;
  name: string;
  price: number;
  originalPrice: number;
  quantity: number;
  maxStock: number;
}

export default function POS() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  
  const { data: products = [], isLoading: productsLoading } = useProducts();
  const { data: customers = [], isLoading: customersLoading } = useCustomers();
  const createSale = useCreateSale();
  const { settings } = useShopSettingsContext();
  const { format } = useCurrency();

  // Extract unique categories from products
  const categories = [...new Set(products.map((p: any) => p.category?.name).filter(Boolean))];
  
  const filteredProducts = products.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: any) => {
    if (product.quantity <= 0) return;
    
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.quantity) {
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { 
        id: product.id, 
        name: product.name, 
        price: product.sell_price,
        originalPrice: product.sell_price,
        quantity: 1,
        maxStock: product.quantity
      }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id !== id) return item;
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
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, price: newPrice } : item
      )
    );
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = settings.tax_enabled ? settings.tax_rate / 100 : 0;
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  const clearCart = () => setCart([]);

  const handlePayment = async (paymentMethod: string) => {
    if (cart.length === 0) return;

    await createSale.mutateAsync({
      customer_id: selectedCustomerId || null,
      payment_method: paymentMethod,
      total_amount: total,
      amount_paid: total,
      items: cart.map((item) => ({
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.price,
      })),
    });

    clearCart();
    setSelectedCustomerId("");
  };

  if (productsLoading) {
    return (
      <div className="h-[calc(100vh-8rem)] animate-fade-in">
        <PageHeader title="Point de Vente" description="Encaissement et ventes" />
        <div className="grid gap-6 lg:grid-cols-3 h-[calc(100%-5rem)]">
          <div className="lg:col-span-2">
            <Skeleton className="h-10 w-full mb-4" />
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-24" />
              ))}
            </div>
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-8rem)] animate-fade-in">
      <PageHeader
        title="Point de Vente"
        description="Encaissement et ventes"
      />

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100%-5rem)]">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          <div className="space-y-3 mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher un produit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(null)}
              >
                Tout
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat}
                  variant={selectedCategory === cat ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(cat)}
                >
                  {cat}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {filteredProducts.length === 0 ? (
              <div className="flex items-center justify-center h-32 text-muted-foreground">
                {products.length === 0 
                  ? "Aucun produit dans l'inventaire. Ajoutez des produits dans la page Stock."
                  : "Aucun produit trouvé pour cette recherche."}
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {filteredProducts.map((product: any) => (
                  <Card
                    key={product.id}
                    className={cn(
                      "cursor-pointer transition-all hover:shadow-soft hover:border-primary/30",
                      product.quantity <= product.min_quantity && "border-warning/50",
                      product.quantity <= 0 && "opacity-50 cursor-not-allowed"
                    )}
                    onClick={() => addToCart(product)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                        <Badge 
                          variant={product.quantity <= 0 ? "destructive" : product.quantity <= product.min_quantity ? "secondary" : "outline"} 
                          className="text-[10px] shrink-0 ml-2"
                        >
                          {product.quantity}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center">
                        <Badge variant="secondary" className="text-xs">
                          {product.category?.name || "Sans catégorie"}
                        </Badge>
                        <span className="font-bold font-mono-numbers text-primary">
                          {format(product.sell_price)}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cart Section */}
        <Card className="flex flex-col min-h-0">
          <CardHeader className="pb-3 shrink-0">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Receipt className="h-4 w-4" />
                Panier
              </CardTitle>
              {cart.length > 0 && (
                <Button variant="ghost" size="sm" onClick={clearCart} className="text-destructive hover:text-destructive">
                  Vider
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col min-h-0 p-4 pt-0">
            <Select
              value={selectedCustomerId || "__none__"}
              onValueChange={(value) => setSelectedCustomerId(value === "__none__" ? "" : value)}
            >
              <SelectTrigger className="w-full mb-3">
                <User className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Sélectionner client (optionnel)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Client anonyme</SelectItem>
                {customers.map((customer: any) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex-1 overflow-auto space-y-2 min-h-0">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Panier vide
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex flex-col gap-1 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{item.name}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, -1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="w-6 text-center text-sm font-medium">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => updateQuantity(item.id, 1)} disabled={item.quantity >= item.maxStock}>
                          <Plus className="h-3 w-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => removeFromCart(item.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        value={item.price}
                        onChange={(e) => updateItemPrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-24 h-7 text-xs text-right font-mono-numbers"
                      />
                      <span className="text-xs text-muted-foreground">× {item.quantity}</span>
                      <span className="text-xs font-medium font-mono-numbers ml-auto">
                        {format(item.price * item.quantity)}
                      </span>
                      {item.price < item.originalPrice && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          -{((1 - item.price / item.originalPrice) * 100).toFixed(0)}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="shrink-0 pt-3 space-y-2">
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-mono-numbers">{format(subtotal)}</span>
              </div>
              {settings.tax_enabled && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">TVA ({settings.tax_rate}%)</span>
                  <span className="font-mono-numbers">{format(tax)}</span>
                </div>
              )}
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono-numbers text-primary">{format(total)}</span>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button 
                  variant="outline" 
                  className="h-12" 
                  disabled={cart.length === 0 || createSale.isPending}
                  onClick={() => handlePayment("card")}
                >
                  {createSale.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="h-4 w-4 mr-2" />
                      Carte
                    </>
                  )}
                </Button>
                <Button 
                  className="h-12 bg-gradient-success hover:opacity-90" 
                  disabled={cart.length === 0 || createSale.isPending}
                  onClick={() => handlePayment("cash")}
                >
                  {createSale.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Banknote className="h-4 w-4 mr-2" />
                      Espèces
                    </>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
