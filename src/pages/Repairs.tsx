import { useState } from "react";
import { Search, Plus, Filter } from "lucide-react";
import { PageHeader } from "@/components/ui/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RepairCard } from "@/components/repairs/RepairCard";
import { type RepairStatus } from "@/components/repairs/RepairStatusSelect";
import { CancelRepairDialog } from "@/components/repairs/CancelRepairDialog";
import { RepairReceiptDialog } from "@/components/repairs/RepairReceiptDialog";
import { RepairDialog } from "@/components/repairs/RepairDialog";
import {
  useRepairs,
  useCreateRepair,
  useUpdateRepair,
  useUpdateRepairStatus,
  useDeleteRepair,
} from "@/hooks/useRepairs";
import { toast } from "sonner";

// Type for the repair with customer relation
interface RepairWithCustomer {
  id: string;
  customer_id: string | null;
  device_model: string;
  problem_description: string;
  diagnosis: string | null;
  status: string;
  deposit_date: string;
  delivery_date: string | null;
  imei: string | null;
  labor_cost: number;
  parts_cost: number;
  total_cost: number;
  amount_paid: number;
  notes: string | null;
  customer: {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
  } | null;
}

// Transform database repair to UI repair format
function transformRepair(dbRepair: RepairWithCustomer) {
  return {
    id: dbRepair.id,
    customer_id: dbRepair.customer_id,
    customer: dbRepair.customer?.name || "Client anonyme",
    phone: dbRepair.customer?.phone || "",
    device: dbRepair.device_model,
    imei: dbRepair.imei || undefined,
    issue: dbRepair.problem_description,
    diagnosis: dbRepair.diagnosis || undefined,
    status: dbRepair.status as RepairStatus,
    depositDate: dbRepair.deposit_date?.split("T")[0] || "",
    estimatedDate: undefined,
    deliveredDate: dbRepair.delivery_date?.split("T")[0],
    parts: [] as { name: string; cost: number }[],
    labor: Number(dbRepair.labor_cost) || 0,
    parts_cost: Number(dbRepair.parts_cost) || 0,
    total: Number(dbRepair.total_cost) || 0,
    paid: Number(dbRepair.amount_paid) || 0,
    notes: dbRepair.notes,
    // Original data for editing
    _original: dbRepair,
  };
}

export default function Repairs() {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [repairDialogOpen, setRepairDialogOpen] = useState(false);
  const [selectedRepairId, setSelectedRepairId] = useState<string | null>(null);
  const [editingRepair, setEditingRepair] = useState<RepairWithCustomer | null>(null);

  const { data: rawRepairs = [], isLoading } = useRepairs();
  const createRepair = useCreateRepair();
  const updateRepair = useUpdateRepair();
  const updateStatus = useUpdateRepairStatus();
  const deleteRepair = useDeleteRepair();

  // Transform repairs for UI
  const repairs = (rawRepairs as unknown as RepairWithCustomer[]).map(transformRepair);
  const selectedRepair = selectedRepairId
    ? repairs.find((r) => r.id === selectedRepairId) || null
    : null;

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

  const handleNewRepair = () => {
    setEditingRepair(null);
    setRepairDialogOpen(true);
  };

  const handleViewDetails = (repair: ReturnType<typeof transformRepair>) => {
    toast.info(`Affichage des détails`, {
      description: `Client: ${repair.customer} - ${repair.device}`,
    });
  };

  const handleEdit = (repair: ReturnType<typeof transformRepair>) => {
    setEditingRepair(repair._original);
    setRepairDialogOpen(true);
  };

  const handlePrint = (repair: ReturnType<typeof transformRepair>) => {
    setSelectedRepairId(repair.id);
    setReceiptDialogOpen(true);
  };

  const handleCancel = (repair: ReturnType<typeof transformRepair>) => {
    setSelectedRepairId(repair.id);
    setCancelDialogOpen(true);
  };

  const confirmCancel = () => {
    if (selectedRepairId) {
      deleteRepair.mutate(selectedRepairId, {
        onSuccess: () => {
          setCancelDialogOpen(false);
          setSelectedRepairId(null);
        },
      });
    }
  };

  const handleStatusChange = (
    repair: ReturnType<typeof transformRepair>,
    newStatus: RepairStatus
  ) => {
    updateStatus.mutate(
      { id: repair.id, status: newStatus },
      {
        onSuccess: () => {
          const statusLabels: Record<RepairStatus, string> = {
            pending: "En attente",
            in_progress: "En cours",
            completed: "Terminé",
            delivered: "Livré",
          };
          toast.success(`Statut mis à jour`, {
            description: `→ ${statusLabels[newStatus]}`,
          });
        },
      }
    );
  };

  const handleRepairSubmit = async (data: {
    customer_id?: string;
    device_model: string;
    imei?: string;
    problem_description: string;
    diagnosis?: string;
    labor_cost: number;
    parts_cost: number;
    amount_paid: number;
    notes?: string;
  }) => {
    const repairData = {
      customer_id: data.customer_id || null,
      device_model: data.device_model,
      imei: data.imei || null,
      problem_description: data.problem_description,
      diagnosis: data.diagnosis || null,
      labor_cost: data.labor_cost,
      parts_cost: data.parts_cost,
      total_cost: data.labor_cost + data.parts_cost,
      amount_paid: data.amount_paid,
      notes: data.notes || null,
    };

    if (editingRepair) {
      await updateRepair.mutateAsync({ id: editingRepair.id, ...repairData });
    } else {
      await createRepair.mutateAsync(repairData);
    }
    setRepairDialogOpen(false);
    setEditingRepair(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <PageHeader
          title="Gestion des Réparations"
          description="Suivi et gestion des fiches de réparation"
        />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

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
              {repairs.length === 0
                ? "Aucune réparation enregistrée. Cliquez sur 'Nouvelle réparation' pour commencer."
                : "Aucune réparation trouvée"}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CancelRepairDialog
        repair={selectedRepair}
        open={cancelDialogOpen}
        onOpenChange={setCancelDialogOpen}
        onConfirm={confirmCancel}
      />

      <RepairReceiptDialog
        repair={selectedRepair}
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
      />

      <RepairDialog
        open={repairDialogOpen}
        onOpenChange={setRepairDialogOpen}
        repair={editingRepair}
        onSubmit={handleRepairSubmit}
        isLoading={createRepair.isPending || updateRepair.isPending}
      />
    </div>
  );
}
