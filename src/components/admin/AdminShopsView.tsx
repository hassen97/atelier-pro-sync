import { useState, useMemo } from "react";
import { useAdminData, useDeleteOwner, useLockOwner, useSetShopPlan } from "@/hooks/useAdmin";
import { useCreateAnnouncement } from "@/hooks/useAnnouncements";
import { CreateOwnerDialog } from "./CreateOwnerDialog";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { EditOwnerSettingsDialog } from "./EditOwnerSettingsDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Plus, MoreHorizontal, KeyRound, Lock, Unlock, Trash2, Settings2, Search, ArrowUp, ArrowDown, Phone, MessageCircle, CheckCircle, Megaphone, Eye, LogIn, ShieldCheck, Crown, Clock, AlertTriangle } from "lucide-react";
import { VerifiedBadge } from "@/components/verification/VerifiedBadge";
import { ShopDetailSheet } from "./ShopDetailSheet";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { AdminVerificationView } from "./AdminVerificationView";
import { format, formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { getCountryByCode, getCurrencyByCode } from "@/data/countries";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

function ShopAnnouncementDialog({
  open,
  onOpenChange,
  userId,
  shopName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  userId: string;
  shopName: string;
}) {
  const createAnnouncement = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [newFeatures, setNewFeatures] = useState("");
  const [changesFixes, setChangesFixes] = useState("");

  const handleSubmit = () => {
    if (!title.trim()) return;
    createAnnouncement.mutate(
      { title, new_features: newFeatures, changes_fixes: changesFixes, target_user_id: userId },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTitle("");
          setNewFeatures("");
          setChangesFixes("");
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-white/10 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-violet-400" />
            Annonce pour <span className="text-violet-300">{shopName}</span>
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label className="text-slate-300">Titre</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Message important pour votre boutique"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>
          <div>
            <Label className="text-slate-300">Nouvelles fonctionnalités</Label>
            <Textarea
              value={newFeatures}
              onChange={(e) => setNewFeatures(e.target.value)}
              placeholder="- Nouveau module disponible&#10;- Accès à la fonctionnalité X"
              className="bg-white/5 border-white/10 text-white min-h-[90px]"
            />
          </div>
          <div>
            <Label className="text-slate-300">Message / Notes</Label>
            <Textarea
              value={changesFixes}
              onChange={(e) => setChangesFixes(e.target.value)}
              placeholder="- Information spécifique&#10;- Action requise de votre part"
              className="bg-white/5 border-white/10 text-white min-h-[90px]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!title.trim() || createAnnouncement.isPending}
            className="bg-violet-600 hover:bg-violet-700 text-white"
          >
            <Megaphone className="h-3.5 w-3.5 mr-2" /> Envoyer l'annonce
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type FilterType = "all" | "active_now" | "active_24h" | "inactive_7d" | "pending";
type SortKey = "name" | "status" | null;
function getOnlineStatus(lastOnline: string | null) {
  if (!lastOnline) return "offline";
  const diff = Date.now() - new Date(lastOnline).getTime();
  if (diff < 5 * 60 * 1000) return "online";
  if (diff < 60 * 60 * 1000) return "away";
  return "offline";
}

const statusDot: Record<string, string> = {
  online: "bg-emerald-400",
  away: "bg-amber-400",
  offline: "bg-red-400",
};

export function AdminShopsView() {
  const { data } = useAdminData();
  const deleteOwner = useDeleteOwner();
  const lockOwner = useLockOwner();
  const [createOpen, setCreateOpen] = useState(false);
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);
  const [editTarget, setEditTarget] = useState<{ userId: string; name: string; country: string; currency: string } | null>(null);
  const [announcementTarget, setAnnouncementTarget] = useState<{ userId: string; shopName: string } | null>(null);
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const owners = data?.owners || [];

  const filteredOwners = useMemo(() => {
    const now = Date.now();
    let result = owners.filter((owner) => {
      if (filter === "all") return true;
      if (filter === "pending") return owner.is_locked && !owner.last_online_at;
      const lastOnline = owner.last_online_at ? new Date(owner.last_online_at).getTime() : 0;
      const diff = now - lastOnline;
      if (filter === "active_now") return diff < 5 * 60 * 1000 && owner.last_online_at;
      if (filter === "active_24h") return diff < 24 * 60 * 60 * 1000 && owner.last_online_at;
      if (filter === "inactive_7d") return !owner.last_online_at || diff > 7 * 24 * 60 * 60 * 1000;
      return true;
    });

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((o) =>
        (o.shop_name || "").toLowerCase().includes(q) ||
        (o.full_name || "").toLowerCase().includes(q) ||
        (o.username || "").toLowerCase().includes(q) ||
        (o.phone || "").toLowerCase().includes(q) ||
        (o.whatsapp_phone || "").toLowerCase().includes(q) ||
        (o.email || "").toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortKey) {
      const statusOrder: Record<string, number> = { online: 0, away: 1, offline: 2 };
      result = [...result].sort((a, b) => {
        let cmp = 0;
        if (sortKey === "name") {
          cmp = (a.shop_name || "").localeCompare(b.shop_name || "");
        } else if (sortKey === "status") {
          cmp = (statusOrder[getOnlineStatus(a.last_online_at)] ?? 2) - (statusOrder[getOnlineStatus(b.last_online_at)] ?? 2);
        }
        return sortDir === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [owners, filter, search, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const SortIcon = ({ col }: { col: SortKey }) => {
    if (sortKey !== col) return null;
    return sortDir === "asc" ? <ArrowUp className="h-3 w-3 inline ml-1" /> : <ArrowDown className="h-3 w-3 inline ml-1" />;
  };

  const pendingCount = owners.filter(o => o.is_locked && !o.last_online_at).length;

  const filters: { key: FilterType; label: string }[] = [
    { key: "all", label: `Toutes (${owners.length})` },
    { key: "pending", label: `En attente (${pendingCount})` },
    { key: "active_now", label: "En ligne" },
    { key: "active_24h", label: "Actif 24h" },
    { key: "inactive_7d", label: "Inactif 7j+" },
  ];

  return (
    <div className="space-y-4 animate-fade-in">
      <Tabs defaultValue="shops" className="w-full">
        <TabsList className="bg-white/5 border border-white/10 mb-4">
          <TabsTrigger value="shops" className="data-[state=active]:bg-[#00D4FF]/15 data-[state=active]:text-[#00D4FF] text-slate-400">Boutiques</TabsTrigger>
          <TabsTrigger value="verification" className="data-[state=active]:bg-[#00D4FF]/15 data-[state=active]:text-[#00D4FF] text-slate-400">Vérification</TabsTrigger>
        </TabsList>
        <TabsContent value="shops" className="mt-0 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h2 className="text-lg font-semibold text-white">Gestion des boutiques</h2>
        <Button
          onClick={() => setCreateOpen(true)}
          className="bg-[#00D4FF]/20 text-[#00D4FF] border border-[#00D4FF]/30 hover:bg-[#00D4FF]/30"
        >
          <Plus className="h-4 w-4 mr-2" /> Nouveau propriétaire
        </Button>
      </div>

      {/* Smart Filters */}
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

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          placeholder="Rechercher par boutique, nom, username, téléphone, email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-slate-500 focus-visible:ring-[#00D4FF]/30"
        />
      </div>

      {/* Table */}
      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("name")}>
                Boutique <SortIcon col="name" />
              </TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Propriétaire</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Inscription</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">Téléphone</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">WhatsApp</TableHead>
              <TableHead className="text-slate-400 text-xs cursor-pointer select-none hover:text-white transition-colors" onClick={() => toggleSort("status")}>
                Statut <SortIcon col="status" />
              </TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Réparations</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOwners.map((owner) => {
              const status = getOnlineStatus(owner.last_online_at);
              return (
                <TableRow key={owner.user_id} className={cn("border-white/5 cursor-pointer hover:bg-white/5 transition-colors", owner.is_locked && "opacity-60")} onClick={() => setSelectedShopId(owner.user_id)}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-1.5">
                          <span className="text-white text-sm font-medium">{owner.shop_name}</span>
                          {owner.verification_status === "verified" && <VerifiedBadge />}
                        </div>
                        <span className="text-xs text-slate-500">
                          {getCountryByCode(owner.country || "TN")?.flag} {getCurrencyByCode(owner.currency || "TND")?.code}
                        </span>
                      </div>
                      {owner.is_locked && !owner.last_online_at ? (
                        <Badge variant="outline" className="text-[10px] border-amber-500/30 text-amber-400 bg-amber-500/10 px-1.5 py-0">
                          En attente
                        </Badge>
                      ) : owner.is_locked ? (
                        <Badge variant="outline" className="text-[10px] border-red-500/30 text-red-400 px-1.5 py-0">
                          Verrouillé
                        </Badge>
                      ) : null}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <div>
                      <span className="text-white text-sm">{owner.full_name || owner.username}</span>
                      <p className="text-xs text-slate-500">@{owner.username}</p>
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-xs text-slate-500">
                    {format(new Date(owner.created_at), "dd MMM yyyy", { locale: fr })}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {owner.phone ? (
                      <a href={`tel:${owner.phone}`} className="text-xs text-[#00D4FF] hover:underline flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {owner.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {(owner.whatsapp_phone || owner.phone) ? (
                      <a 
                        href={`https://wa.me/${(owner.whatsapp_phone || owner.phone || "").replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-emerald-400 hover:underline flex items-center gap-1"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {owner.whatsapp_phone || owner.phone}
                      </a>
                    ) : (
                      <span className="text-xs text-slate-600">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", statusDot[status])} />
                      <span className="text-xs text-slate-400">
                        {owner.last_online_at
                          ? formatDistanceToNow(new Date(owner.last_online_at), { addSuffix: true, locale: fr })
                          : "Jamais"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-white font-mono-numbers">{owner.repair_count}</span>
                    <span className="text-xs text-slate-500 ml-1">({owner.team_count} membres)</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget({
                          userId: owner.user_id,
                          name: owner.full_name || owner.username || "",
                          country: owner.country || "TN",
                          currency: owner.currency || "TND",
                        })}>
                          <Settings2 className="h-4 w-4 mr-2" /> Modifier pays/devise
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setResetTarget({
                          userId: owner.user_id,
                          name: owner.full_name || owner.username || "",
                        })}>
                          <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setAnnouncementTarget({
                          userId: owner.user_id,
                          shopName: owner.shop_name,
                        })}>
                          <Megaphone className="h-4 w-4 mr-2" /> Envoyer une annonce
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => {
                          const viewUrl = `/?impersonate=${owner.user_id}&mode=readonly`;
                          window.location.href = viewUrl;
                        }}>
                          <LogIn className="h-4 w-4 mr-2" /> Accéder à la boutique
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {owner.is_locked && !owner.last_online_at ? (
                          <DropdownMenuItem 
                            className="text-emerald-400"
                            onClick={() => lockOwner.mutate({ userId: owner.user_id, lock: false })}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" /> Approuver l'inscription
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => lockOwner.mutate({ userId: owner.user_id, lock: !owner.is_locked })}>
                            {owner.is_locked ? (
                              <><Unlock className="h-4 w-4 mr-2" /> Déverrouiller</>
                            ) : (
                              <><Lock className="h-4 w-4 mr-2" /> Verrouiller</>
                            )}
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-400"
                          onClick={() => {
                            if (confirm(`Supprimer ${owner.full_name || owner.username} ?`)) {
                              deleteOwner.mutate(owner.user_id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredOwners.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                  Aucune boutique trouvée
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} />
      {announcementTarget && (
        <ShopAnnouncementDialog
          open={!!announcementTarget}
          onOpenChange={() => setAnnouncementTarget(null)}
          userId={announcementTarget.userId}
          shopName={announcementTarget.shopName}
        />
      )}
      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={() => setResetTarget(null)}
          userId={resetTarget.userId}
          userName={resetTarget.name}
        />
      )}
      {editTarget && (
        <EditOwnerSettingsDialog
          open={!!editTarget}
          onOpenChange={() => setEditTarget(null)}
          userId={editTarget.userId}
          userName={editTarget.name}
          currentCountry={editTarget.country}
          currentCurrency={editTarget.currency}
        />
      )}
      <ShopDetailSheet userId={selectedShopId} onClose={() => setSelectedShopId(null)} />
        </TabsContent>
        <TabsContent value="verification" className="mt-0">
          <AdminVerificationView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
