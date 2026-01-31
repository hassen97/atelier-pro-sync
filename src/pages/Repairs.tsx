import { useState } from "react";
import {
  Search,
  Plus,
  Filter,
  MoreHorizontal,
  Clock,
  CheckCircle2,
  Loader2,
  Phone,
  Wrench as WrenchIcon,
  Calendar,
} from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatCurrency } from "@/lib/currency";
import { cn } from "@/lib/utils";

// Mock repair data
const repairs = [
  {
    id: "REP-001",
    customer: "Ahmed Ben Ali",
    phone: "98 765 432",
    device: "iPhone 14 Pro",
    imei: "352345678901234",
    issue: "Écran cassé",
    diagnosis: "Remplacement écran complet nécessaire",
    status: "in_progress",
    depositDate: "2024-01-15",
    estimatedDate: "2024-01-17",
    parts: [{ name: "Écran iPhone 14 Pro", cost: 220.000 }],
    labor: 40.000,
    total: 260.000,
    paid: 100.000,
  },
  {
    id: "REP-002",
    customer: "Fatma Trabelsi",
    phone: "55 123 456",
    device: "Samsung Galaxy S23",
    imei: "356789012345678",
    issue: "Batterie ne charge plus",
    diagnosis: "Batterie défectueuse - à remplacer",
    status: "completed",
    depositDate: "2024-01-14",
    estimatedDate: "2024-01-15",
    deliveredDate: "2024-01-15",
    parts: [{ name: "Batterie Samsung S23", cost: 55.000 }],
    labor: 30.000,
    total: 85.000,
    paid: 85.000,
  },
  {
    id: "REP-003",
    customer: "Mohamed Khelifi",
    phone: "22 456 789",
    device: "Huawei P30 Pro",
    issue: "Port de charge défectueux",
    status: "pending",
    depositDate: "2024-01-16",
    parts: [],
    labor: 0,
    total: 65.000,
    paid: 0,
  },
  {
    id: "REP-004",
    customer: "Sarra Bouazizi",
    phone: "97 654 321",
    device: "iPhone 13",
    issue: "Caméra arrière floue",
    diagnosis: "Module caméra à remplacer",
    status: "completed",
    depositDate: "2024-01-13",
    deliveredDate: "2024-01-16",
    parts: [{ name: "Caméra arrière iPhone 13", cost: 120.000 }],
    labor: 30.000,
    total: 150.000,
    paid: 150.000,
  },
  {
    id: "REP-005",
    customer: "Karim Mejri",
    phone: "20 987 654",
    device: "Xiaomi 12",
    issue: "Écran + vitre tactile",
    diagnosis: "Chute - remplacement complet",
    status: "in_progress",
    depositDate: "2024-01-15",
    estimatedDate: "2024-01-18",
    parts: [{ name: "Écran Xiaomi 12", cost: 90.000 }],
    labor: 30.000,
    total: 120.000,
    paid: 50.000,
  },
];

const statusConfig = {
  pending: {
    label: "En attente",
    icon: Clock,
    className: "bg-warning/10 text-warning border-warning/20",
  },
  in_progress: {
    label: "En cours",
    icon: Loader2,
    className: "bg-primary/10 text-primary border-primary/20",
  },
  completed: {
    label: "Terminé",
    icon: CheckCircle2,
    className: "bg-success/10 text-success border-success/20",
  },
  delivered: {
    label: "Livré",
    icon: CheckCircle2,
    className: "bg-accent/10 text-accent border-accent/20",
  },
};

export default function Repairs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab =
      activeTab === "all" ||
      repair.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusCounts = () => ({
    all: repairs.length,
    pending: repairs.filter((r) => r.status === "pending").length,
    in_progress: repairs.filter((r) => r.status === "in_progress").length,
    completed: repairs.filter((r) => r.status === "completed").length,
  });

  const counts = getStatusCounts();

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Réparations"
        description="Suivi et gestion des fiches de réparation"
      >
        <Button className="bg-gradient-primary hover:opacity-90">
          <Plus className="h-4 w-4 mr-2" />
          Nouvelle réparation
        </Button>
      </PageHeader>

      {/* Search & Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par client, appareil ou N° réparation..."
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

      {/* Status Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">
            Toutes ({counts.all})
          </TabsTrigger>
          <TabsTrigger value="pending">
            En attente ({counts.pending})
          </TabsTrigger>
          <TabsTrigger value="in_progress">
            En cours ({counts.in_progress})
          </TabsTrigger>
          <TabsTrigger value="completed">
            Terminées ({counts.completed})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRepairs.map((repair) => {
              const status = statusConfig[repair.status as keyof typeof statusConfig];
              const StatusIcon = status.icon;
              const remaining = repair.total - repair.paid;

              return (
                <Card key={repair.id} className="hover:shadow-soft transition-shadow">
                  <CardContent className="p-4">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs text-muted-foreground">
                            {repair.id}
                          </span>
                          <Badge className={cn("text-xs", status.className)}>
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {status.label}
                          </Badge>
                        </div>
                        <h3 className="font-semibold mt-1">{repair.customer}</h3>
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
                          <DropdownMenuItem>Imprimer fiche</DropdownMenuItem>
                          <DropdownMenuItem className="text-destructive">
                            Annuler
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>

                    {/* Device Info */}
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-4 w-4 text-muted-foreground" />
                        <span>{repair.device}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <WrenchIcon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">{repair.issue}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-muted-foreground">
                          Dépôt: {new Date(repair.depositDate).toLocaleDateString("fr-TN")}
                        </span>
                      </div>
                    </div>

                    {/* Pricing */}
                    <div className="flex items-center justify-between pt-3 border-t border-border">
                      <div>
                        <span className="text-sm text-muted-foreground">Total: </span>
                        <span className="font-bold font-mono-numbers">
                          {formatCurrency(repair.total)}
                        </span>
                      </div>
                      {remaining > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          Reste: {formatCurrency(remaining)}
                        </Badge>
                      )}
                      {remaining === 0 && repair.paid > 0 && (
                        <Badge className="bg-success/10 text-success border-success/20 text-xs">
                          Payé
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredRepairs.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              Aucune réparation trouvée
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
