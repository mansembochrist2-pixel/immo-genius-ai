import { useState, useEffect, createContext, useContext, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { User, Session } from "@supabase/supabase-js";

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  session: Session | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error: string | null }>;
  signup: (name: string, email: string, password: string) => Promise<{ error: string | null }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const demoOptOutKey = "estate-ai-demo-opt-out";

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // 🔑 CŒUR DU PRODUIT : dès que l'agent se connecte avec Google,
      // on enregistre ses tokens Gmail et on déclenche la 1re synchro
      // des 50 derniers emails — sans qu'il ait à cliquer sur quoi que ce soit.
      if (event === "SIGNED_IN" && session?.provider_token) {
        // setTimeout pour ne pas bloquer le callback Supabase (deadlock auth)
        setTimeout(() => {
          (async () => {
            try {
              await supabase.functions.invoke("gmail-connect-from-session", {
                body: {
                  provider_token: session.provider_token,
                  provider_refresh_token: session.provider_refresh_token,
                  expires_in: 3600,
                },
              });
              // Première synchro immédiate (50 derniers)
              await supabase.functions.invoke("sync-emails", {
                body: { provider: "gmail" },
              });
            } catch (e) {
              console.warn("Gmail auto-connect/sync failed:", e);
            }
          })();
        }, 0);
      }
    });

    // Mode démo : auto-connexion uniquement tant que l'utilisateur ne s'est pas explicitement déconnecté
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session && localStorage.getItem(demoOptOutKey) !== "true") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: "demo@estate-ai.app",
          password: "DemoEstate2026!",
        });
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.user);
        }
      } else {
        setSession(session);
        setUser(session.user);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const login = async (email: string, password: string) => {
    localStorage.removeItem(demoOptOutKey);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signup = async (name: string, email: string, password: string) => {
    localStorage.removeItem(demoOptOutKey);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: name },
        emailRedirectTo: window.location.origin,
      },
    });
    return { error: error?.message ?? null };
  };

  const logout = async () => {
    localStorage.setItem(demoOptOutKey, "true");
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    return { error: error?.message ?? null };
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!session, user, session, loading, login, signup, logout, resetPassword }}>
      {children}
    </AuthContext.Provider>
  );
};
