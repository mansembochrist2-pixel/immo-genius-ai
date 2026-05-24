import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Compact credits indicator shown in the app header.
 * Reads `credits_remaining` + `plan` from `profiles` (RLS-protected).
 */
export function CreditsBadge() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const { data } = useQuery({
    queryKey: ["profile-credits", user?.id],
    enabled: !!user,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("credits_remaining, plan")
        .eq("id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  if (!data) return null;
  const credits = data.credits_remaining ?? 0;
  const low = credits <= 5;

  return (
    <button
      onClick={() => navigate("/settings")}
      className={cn(
        "hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs transition-colors",
        low
          ? "border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20"
          : "border-border/70 bg-surface-1/60 hover:bg-surface-1"
      )}
      title={`Plan ${data.plan} — ${credits} crédits IA restants ce mois-ci`}
    >
      <Sparkles className="h-3.5 w-3.5 text-accent" />
      <span className="font-medium tabular-nums">{credits}</span>
      <span className="text-muted-foreground">crédits</span>
    </button>
  );
}
