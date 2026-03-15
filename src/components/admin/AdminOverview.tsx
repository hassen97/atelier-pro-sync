import { Store, Users, Wrench, DollarSign, Activity, ShoppingCart, Wifi, ClipboardList } from "lucide-react";
import { useAdminData, useAdminRevenue } from "@/hooks/useAdmin";
import { useAdminFeedback } from "@/hooks/useFeedback";
import { useWaitlistCount } from "@/hooks/useWaitlist";
import { AdminStatCard } from "./AdminStatCard";
import { AdminActivityFeed } from "./AdminActivityFeed";

export function AdminOverview() {
  const { data } = useAdminData();
  const { data: revenue } = useAdminRevenue();
  const { data: feedbackData } = useAdminFeedback();
  const { data: waitlistData } = useWaitlistCount();

  const newFeedbackCount = feedbackData?.filter((f) => f.status === "new").length || 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Bento Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <AdminStatCard
          title="Boutiques"
          value={data?.stats.total_owners || 0}
          icon={Store}
          color="blue"
        />
        <AdminStatCard
          title="En ligne"
          value={data?.stats.active_now_count || 0}
          icon={Wifi}
          color="green"
        />
        <AdminStatCard
          title="Employés"
          value={data?.stats.total_employees || 0}
          icon={Users}
          color="green"
        />
        <AdminStatCard
          title="Réparations"
          value={data?.stats.total_repairs || 0}
          icon={Wrench}
          color="amber"
        />
        <AdminStatCard
          title="Waitlist"
          value={waitlistData?.total || 0}
          icon={ClipboardList}
          color="blue"
          subtitle={waitlistData ? `+${waitlistData.recent_7d} cette semaine` : undefined}
        />
        <AdminStatCard
          title="MRR"
          value="— DT"
          icon={DollarSign}
          color="green"
          subtitle="Placeholder"
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

        <div className="admin-glass-card rounded-xl p-5 space-y-4">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <ShoppingCart className="h-4 w-4 text-emerald-400" />
              <h3 className="font-semibold text-white text-sm">Feedback</h3>
            </div>
            {newFeedbackCount > 0 ? (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <span className="text-2xl font-bold text-amber-400 font-mono-numbers">{newFeedbackCount}</span>
                <span className="text-sm text-amber-300">nouveaux retours</span>
              </div>
            ) : (
              <p className="text-sm text-slate-500">Aucun nouveau feedback</p>
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 mb-3">
              <DollarSign className="h-4 w-4 text-[#00D4FF]" />
              <h3 className="font-semibold text-white text-sm">Chiffre d'affaires</h3>
            </div>
            {revenue ? (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Ventes</span>
                  <span className="text-white font-mono-numbers">{revenue.sales_revenue.toFixed(0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Réparations</span>
                  <span className="text-white font-mono-numbers">{revenue.repair_revenue.toFixed(0)}</span>
                </div>
                <div className="border-t border-white/5 pt-2 flex justify-between text-sm font-semibold">
                  <span className="text-slate-300">Total</span>
                  <span className="text-[#00D4FF] font-mono-numbers">{(revenue.total_revenue / 1000).toFixed(1)}K</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-slate-500">—</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
