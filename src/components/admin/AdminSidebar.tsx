import { cn } from "@/lib/utils";
import { LayoutDashboard, Store, Megaphone, MessageSquare, LogOut, KeyRound } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

type AdminView = "overview" | "shops" | "announcements" | "feedback" | "reset_requests";

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  onClose?: () => void;
}

const navItems = [
  { id: "overview" as const, label: "Dashboard", icon: LayoutDashboard },
  { id: "shops" as const, label: "Boutiques", icon: Store },
  { id: "reset_requests" as const, label: "Demandes", icon: KeyRound },
  { id: "announcements" as const, label: "Annonces", icon: Megaphone },
  { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
];

export function AdminSidebar({ active, onNavigate, onClose }: AdminSidebarProps) {
  const { signOut } = useAuth();

  const handleNavigate = (view: AdminView) => {
    onNavigate(view);
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center">
            <span className="text-white font-bold text-lg">⚡</span>
          </div>
          <div>
            <h1 className="font-bold text-white text-sm">Centre de Commande</h1>
            <p className="text-xs text-slate-400">Platform Admin</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              active === item.id
                ? "bg-[#00D4FF]/10 text-[#00D4FF] shadow-[inset_0_0_20px_rgba(0,212,255,0.05)]"
                : "text-slate-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </button>
        ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/10">
        <button
          onClick={signOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Déconnexion
        </button>
      </div>
    </div>
  );
}
