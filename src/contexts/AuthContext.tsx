import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (username: string, password: string, fullName: string) => Promise<{ error: Error | null }>;
  signIn: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  updatePassword: (newPassword: string) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener BEFORE checking session
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Convert username to internal email format
  const usernameToEmail = (username: string) => `${username.toLowerCase()}@repairpro.local`;

  const signUp = async (username: string, password: string, fullName: string) => {
    const internalEmail = usernameToEmail(username);
    
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await supabase.auth.signUp({
          email: internalEmail,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: {
              full_name: fullName,
              username: username.toLowerCase(),
            },
          },
        });
        return { error };
      } catch (error) {
        const isNetworkError = (error as Error).message?.includes("Failed to fetch") || 
                               (error as Error).message?.includes("NetworkError") ||
                               (error as Error).message?.includes("Load failed");
        if (isNetworkError && attempt < 2) {
          await new Promise(r => setTimeout(r, (attempt + 1) * 500));
          continue;
        }
        if (isNetworkError) {
          return { error: new Error("Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.") };
        }
        return { error: error as Error };
      }
    }
    return { error: new Error("Erreur inattendue") };
  };

  const signIn = async (username: string, password: string) => {
    const internalEmail = usernameToEmail(username);
    
    // Retry up to 2 times for network errors (common on mobile)
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const { error } = await supabase.auth.signInWithPassword({
          email: internalEmail,
          password,
        });
        return { error };
      } catch (error) {
        const isNetworkError = (error as Error).message?.includes("Failed to fetch") || 
                               (error as Error).message?.includes("NetworkError") ||
                               (error as Error).message?.includes("Load failed");
        if (isNetworkError && attempt < 2) {
          // Wait before retry (500ms, then 1500ms)
          await new Promise(r => setTimeout(r, (attempt + 1) * 500));
          continue;
        }
        if (isNetworkError) {
          return { error: new Error("Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.") };
        }
        return { error: error as Error };
      }
    }
    return { error: new Error("Erreur inattendue") };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updatePassword = async (newPassword: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      return { error };
    } catch (error) {
      return { error: error as Error };
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signUp, signIn, signOut, updatePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
