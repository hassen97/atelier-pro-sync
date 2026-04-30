import { useState, useMemo } from "react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Download, FileText, Filter, TrendingUp, TrendingDown,
  Store, Wrench, DollarSign, Smartphone, Search,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ShopStat {
  rank: number;
  name: string;
  city: string;
  repairs: number;
  revenue: number;
  growth: string;
  status: "active" | "pending" | "suspended";
}

// ─── Mock data (replace with real Supabase queries) ───────────────────────────
const REVENUE_DATA = [
  { month: "Nov", revenue: 12400, repairs: 310 },
  { month: "Dec", revenue: 15800, repairs: 395 },
  { month: "Jan", revenue: 11200, repairs: 280 },
  { month: "Feb", revenue: 17600, repairs: 440 },
  { month: "Mar", revenue: 21300, repairs: 532 },
  { month: "Apr", revenue: 19800, repairs: 495 },
];

const DEVICE_DATA = [
  { name: "Mobile",   value: 52, color: "#00D4FF" },
  { name: "Laptop",   value: 30, color: "#6366F1" },
  { name: "Tablette", value: 18, color: "#F59E0B" },
];

const REPAIR_TYPES = [
  { type: "Ecran",      count: 284, revenue: 11240 },
  { type: "Batterie",   count: 198, revenue: 5940  },
  { type: "Carte mere", count: 87,  revenue: 8700  },
  { type: "Connecteur", count: 156, revenue: 4680  },
  { type: "Logiciel",   count: 220, revenue: 6600  },
  { type: "Autre",      count: 50,  revenue: 2500  },
];

const TOP_SHOPS: ShopStat[] = [
  { rank: 1, name: "TechFix Tunis",      city: "Tunis",       repairs: 213, revenue: 9870, growth: "+18%", status: "active"   },
  { rank: 2, name: "Cool Store SBZ",     city: "Sidi Bouzid", repairs: 148, revenue: 6240, growth: "+12%", status: "active"   },
  { rank: 3, name: "iRepair Sfax",       city: "Sfax",        repairs: 97,  revenue: 4310, growth: "+5%",  status: "active"   },
  { rank: 4, name: "SmartCare Sousse",   city: "Sousse",      repairs: 55,  revenue: 2100, growth: "-3%",  status: "pending"  },
  { rank: 5, name: "MobileDoc Bizerte",  city: "Bizerte",     repairs: 42,  revenue: 1890, growth: "+2%",  status: "active"   },
  { rank: 6, name: "RepairHub Monastir", city: "Monastir",    repairs: 38,  revenue: 1670, growth: "-1%",  status: "suspended"},
];

const TOTAL_REVENUE = TOP_SHOPS.reduce((s, sh) => s + sh.revenue, 0);

// ─── Helpers ──────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-white/[0.07] bg-[#0D1A2D] p-3 text-xs shadow-xl">
      <p className="mb-2 text-slate-500">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color }} className="font-semibold font-mono">
          {p.name}: {typeof p.value === "number" && p.name?.toLowerCase().includes("rev")
            ? `${p.value.toLocaleString()} TND`
            : p.value}
        </p>
      ))}
    </div>
  );
};

const KpiCard = ({
  label, value, sub, trend, accent = "#00D4FF", Icon: IconComp,
}: {
  label: string; value: string; sub?: string; trend?: string;
  accent?: string; Icon: React.ElementType;
}) => (
  <div
    className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-white/10 hover:bg-white/[0.04]"
    style={{ boxShadow: `0 0 0 0 ${accent}` }}
  >
    <div className="mb-4 flex items-start justify-between">
      <span className="text-xs text-slate-500 font-medium">{label}</span>
      <div className="flex h-8 w-8 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
        <IconComp size={15} style={{ color: accent }} />
      </div>
    </div>
    <div className="mb-2 font-mono text-2xl font-bold tracking-tighter text-white">{value}</div>
    <div className="flex items-center gap-2">
      {trend && (
        <span className={cn("text-xs font-semibold", trend.startsWith("+") ? "text-emerald-400" : "text-red-400")}>
          {trend.startsWith("+") ? <TrendingUp size={11} className="mr-0.5 inline" /> : <TrendingDown size={11} className="mr-0.5 inline" />}
          {trend}
        </span>
      )}
      {sub && <span className="text-xs text-slate-600">{sub}</span>}
    </div>
  </div>
);

