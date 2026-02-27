import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUpdateSupplierBalance, Supplier } from "@/hooks/useSuppliers";
import { useCurrency } from "@/hooks/useCurrency";
import { supabase } from "@/integrations/supabase/client";
import { Upload, Loader2 } from "lucide-react";

interface SupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier | null;
}

export function SupplierPaymentDialog({ open, onOpenChange, supplier }: SupplierPaymentDialogProps) {
  const updateBalance = useUpdateSupplierBalance();
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { format } = useCurrency();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null;
    setProofFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplier || !amount) return;
    const paymentAmount = parseFloat(amount);
    if (isNaN(paymentAmount) || paymentAmount <= 0) return;

    let proofUrl: string | undefined;

    if (proofFile) {
      setUploading(true);
      try {
        const ext = proofFile.name.split(".").pop();
        const fileName = `${supplier.id}/${Date.now()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("supplier-proofs")
          .upload(fileName, proofFile);

        if (!uploadError) {
          const { data: urlData } = supabase.storage
            .from("supplier-proofs")
            .getPublicUrl(fileName);
          proofUrl = urlData.publicUrl;
        }
      } catch {
        // proceed without proof if upload fails
      } finally {
        setUploading(false);
      }
    }

    try {
      await updateBalance.mutateAsync({
        id: supplier.id,
        amount: paymentAmount,
        proofUrl,
        description: description || undefined,
      });
      setAmount("");
      setDescription("");
      setProofFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onOpenChange(false);
    } catch (error) {
      console.error("Error recording payment:", error);
    }
  };

  const currentDebt = supplier ? Math.abs(Math.min(0, Number(supplier.balance))) : 0;
  const isPending = updateBalance.isPending || uploading;

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
                Dette actuelle: <span className="text-destructive font-medium">{format(currentDebt)}</span>
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Montant du paiement</Label>
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

            <div className="space-y-2">
              <Label htmlFor="description">Description (optionnel)</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ex: Virement bancaire, espèces..."
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proof">Preuve de paiement (optionnel)</Label>
              <div className="flex items-center gap-2">
                <Input
                  ref={fileInputRef}
                  id="proof"
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileChange}
                  className="text-sm"
                />
              </div>
              {proofFile && (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Upload className="h-3 w-3" />
                  {proofFile.name}
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
