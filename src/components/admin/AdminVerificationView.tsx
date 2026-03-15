import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, CheckCircle, Ban, Eye, Clock, ShieldCheck, Trash2, CheckCheck } from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

interface VerificationOwner {
  user_id: string;
  full_name: string | null;
  username: string | null;
  phone: string | null;
  created_at: string;
  verification_status: string;
  verification_deadline: string | null;
  verification_requested_at: string | null;
  verified_at: string | null;
  shop_name: string;
  city: string | null;
}

function useVerificationData() {
  return useQuery({
    queryKey: ["admin-verification-data"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-verification" },
      });
      if (error) throw error;
      return data as { owners: VerificationOwner[] };
    },
  });
}

function useVerifyOwner() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "verify" | "suspend" | "revert-to-pending" }) => {
      const actionMap = { verify: "verify-owner", suspend: "suspend-owner", "revert-to-pending": "revert-to-pending" };
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: actionMap[action], userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      const msgs = { verify: "Propriétaire vérifié !", suspend: "Propriétaire suspendu", "revert-to-pending": "Remis en attente de vérification" };
      toast.success(msgs[variables.action]);
    },
    onError: (err: any) => toast.error(err.message),
  });
}

function useBulkAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ action, userIds }: { action: "bulk-verify" | "bulk-suspend" | "bulk-delete" | "bulk-revert-to-pending"; userIds: string[] }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action, userIds },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      const count = data?.count || variables.userIds.length;
      const labels: Record<string, string> = {
        "bulk-verify": `${count} propriétaire(s) vérifié(s)`,
        "bulk-suspend": `${count} propriétaire(s) suspendu(s)`,
        "bulk-delete": `${count} propriétaire(s) supprimé(s)`,
        "bulk-revert-to-pending": `${count} propriétaire(s) remis en attente`,
      };
      toast.success(labels[variables.action]);
    },
    onError: (err: any) => toast.error(err.message),
  });
}

function useVerificationRequest(userId: string | null) {
  return useQuery({
    queryKey: ["verification-request", userId],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "get-verification-request", userId },
      });
      if (error) throw error;
      return data?.request || null;
    },
    enabled: !!userId,
  });
}

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  verified: { label: "Vérifié", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10", icon: CheckCircle },
  pending_verification: { label: "En attente", color: "border-amber-500/30 text-amber-400 bg-amber-500/10", icon: Clock },
  suspended: { label: "Suspendu", color: "border-red-500/30 text-red-400 bg-red-500/10", icon: Ban },
};

