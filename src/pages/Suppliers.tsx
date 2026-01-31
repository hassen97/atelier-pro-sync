import { useState } from "react";
import {
  Search,
  Plus,
  Phone,
  Mail,
  Building,
  Package,
  CreditCard,
  MoreHorizontal,
  MapPin,
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
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock supplier data
const suppliers = [
  {
    id: "1",
    name: "TechParts Tunisia",
    contact: "Hamdi Sassi",
    phone: "71 123 456",
    email: "contact@techparts.tn",
    address: "Zone Industrielle, Sfax",
    totalPurchases: 45000.000,
    balance: -8500.000, // negative = we owe them
    lastOrder: "2024-01-14",
  },
  {
    id: "2",
    name: "Mobile Screens SARL",
    contact: "Nadia Hammami",
    phone: "72 654 321",
    email: "info@mobilescreens.tn",
    address: "Avenue Habib Bourguiba, Tunis",
    totalPurchases: 32000.000,
    balance: -3200.000,
    lastOrder: "2024-01-12",
  },
  {
    id: "3",
    name: "Battery Plus",
    contact: "Raouf Ben Amor",
    phone: "73 987 654",
    email: "sales@batteryplus.tn",
    address: "Sousse",
    totalPurchases: 18500.000,
    balance: 0,
    lastOrder: "2024-01-10",
  },
  {
    id: "4",
    name: "Accessoires Pro",
    contact: "Salma Mejri",
    phone: "74 111 222",
    totalPurchases: 12000.000,
    balance: -1800.000,
    lastOrder: "2024-01-08",
  },
];

export default function Suppliers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredSuppliers = suppliers.filter(
    (supplier) =>
      supplier.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      supplier.contact?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSuppliers = suppliers.length;
  const totalDebts = suppliers.reduce(
    (sum, s) => sum + Math.abs(Math.min(0, s.balance)),
    0
  );
  const suppliersWithDebts = suppliers.filter((s) => s.balance < 0).length;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Fournisseurs"
        description="Fiches fournisseurs et comptes"
      >
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouveau fournisseur
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total fournisseurs"
          value={totalSuppliers}
          icon={Building}
          variant="default"
        />
        <StatCard
          title="Fournisseurs à payer"
          value={suppliersWithDebts}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Total dettes"
          value={formatCurrency(totalDebts)}
          icon={CreditCard}
          variant="destructive"
        />
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par nom ou contact..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9 max-w-md"
        />
      </div>

      {/* Suppliers Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredSuppliers.map((supplier) => (
          <Card key={supplier.id} className="hover:shadow-soft transition-shadow">
            <CardContent className="p-4">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarFallback className="bg-accent/10 text-accent font-medium">
                      {getInitials(supplier.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{supplier.name}</h3>
                    {supplier.contact && (
                      <p className="text-sm text-muted-foreground">
                        {supplier.contact}
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
                    <DropdownMenuItem>Voir détails</DropdownMenuItem>
                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                    <DropdownMenuItem>Historique achats</DropdownMenuItem>
                    <DropdownMenuItem>Nouvelle commande</DropdownMenuItem>
                    <DropdownMenuItem>Enregistrer paiement</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
                      Supprimer
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              {/* Contact Info */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {supplier.phone}
                </div>
                {supplier.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    <span className="truncate">{supplier.email}</span>
                  </div>
                )}
                {supplier.address && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3 w-3" />
                    <span className="truncate">{supplier.address}</span>
                  </div>
                )}
              </div>

              {/* Stats */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 mb-3">
                <div className="flex items-center gap-2 text-sm">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <span className="text-muted-foreground">Total achats:</span>
                </div>
                <span className="font-semibold font-mono-numbers">
                  {formatCurrency(supplier.totalPurchases)}
                </span>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Solde</span>
                <Badge
                  className={cn(
                    supplier.balance < 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {supplier.balance < 0
                    ? `À payer: ${formatCurrency(Math.abs(supplier.balance))}`
                    : "Soldé"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredSuppliers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun fournisseur trouvé
        </div>
      )}
    </div>
  );
}
