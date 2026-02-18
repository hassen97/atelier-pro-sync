import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Plus, Shield } from "lucide-react";
import { useAdminData } from "@/hooks/useAdmin";
import { AdminStats } from "@/components/admin/AdminStats";
import { ShopOwnersList } from "@/components/admin/ShopOwnersList";
import { CreateOwnerDialog } from "@/components/admin/CreateOwnerDialog";

const AdminDashboard = () => {
  const { data, isLoading } = useAdminData();
  const [createOpen, setCreateOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto flex items-center justify-between py-4 px-4">
          <div className="flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Administration Plateforme</h1>
          </div>
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nouveau propriétaire
          </Button>
        </div>
      </div>

      <div className="container mx-auto p-4 space-y-6">
        {data?.stats && <AdminStats stats={data.stats} />}
        <div>
          <h2 className="text-lg font-semibold mb-4">Propriétaires de boutiques</h2>
          <ShopOwnersList owners={data?.owners || []} />
        </div>
      </div>

      <CreateOwnerDialog open={createOpen} onOpenChange={setCreateOpen} />
    </div>
  );
};

export default AdminDashboard;
