import { useAdminActivity, type ActivityItem } from "@/hooks/useAdmin";
import { Wrench, ShoppingCart } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

export function AdminActivityFeed() {
  const { data, isLoading } = useAdminActivity();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-12 rounded-lg bg-white/5 animate-pulse" />
        ))}
      </div>
    );
  }

  const activities = data?.activity || [];

  if (activities.length === 0) {
    return <p className="text-sm text-slate-500">Aucune activité récente</p>;
  }

  return (
    <div className="space-y-2 max-h-[320px] overflow-y-auto pr-1">
      {activities.map((item) => (
        <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-white/5 transition-colors">
          <div className={cn(
            "p-1.5 rounded-md",
            item.type === "repair" ? "bg-amber-500/10" : "bg-emerald-500/10"
          )}>
            {item.type === "repair" ? (
              <Wrench className="h-3.5 w-3.5 text-amber-400" />
            ) : (
              <ShoppingCart className="h-3.5 w-3.5 text-emerald-400" />
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-white truncate">{item.description}</p>
            <p className="text-[10px] text-slate-500">{item.shop_name}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-mono-numbers text-slate-300">{Number(item.amount).toFixed(2)}</p>
            <p className="text-[10px] text-slate-500">
              {format(new Date(item.created_at), "dd MMM HH:mm", { locale: fr })}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
