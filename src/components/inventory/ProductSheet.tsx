import { useEffect, useMemo, useState, useRef, forwardRef, useImperativeHandle } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Combobox } from "@/components/ui/combobox";
import { Badge } from "@/components/ui/badge";
import { Loader2, X, Wand2, Printer, Zap } from "lucide-react";
import { useCategories } from "@/hooks/useCategories";
import { LabelPrintDialog } from "./LabelPrintDialog";

const productSchema = z.object({
  name: z.string().min(1, "Le nom est requis"),
  barcodes: z.array(z.string()).default([]),
  description: z.string().optional(),
  category_id: z.string().optional(),
  cost_price: z.coerce.number().min(0),
  sell_price: z.coerce.number().min(0),
  quantity: z.coerce.number().int().min(0),
  min_quantity: z.coerce.number().int().min(0),
});

export type ProductSheetFormValues = z.infer<typeof productSchema>;

interface ProductSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: {
    id: string;
    name: string;
    sku?: string | null;
    barcodes?: string[];
    description?: string | null;
    category_id?: string | null;
    cost_price: number;
    sell_price: number;
    quantity: number;
    min_quantity: number;
  } | null;
  prefillBarcode?: string;
  onSubmit: (data: ProductSheetFormValues) => Promise<void>;
  isLoading?: boolean;
  onSaved?: () => void;
}

export interface ProductSheetRef {
  addBarcode: (code: string) => void;
}

