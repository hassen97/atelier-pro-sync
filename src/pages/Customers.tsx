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

// Mock customer data
const customers = [
  {
    id: "1",
    name: "Ahmed Ben Ali",
    phone: "98 765 432",
    email: "ahmed.benali@email.com",
    totalPurchases: 1250.000,
    totalRepairs: 8,
    balance: -180.000, // negative = owes money
    lastVisit: "2024-01-15",
  },
  {
    id: "2",
    name: "Fatma Trabelsi",
    phone: "55 123 456",
    email: "fatma.t@email.com",
    totalPurchases: 890.000,
    totalRepairs: 5,
    balance: 0,
    lastVisit: "2024-01-14",
  },
  {
    id: "3",
    name: "Mohamed Khelifi",
    phone: "22 456 789",
    totalPurchases: 450.000,
    totalRepairs: 3,
    balance: -65.000,
    lastVisit: "2024-01-16",
  },
  {
    id: "4",
    name: "Sarra Bouazizi",
    phone: "97 654 321",
    email: "sarra.b@email.com",
    totalPurchases: 2100.000,
    totalRepairs: 12,
    balance: 0,
    lastVisit: "2024-01-13",
  },
  {
    id: "5",
    name: "Karim Mejri",
    phone: "20 987 654",
    totalPurchases: 780.000,
    totalRepairs: 4,
    balance: -70.000,
    lastVisit: "2024-01-15",
  },
  {
    id: "6",
    name: "Leila Gharbi",
    phone: "50 111 222",
    email: "leila.g@email.com",
    totalPurchases: 1560.000,
    totalRepairs: 6,
    balance: 0,
    lastVisit: "2024-01-12",
  },
];

export default function Customers() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery)
  );

  const totalCustomers = customers.length;
  const totalDebts = customers.reduce(
    (sum, c) => sum + Math.abs(Math.min(0, c.balance)),
    0
  );
  const customersWithDebts = customers.filter((c) => c.balance < 0).length;

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
        title="Gestion des Clients"
        description="Fiches clients et historique"
      >
        <Button className="bg-gradient-primary hover:opacity-90">
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
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {customer.phone}
                    </p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>Voir profil</DropdownMenuItem>
                    <DropdownMenuItem>Modifier</DropdownMenuItem>
                    <DropdownMenuItem>Historique achats</DropdownMenuItem>
                    <DropdownMenuItem>Historique réparations</DropdownMenuItem>
                    <DropdownMenuItem className="text-destructive">
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <ShoppingBag className="h-3 w-3" />
                    Achats
                  </div>
                  <p className="font-semibold font-mono-numbers">
                    {formatCurrency(customer.totalPurchases)}
                  </p>
                </div>
                <div className="p-2 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
                    <Wrench className="h-3 w-3" />
                    Réparations
                  </div>
                  <p className="font-semibold">{customer.totalRepairs}</p>
                </div>
              </div>

              {/* Balance */}
              <div className="flex items-center justify-between pt-3 border-t border-border">
                <span className="text-sm text-muted-foreground">Solde</span>
                <Badge
                  className={cn(
                    customer.balance < 0
                      ? "bg-destructive/10 text-destructive border-destructive/20"
                      : "bg-success/10 text-success border-success/20"
                  )}
                >
                  {customer.balance < 0
                    ? `Doit: ${formatCurrency(Math.abs(customer.balance))}`
                    : "À jour"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredCustomers.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          Aucun client trouvé
        </div>
      )}
    </div>
  );
}
