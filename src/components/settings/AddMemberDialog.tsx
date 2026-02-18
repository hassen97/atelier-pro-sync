import { useState } from "react";
import { Search, UserPlus, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSearchUsers, useAddTeamMember, ALL_PAGES } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";

export function AddMemberDialog() {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<{
    user_id: string;
    username: string | null;
    full_name: string | null;
  } | null>(null);
  const [role, setRole] = useState<"employee" | "manager" | "admin">("employee");
  const [selectedPages, setSelectedPages] = useState<string[]>(["/", "/pos"]);

  const { user } = useAuth();
  const searchUsers = useSearchUsers();
  const addMember = useAddTeamMember();

  const handleSearch = () => {
    if (searchQuery.trim().length < 2) return;
    searchUsers.mutate(searchQuery.trim());
  };

  const togglePage = (href: string) => {
    if (href === "/") return; // Dashboard always included
    setSelectedPages((prev) =>
      prev.includes(href) ? prev.filter((p) => p !== href) : [...prev, href]
    );
  };

  const handleAdd = async () => {
    if (!selectedUser) return;
    await addMember.mutateAsync({
      memberUserId: selectedUser.user_id,
      role,
      allowedPages: selectedPages,
    });
    setOpen(false);
    setSearchQuery("");
    setSelectedUser(null);
    setSelectedPages(["/", "/pos"]);
  };

  const searchResults = (searchUsers.data || []).filter(
    (u) => u.user_id !== user?.id
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-primary hover:opacity-90">
          <UserPlus className="h-4 w-4 mr-2" />
          Inviter un employé
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Inviter un employé</DialogTitle>
        </DialogHeader>

        {!selectedUser ? (
          <div className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Nom d'utilisateur..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button
                variant="outline"
                onClick={handleSearch}
                disabled={searchUsers.isPending}
              >
                {searchUsers.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((u) => (
                  <button
                    key={u.user_id}
                    onClick={() => setSelectedUser(u)}
                    className="w-full flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors text-left"
                  >
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                      {(u.full_name || u.username || "?")[0]?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{u.full_name || "Sans nom"}</p>
                      <p className="text-xs text-muted-foreground">@{u.username}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searchUsers.isSuccess && searchResults.length === 0 && searchQuery && (
              <p className="text-sm text-muted-foreground text-center py-4">
                Aucun utilisateur trouvé
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium text-sm">
                {(selectedUser.full_name || selectedUser.username || "?")[0]?.toUpperCase()}
              </div>
              <div>
                <p className="font-medium text-sm">{selectedUser.full_name || "Sans nom"}</p>
                <p className="text-xs text-muted-foreground">@{selectedUser.username}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="ml-auto"
                onClick={() => setSelectedUser(null)}
              >
                Changer
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={(v: any) => setRole(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="employee">Employé</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Pages autorisées</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_PAGES.map((page) => (
                  <label
                    key={page.href}
                    className="flex items-center gap-2 text-sm cursor-pointer"
                  >
                    <Checkbox
                      checked={selectedPages.includes(page.href)}
                      onCheckedChange={() => togglePage(page.href)}
                      disabled={page.href === "/"}
                    />
                    {page.label}
                  </label>
                ))}
              </div>
            </div>

            <Button
              className="w-full bg-gradient-primary hover:opacity-90"
              onClick={handleAdd}
              disabled={addMember.isPending}
            >
              {addMember.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4 mr-2" />
              )}
              Ajouter à l'équipe
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
