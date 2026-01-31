import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { RepairCard, type Repair } from "@/components/repairs/RepairCard";
import { type RepairStatus } from "@/components/repairs/RepairStatusSelect";

// Mock repair data
const initialRepairs: Repair[] = [
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
    parts: [{ name: "Écran iPhone 14 Pro", cost: 220.0 }],
    labor: 40.0,
    total: 260.0,
    paid: 100.0,
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
    parts: [{ name: "Batterie Samsung S23", cost: 55.0 }],
    labor: 30.0,
    total: 85.0,
    paid: 85.0,
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
    total: 65.0,
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
    parts: [{ name: "Caméra arrière iPhone 13", cost: 120.0 }],
    labor: 30.0,
    total: 150.0,
    paid: 150.0,
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
    parts: [{ name: "Écran Xiaomi 12", cost: 90.0 }],
    labor: 30.0,
    total: 120.0,
    paid: 50.0,
  },
];

export default function Repairs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [repairs, setRepairs] = useState<Repair[]>(initialRepairs);

  const filteredRepairs = repairs.filter((repair) => {
    const matchesSearch =
      repair.customer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.device.toLowerCase().includes(searchQuery.toLowerCase()) ||
      repair.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "all" || repair.status === activeTab;
    return matchesSearch && matchesTab;
  });

  const getStatusCounts = () => ({
    all: repairs.length,
    pending: repairs.filter((r) => r.status === "pending").length,
    in_progress: repairs.filter((r) => r.status === "in_progress").length,
    completed: repairs.filter((r) => r.status === "completed").length,
  });

  const counts = getStatusCounts();

  const handleViewDetails = (repair: Repair) => {
    toast.info(`Affichage des détails de ${repair.id}`, {
      description: `Client: ${repair.customer} - ${repair.device}`,
    });
  };

  const handleEdit = (repair: Repair) => {
    toast.info(`Modification de ${repair.id}`, {
      description: "Fonctionnalité à venir",
    });
  };

  const handlePrint = (repair: Repair) => {
    toast.info(`Impression de la fiche ${repair.id}`, {
      description: "Préparation de l'impression...",
    });
    // In a real app, this would open a print dialog
    window.print();
  };

  const handleCancel = (repair: Repair) => {
    toast.error(`Annulation de ${repair.id}`, {
      description: "Êtes-vous sûr de vouloir annuler cette réparation?",
    });
  };

  const handleStatusChange = (repair: Repair, newStatus: RepairStatus) => {
    setRepairs((prev) =>
      prev.map((r) =>
        r.id === repair.id
          ? {
              ...r,
              status: newStatus,
              deliveredDate:
                newStatus === "delivered"
                  ? new Date().toISOString().split("T")[0]
                  : r.deliveredDate,
            }
          : r
      )
    );
    
    const statusLabels: Record<RepairStatus, string> = {
      pending: "En attente",
      in_progress: "En cours",
      completed: "Terminé",
      delivered: "Livré",
    };
    
    toast.success(`Statut mis à jour`, {
      description: `${repair.id} → ${statusLabels[newStatus]}`,
    });
  };

  const handleNewRepair = () => {
    toast.info("Nouvelle réparation", {
      description: "Fonctionnalité à venir",
    });
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Gestion des Réparations"
        description="Suivi et gestion des fiches de réparation"
      >
        <Button
          className="bg-gradient-primary hover:opacity-90"
          onClick={handleNewRepair}
        >
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
          <TabsTrigger value="all">Toutes ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">En attente ({counts.pending})</TabsTrigger>
          <TabsTrigger value="in_progress">En cours ({counts.in_progress})</TabsTrigger>
          <TabsTrigger value="completed">Terminées ({counts.completed})</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredRepairs.map((repair) => (
              <RepairCard
                key={repair.id}
                repair={repair}
                onViewDetails={handleViewDetails}
                onEdit={handleEdit}
                onPrint={handlePrint}
                onCancel={handleCancel}
                onStatusChange={handleStatusChange}
              />
            ))}
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
