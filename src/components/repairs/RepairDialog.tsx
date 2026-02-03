import { useEffect, useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, UserPlus, X } from "lucide-react";
import { useCustomers, useCreateCustomer } from "@/hooks/useCustomers";
import { Combobox } from "@/components/ui/combobox";
import { PHONE_BRANDS, PHONE_MODELS, getBrandLabel, BRANDS_WITH_API } from "@/data/phoneModels";
import { useAppleDevices } from "@/hooks/useAppleDevices";

const repairSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
  device_brand: z.string().optional(),
  device_model: z.string().min(1, "Le modèle est requis"),
  imei: z.string().optional(),
  problem_description: z.string().min(1, "La description du problème est requise"),
  diagnosis: z.string().optional(),
  labor_cost: z.coerce.number().min(0, "Le coût doit être positif"),
  parts_cost: z.coerce.number().min(0, "Le coût doit être positif"),
  amount_paid: z.coerce.number().min(0, "Le montant doit être positif"),
  notes: z.string().optional(),
});

type RepairFormValues = z.infer<typeof repairSchema>;

interface RepairDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  repair?: {
    id: string;
    customer_id?: string | null;
    device_model: string;
    imei?: string | null;
    problem_description: string;
    diagnosis?: string | null;
    labor_cost: number;
    parts_cost: number;
    amount_paid: number;
    notes?: string | null;
  } | null;
  onSubmit: (data: RepairFormValues) => Promise<void>;
  isLoading?: boolean;
}

// Helper function to parse device_model into brand and model
function parseDeviceModel(deviceModel: string): { brand: string; model: string } {
  // Try to find a matching brand at the start of the string
  for (const brand of PHONE_BRANDS) {
    if (deviceModel.toLowerCase().startsWith(brand.label.toLowerCase() + " ")) {
      return {
        brand: brand.value,
        model: deviceModel.substring(brand.label.length + 1),
      };
    }
  }
  // If no brand found, return empty brand and full string as model
  return { brand: "", model: deviceModel };
}