export function AdminVerificationView() {
  const { data, isLoading } = useVerificationData();
  const verifyOwner = useVerifyOwner();
  const bulkAction = useBulkAction();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: requestData } = useVerificationRequest(selectedUserId);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmAction, setConfirmAction] = useState<"bulk-verify" | "bulk-suspend" | "bulk-delete" | "bulk-revert-to-pending" | null>(null);

  const owners = data?.owners || [];

  const filtered = owners.filter((o) => {
    if (filter !== "all" && o.verification_status !== filter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        (o.full_name || "").toLowerCase().includes(q) ||
        (o.username || "").toLowerCase().includes(q) ||
        (o.shop_name || "").toLowerCase().includes(q) ||
        (o.phone || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: owners.length,
    pending_verification: owners.filter((o) => o.verification_status === "pending_verification").length,
    verified: owners.filter((o) => o.verification_status === "verified").length,
    suspended: owners.filter((o) => o.verification_status === "suspended").length,
  };

  const filters = [
    { key: "all", label: `Tous (${counts.all})` },
    { key: "pending_verification", label: `En attente (${counts.pending_verification})` },
    { key: "verified", label: `Vérifiés (${counts.verified})` },
    { key: "suspended", label: `Suspendus (${counts.suspended})` },
  ];

  const allFilteredIds = filtered.map((o) => o.user_id);
  const allSelected = filtered.length > 0 && filtered.every((o) => selectedIds.has(o.user_id));
  const someSelected = selectedIds.size > 0;

  const toggleAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allFilteredIds));
    }
  };

  const toggleOne = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkConfirm = () => {
    if (!confirmAction || selectedIds.size === 0) return;
    bulkAction.mutate(
      { action: confirmAction, userIds: Array.from(selectedIds) },
      {
        onSuccess: () => {
          setSelectedIds(new Set());
          setConfirmAction(null);
        },
        onSettled: () => setConfirmAction(null),
      }
    );
  };

  const confirmLabels: Record<string, { title: string; desc: string; btn: string; destructive?: boolean }> = {
    "bulk-verify": {
      title: "Vérifier en masse",
      desc: `Voulez-vous vérifier ${selectedIds.size} propriétaire(s) ? Leurs comptes seront déverrouillés.`,
      btn: "Vérifier tout",
    },
    "bulk-suspend": {
      title: "Suspendre en masse",
      desc: `Voulez-vous suspendre ${selectedIds.size} propriétaire(s) ? Leurs comptes seront verrouillés.`,
      btn: "Suspendre tout",
      destructive: true,
    },
    "bulk-delete": {
      title: "Supprimer en masse",
      desc: `Voulez-vous supprimer définitivement ${selectedIds.size} propriétaire(s) ? Cette action est irréversible.`,
      btn: "Supprimer tout",
      destructive: true,
    },
    "bulk-revert-to-pending": {
      title: "Remettre en attente en masse",
      desc: `Voulez-vous remettre ${selectedIds.size} propriétaire(s) en attente de vérification ? Un nouveau délai de 48h sera appliqué.`,
      btn: "Remettre en attente",
    },
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-[#00D4FF]" />
          Vérification des propriétaires
        </h2>
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map((f) => (
          <Button
            key={f.key}
            variant={filter === f.key ? "default" : "outline"}
            size="sm"
            className={cn(
              "text-xs",
              filter === f.key
                ? "bg-[#00D4FF]/20 text-[#00D4FF] border-[#00D4FF]/30"
                : "border-white/10 text-slate-400 hover:text-white hover:bg-white/5"
            )}
            onClick={() => { setFilter(f.key); setSelectedIds(new Set()); }}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Rechercher par nom, boutique, téléphone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500"
        />
      </div>

      {/* Bulk action bar */}
      {someSelected && (
        <div className="flex items-center gap-2 flex-wrap bg-white/5 border border-white/10 rounded-lg px-3 py-2">
          <span className="text-xs text-slate-300 mr-1">
            {selectedIds.size} sélectionné(s)
          </span>
          <Button
            size="sm"
            variant="ghost"
            className="text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs"
            onClick={() => setConfirmAction("bulk-verify")}
            disabled={bulkAction.isPending}
          >
            <CheckCircle className="h-3 w-3 mr-1" />
            Vérifier
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-400 hover:bg-amber-500/10 h-7 text-xs"
            onClick={() => setConfirmAction("bulk-revert-to-pending")}
            disabled={bulkAction.isPending}
          >
            <Clock className="h-3 w-3 mr-1" />
            En attente
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-amber-400 hover:bg-amber-500/10 h-7 text-xs"
            onClick={() => setConfirmAction("bulk-suspend")}
            disabled={bulkAction.isPending}
          >
            <Ban className="h-3 w-3 mr-1" />
            Suspendre
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-red-400 hover:bg-red-500/10 h-7 text-xs"
            onClick={() => setConfirmAction("bulk-delete")}
            disabled={bulkAction.isPending}
          >
            <Trash2 className="h-3 w-3 mr-1" />
            Supprimer
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-slate-400 hover:bg-white/5 h-7 text-xs ml-auto"
            onClick={() => setSelectedIds(new Set())}
          >
            Désélectionner
          </Button>
        </div>
      )}

      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="w-10">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={toggleAll}
                  className="border-slate-600 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                />
              </TableHead>
              <TableHead className="text-slate-400 text-xs">Propriétaire</TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Boutique</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Téléphone</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Inscription</TableHead>
              <TableHead className="text-slate-400 text-xs">Statut</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">Temps restant</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((owner) => {
              const cfg = statusConfig[owner.verification_status] || statusConfig.pending_verification;
              const Icon = cfg.icon;
              const deadline = owner.verification_deadline ? new Date(owner.verification_deadline) : null;
              const remaining = deadline && owner.verification_status === "pending_verification"
                ? Math.max(0, deadline.getTime() - Date.now())
                : null;
              const remainingStr = remaining !== null
                ? remaining <= 0
                  ? "Expiré"
                  : formatDistanceToNow(deadline!, { locale: fr, addSuffix: false })
                : "—";
              const isSelected = selectedIds.has(owner.user_id);

              return (
                <TableRow key={owner.user_id} className={cn("border-white/5 hover:bg-white/5", isSelected && "bg-[#00D4FF]/5")}>
                  <TableCell>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => toggleOne(owner.user_id)}
                      className="border-slate-600 data-[state=checked]:bg-[#00D4FF] data-[state=checked]:border-[#00D4FF]"
                    />
                  </TableCell>
                  <TableCell>
                    <div>
                      <span className="text-white text-sm font-medium">{owner.full_name || owner.username}</span>
                      <p className="text-xs text-slate-500">@{owner.username}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-sm text-slate-300">
                    {owner.shop_name}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-400">
                    {owner.phone || "—"}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">
                    {format(new Date(owner.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", cfg.color)}>
                      <Icon className="h-3 w-3 mr-1" />
                      {cfg.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {owner.verification_status === "pending_verification" ? (
                      <span className={cn("text-xs font-mono", remaining !== null && remaining <= 0 ? "text-red-400" : "text-amber-400")}>
                        {remainingStr}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-500">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      {owner.verification_requested_at && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-[#00D4FF] hover:bg-[#00D4FF]/10 h-7 text-xs"
                          onClick={() => setSelectedUserId(owner.user_id)}
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Voir
                        </Button>
                      )}
                      {owner.verification_status !== "verified" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-emerald-400 hover:bg-emerald-500/10 h-7 text-xs"
                          onClick={() => verifyOwner.mutate({ userId: owner.user_id, action: "verify" })}
                          disabled={verifyOwner.isPending}
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Vérifier
                        </Button>
                      )}
                      {owner.verification_status !== "pending_verification" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-amber-400 hover:bg-amber-500/10 h-7 text-xs"
                          onClick={() => verifyOwner.mutate({ userId: owner.user_id, action: "revert-to-pending" })}
                          disabled={verifyOwner.isPending}
                        >
                          <Clock className="h-3 w-3 mr-1" />
                          En attente
                        </Button>
                      )}
                      {owner.verification_status !== "suspended" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:bg-red-500/10 h-7 text-xs"
                          onClick={() => verifyOwner.mutate({ userId: owner.user_id, action: "suspend" })}
                          disabled={verifyOwner.isPending}
                        >
                          <Ban className="h-3 w-3 mr-1" />
                          Suspendre
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  Aucun propriétaire trouvé
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Verification Request Detail Dialog */}
      <Dialog open={!!selectedUserId} onOpenChange={() => setSelectedUserId(null)}>
        <DialogContent className="bg-slate-900 border-white/10 text-white max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-[#00D4FF]" />
              Demande de vérification
            </DialogTitle>
          </DialogHeader>
          {requestData ? (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div><span className="text-slate-500 text-xs">Magasin</span><p className="text-white">{requestData.shop_name}</p></div>
                <div><span className="text-slate-500 text-xs">Propriétaire</span><p className="text-white">{requestData.owner_name}</p></div>
                <div><span className="text-slate-500 text-xs">Téléphone</span><p className="text-white">{requestData.phone}</p></div>
                <div><span className="text-slate-500 text-xs">Ville</span><p className="text-white">{requestData.city}</p></div>
              </div>
              <div><span className="text-slate-500 text-xs">Adresse</span><p className="text-white">{requestData.address}</p></div>
              {requestData.google_maps_url && (
                <div><span className="text-slate-500 text-xs">Google Maps</span><a href={requestData.google_maps_url} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] text-xs hover:underline block truncate">{requestData.google_maps_url}</a></div>
              )}
              {requestData.facebook_url && (
                <div><span className="text-slate-500 text-xs">Facebook</span><a href={requestData.facebook_url} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] text-xs hover:underline block truncate">{requestData.facebook_url}</a></div>
              )}
              {requestData.instagram_url && (
                <div><span className="text-slate-500 text-xs">Instagram</span><a href={requestData.instagram_url} target="_blank" rel="noopener noreferrer" className="text-[#00D4FF] text-xs hover:underline block truncate">{requestData.instagram_url}</a></div>
              )}
              {requestData.shop_description && (
                <div><span className="text-slate-500 text-xs">Description</span><p className="text-slate-300">{requestData.shop_description}</p></div>
              )}
              {requestData.message_to_admin && (
                <div><span className="text-slate-500 text-xs">Message</span><p className="text-slate-300">{requestData.message_to_admin}</p></div>
              )}
              <p className="text-xs text-slate-500">
                Soumis le {format(new Date(requestData.created_at), "dd MMM yyyy à HH:mm", { locale: fr })}
              </p>
            </div>
          ) : (
            <p className="text-slate-500 text-sm py-4 text-center">Aucune demande de vérification trouvée</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Bulk Action Confirmation */}
      <AlertDialog open={!!confirmAction} onOpenChange={(open) => !open && setConfirmAction(null)}>
        <AlertDialogContent className="bg-slate-900 border-white/10 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction && confirmLabels[confirmAction]?.title}</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-400">
              {confirmAction && confirmLabels[confirmAction]?.desc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10 text-slate-300 hover:bg-white/5">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleBulkConfirm}
              disabled={bulkAction.isPending}
              className={cn(
                confirmAction && confirmLabels[confirmAction]?.destructive
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white"
              )}
            >
              {bulkAction.isPending ? "En cours..." : confirmAction && confirmLabels[confirmAction]?.btn}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
