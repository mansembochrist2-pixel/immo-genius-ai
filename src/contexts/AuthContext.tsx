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

const ensureProfileForSession = async (session: Session) => {
  const fullName =
    session.user.user_metadata?.full_name ||
    session.user.user_metadata?.name ||
    session.user.email?.split("@")[0] ||
    "Agent immobilier";

  const { error } = await supabase.from("profiles").upsert({
    id: session.user.id,
    email: session.user.email ?? null,
    full_name: fullName,
  }, { onConflict: "id" });

  if (error) console.warn("Profile auto-create failed:", error.message);
};

const startGmailSyncFromSession = async (session: Session) => {
  if (!session.provider_token) return;

  const syncKey = `estate-ai-gmail-sync-started:${session.user.id}`;
  if (sessionStorage.getItem(syncKey) === "true") return;
  sessionStorage.setItem(syncKey, "true");

  const connect = await supabase.functions.invoke("gmail-connect-from-session", {
    body: {
      provider_token: session.provider_token,
      provider_refresh_token: session.provider_refresh_token,
      expires_in: 3600,
    },
  });
  if (connect.error) throw connect.error;

  const sync = await supabase.functions.invoke("sync-emails", {
    body: { provider: "gmail" },
  });
  if (sync.error) throw sync.error;
};

const runPostLoginSideEffects = (session: Session) => {
  setTimeout(() => {
    (async () => {
      try {
        await ensureProfileForSession(session);
        await startGmailSyncFromSession(session);
      } catch (e) {
        console.warn("Post-login setup failed:", e);
      }
    })();
  }, 0);
};

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

      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) {
        runPostLoginSideEffects(session);
      }
    });

    // Mode démo : auto-connexion uniquement tant que l'utilisateur ne s'est pas explicitement déconnecté
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authPage = ["/login", "/signup", "/forgot-password", "/auth/complete"].includes(window.location.pathname);
      if (!session && !authPage && localStorage.getItem(demoOptOutKey) !== "true") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: "demo@estate-ai.app",
          password: "DemoEstate2026!",
        });
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.user);
          runPostLoginSideEffects(data.session);
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) runPostLoginSideEffects(session);
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
