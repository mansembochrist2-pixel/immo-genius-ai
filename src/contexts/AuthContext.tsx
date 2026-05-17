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
        setTimeout(() => { ensureProfileForSession(session).catch(() => {}); }, 0);
      }
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      const authPage = ["/login", "/signup", "/forgot-password"].includes(window.location.pathname);
      if (!session && !authPage && localStorage.getItem(demoOptOutKey) !== "true") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: "demo@estate-ai.app",
          password: "DemoEstate2026!",
        });
        if (!error && data.session) {
          setSession(data.session);
          setUser(data.user);
          ensureProfileForSession(data.session).catch(() => {});
        }
      } else {
        setSession(session);
        setUser(session?.user ?? null);
        if (session) ensureProfileForSession(session).catch(() => {});
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
