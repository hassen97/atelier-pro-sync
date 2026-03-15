import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, CheckCircle, Ban, Eye, Clock, ShieldCheck, AlertTriangle } from "lucide-react";
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
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "verify" | "suspend" }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: action === "verify" ? "verify-owner" : "suspend-owner", userId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["admin-verification-data"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success(variables.action === "verify" ? "Propriétaire vérifié !" : "Propriétaire suspendu");
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
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<string>("all");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const { data: requestData } = useVerificationRequest(selectedUserId);

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
            onClick={() => setFilter(f.key)}
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

      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
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

              return (
                <TableRow key={owner.user_id} className="border-white/5 hover:bg-white/5">
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
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
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
    </div>
  );
}