export function RepairDialog({
  open,
  onOpenChange,
  repair,
  onSubmit,
  isLoading,
}: RepairDialogProps) {
  const isEditing = !!repair;
  const { data: customers = [] } = useCustomers();
  const createCustomer = useCreateCustomer();
  const { data: appleDevices = [], isLoading: isLoadingApple } = useAppleDevices();
  
  const [showQuickCustomer, setShowQuickCustomer] = useState(false);
  const [quickCustomerName, setQuickCustomerName] = useState("");
  const [quickCustomerPhone, setQuickCustomerPhone] = useState("");
  const [creatingCustomer, setCreatingCustomer] = useState(false);
  
  // State for brand/model selection
  const [selectedBrand, setSelectedBrand] = useState("");

  const handleQuickCustomerCreate = async () => {
    if (!quickCustomerName.trim()) return;
    
    setCreatingCustomer(true);
    try {
      const newCustomer = await createCustomer.mutateAsync({
        name: quickCustomerName.trim(),
        phone: quickCustomerPhone.trim() || null,
      });
      
      if (newCustomer?.id) {
        form.setValue("customer_id", newCustomer.id);
      }
      
      setQuickCustomerName("");
      setQuickCustomerPhone("");
      setShowQuickCustomer(false);
    } finally {
      setCreatingCustomer(false);
    }
  };

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      customer_id: "",
      customer_name: "",
      customer_phone: "",
      device_brand: "",
      device_model: "",
      imei: "",
      problem_description: "",
      diagnosis: "",
      labor_cost: 0,
      parts_cost: 0,
      amount_paid: 0,
      notes: "",
    },
  });

  // Get available models based on selected brand
  const availableModels = useMemo(() => {
    if (!selectedBrand) return [];
    
    // Use API data for brands with external API
    if (BRANDS_WITH_API.includes(selectedBrand as typeof BRANDS_WITH_API[number])) {
      if (selectedBrand === "apple") {
        return appleDevices.map(model => ({ value: model, label: model }));
      }
    }
    
    // Use static list for other brands
    const models = PHONE_MODELS[selectedBrand] || [];
    return models.map(model => ({ value: model, label: model }));
  }, [selectedBrand, appleDevices]);

  // Brand options for combobox
  const brandOptions = useMemo(() => 
    PHONE_BRANDS.map(brand => ({ value: brand.value, label: brand.label })),
    []
  );

  useEffect(() => {
    if (repair) {
      const { brand, model } = parseDeviceModel(repair.device_model);
      setSelectedBrand(brand);
      form.reset({
        customer_id: repair.customer_id || "",
        device_brand: brand,
        device_model: model,
        imei: repair.imei || "",
        problem_description: repair.problem_description,
        diagnosis: repair.diagnosis || "",
        labor_cost: Number(repair.labor_cost) || 0,
        parts_cost: Number(repair.parts_cost) || 0,
        amount_paid: Number(repair.amount_paid) || 0,
        notes: repair.notes || "",
      });
    } else {
      setSelectedBrand("");
      form.reset({
        customer_id: "",
        customer_name: "",
        customer_phone: "",
        device_brand: "",
        device_model: "",
        imei: "",
        problem_description: "",
        diagnosis: "",
        labor_cost: 0,
        parts_cost: 0,
        amount_paid: 0,
        notes: "",
      });
    }
  }, [repair, form]);

  const handleBrandChange = (brandValue: string) => {
    setSelectedBrand(brandValue);
    form.setValue("device_brand", brandValue);
    // Reset model when brand changes
    form.setValue("device_model", "");
  };

  const handleSubmit = async (data: RepairFormValues) => {
    // Combine brand and model for storage
    const brandLabel = data.device_brand ? getBrandLabel(data.device_brand) : "";
    const fullDeviceModel = brandLabel 
      ? `${brandLabel} ${data.device_model}`.trim()
      : data.device_model;
    
    await onSubmit({
      ...data,
      device_model: fullDeviceModel,
    });
    form.reset();
    setSelectedBrand("");
  };

  const laborCostWatch = form.watch("labor_cost");
  const partsCostWatch = form.watch("parts_cost");
  const laborCost = Number(laborCostWatch) || 0;
  const partsCost = Number(partsCostWatch) || 0;
  const totalCost = laborCost + partsCost;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Modifier la réparation" : "Nouvelle réparation"}
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            {/* Customer Selection */}
            {!showQuickCustomer ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <FormLabel>Client</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-primary hover:text-primary"
                    onClick={() => setShowQuickCustomer(true)}
                  >
                    <UserPlus className="h-3.5 w-3.5 mr-1" />
                    Ajouter
                  </Button>
                </div>
                <FormField
                  control={form.control}
                  name="customer_id"
                  render={({ field }) => (
                    <FormItem>
                      <Select 
                        onValueChange={(value) => field.onChange(value === "__none__" ? "" : value)} 
                        value={field.value || "__none__"}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Sélectionner un client (optionnel)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">Client anonyme</SelectItem>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name} {customer.phone ? `- ${customer.phone}` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            ) : (
              <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Nouveau client rapide</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 w-6 p-0"
                    onClick={() => {
                      setShowQuickCustomer(false);
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Nom *</label>
                    <Input
                      placeholder="Nom du client"
                      value={quickCustomerName}
                      onChange={(e) => setQuickCustomerName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-muted-foreground">Téléphone</label>
                    <Input
                      placeholder="Numéro (optionnel)"
                      value={quickCustomerPhone}
                      onChange={(e) => setQuickCustomerPhone(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowQuickCustomer(false);
                      setQuickCustomerName("");
                      setQuickCustomerPhone("");
                    }}
                  >
                    Annuler
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleQuickCustomerCreate}
                    disabled={!quickCustomerName.trim() || creatingCustomer}
                  >
                    {creatingCustomer && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                    Créer et utiliser
                  </Button>
                </div>
              </div>
            )}

            {/* Device Info - Brand and Model with autocomplete */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="device_brand"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Marque</FormLabel>
                    <FormControl>
                      <Combobox
                        options={brandOptions}
                        value={field.value || ""}
                        onValueChange={handleBrandChange}
                        placeholder="Sélectionner marque"
                        searchPlaceholder="Rechercher marque..."
                        emptyText="Aucune marque trouvée"
                        allowCustomValue
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="device_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle *</FormLabel>
                    <FormControl>
                      {selectedBrand && (availableModels.length > 0 || isLoadingApple) ? (
                        <Combobox
                          options={availableModels}
                          value={field.value || ""}
                          onValueChange={field.onChange}
                          placeholder={isLoadingApple ? "Chargement..." : "Sélectionner modèle"}
                          searchPlaceholder="Rechercher modèle..."
                          emptyText="Aucun modèle trouvé"
                          allowCustomValue
                          disabled={isLoadingApple}
                        />
                      ) : (
                        <Input 
                          placeholder="Ex: iPhone 15 Pro" 
                          {...field} 
                        />
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* IMEI */}
            <FormField
              control={form.control}
              name="imei"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>IMEI</FormLabel>
                  <FormControl>
                    <Input placeholder="IMEI (optionnel)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Problem Description */}
            <FormField
              control={form.control}
              name="problem_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description du problème *</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Décrivez le problème signalé par le client..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Diagnosis */}
            <FormField
              control={form.control}
              name="diagnosis"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Diagnostic</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Votre diagnostic technique..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Costs */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="labor_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Main d'œuvre</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parts_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Pièces</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="amount_paid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Avance payée</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.001"
                        min="0"
                        placeholder="0.000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Total Display */}
            <div className="bg-muted/50 p-3 rounded-lg flex justify-between items-center">
              <span className="text-sm font-medium">Total estimé:</span>
              <span className="text-lg font-bold text-primary">
                {totalCost.toFixed(3)} TND
              </span>
            </div>

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes internes</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Notes internes (non visibles par le client)..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Annuler
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? "Enregistrer" : "Créer la réparation"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
