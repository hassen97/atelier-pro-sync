import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertTriangle } from "lucide-react";

interface ResetDataDialogProps {
  onConfirm: () => Promise<boolean>;
  isResetting: boolean;
}

export function ResetDataDialog({ onConfirm, isResetting }: ResetDataDialogProps) {
  const [confirmText, setConfirmText] = useState("");
  const [open, setOpen] = useState(false);

  const isConfirmValid = confirmText === "SUPPRIMER";

  const handleConfirm = async () => {
    if (!isConfirmValid) return;
    const success = await onConfirm();
    if (success) {
      setOpen(false);
      setConfirmText("");
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-destructive border-destructive/30 hover:bg-destructive/10"
        >
          Réinitialiser les données
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            Réinitialiser toutes les données ?
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              <strong>Cette action est irréversible !</strong> Toutes vos données seront 
              définitivement supprimées :
            </p>
            <ul className="list-disc list-inside space-y-1 text-sm">
              <li>Tous les produits et catégories</li>
              <li>Tous les clients et fournisseurs</li>
              <li>Toutes les réparations et pièces utilisées</li>
              <li>Toutes les ventes et articles vendus</li>
              <li>Toutes les factures et dépenses</li>
            </ul>
            <div className="pt-4">
              <Label htmlFor="confirm-text" className="text-foreground font-medium">
                Tapez <span className="font-mono text-destructive">SUPPRIMER</span> pour confirmer :
              </Label>
              <Input
                id="confirm-text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="SUPPRIMER"
                className="mt-2"
                autoComplete="off"
              />
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setConfirmText("")}>
            Annuler
          </AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!isConfirmValid || isResetting}
          >
            {isResetting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isResetting ? "Suppression..." : "Supprimer tout"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
