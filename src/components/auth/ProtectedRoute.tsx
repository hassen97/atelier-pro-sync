import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useAllowedPages } from "@/hooks/useTeam";
import { useIsPlatformAdmin } from "@/hooks/useAdmin";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useRef } from "react";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const { allowedPages, isLoading: pagesLoading } = useAllowedPages();
  const { data: isPlatformAdmin, isLoading: adminLoading } = useIsPlatformAdmin();
  const hasShownToast = useRef(false);

  const isBlocked =
    !pagesLoading &&
    allowedPages !== null &&
    !allowedPages.includes(location.pathname);

  useEffect(() => {
    if (isBlocked && !hasShownToast.current) {
      hasShownToast.current = true;
      toast.error("Accès non autorisé à cette page");
    }
  }, [isBlocked]);

  if (loading || pagesLoading || adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-muted-foreground">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Platform admin redirect logic
  // Allow platform_admin to access tenant routes when impersonating
  const isImpersonating = new URLSearchParams(location.search).has("impersonate");
  if (isPlatformAdmin && location.pathname !== "/admin" && !isImpersonating) {
    return <Navigate to="/admin" replace />;
  }
  if (!isPlatformAdmin && location.pathname === "/admin") {
    return <Navigate to="/" replace />;
  }

  if (isBlocked) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}
