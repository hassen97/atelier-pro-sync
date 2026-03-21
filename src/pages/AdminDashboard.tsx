import { useState, useEffect, useCallback } from "react";
import { Loader2, Menu, Search } from "lucide-react";
import { useAdminData } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminShopsView } from "@/components/admin/AdminShopsView";
import { AdminAnnouncementsView } from "@/components/admin/AdminAnnouncementsView";
import { AdminFeedbackInbox } from "@/components/admin/AdminFeedbackInbox";
import { AdminResetRequests } from "@/components/admin/AdminResetRequests";
import { AdminSettingsView } from "@/components/admin/AdminSettingsView";
import { AdminEmployeesView } from "@/components/admin/AdminEmployeesView";
import { AdminPlansView } from "@/components/admin/AdminPlansView";
import { AdminPaymentGatewaysView } from "@/components/admin/AdminPaymentGatewaysView";
import { AdminFeatureFlagsView } from "@/components/admin/AdminFeatureFlagsView";
import { AdminWaitlistView } from "@/components/admin/AdminWaitlistView";
import { AdminSignupAttemptsView } from "@/components/admin/AdminSignupAttemptsView";
import { AdminCommandPalette } from "@/components/admin/AdminCommandPalette";
import { AdminOrdersView } from "@/components/admin/AdminOrdersView";
import { AdminCommunityView } from "@/components/admin/AdminCommunityView";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";

type AdminView = "overview" | "shops" | "announcements" | "feedback" | "reset_requests" | "settings" | "employees" | "plans" | "gateways" | "feature_flags" | "waitlist" | "signup_attempts" | "orders" | "community";

const viewLabels: Record<AdminView, string> = {
  overview: "Dashboard",
  shops: "Boutiques",
  employees: "Employés",
  waitlist: "Liste d'attente",
  plans: "Tarifs & Plans",
  gateways: "Paiements",
  orders: "Commandes",
  reset_requests: "Demandes",
  announcements: "Annonces",
  feedback: "Feedback",
  community: "Communauté",
  signup_attempts: "Tentatives de connexion",
  settings: "Paramètres",
  feature_flags: "Feature Flags",
};

const AdminDashboard = () => {
  const { isLoading } = useAdminData();
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const isMobile = useIsMobile();

  // Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const handleNavigate = useCallback((view: string) => {
    setActiveView(view as AdminView);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B1120]">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <Loader2 className="h-8 w-8 animate-spin text-[#00D4FF]" />
            <div className="absolute inset-0 blur-xl bg-[#00D4FF]/20 rounded-full" />
          </div>
          <p className="text-slate-500 text-xs tracking-wide">Chargement du centre de commande...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#080E1A] via-[#0B1120] to-[#080E1A] text-white overflow-hidden">

      {/* Mobile header */}
      {isMobile && (
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0"
          style={{ background: "hsla(215, 28%, 10%, 0.8)", backdropFilter: "blur(12px)" }}>
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
            <Menu className="h-5 w-5 text-slate-400" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0066FF] flex items-center justify-center shadow-[0_0_10px_rgba(0,212,255,0.3)]">
              <span className="text-white font-bold text-xs">⚡</span>
            </div>
            <span className="font-semibold text-sm text-white">Centre de Commande</span>
          </div>
          <button
            onClick={() => setCmdOpen(true)}
            className="ml-auto p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Search className="h-4 w-4 text-slate-400" />
          </button>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside
            className="shrink-0 admin-glass border-r border-white/[0.06] h-full transition-all duration-250"
            style={{ width: sidebarCollapsed ? 64 : 240 }}
          >
            <AdminSidebar
              active={activeView}
              onNavigate={setActiveView}
              collapsed={sidebarCollapsed}
              onToggleCollapse={() => setSidebarCollapsed(v => !v)}
            />
          </aside>
        )}

        {/* Mobile sheet sidebar */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent side="left" className="w-60 p-0 bg-[#080E1A] border-r border-white/[0.06]">
              <AdminSidebar
                active={activeView}
                onNavigate={setActiveView}
                onClose={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-auto">
          {/* Top bar */}
          {!isMobile && (
            <div
              className="sticky top-0 z-10 flex items-center justify-between px-6 py-3 border-b border-white/[0.05]"
              style={{ background: "hsla(215, 28%, 9%, 0.85)", backdropFilter: "blur(12px)" }}
            >
              <div>
                <h2 className="text-sm font-semibold text-white">{viewLabels[activeView]}</h2>
                <p className="text-[10px] text-slate-600">Ultra Admin · Centre de Commande</p>
              </div>
              <button
                onClick={() => setCmdOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-white/[0.06] hover:bg-white/5 transition-all group"
                style={{ background: "hsla(215, 28%, 12%, 0.6)" }}
              >
                <Search className="h-3.5 w-3.5 text-slate-500 group-hover:text-slate-400" />
                <span className="text-xs text-slate-600 group-hover:text-slate-500">Rechercher...</span>
                <kbd className="ml-2 text-[10px] text-slate-700 border border-white/[0.06] rounded px-1.5 py-0.5 font-mono">⌘K</kbd>
              </button>
            </div>
          )}

          {/* View content with animation */}
          <div className="p-4 sm:p-6">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeView}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2, ease: "easeOut" }}
              >
                {activeView === "overview" && <AdminOverview />}
                {activeView === "shops" && <AdminShopsView />}
                {activeView === "reset_requests" && <AdminResetRequests />}
                {activeView === "announcements" && <AdminAnnouncementsView />}
                {activeView === "feedback" && <AdminFeedbackInbox />}
                {activeView === "settings" && <AdminSettingsView />}
                {activeView === "employees" && <AdminEmployeesView />}
                {activeView === "plans" && <AdminPlansView />}
                {activeView === "gateways" && <AdminPaymentGatewaysView />}
                {activeView === "feature_flags" && <AdminFeatureFlagsView />}
                {activeView === "waitlist" && <AdminWaitlistView />}
                {activeView === "signup_attempts" && <AdminSignupAttemptsView />}
                {activeView === "orders" && <AdminOrdersView />}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* Command Palette */}
      <AdminCommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        onNavigate={handleNavigate}
      />
    </div>
  );
};

export default AdminDashboard;
