import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserCheck, Wrench } from "lucide-react";

interface StatusAssignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (data: { received_by: string; repaired_by: string }) => void;
  isLoading?: boolean;
}

export function StatusAssignDialog({ open, onOpenChange, onConfirm, isLoading }: StatusAssignDialogProps) {
  const [receivedBy, setReceivedBy] = useState("");
  const [repairedBy, setRepairedBy] = useState("");

  const handleConfirm = () => {
    onConfirm({ received_by: receivedBy.trim(), repaired_by: repairedBy.trim() });
    setReceivedBy("");
    setRepairedBy("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Passer en cours</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <UserCheck className="h-4 w-4 text-muted-foreground" />
              Reçu par
            </Label>
            <Input
              placeholder="Nom de la personne qui a reçu l'appareil"
              value={receivedBy}
              onChange={(e) => setReceivedBy(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label className="flex items-center gap-2 text-sm">
              <Wrench className="h-4 w-4 text-muted-foreground" />
              Réparé par (technicien)
            </Label>
            <Input
              placeholder="Nom du technicien assigné"
              value={repairedBy}
              onChange={(e) => setRepairedBy(e.target.value)}
            />
          </div>
          <Button onClick={handleConfirm} className="w-full" disabled={isLoading}>
            {isLoading ? "Mise à jour..." : "Confirmer"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
