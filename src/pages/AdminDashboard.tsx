import { useState } from "react";
import { Loader2 } from "lucide-react";
import { useAdminData } from "@/hooks/useAdmin";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminShopsView } from "@/components/admin/AdminShopsView";
import { AdminAnnouncementsView } from "@/components/admin/AdminAnnouncementsView";
import { AdminFeedbackInbox } from "@/components/admin/AdminFeedbackInbox";

type AdminView = "overview" | "shops" | "announcements" | "feedback";

const AdminDashboard = () => {
  const { isLoading } = useAdminData();
  const [activeView, setActiveView] = useState<AdminView>("overview");

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
    <div className="flex h-screen bg-gradient-to-br from-[#0B1120] via-[#0F172A] to-[#0B1120] text-white overflow-hidden">
      <AdminSidebar active={activeView} onNavigate={setActiveView} />
      <main className="flex-1 overflow-auto p-6">
        {activeView === "overview" && <AdminOverview />}
        {activeView === "shops" && <AdminShopsView />}
        {activeView === "announcements" && <AdminAnnouncementsView />}
        {activeView === "feedback" && <AdminFeedbackInbox />}
      </main>
    </div>
  );
};

export default AdminDashboard;
