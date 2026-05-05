import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const AuthComplete = () => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Création de votre espace agent...");

  useEffect(() => {
    if (loading) return;

    if (!session || !user) {
      navigate("/login", { replace: true });
      return;
    }

    let cancelled = false;

    const finalize = async () => {
      setStatus("Connexion sécurisée à Gmail...");

      const fullName = user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split("@")[0] || "Agent immobilier";
      await supabase.from("profiles").upsert({
        id: user.id,
        email: user.email ?? null,
        full_name: fullName,
      }, { onConflict: "id" });

      if (session.provider_token) {
        setStatus("Lecture des 50 derniers emails...");
        await supabase.functions.invoke("gmail-connect-from-session", {
          body: {
            provider_token: session.provider_token,
            provider_refresh_token: session.provider_refresh_token,
            expires_in: 3600,
          },
        });
        await supabase.functions.invoke("sync-emails", { body: { provider: "gmail" } });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", user.id)
        .maybeSingle();

      if (!cancelled) {
        setStatus("Préparation de votre copilote IA...");
        setTimeout(() => {
          navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
        }, 700);
      }
    };

    finalize().catch(() => {
      if (!cancelled) navigate("/onboarding", { replace: true });
    });

    return () => {
      cancelled = true;
    };
  }, [loading, navigate, session, user]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-6">
      <section className="w-full max-w-md text-center space-y-7">
        <div className="mx-auto h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
          <MailCheck className="h-8 w-8 text-primary" />
        </div>
        <div className="space-y-3">
          <p className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="h-3.5 w-3.5 text-accent" /> Estate AI initialise votre compte
          </p>
          <h1 className="text-3xl font-bold font-display text-foreground">Analyse en cours</h1>
          <p className="text-muted-foreground">{status}</p>
        </div>
        <Loader2 className="mx-auto h-6 w-6 animate-spin text-primary" />
      </section>
    </main>
  );
};

export default AuthComplete;