import { useState } from "react";
import { useAdminData, useDeleteOwner, useResetOwnerPassword, useLockOwner } from "@/hooks/useAdmin";
import { CreateOwnerDialog } from "./CreateOwnerDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, KeyRound, Lock, Unlock, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AdminShopsView() {
  const { data } = useAdminData();
  const deleteOwner = useDeleteOwner();
  const lockOwner = useLockOwner();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);

  const owners = data?.owners || [];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Gestion des boutiques</h2>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouveau propriétaire
        </Button>
      </div>

      <div className="space-y-2">
        {owners.map((owner) => (
          <div
            key={owner.user_id}
            className={cn(
              "admin-glass-card rounded-xl p-4 flex items-center gap-4 transition-all",
              owner.is_locked && "border-red-500/30 opacity-70"
            )}
          >
            <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
              <Store className="h-5 w-5 text-slate-400" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-white font-medium text-sm truncate">{owner.full_name || owner.username}</span>
                {owner.is_locked && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                    Verrouillé
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                <span>@{owner.username}</span>
                <span>•</span>
                <span>{owner.shop_name}</span>
                <span>•</span>
                <span>{owner.team_count} membres</span>
                <span>•</span>
                <span>{owner.repair_count} réparations</span>
              </div>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Inscrit {format(new Date(owner.created_at), "dd MMM yyyy", { locale: fr })}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-slate-400 hover:text-[#00D4FF] hover:bg-[#00D4FF]/10"
                onClick={() => setResetTarget({ userId: owner.user_id, name: owner.full_name || owner.username || "" })}
                title="Réinitialiser mot de passe"
              >
                <KeyRound className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                  "h-8 w-8",
                  owner.is_locked
                    ? "text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
                    : "text-amber-400 hover:text-amber-300 hover:bg-amber-500/10"
                )}
                onClick={() => lockOwner.mutate({ userId: owner.user_id, lock: !owner.is_locked })}
                title={owner.is_locked ? "Déverrouiller" : "Verrouiller"}
              >
                {owner.is_locked ? <Unlock className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                onClick={() => {
                  if (confirm(`Supprimer ${owner.full_name || owner.username} ?`)) {
                    deleteOwner.mutate(owner.user_id);
                  }
                }}
                title="Supprimer"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} />
      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={() => setResetTarget(null)}
          userId={resetTarget.userId}
          userName={resetTarget.name}
        />
      )}
    </div>
  );
}
