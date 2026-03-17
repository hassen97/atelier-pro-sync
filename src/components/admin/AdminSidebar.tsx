import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Store, Megaphone, MessageSquare, LogOut, KeyRound,
  Settings, Users, CreditCard, Tags, ToggleRight, ClipboardList, Shield,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AdminView = "overview" | "shops" | "announcements" | "feedback" | "reset_requests" | "settings" | "employees" | "plans" | "gateways" | "feature_flags" | "waitlist" | "signup_attempts" | "orders";

interface AdminSidebarProps {
  active: AdminView;
  onNavigate: (view: AdminView) => void;
  onClose?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const navSections = [
  {
    label: "Écosystème",
    items: [
      { id: "overview" as const, label: "Dashboard", icon: LayoutDashboard },
      { id: "shops" as const, label: "Boutiques", icon: Store },
      { id: "employees" as const, label: "Employés", icon: Users },
      { id: "waitlist" as const, label: "Liste d'attente", icon: ClipboardList },
    ],
  },
  {
    label: "Monétisation",
    items: [
      { id: "plans" as const, label: "Tarifs & Plans", icon: Tags },
      { id: "gateways" as const, label: "Paiements", icon: CreditCard },
    ],
  },
  {
    label: "Engagement",
    items: [
      { id: "reset_requests" as const, label: "Demandes", icon: KeyRound },
      { id: "announcements" as const, label: "Annonces", icon: Megaphone },
      { id: "feedback" as const, label: "Feedback", icon: MessageSquare },
    ],
  },
  {
    label: "Sécurité & Système",
    items: [
      { id: "signup_attempts" as const, label: "Tentatives", icon: Shield },
      { id: "settings" as const, label: "Paramètres", icon: Settings },
    ],
  },
];

export function AdminSidebar({ active, onNavigate, onClose, collapsed = false, onToggleCollapse }: AdminSidebarProps) {
  const { signOut } = useAuth();

  const handleNavigate = (view: AdminView) => {
    onNavigate(view);
    onClose?.();
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.div
        className="flex flex-col h-full"
        animate={{ width: collapsed ? 64 : 256 }}
        transition={{ duration: 0.25, ease: "easeInOut" }}
        style={{ overflow: "hidden" }}
      >
        {/* Header */}
        <div className={cn("flex items-center border-b border-white/10 shrink-0 transition-all duration-250", collapsed ? "p-3 justify-center" : "p-4 justify-between")}>
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                key="expanded"
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-2.5 min-w-0"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(0,212,255,0.4)]">
                  <span className="text-white font-bold text-sm">⚡</span>
                </div>
                <div className="min-w-0">
                  <h1 className="font-bold text-white text-xs tracking-wide truncate">Centre de Commande</h1>
                  <p className="text-[10px] text-slate-500 tracking-wider uppercase">Ultra Admin</p>
                </div>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.18 }}
                className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shadow-[0_0_12px_rgba(0,212,255,0.4)]"
              >
                <span className="text-white font-bold text-sm">⚡</span>
              </motion.div>
            )}
          </AnimatePresence>
          {onToggleCollapse && !onClose && (
            <button
              onClick={onToggleCollapse}
              className={cn(
                "p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-white/5 transition-all shrink-0",
                collapsed && "mt-0"
              )}
            >
              {collapsed ? <ChevronRight className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
            </button>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 space-y-4 overflow-y-auto overflow-x-hidden px-2">
          {navSections.map((section) => (
            <div key={section.label}>
              <AnimatePresence>
                {!collapsed && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.15 }}
                    className="text-[10px] uppercase tracking-widest text-slate-600 font-semibold px-2 mb-1.5"
                  >
                    {section.label}
                  </motion.p>
                )}
              </AnimatePresence>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = active === item.id;
                  const btn = (
                    <motion.button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className={cn(
                        "w-full flex items-center gap-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                        collapsed ? "px-0 py-2 justify-center" : "px-2.5 py-2",
                        isActive
                          ? "bg-[#00D4FF]/10 text-[#00D4FF] shadow-[inset_0_0_16px_rgba(0,212,255,0.06)] border border-[#00D4FF]/15"
                          : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                      )}
                    >
                      <item.icon className={cn("shrink-0", collapsed ? "h-4.5 w-4.5" : "h-4 w-4", isActive && "drop-shadow-[0_0_6px_rgba(0,212,255,0.6)]")} style={{ width: collapsed ? 18 : 16, height: collapsed ? 18 : 16 }} />
                      <AnimatePresence>
                        {!collapsed && (
                          <motion.span
                            initial={{ opacity: 0, width: 0 }}
                            animate={{ opacity: 1, width: "auto" }}
                            exit={{ opacity: 0, width: 0 }}
                            transition={{ duration: 0.15 }}
                            className="truncate overflow-hidden whitespace-nowrap"
                          >
                            {item.label}
                          </motion.span>
                        )}
                      </AnimatePresence>
                    </motion.button>
                  );
                  if (collapsed) {
                    return (
                      <Tooltip key={item.id}>
                        <TooltipTrigger asChild>{btn}</TooltipTrigger>
                        <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-white text-xs">
                          {item.label}
                        </TooltipContent>
                      </Tooltip>
                    );
                  }
                  return btn;
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className={cn("p-2 border-t border-white/10 shrink-0")}>
          {collapsed ? (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={signOut}
                  className="w-full flex items-center justify-center p-2 rounded-lg text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" className="bg-[#0F172A] border-white/10 text-red-400 text-xs">
                Déconnexion
              </TooltipContent>
            </Tooltip>
          ) : (
            <button
              onClick={signOut}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium text-red-400/70 hover:text-red-400 hover:bg-red-500/10 transition-all"
            >
              <LogOut className="h-4 w-4 shrink-0" />
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="truncate"
              >
                Déconnexion
              </motion.span>
            </button>
          )}
        </div>
      </motion.div>
    </TooltipProvider>
  );
}
