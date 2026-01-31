import { useState } from "react";
import {
  Search,
  Plus,
  FileText,
  Download,
  Eye,
  MoreHorizontal,
  Calendar,
  User,
  Printer,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

// Mock invoices data
const invoices = [
  {
    id: "FAC-2024-001",
    customer: "Ahmed Ben Ali",
    date: "2024-01-15",
    type: "Réparation",
    items: 2,
    total: 260.000,
    status: "paid",
  },
  {
    id: "FAC-2024-002",
    customer: "Fatma Trabelsi",
    date: "2024-01-15",
    type: "Réparation",
    items: 1,
    total: 85.000,
    status: "paid",
  },
  {
    id: "FAC-2024-003",
    customer: "Mohamed Khelifi",
    date: "2024-01-16",
    type: "Vente",
    items: 3,
    total: 125.000,
    status: "pending",
  },
  {
    id: "FAC-2024-004",
    customer: "Sarra Bouazizi",
    date: "2024-01-14",
    type: "Réparation",
    items: 1,
    total: 150.000,
    status: "paid",
  },
  {
    id: "FAC-2024-005",
    customer: "Karim Mejri",
    date: "2024-01-13",
    type: "Vente",
    items: 5,
    total: 89.000,
    status: "paid",
  },
  {
    id: "FAC-2024-006",
    customer: "Ali Mansour",
    date: "2024-01-12",
    type: "Réparation",
    items: 2,
    total: 320.000,
    status: "partial",
  },
];

const statusConfig = {
  paid: { label: "Payée", className: "bg-success/10 text-success border-success/20" },
  pending: { label: "En attente", className: "bg-warning/10 text-warning border-warning/20" },
  partial: { label: "Partielle", className: "bg-accent/10 text-accent border-accent/20" },
};

export default function Invoices() {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredInvoices = invoices.filter(
    (invoice) =>
      invoice.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      invoice.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalInvoices = invoices.length;
  const totalAmount = invoices.reduce((sum, i) => sum + i.total, 0);
  const paidAmount = invoices
    .filter((i) => i.status === "paid")
    .reduce((sum, i) => sum + i.total, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Factures"
        description="Gestion et historique des factures"
      >
        <Button variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exporter Excel
        </Button>
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle facture
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total factures"
          value={totalInvoices}
          icon={FileText}
          variant="default"
        />
        <StatCard
          title="Montant total"
          value={formatCurrency(totalAmount)}
          icon={FileText}
          variant="accent"
        />
        <StatCard
          title="Montant encaissé"
          value={formatCurrency(paidAmount)}
          icon={FileText}
          variant="success"
        />
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Rechercher par N° ou client..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Invoices Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>N° Facture</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-center">Articles</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.map((invoice) => {
                const status = statusConfig[invoice.status as keyof typeof statusConfig];

                return (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-mono text-sm font-medium">
                      {invoice.id}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {invoice.customer}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="h-4 w-4" />
                        {new Date(invoice.date).toLocaleDateString("fr-TN")}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{invoice.type}</Badge>
                    </TableCell>
                    <TableCell className="text-center">{invoice.items}</TableCell>
                    <TableCell className="text-right font-mono-numbers font-medium">
                      {formatCurrency(invoice.total)}
                    </TableCell>
                    <TableCell>
                      <Badge className={status.className}>{status.label}</Badge>
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
                            <Eye className="h-4 w-4 mr-2" />
                            Voir
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Download className="h-4 w-4 mr-2" />
                            Télécharger PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Printer className="h-4 w-4 mr-2" />
                            Imprimer
                          </DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Annuler
                          </DropdownMenuItem>
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
