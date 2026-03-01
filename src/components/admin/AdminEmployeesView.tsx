import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ResetPasswordDialog } from "./ResetPasswordDialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { MoreHorizontal, KeyRound, Trash2, Users, Search, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { EmployeeRecord } from "@/hooks/useAdmin";

const roleConfig: Record<string, { label: string; color: string }> = {
  employee: { label: "Employé", color: "border-slate-500/30 text-slate-400 bg-slate-500/10" },
  manager: { label: "Manager", color: "border-blue-500/30 text-blue-400 bg-blue-500/10" },
  admin: { label: "Admin", color: "border-purple-500/30 text-purple-400 bg-purple-500/10" },
  super_admin: { label: "Propriétaire", color: "border-amber-500/30 text-amber-400 bg-amber-500/10" },
};

export function AdminEmployeesView() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [resetTarget, setResetTarget] = useState<{ userId: string; name: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<EmployeeRecord | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-employees"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "list-employees" },
      });
      if (error) throw error;
      return data as { employees: EmployeeRecord[] };
    },
    enabled: !!user,
  });

  const deleteEmployee = useMutation({
    mutationFn: async ({ memberId, employeeUserId }: { memberId: string; employeeUserId: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-manage-users", {
        body: { action: "delete-employee", memberId, employeeUserId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-employees"] });
      queryClient.invalidateQueries({ queryKey: ["admin-data"] });
      toast.success("Employé supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => toast.error(err.message || "Erreur lors de la suppression"),
  });

  const employees = data?.employees || [];
  const filtered = employees.filter((e) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (e.username || "").toLowerCase().includes(q) ||
      (e.full_name || "").toLowerCase().includes(q) ||
      (e.shop_name || "").toLowerCase().includes(q) ||
      (e.owner_username || "").toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#00D4FF]/10 flex items-center justify-center">
            <Users className="h-4 w-4 text-[#00D4FF]" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-white">
              Gestion des Employés
              <Badge className="ml-2 bg-[#00D4FF]/10 text-[#00D4FF] border-[#00D4FF]/20 text-xs">
                {employees.length}
              </Badge>
            </h2>
            <p className="text-xs text-slate-500">Tous les comptes employés de la plateforme</p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher par nom, boutique, propriétaire..."
          className="pl-9 bg-white/5 border-white/10 text-white placeholder:text-slate-600 focus:border-[#00D4FF]/50"
        />
      </div>

      {/* Table */}
      <div className="admin-glass-card rounded-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="text-slate-400 text-xs">Employé</TableHead>
              <TableHead className="text-slate-400 text-xs hidden sm:table-cell">Boutique</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Propriétaire</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">Rôle</TableHead>
              <TableHead className="text-slate-400 text-xs hidden lg:table-cell">Pages</TableHead>
              <TableHead className="text-slate-400 text-xs hidden md:table-cell">Ajouté le</TableHead>
              <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">Chargement...</TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-slate-500 py-8">
                  {search ? "Aucun employé trouvé" : "Aucun employé enregistré"}
                </TableCell>
              </TableRow>
            ) : filtered.map((emp) => {
              const rc = roleConfig[emp.role] || roleConfig.employee;
              return (
                <TableRow key={emp.id} className="border-white/5">
                  <TableCell>
                    <div>
                      <span className="text-white text-sm font-medium">
                        {emp.full_name || `@${emp.username}`}
                      </span>
                      {emp.username && (
                        <p className="text-xs text-slate-500">@{emp.username}</p>
                      )}
                      {emp.phone && (
                        <a href={`tel:${emp.phone}`} className="text-xs text-[#00D4FF] flex items-center gap-1 mt-0.5">
                          <Phone className="h-3 w-3" />{emp.phone}
                        </a>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className="text-sm text-slate-300">{emp.shop_name}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-slate-400">@{emp.owner_username || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", rc.color)}>
                      {rc.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-slate-500/30 text-slate-400 bg-slate-500/10">
                      {emp.allowed_pages.length} page{emp.allowed_pages.length !== 1 ? "s" : ""}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-xs text-slate-500">
                      {format(new Date(emp.created_at), "dd MMM yyyy", { locale: fr })}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setResetTarget({
                          userId: emp.member_user_id,
                          name: emp.full_name || emp.username || "Employé",
                        })}>
                          <KeyRound className="h-4 w-4 mr-2" /> Réinitialiser mot de passe
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={() => setDeleteTarget(emp)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer l'employé
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Reset password dialog */}
      {resetTarget && (
        <ResetPasswordDialog
          open={!!resetTarget}
          onOpenChange={() => setResetTarget(null)}
          userId={resetTarget.userId}
          userName={resetTarget.name}
        />
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer l'employé ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action supprimera définitivement le compte de{" "}
              <strong>{deleteTarget?.full_name || deleteTarget?.username}</strong> et retirera
              son accès à la boutique <strong>{deleteTarget?.shop_name}</strong>. Irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteTarget) {
                  deleteEmployee.mutate({
                    memberId: deleteTarget.id,
                    employeeUserId: deleteTarget.member_user_id,
                  });
                }
              }}
            >
              {deleteEmployee.isPending ? "Suppression..." : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
