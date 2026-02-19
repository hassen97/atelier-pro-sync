import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

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

// Direct fetch to Supabase Auth REST API with timeout + retries
// Bypasses Chrome Android Data Saver/proxy issues with the JS client
async function authFetch(endpoint: string, body: Record<string, unknown>): Promise<{ data: any; error: Error | null }> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": SUPABASE_ANON_KEY,
          "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
        mode: "cors",
        credentials: "omit",
        cache: "no-store",
      });
      clearTimeout(timeout);

      const json = await res.json();

      if (!res.ok) {
        const msg = json?.error_description || json?.error || json?.msg || "Erreur d'authentification";
        return { data: null, error: new Error(String(msg)) };
      }

      return { data: json, error: null };
    } catch (err) {
      clearTimeout(timeout);
      const message = (err as Error).message || "";
      const name = (err as Error).name || "";
      const isNetworkError = name === "AbortError" ||
        message.includes("Failed to fetch") ||
        message.includes("NetworkError") ||
        message.includes("Load failed") ||
        message.includes("aborted");

      if (isNetworkError && attempt < 2) {
        await new Promise(r => setTimeout(r, (attempt + 1) * 500));
        continue;
      }
      if (isNetworkError) {
        return { data: null, error: new Error("Erreur de connexion réseau. Vérifiez votre connexion internet et réessayez.") };
      }
      return { data: null, error: err as Error };
    }
  }
  return { data: null, error: new Error("Erreur inattendue") };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const usernameToEmail = (username: string) => `${username.toLowerCase()}@repairpro.local`;

  const signUp = async (username: string, password: string, fullName: string) => {
    const internalEmail = usernameToEmail(username);

    const { data, error } = await authFetch("signup", {
      email: internalEmail,
      password,
      data: {
        full_name: fullName,
        username: username.toLowerCase(),
      },
    });

    if (error) return { error };

    // If signup returns a session, set it
    if (data?.access_token && data?.refresh_token) {
      await supabase.auth.setSession({
        access_token: data.access_token,
        refresh_token: data.refresh_token,
      });
    }

    return { error: null };
  };

  const signIn = async (username: string, password: string) => {
    const internalEmail = usernameToEmail(username);

    const { data, error } = await authFetch("token?grant_type=password", {
      email: internalEmail,
      password,
    });

    if (error) return { error };

    // Sync session with the Supabase client
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) return { error: sessionError };
    return { error: null };
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
