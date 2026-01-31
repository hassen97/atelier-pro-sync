import { useEffect } from "react";
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
import { Loader2 } from "lucide-react";
import { useCustomers } from "@/hooks/useCustomers";

const repairSchema = z.object({
  customer_id: z.string().optional(),
  customer_name: z.string().optional(),
  customer_phone: z.string().optional(),
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

export function RepairDialog({
  open,
  onOpenChange,
  repair,
  onSubmit,
  isLoading,
}: RepairDialogProps) {
  const isEditing = !!repair;
  const { data: customers = [] } = useCustomers();

  const form = useForm<RepairFormValues>({
    resolver: zodResolver(repairSchema),
    defaultValues: {
      customer_id: "",
      customer_name: "",
      customer_phone: "",
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

  useEffect(() => {
    if (repair) {
      form.reset({
        customer_id: repair.customer_id || "",
        device_model: repair.device_model,
        imei: repair.imei || "",
        problem_description: repair.problem_description,
        diagnosis: repair.diagnosis || "",
        labor_cost: Number(repair.labor_cost) || 0,
        parts_cost: Number(repair.parts_cost) || 0,
        amount_paid: Number(repair.amount_paid) || 0,
        notes: repair.notes || "",
      });
    } else {
      form.reset({
        customer_id: "",
        customer_name: "",
        customer_phone: "",
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

  const handleSubmit = async (data: RepairFormValues) => {
    await onSubmit(data);
    form.reset();
  };

  const laborCost = form.watch("labor_cost") || 0;
  const partsCost = form.watch("parts_cost") || 0;
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
            <FormField
              control={form.control}
              name="customer_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Client</FormLabel>
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

            {/* Device Info */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="device_model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Modèle appareil *</FormLabel>
                    <FormControl>
                      <Input placeholder="iPhone 13 Pro" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

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
