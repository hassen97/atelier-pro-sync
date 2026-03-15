import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface ImpersonationContextType {
  /** The user ID being impersonated, or null */
  impersonatedUserId: string | null;
  /** Whether impersonation mode is active */
  isImpersonating: boolean;
  /** Whether mutations should be blocked */
  isReadOnly: boolean;
  /** Shop name of the impersonated tenant */
  impersonatedShopName: string | null;
  /** Exit impersonation and return to admin */
  exitImpersonation: () => void;
}

const ImpersonationContext = createContext<ImpersonationContextType>({
  impersonatedUserId: null,
  isImpersonating: false,
  isReadOnly: false,
  impersonatedShopName: null,
  exitImpersonation: () => {},
});

export function ImpersonationProvider({ children }: { children: ReactNode }) {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const impersonateParam = searchParams.get("impersonate");
  const modeParam = searchParams.get("mode");

  const [impersonatedUserId, setImpersonatedUserId] = useState<string | null>(null);
  const [shopName, setShopName] = useState<string | null>(null);
  const [verified, setVerified] = useState(false);

  // Verify admin role and activate impersonation
  useEffect(() => {
    if (!impersonateParam || !user) {
      setImpersonatedUserId(null);
      setShopName(null);
      setVerified(false);
      return;
    }

    const verify = async () => {
      // Check that the current user is platform_admin
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "platform_admin")
        .maybeSingle();

      if (!roleData) {
        toast.error("Accès non autorisé");
        navigate("/", { replace: true });
        return;
      }

      // Fetch the shop name for the impersonated user
      const { data: settings } = await supabase
        .from("shop_settings")
        .select("shop_name")
        .eq("user_id", impersonateParam)
        .maybeSingle();

      setImpersonatedUserId(impersonateParam);
      setShopName(settings?.shop_name || "Boutique");
      setVerified(true);
    };

    verify();
  }, [impersonateParam, user, navigate]);

  const exitImpersonation = useCallback(() => {
    setImpersonatedUserId(null);
    setShopName(null);
    setVerified(false);
    navigate("/admin", { replace: true });
  }, [navigate]);

  const isImpersonating = verified && !!impersonatedUserId;
  const isReadOnly = isImpersonating && modeParam === "readonly";

  return (
    <ImpersonationContext.Provider
      value={{
        impersonatedUserId: isImpersonating ? impersonatedUserId : null,
        isImpersonating,
        isReadOnly,
        impersonatedShopName: shopName,
        exitImpersonation,
      }}
    >
      {children}
    </ImpersonationContext.Provider>
  );
}

export function useImpersonation() {
  return useContext(ImpersonationContext);
}
