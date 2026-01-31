import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  Receipt,
  Calendar,
  Building,
  MoreHorizontal,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock expenses data
const expenses = [
  { id: "1", date: "2024-01-15", description: "Loyer local", category: "Loyer", supplier: null, amount: 1200.000 },
  { id: "2", date: "2024-01-14", description: "Facture STEG", category: "Électricité", supplier: null, amount: 180.000 },
  { id: "3", date: "2024-01-13", description: "Achat écrans iPhone", category: "Stock", supplier: "TechParts Tunisia", amount: 2200.000 },
  { id: "4", date: "2024-01-12", description: "Publicité Facebook", category: "Marketing", supplier: null, amount: 150.000 },
  { id: "5", date: "2024-01-11", description: "Facture Ooredoo", category: "Télécom", supplier: null, amount: 89.000 },
  { id: "6", date: "2024-01-10", description: "Achat batteries", category: "Stock", supplier: "Battery Plus", amount: 850.000 },
  { id: "7", date: "2024-01-09", description: "Fournitures bureau", category: "Fournitures", supplier: null, amount: 65.000 },
  { id: "8", date: "2024-01-08", description: "Entretien climatisation", category: "Maintenance", supplier: null, amount: 120.000 },
];

const categories = ["Toutes", "Loyer", "Électricité", "Stock", "Marketing", "Télécom", "Fournitures", "Maintenance"];

export default function Expenses() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");

  const filteredExpenses = expenses.filter((expense) => {
    const matchesSearch = expense.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === "Toutes" || expense.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
  const stockExpenses = expenses.filter((e) => e.category === "Stock").reduce((sum, e) => sum + e.amount, 0);
  const fixedExpenses = expenses.filter((e) => ["Loyer", "Électricité", "Télécom"].includes(e.category)).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Dépenses"
        description="Suivi des dépenses fixes et variables"
      >
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle dépense
        </Button>
      </PageHeader>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Total dépenses (mois)"
          value={formatCurrency(totalExpenses)}
          icon={Receipt}
          variant="destructive"
        />
        <StatCard
          title="Achats stock"
          value={formatCurrency(stockExpenses)}
          icon={Receipt}
          variant="accent"
        />
        <StatCard
          title="Charges fixes"
          value={formatCurrency(fixedExpenses)}
          icon={Receipt}
          variant="warning"
        />
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une dépense..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedCategory} onValueChange={setSelectedCategory}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Catégorie" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {cat}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead>Fournisseur</TableHead>
                <TableHead className="text-right">Montant</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredExpenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell className="text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {new Date(expense.date).toLocaleDateString("fr-TN")}
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">{expense.description}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">{expense.category}</Badge>
                  </TableCell>
                  <TableCell>
                    {expense.supplier ? (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-muted-foreground" />
                        <span>{expense.supplier}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right font-mono-numbers font-medium text-destructive">
                    -{formatCurrency(expense.amount)}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
