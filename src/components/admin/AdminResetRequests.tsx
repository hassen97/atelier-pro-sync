import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal, KeyRound, Phone, MessageCircle, CheckCircle, Clock, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface ResetRequest {
  id: string;
  username: string;
  status: string;
  created_at: string;
  phone: string | null;
  whatsapp_phone: string | null;
  user_id: string | null;
  full_name: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  pending: { label: "En attente", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
  contacted: { label: "Contacté", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  resolved: { label: "Résolu", color: "border-emerald-500/30 text-emerald-400 bg-emerald-500/10" },
};

export function AdminResetRequests() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "contacted" | "resolved">("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-reset-requests"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-reset-requests" },
      });
      if (error) throw error;
      return data as { requests: ResetRequest[] };
    },
    enabled: !!user,
  });

  const updateStatus = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: string; status: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "update-reset-request", requestId, status },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-reset-requests"] });
      toast.success("Statut mis à jour");
    },
    onError: (err: any) => toast.error(err.message || "Erreur"),
  });

  const requests = data?.requests || [];
  const filtered = filter === "all" ? requests : requests.filter(r => r.status === filter);
  const pendingCount = requests.filter(r => r.status === "pending").length;

  const filters: { key: typeof filter; label: string }[] = [
    { key: "all", label: `Toutes (${requests.length})` },
    { key: "pending", label: `En attente (${pendingCount})` },
    { key: "contacted", label: "Contacté" },
    { key: "resolved", label: "Résolu" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">
          Demandes de réinitialisation
          {pendingCount > 0 && (
            <Badge className="ml-2 bg-amber-500/20 text-amber-400 border-amber-500/30">
              {pendingCount} en attente
            </Badge>
          )}
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

      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Utilisateur</TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Contact</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Date</TableHead>
              <TableHead className="text-slate-400 text-xs">Statut</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Chargement...
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-slate-500 py-8">
                  Aucune demande trouvée
                </TableCell>
              </TableRow>
            ) : filtered.map((req) => {
              const config = statusConfig[req.status] || statusConfig.pending;
              return (
                <TableRow key={req.id} className="border-white/5">
                  <TableCell>
                    <div>
                      <span className="text-white text-sm font-medium">@{req.username}</span>
                      {req.full_name && (
                        <p className="text-xs text-slate-500">{req.full_name}</p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div className="flex flex-col gap-1">
                      {req.phone && (
                        <a href={`tel:${req.phone}`} className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {req.phone}
                        </a>
                      )}
                      {(req.whatsapp_phone || req.phone) && (
                        <a
                          href={`https://wa.me/${(req.whatsapp_phone || req.phone || "").replace(/[^0-9]/g, "")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                        >
                          <MessageCircle className="h-3 w-3" /> WhatsApp
                        </a>
                      )}
                      {!req.phone && !req.whatsapp_phone && (
                        <span className="text-xs text-slate-600">Aucun contact</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div>
                      <span className="text-xs text-slate-400">
                        {format(new Date(req.created_at), "dd MMM yyyy HH:mm", { locale: fr })}
                      </span>
                      <p className="text-xs text-slate-600">
                        {formatDistanceToNow(new Date(req.created_at), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
                      {config.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {req.status === "pending" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ requestId: req.id, status: "contacted" })}>
                            <Eye className="h-4 w-4 mr-2" /> Marquer contacté
                          </DropdownMenuItem>
                        )}
                        {req.status !== "resolved" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ requestId: req.id, status: "resolved" })}>
                            <CheckCircle className="h-4 w-4 mr-2" /> Marquer résolu
                          </DropdownMenuItem>
                        )}
                        {req.status === "resolved" && (
                          <DropdownMenuItem onClick={() => updateStatus.mutate({ requestId: req.id, status: "pending" })}>
                            <Clock className="h-4 w-4 mr-2" /> Remettre en attente
                          </DropdownMenuItem>
                        )}
                        {req.user_id && (
                          <DropdownMenuItem onClick={() => setResetTarget({
                            userId: req.user_id!,
                            name: req.full_name || req.username,
                          })}>
                            <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

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
