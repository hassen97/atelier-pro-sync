import { useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  User,
  ShoppingBag,
  Wrench,
  CreditCard,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";
import { useCustomers, useDeleteCustomer } from "@/hooks/useCustomers";
import { toast } from "sonner";

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");
  const { data: customers = [], isLoading } = useCustomers();
  const deleteCustomer = useDeleteCustomer();

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (customer.phone?.includes(searchQuery) ?? false)
  );

  const totalCustomers = customers.length;
  const totalDebts = customers.reduce(
    (sum, c) => sum + Math.abs(Math.min(0, Number(c.balance) || 0)),
    0
  );
  const customersWithDebts = customers.filter((c) => Number(c.balance) < 0).length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleDelete = (id: string, name: string) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer ${name} ?`)) {
      deleteCustomer.mutate(id);
    }
  };

  const handleNewCustomer = () => {
    toast.info("Nouveau client", {
      description: "Formulaire de création à venir",
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader title="Gestion des Clients" description="Fiches clients et historique" />
        <div className="grid gap-4 sm:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Clients"
        description="Fiches clients et historique"
      >
        <Button className="bg-gradient-primary hover:opacity-90" onClick={handleNewCustomer}>
          <Plus className="h-4 w-4 mr-2" />
          Nouveau client
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total clients"
          value={totalCustomers}
          icon={User}
          variant="default"
        />
        <StatCard
          title="Clients avec crédit"
          value={customersWithDebts}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Total créances"
          value={formatCurrency(totalDebts)}
          icon={CreditCard}
          variant="destructive"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou téléphone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Customers Grid */}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filteredCustomers.map((customer) => (
          <Card key={customer.id} className="hover:shadow-soft transition-shadow">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-primary/10 text-primary font-medium">
                      {getInitials(customer.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{customer.name}</h3>
                    {customer.phone && (
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {customer.phone}
                      </p>
                    )}
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => toast.info("Voir profil", { description: "Fonctionnalité à venir" })}>
                      Voir profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Modifier", { description: "Fonctionnalité à venir" })}>
                      Modifier
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => toast.info("Historique", { description: "Fonctionnalité à venir" })}>
                      Historique achats
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDelete(customer.id, customer.name)}
                    >
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Email */}
              {customer.email && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                  <Mail className="h-3 w-3" />
                  <span className="truncate">{customer.email}</span>
                </div>
              )}

              {/* Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Solde</span>
                <Badge
                  className={cn(
                    Number(customer.balance) < 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {Number(customer.balance) < 0
                    ? `Doit: ${formatCurrency(Math.abs(Number(customer.balance)))}`
                    : "À jour"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && !isLoading && (
        <div className="text-center py-12 text-muted-foreground">
          {customers.length === 0
            ? "Aucun client enregistré. Cliquez sur 'Nouveau client' pour commencer."
            : "Aucun client trouvé"}
        </div>
      )}
    </div>
  );
}
