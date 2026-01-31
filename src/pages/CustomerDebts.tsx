import { useState } from "react";
import {
  Search,
  Filter,
  User,
  Phone,
  CreditCard,
  Calendar,
  MoreHorizontal,
  Banknote,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock customer debts data
const customerDebts = [
  {
    id: "1",
    customer: "Ahmed Ben Ali",
    phone: "98 765 432",
    type: "Réparation",
    reference: "REP-001",
    totalAmount: 260.000,
    paidAmount: 100.000,
    dueDate: "2024-01-20",
    createdAt: "2024-01-15",
  },
  {
    id: "2",
    customer: "Mohamed Khelifi",
    phone: "22 456 789",
    type: "Réparation",
    reference: "REP-003",
    totalAmount: 65.000,
    paidAmount: 0,
    dueDate: "2024-01-22",
    createdAt: "2024-01-16",
  },
  {
    id: "3",
    customer: "Karim Mejri",
    phone: "20 987 654",
    type: "Réparation",
    reference: "REP-005",
    totalAmount: 120.000,
    paidAmount: 50.000,
    dueDate: "2024-01-25",
    createdAt: "2024-01-15",
  },
  {
    id: "4",
    customer: "Ali Mansour",
    phone: "55 444 333",
    type: "Vente",
    reference: "VEN-042",
    totalAmount: 450.000,
    paidAmount: 200.000,
    dueDate: "2024-01-18",
    createdAt: "2024-01-10",
  },
  {
    id: "5",
    customer: "Nadia Ferchichi",
    phone: "97 222 111",
    type: "Vente",
    reference: "VEN-045",
    totalAmount: 180.000,
    paidAmount: 80.000,
    dueDate: "2024-01-28",
    createdAt: "2024-01-14",
  },
];

export default function CustomerDebts() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredDebts = customerDebts.filter(
    (debt) =>
      debt.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      debt.reference.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalDebts = customerDebts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);
  const overdueDebts = customerDebts.filter(
    (d) => new Date(d.dueDate) < new Date() && d.paidAmount < d.totalAmount
  );
  const overdueAmount = overdueDebts.reduce((sum, d) => sum + (d.totalAmount - d.paidAmount), 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Dettes Clients"
        description="Suivi des créances et paiements partiels"
      />

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total créances"
          value={formatCurrency(totalDebts)}
          icon={CreditCard}
          variant="warning"
        />
        <StatCard
          title="Clients débiteurs"
          value={customerDebts.length}
          icon={User}
          variant="default"
        />
        <StatCard
          title="Montant en retard"
          value={formatCurrency(overdueAmount)}
          subtitle={`${overdueDebts.length} créance(s) en retard`}
          icon={CreditCard}
          variant="destructive"
        />
      </div>

      {/* Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client ou référence..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Button variant="outline">
          <Filter className="h-4 w-4 mr-2" />
          Filtres
        </Button>
      </div>

      {/* Debts Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Référence</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Progression</TableHead>
                <TableHead className="text-right">Reste à payer</TableHead>
                <TableHead>Échéance</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDebts.map((debt) => {
                const remaining = debt.totalAmount - debt.paidAmount;
                const progress = (debt.paidAmount / debt.totalAmount) * 100;
                const isOverdue = new Date(debt.dueDate) < new Date() && remaining > 0;

                return (
                  <TableRow key={debt.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{debt.customer}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="h-3 w-3" />
                          {debt.phone}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{debt.type}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {debt.reference}
                    </TableCell>
                    <TableCell className="text-right font-mono-numbers">
                      {formatCurrency(debt.totalAmount)}
                    </TableCell>
                    <TableCell>
                      <div className="w-24 mx-auto">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-center text-muted-foreground mt-1">
                          {progress.toFixed(0)}%
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono-numbers font-medium text-destructive">
                      {formatCurrency(remaining)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className={cn(isOverdue && "text-destructive font-medium")}>
                          {new Date(debt.dueDate).toLocaleDateString("fr-TN")}
                        </span>
                        {isOverdue && (
                          <Badge variant="destructive" className="text-xs">
                            En retard
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Banknote className="h-4 w-4 mr-2" />
                            Enregistrer paiement
                          </DropdownMenuItem>
                          <DropdownMenuItem>Voir détails</DropdownMenuItem>
                          <DropdownMenuItem>Contacter client</DropdownMenuItem>
                          <DropdownMenuItem>Imprimer rappel</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
