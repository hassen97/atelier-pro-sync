import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSupplierBalance, Supplier } from "@/hooks/useSuppliers";
import { formatCurrency } from "@/lib/currency";

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierPaymentDialog({ open, onOpenChange, supplier }: SupplierPaymentDialogProps) {
  const updateBalance = useUpdateSupplierBalance();
  const [amount, setAmount] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!supplier || !amount) return;

    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    try {
      // Payment reduces the debt (negative balance becomes less negative)
      await updateBalance.mutateAsync({
        id: supplier.id,
        amount: paymentAmount,
      });
      setAmount("");
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const currentDebt = supplier ? Math.abs(Math.min(0, Number(supplier.balance))) : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        {supplier && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="p-3 rounded-lg bg-muted">
              <p className="font-medium">{supplier.name}</p>
              <p className="text-sm text-muted-foreground">
                Dette actuelle: <span className="text-destructive font-medium">{formatCurrency(currentDebt)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant du paiement (DT)</Label>
              <Input
                id="amount"
                type="number"
                step="0.001"
                min="0"
                max={currentDebt}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.000"
                required
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={updateBalance.isPending}>
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
