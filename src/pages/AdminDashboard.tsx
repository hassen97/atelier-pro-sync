import { useState } from "react";
import { Loader2, Menu } from "lucide-react";
import { useAdminData } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminShopsView } from "@/components/admin/AdminShopsView";
import { AdminAnnouncementsView } from "@/components/admin/AdminAnnouncementsView";
import { AdminFeedbackInbox } from "@/components/admin/AdminFeedbackInbox";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";

type AdminView = "overview" | "shops" | "announcements" | "feedback" | "reset_requests";

const AdminDashboard = () => {
  const { isLoading } = useAdminData();
  const [activeView, setActiveView] = useState<AdminView>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isMobile = useIsMobile();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#0B1120]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-[#00D4FF]" />
          <p className="text-slate-400 text-sm">Chargement du centre de commande...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#0B1120] text-white overflow-hidden">
      {/* Mobile top bar */}
      {isMobile && (
        <header className="flex items-center gap-3 px-4 py-3 border-b border-white/10 shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
          >
            <Menu className="h-5 w-5 text-slate-300" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#00D4FF] to-[#0099CC] flex items-center justify-center">
              <span className="text-white font-bold text-xs">⚡</span>
            </div>
            <span className="font-semibold text-sm text-white">Centre de Commande</span>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Desktop sidebar */}
        {!isMobile && (
          <aside className="w-64 shrink-0 admin-glass border-r border-white/10 h-full">
            <AdminSidebar active={activeView} onNavigate={setActiveView} />
          </aside>
        )}

        {/* Mobile sidebar sheet */}
        {isMobile && (
          <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
            <SheetContent
              side="left"
              className="w-64 p-0 bg-[#0B1120] border-r border-white/10"
            >
              <AdminSidebar
                active={activeView}
                onNavigate={setActiveView}
                onClose={() => setSidebarOpen(false)}
              />
            </SheetContent>
          </Sheet>
        )}

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {activeView === "overview" && <AdminOverview />}
          {activeView === "shops" && <AdminShopsView />}
          {activeView === "reset_requests" && <AdminResetRequests />}
          {activeView === "announcements" && <AdminAnnouncementsView />}
          {activeView === "feedback" && <AdminFeedbackInbox />}
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