const statusBadge = (status: ShopStat["status"]) => {
  const map = {
    active:    "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending:   "bg-amber-500/10 text-amber-400 border-amber-500/20",
    suspended: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  const label = { active: "Actif", pending: "En attente", suspended: "Suspendu" };
  return (
    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", map[status])}>
      {label[status]}
    </span>
  );
};

// ─── Export helpers ───────────────────────────────────────────────────────────
const exportCSV = (shops: ShopStat[], range: string) => {
  const header = ["Rang", "Boutique", "Ville", "Reparations", "Revenu (TND)", "Croissance", "Statut"];
  const rows = shops.map(s => [s.rank, s.name, s.city, s.repairs, s.revenue, s.growth, s.status]);
  const csv = [header, ...rows].map(r => r.join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `rapport-boutiques-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

const exportJSON = (shops: ShopStat[], range: string) => {
  const blob = new Blob([JSON.stringify({ range, generatedAt: new Date().toISOString(), shops }, null, 2)], { type: "application/json" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `rapport-boutiques-${range}-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

// ─── Component ────────────────────────────────────────────────────────────────
export const AdminReportsView = () => {
  const [dateRange, setDateRange] = useState("6m");
  const [shopFilter, setShopFilter] = useState("all");
  const [deviceFilter, setDeviceFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const filteredShops = useMemo(() =>
    TOP_SHOPS.filter(s =>
      (shopFilter === "all" || s.name.toLowerCase().includes(shopFilter)) &&
      (search === "" || s.name.toLowerCase().includes(search.toLowerCase()) || s.city.toLowerCase().includes(search.toLowerCase()))
    ), [shopFilter, search]);

  const handleExport = (type: "csv" | "json") => {
    if (type === "csv") exportCSV(filteredShops, dateRange);
    if (type === "json") exportJSON(filteredShops, dateRange);
    setExportSuccess(type.toUpperCase());
    setTimeout(() => setExportSuccess(null), 3000);
  };

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-white">Rapports & Export</h1>
          <p className="mt-0.5 text-xs text-slate-500">Analysez les performances de la plateforme et exportez vos donnees</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport("csv")}
            className="border-white/10 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:text-emerald-300 hover:border-emerald-500/30 gap-1.5"
          >
            <FileText size={13} /> Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport("json")}
            className="bg-gradient-to-r from-[#00D4FF] to-[#0066FF] text-white hover:opacity-90 hover:shadow-[0_4px_12px_rgba(0,212,255,0.3)] gap-1.5 transition-all"
          >
            <Download size={13} /> Export JSON
          </Button>
        </div>
      </div>

      {/* Export success toast */}
      {exportSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-2.5 text-sm text-emerald-400">
          <span className="text-base">✓</span>
          Rapport {exportSuccess} telecharge avec succes
        </div>
      )}

      {/* ── Filter bar ── */}
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <Filter size={12} /> Filtres
        </div>

        {/* Date range */}
        <div className="flex gap-1">
          {[["1m","1 mois"],["3m","3 mois"],["6m","6 mois"],["1y","1 an"]] .map(([v, l]) => (
            <button
              key={v}
              onClick={() => setDateRange(v)}
              className={cn(
                "rounded-lg px-3 py-1 text-xs font-medium transition-all",
                dateRange === v
                  ? "bg-[#00D4FF]/15 text-[#00D4FF]"
                  : "bg-white/5 text-slate-500 hover:text-slate-300"
              )}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="h-5 w-px bg-white/[0.07]" />

        <Select value={shopFilter} onValueChange={setShopFilter}>
          <SelectTrigger className="h-8 w-44 border-white/10 bg-white/5 text-xs text-slate-400">
            <SelectValue placeholder="Toutes les boutiques" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0D1526] text-slate-300">
            <SelectItem value="all">Toutes les boutiques</SelectItem>
            <SelectItem value="techfix">TechFix Tunis</SelectItem>
            <SelectItem value="cool">Cool Store SBZ</SelectItem>
            <SelectItem value="irepair">iRepair Sfax</SelectItem>
          </SelectContent>
        </Select>

        <Select value={deviceFilter} onValueChange={setDeviceFilter}>
          <SelectTrigger className="h-8 w-40 border-white/10 bg-white/5 text-xs text-slate-400">
            <SelectValue placeholder="Tous les appareils" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-[#0D1526] text-slate-300">
            <SelectItem value="all">Tous les appareils</SelectItem>
            <SelectItem value="mobile">Mobile</SelectItem>
            <SelectItem value="laptop">Laptop</SelectItem>
            <SelectItem value="tablet">Tablette</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* ── KPI row ── */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="Revenu total"        value="97.8K TND" trend="+8.4%"  sub="6 mois"             accent="#00D4FF" Icon={DollarSign}  />
        <KpiCard label="Total reparations"   value="2 452"     trend="+12%"   sub="toutes boutiques"   accent="#6366F1" Icon={Wrench}      />
        <KpiCard label="Valeur moy. ticket"  value="39.9 TND"  trend="+2.1%"  sub="par reparation"     accent="#10B981" Icon={TrendingUp}  />
        <KpiCard label="Boutiques actives"   value="40"        trend="+3"     sub="ce mois"            accent="#F59E0B" Icon={Store}       />
      </div>

      {/* ── Charts ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        {/* Revenue area chart */}
        <div className="col-span-2 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-white">Evolution du revenu</h3>
              <p className="mt-0.5 text-xs text-slate-500">Mensuel · Toutes boutiques</p>
            </div>
            <div className="flex gap-4 text-xs">
              {[["#00D4FF","Revenu"],["#6366F1","Reparations"]].map(([c, l]) => (
                <span key={l} className="flex items-center gap-1.5 text-slate-500">
                  <span className="h-2 w-2 rounded-full" style={{ background: c }} /> {l}
                </span>
              ))}
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={REVENUE_DATA}>
              <defs>
                {[["revGrad","#00D4FF"],["repGrad","#6366F1"]].map(([id, color]) => (
                  <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor={color} stopOpacity={0.18} />
                    <stop offset="95%" stopColor={color} stopOpacity={0}    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
              <XAxis dataKey="month" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="revenue"  name="Revenue"      stroke="#00D4FF" strokeWidth={2.5} fill="url(#revGrad)" dot={false} />
              <Area type="monotone" dataKey="repairs"  name="Reparations"  stroke="#6366F1" strokeWidth={2.5} fill="url(#repGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Device pie */}
        <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
          <h3 className="text-sm font-semibold text-white">Par appareil</h3>
          <p className="mb-4 mt-0.5 text-xs text-slate-500">Distribution des reparations</p>
          <ResponsiveContainer width="100%" height={140}>
            <PieChart>
              <Pie data={DEVICE_DATA} cx="50%" cy="50%" innerRadius={42} outerRadius={60} dataKey="value" strokeWidth={0}>
                {DEVICE_DATA.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-4 flex flex-col gap-2.5">
            {DEVICE_DATA.map(d => (
              <div key={d.name} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-xs text-slate-500">
                  <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                  {d.name}
                </span>
                <div className="flex items-center gap-3">
                  <div className="h-1 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
                  </div>
                  <span className="w-8 text-right font-mono text-xs font-semibold text-white">{d.value}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Repair types bar chart ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5">
        <div className="mb-5">
          <h3 className="text-sm font-semibold text-white">Volume par type de reparation</h3>
          <p className="mt-0.5 text-xs text-slate-500">Nombre de reparations par categorie</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={REPAIR_TYPES} layout="vertical" barSize={10}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
            <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="type" tick={{ fill: "rgba(255,255,255,0.4)", fontSize: 11 }} axisLine={false} tickLine={false} width={80} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey="count" name="Reparations" radius={[0, 5, 5, 0]}>
              {REPAIR_TYPES.map((_, i) => (
                <Cell key={i} fill={`hsl(${220 + i * 20}, 80%, ${55 + i * 3}%)`} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Shop performance table ── */}
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.025]">
        <div className="flex flex-wrap items-center gap-3 border-b border-white/[0.05] px-5 py-4">
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-white">Performance par boutique</h3>
            <p className="mt-0.5 text-xs text-slate-500">Classement detaille · {filteredShops.length} boutiques</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <Input
                placeholder="Rechercher..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 w-44 border-white/10 bg-white/5 pl-8 text-xs text-slate-300 placeholder:text-slate-600 focus-visible:ring-[#00D4FF]/30"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport("csv")}
              className="h-8 border-white/10 bg-white/5 text-xs text-slate-400 hover:text-white gap-1.5"
            >
              <Download size={12} /> Exporter
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-white/[0.04] bg-white/[0.015]">
                {["#","Boutique","Reparations","Revenu","Part du CA","Croissance","Statut"].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-600">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filteredShops.map(s => {
                const share = ((s.revenue / TOTAL_REVENUE) * 100).toFixed(1);
                const isPos = s.growth.startsWith("+");
                return (
                  <tr key={s.rank} className="border-b border-white/[0.03] transition-colors hover:bg-white/[0.025] last:border-0">
                    <td className="px-5 py-3.5 font-mono text-xs text-slate-600">#{s.rank}</td>
                    <td className="px-5 py-3.5">
                      <div className="text-sm font-semibold text-white">{s.name}</div>
                      <div className="text-xs text-slate-500">{s.city}</div>
                    </td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-300">{s.repairs}</td>
                    <td className="px-5 py-3.5 font-mono text-sm text-slate-300">{s.revenue.toLocaleString()} TND</td>
                    <td className="px-5 py-3.5">
                      <div className="mb-1 font-mono text-xs text-slate-500">{share}%</div>
                      <div className="h-1 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-[#00D4FF] to-[#6366F1] transition-all duration-700"
                          style={{ width: `${share}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn("text-sm font-semibold flex items-center gap-1", isPos ? "text-emerald-400" : "text-red-400")}>
                        {isPos ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                        {s.growth}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">{statusBadge(s.status)}</td>
                  </tr>
                );
              })}
              {filteredShops.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-sm text-slate-600">
                    Aucun resultat trouve pour "{search}"
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Device revenue breakdown ── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {DEVICE_DATA.map(d => {
          const repairs = Math.round(2452 * d.value / 100);
          const revenue = Math.round(97800 * d.value / 100);
          return (
            <div key={d.name} className="rounded-2xl border border-white/[0.06] bg-white/[0.025] p-5 transition-all hover:-translate-y-0.5 hover:border-white/10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${d.color}18` }}>
                  <Smartphone size={16} style={{ color: d.color }} />
                </div>
                <div>
                  <div className="text-sm font-semibold text-white">{d.name}</div>
                  <div className="text-xs text-slate-500">{d.value}% du total</div>
                </div>
                <span className="ml-auto font-mono text-xl font-bold" style={{ color: d.color }}>{d.value}%</span>
              </div>
              <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${d.value}%`, background: d.color }} />
              </div>
              <div className="flex justify-between text-xs text-slate-500">
                <span>{repairs.toLocaleString()} reparations</span>
                <span className="font-mono font-medium text-slate-300">{revenue.toLocaleString()} TND</span>
              </div>
            </div>
          );
        })}
      </div>

    </div>
  );
};
