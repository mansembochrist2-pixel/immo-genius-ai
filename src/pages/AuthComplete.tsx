import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, MailCheck, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const AuthComplete = () => {
  const { session, user, loading } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState("Création de votre espace agent...");

  useEffect(() => {
    if (loading) return;

    let cancelled = false;

    const finalize = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const idToken = hash.get("id_token");
      const providerToken = hash.get("provider_token") || hash.get("access_token");
      const providerRefreshToken = hash.get("refresh_token");
      const expiresIn = Number(hash.get("expires_in") || 3600);

      let activeSession = session;
      let activeUser = user;

      if (!activeSession && idToken && providerToken) {
        setStatus("Création de votre session agent...");
        const { data, error } = await supabase.auth.signInWithIdToken({
          provider: "google",
          token: idToken,
          access_token: providerToken,
        });
        if (error) throw error;
        activeSession = data.session;
        activeUser = data.user;
        window.history.replaceState(null, "", window.location.pathname + window.location.search);
      }

      if (!activeSession || !activeUser) {
        navigate("/login", { replace: true });
        return;
      }

      setStatus("Connexion sécurisée à Gmail...");
      const { data: fresh } = await supabase.auth.getSession();
      activeSession = fresh.session ?? activeSession;

      const fullName = activeUser.user_metadata?.full_name || activeUser.user_metadata?.name || activeUser.email?.split("@")[0] || "Agent immobilier";
      await supabase.from("profiles").upsert({
        id: activeUser.id,
        email: activeUser.email ?? null,
        full_name: fullName,
      }, { onConflict: "id" });

      const gmailAccessToken = providerToken || activeSession.provider_token;
      if (!gmailAccessToken) {
        throw new Error("Token Google Gmail manquant");
      }

      setStatus("Lecture des 50 derniers emails...");
      const connect = await supabase.functions.invoke("gmail-connect-from-session", {
        body: {
          provider_token: gmailAccessToken,
          provider_refresh_token: providerRefreshToken || activeSession.provider_refresh_token,
          expires_in: expiresIn,
        },
      });
      if (connect.error) throw connect.error;

      setStatus("Import dans Inbox...");
      const sync = await supabase.functions.invoke("sync-emails", { body: { provider: "gmail" } });
      if (sync.error) throw sync.error;

      const { data: imported } = await supabase
        .from("inbox_messages")
        .select("id")
        .eq("user_id", activeUser.id)
        .eq("canal", "email")
        .limit(1);

      if (!imported?.length) {
        await supabase.functions.invoke("sync-emails", { body: { provider: "gmail" } });
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_completed")
        .eq("id", activeUser.id)
        .maybeSingle();

      if (!cancelled) {
        setStatus("Préparation de votre copilote IA...");
        setTimeout(() => {
          navigate(profile?.onboarding_completed ? "/dashboard" : "/onboarding", { replace: true });
        }, 700);
      }
    };

    finalize().catch((error) => {
      console.warn("Finalisation Google/Gmail échouée:", error);
      toast.error("Connexion Gmail incomplète", {
        description: "Reconnectez-vous avec Google pour autoriser la lecture des 50 derniers emails.",
      });
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