export const ProductSheet = forwardRef<ProductSheetRef, ProductSheetProps>(
  ({ open, onOpenChange, product, prefillBarcode, onSubmit, isLoading, onSaved }, ref) => {
    const isEditing = !!product;
    const { data: productCategories = [] } = useCategories("product");
    const categoryOptions = useMemo(
      () => productCategories.map((c) => ({ value: c.id, label: c.name })),
      [productCategories]
    );

    const [barcodeInput, setBarcodeInput] = useState("");
    const [printDialogOpen, setPrintDialogOpen] = useState(false);
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    const form = useForm<ProductSheetFormValues>({
      resolver: zodResolver(productSchema),
      defaultValues: {
        name: "",
        barcodes: [],
        description: "",
        category_id: "",
        cost_price: 0,
        sell_price: 0,
        quantity: 0,
        min_quantity: 5,
      },
    });

    const barcodes = useWatch({ control: form.control, name: "barcodes" }) || [];
    const costPrice = useWatch({ control: form.control, name: "cost_price" }) || 0;
    const sellPrice = useWatch({ control: form.control, name: "sell_price" }) || 0;
    const margin = sellPrice > 0 ? ((sellPrice - costPrice) / sellPrice) * 100 : 0;
    const productName = useWatch({ control: form.control, name: "name" }) || "";

    useImperativeHandle(ref, () => ({
      addBarcode: (code: string) => {
        const current = form.getValues("barcodes") || [];
        if (!current.includes(code)) {
          form.setValue("barcodes", [...current, code]);
        }
      },
    }));

    useEffect(() => {
      if (open) {
        if (product) {
          const existingBarcodes = product.barcodes && product.barcodes.length > 0
            ? product.barcodes
            : product.sku ? [product.sku] : [];
          form.reset({
            name: product.name,
            barcodes: existingBarcodes,
            description: product.description || "",
            category_id: product.category_id || "",
            cost_price: Number(product.cost_price) || 0,
            sell_price: Number(product.sell_price) || 0,
            quantity: product.quantity || 0,
            min_quantity: product.min_quantity || 5,
          });
        } else {
          form.reset({
            name: "",
            barcodes: prefillBarcode ? [prefillBarcode] : [],
            description: "",
            category_id: "",
            cost_price: 0,
            sell_price: 0,
            quantity: 0,
            min_quantity: 5,
          });
        }
      }
    }, [product, open, prefillBarcode, form]);

    const addBarcode = (code: string) => {
      const trimmed = code.trim();
      if (!trimmed) return;
      const current = form.getValues("barcodes") || [];
      if (!current.includes(trimmed)) {
        form.setValue("barcodes", [...current, trimmed]);
      }
      setBarcodeInput("");
      barcodeInputRef.current?.focus();
    };

    const removeBarcode = (code: string) => {
      const current = form.getValues("barcodes") || [];
      form.setValue("barcodes", current.filter((b) => b !== code));
    };

    const generateSku = () => {
      const ts = Date.now().toString().slice(-6);
      const sku = `SHOP-${ts}`;
      addBarcode(sku);
    };

    const handleSubmit = async (data: ProductSheetFormValues) => {
      await onSubmit(data);
      form.reset();
      onSaved?.();
    };

    return (
      <>
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent className="w-full sm:max-w-lg overflow-y-auto" side="right">
            <SheetHeader className="pb-4 border-b">
              <SheetTitle className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {isEditing ? "Modifier le produit" : "Nouveau produit"}
              </SheetTitle>
            </SheetHeader>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nom du produit *</FormLabel>
                      <FormControl>
                        <Input placeholder="Écran iPhone 13" autoFocus {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Multi-barcode Tag Input */}
                <FormItem>
                  <FormLabel>Codes-barres / SKU</FormLabel>
                  <div className="space-y-2">
                    {barcodes.length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {barcodes.map((code) => (
                          <Badge
                            key={code}
                            variant="secondary"
                            className="font-mono text-xs gap-1 pl-2 pr-1"
                          >
                            {code}
                            <button
                              type="button"
                              onClick={() => removeBarcode(code)}
                              className="ml-0.5 hover:text-destructive transition-colors"
                            >
                              <X className="h-3 w-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        ref={barcodeInputRef}
                        placeholder="Scanner ou saisir un code..."
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            addBarcode(barcodeInput);
                          }
                        }}
                        className="font-mono text-sm flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={generateSku}
                        title="Générer SKU Interne"
                        className="shrink-0 gap-1"
                      >
                        <Wand2 className="h-3.5 w-3.5" />
                        Générer
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Appuyez sur <kbd className="px-1 py-0.5 bg-muted rounded text-xs">Entrée</kbd> pour ajouter chaque code
                    </p>
                  </div>
                </FormItem>

                {/* Category */}
                {categoryOptions.length > 0 && (
                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Catégorie</FormLabel>
                        <FormControl>
                          <Combobox
                            options={categoryOptions}
                            value={field.value || ""}
                            onValueChange={field.onChange}
                            placeholder="Sélectionner catégorie"
                            searchPlaceholder="Rechercher catégorie..."
                            emptyText="Aucune catégorie"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Description */}
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Description</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Description du produit..." rows={2} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Prices + Reactive Margin */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix d'achat (TND)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" min="0" placeholder="0.000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="sell_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Prix de vente (TND)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.001" min="0" placeholder="0.000" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Reactive Margin */}
                <div className={`p-3 rounded-lg flex justify-between items-center transition-colors ${
                  margin > 0 ? "bg-success/10 border border-success/20" : "bg-muted/50"
                }`}>
                  <span className="text-sm font-medium text-muted-foreground">Marge sur vente :</span>
                  <span className={`text-xl font-bold tabular-nums ${margin > 0 ? "text-success" : "text-destructive"}`}>
                    {margin > 0 ? "+" : ""}{margin.toFixed(1)}%
                  </span>
                </div>

                {/* Stock */}
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Quantité en stock</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="0" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="min_quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Seuil d'alerte</FormLabel>
                        <FormControl>
                          <Input type="number" min="0" placeholder="5" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <SheetFooter className="flex-col gap-2 pt-2">
                  {barcodes.length > 0 && productName && (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full gap-2"
                      onClick={() => setPrintDialogOpen(true)}
                    >
                      <Printer className="h-4 w-4" />
                      Imprimer l'étiquette
                    </Button>
                  )}
                  <div className="flex gap-2 w-full">
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => onOpenChange(false)}
                    >
                      Annuler
                    </Button>
                    <Button type="submit" disabled={isLoading} className="flex-1">
                      {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {isEditing ? "Enregistrer" : "Créer le produit"}
                    </Button>
                  </div>
                </SheetFooter>
              </form>
            </Form>
          </SheetContent>
        </Sheet>

        <LabelPrintDialog
          open={printDialogOpen}
          onOpenChange={setPrintDialogOpen}
          productName={productName}
          barcode={barcodes[0] || ""}
          price={sellPrice}
        />
      </>
    );
  }
);

ProductSheet.displayName = "ProductSheet";
