import { Store, Users, Wrench, DollarSign, Activity, ShoppingCart, Wifi } from "lucide-react";
import { useAdminData, useAdminRevenue, useAdminActivity } from "@/hooks/useAdmin";
import { useAdminFeedback } from "@/hooks/useFeedback";
import { AdminStatCard } from "./AdminStatCard";
import { AdminActivityFeed } from "./AdminActivityFeed";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export function AdminOverview() {
  const { data } = useAdminData();
  const { data: revenue } = useAdminRevenue();
  const { data: feedbackData } = useAdminFeedback();

  const newFeedbackCount = feedbackData?.filter((f) => f.status === "new").length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <AdminStatCard
          title="Boutiques enregistrées"
          value={data?.stats.total_owners || 0}
          icon={Store}
          color="blue"
        />
        <AdminStatCard
          title="Boutiques actives"
          value={data?.stats.active_now_count || 0}
          icon={Wifi}
          color="green"
        />
        <AdminStatCard
          title="Employés total"
          value={data?.stats.total_employees || 0}
          icon={Users}
          color="green"
        />
        <AdminStatCard
          title="Réparations total"
          value={data?.stats.total_repairs || 0}
          icon={Wrench}
          color="amber"
        />
        <AdminStatCard
          title="Chiffre d'affaires"
          value={revenue ? `${(revenue.total_revenue / 1000).toFixed(1)}K` : "—"}
          icon={DollarSign}
          color="green"
          subtitle={revenue ? `Ventes: ${revenue.sales_revenue.toFixed(0)} | Réparations: ${revenue.repair_revenue.toFixed(0)}` : undefined}
        />
      </div>

      {/* Activity + Feedback Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 admin-glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="h-4 w-4 text-[#00D4FF]" />
            <h3 className="font-semibold text-white text-sm">Activité récente</h3>
          </div>
          <AdminActivityFeed />
        </div>

        <div className="admin-glass-card rounded-xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <ShoppingCart className="h-4 w-4 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">Feedback</h3>
          </div>
          {newFeedbackCount > 0 ? (
            <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
              <span className="text-2xl font-bold text-amber-400 font-mono-numbers">{newFeedbackCount}</span>
              <span className="text-sm text-amber-300">nouveaux retours en attente</span>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Aucun nouveau feedback</p>
          )}
        </div>
      </div>
    </div>
  );
}
