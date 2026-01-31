import { useState } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, Banknote, Receipt, User } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock products
const products = [
  { id: "1", name: "Écran iPhone 14 Pro", category: "Écrans", price: 280.000, stock: 5 },
  { id: "2", name: "Écran iPhone 13", category: "Écrans", price: 180.000, stock: 8 },
  { id: "3", name: "Batterie iPhone 12", category: "Batteries", price: 45.000, stock: 15 },
  { id: "4", name: "Batterie Samsung S23", category: "Batteries", price: 55.000, stock: 10 },
  { id: "5", name: "Protection écran", category: "Accessoires", price: 15.000, stock: 50 },
  { id: "6", name: "Coque silicone", category: "Accessoires", price: 12.000, stock: 40 },
  { id: "7", name: "Chargeur rapide 20W", category: "Accessoires", price: 25.000, stock: 25 },
  { id: "8", name: "Câble USB-C", category: "Accessoires", price: 8.000, stock: 60 },
];

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function POS() {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const categories = [...new Set(products.map((p) => p.category))];
  
  const filteredProducts = products.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = !selectedCategory || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: typeof products[0]) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { id: product.id, name: product.name, price: product.price, quantity: 1 }];
    });
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) =>
          item.id === id
            ? { ...item, quantity: Math.max(0, item.quantity + delta) }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.19; // TVA 19%
  const total = subtotal + tax;

  const clearCart = () => setCart([]);

  return (
    <div className="h-[calc(100vh-8rem)] animate-fade-in">
      <PageHeader
        title="Point de Vente"
        description="Encaissement et ventes"
      />

      <div className="grid gap-6 lg:grid-cols-3 h-[calc(100%-5rem)]">
        {/* Products Section */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {/* Search & Categories */}
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

          {/* Products Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => (
                <Card
                  key={product.id}
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-soft hover:border-primary/30",
                    product.stock < 3 && "border-warning/50"
                  )}
                  onClick={() => addToCart(product)}
                >
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-medium text-sm leading-tight">{product.name}</h3>
                      {product.stock < 3 && (
                        <Badge variant="destructive" className="text-[10px] shrink-0 ml-2">
                          {product.stock}
                        </Badge>
                      )}
                    </div>
                    <div className="flex justify-between items-center">
                      <Badge variant="secondary" className="text-xs">
                        {product.category}
                      </Badge>
                      <span className="font-bold font-mono-numbers text-primary">
                        {formatCurrency(product.price)}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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
            {/* Customer Selection */}
            <Button variant="outline" size="sm" className="w-full mb-3 justify-start">
              <User className="h-4 w-4 mr-2" />
              Sélectionner client (optionnel)
            </Button>

            {/* Cart Items */}
            <div className="flex-1 overflow-auto space-y-2 min-h-0">
              {cart.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  Panier vide
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-muted/50"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.name}</p>
                      <p className="text-xs text-muted-foreground font-mono-numbers">
                        {formatCurrency(item.price)} × {item.quantity}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center text-sm font-medium">
                        {item.quantity}
                      </span>
                      <Button
                        variant="outline"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => removeFromCart(item.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Totals */}
            <div className="shrink-0 pt-3 space-y-2">
              <Separator />
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Sous-total</span>
                <span className="font-mono-numbers">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">TVA (19%)</span>
                <span className="font-mono-numbers">{formatCurrency(tax)}</span>
              </div>
              <Separator />
              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span className="font-mono-numbers text-primary">{formatCurrency(total)}</span>
              </div>

              {/* Payment Buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <Button variant="outline" className="h-12" disabled={cart.length === 0}>
                  <CreditCard className="h-4 w-4 mr-2" />
                  Carte
                </Button>
                <Button className="h-12 bg-gradient-success hover:opacity-90" disabled={cart.length === 0}>
                  <Banknote className="h-4 w-4 mr-2" />
                  Espèces
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
