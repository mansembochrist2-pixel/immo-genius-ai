import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Crown, ArrowRight, Flame } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

const PERKS = [
  "Accès complet à tous les modules",
  "Radar de prospection illimité en consultation",
  "120 crédits IA par mois (estimations, analyses, courriers, annonces)",
  "Toutes les sources officielles : DVF · DPE ADEME · INSEE · BAN",
  "Support email",
  "Sans engagement, résiliable à tout moment",
];

export const PricingSection = () => {
  const navigate = useNavigate();
  const [founder, setFounder] = useState<{ remaining: number; total: number } | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.functions.invoke("founder-stats");
        if (data && typeof data.remaining === "number") setFounder(data);
      } catch {/* silent */}
    })();
  }, []);

  const founderOpen = !founder || founder.remaining > 0;

  return (
    <section id="tarifs" className="max-w-6xl mx-auto px-6 py-24 relative">
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
           style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="text-center max-w-2xl mx-auto mb-12 relative">
        <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> Tarif</div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
          Un seul plan. <span className="gradient-text">Tout inclus.</span>
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Pas de palier, pas de surprise. Toute la plateforme dans un seul abonnement.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 relative">
        {/* Founder offer */}
        <div className={`relative rounded-2xl border-2 ${founderOpen ? "border-accent/60" : "border-border/70 opacity-70"} bg-gradient-to-br from-accent/[0.08] via-surface-1 to-surface-2 p-7 flex flex-col`}>
          <div className="absolute -top-3 left-6 chip border-accent/60 text-accent bg-background">
            <Flame className="h-3 w-3" /> Offre Fondateur
          </div>
          <div className="flex items-center gap-3 mb-3 mt-1">
            <div className="h-11 w-11 rounded-xl grid place-items-center bg-accent/15 border border-accent/40">
              <Crown className="h-5 w-5 text-accent" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">ImmoGenius Pro — Fondateur</p>
              <p className="text-xs text-muted-foreground mt-1">Tarif bloqué à vie pour les 30 premiers</p>
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-end gap-1.5">
              <span className="font-display text-5xl md:text-6xl font-semibold leading-none tracking-tight">
                29,99<span className="text-2xl align-top ml-0.5">€</span>
              </span>
              <span className="text-sm text-muted-foreground pb-2">/ mois à vie</span>
            </div>
            <p className="mt-3 text-xs text-foreground/90 flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-accent animate-pulse" />
              {founder
                ? founderOpen
                  ? <><span className="font-semibold tabular-nums">{founder.remaining}</span> / {founder.total} places restantes</>
                  : <>Toutes les places ont été prises.</>
                : <>Places limitées — 30 fondateurs au total</>}
            </p>
          </div>

          <ul className="space-y-2.5 my-5 flex-1">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
                <span className="text-foreground/90 leading-snug">{p}</span>
              </li>
            ))}
            <li className="flex items-start gap-2.5 text-sm">
              <Check className="h-4 w-4 mt-0.5 shrink-0 text-accent" />
              <span className="text-foreground/90 leading-snug font-medium">Voix dans la roadmap produit</span>
            </li>
          </ul>

          <Button
            onClick={() => navigate("/signup?plan=founder")}
            disabled={!founderOpen}
            size="lg"
            className="w-full rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_10px_30px_-10px_hsl(var(--accent)/0.6)]"
          >
            {founderOpen ? "Réserver ma place" : "Plus de places"} <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>

        {/* Standard plan */}
        <div className="relative rounded-2xl border border-border/70 bg-surface-1 p-7 flex flex-col hover:border-primary/30 transition-colors">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-11 w-11 rounded-xl grid place-items-center bg-primary/10 border border-primary/30">
              <Sparkles className="h-5 w-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="font-display text-xl font-semibold leading-none">ImmoGenius Pro</p>
              <p className="text-xs text-muted-foreground mt-1">Tarif standard</p>
            </div>
          </div>

          <div className="my-3">
            <div className="flex items-end gap-1.5">
              <span className="font-display text-5xl md:text-6xl font-semibold leading-none tracking-tight">
                49,99<span className="text-2xl align-top ml-0.5">€</span>
              </span>
              <span className="text-sm text-muted-foreground pb-2">/ mois</span>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Renouvellement des crédits le 1<sup>er</sup> de chaque mois
            </p>
          </div>

          <ul className="space-y-2.5 my-5 flex-1">
            {PERKS.map((p) => (
              <li key={p} className="flex items-start gap-2.5 text-sm">
                <Check className="h-4 w-4 mt-0.5 shrink-0 text-success" />
                <span className="text-foreground/90 leading-snug">{p}</span>
              </li>
            ))}
          </ul>

          <Button
            onClick={() => navigate("/signup")}
            size="lg"
            variant="outline"
            className="w-full rounded-xl"
          >
            Commencer <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
        Tous les plans incluent <span className="text-foreground font-medium">100 % de la plateforme</span>.
        La consultation du Radar et la lecture des données publiques ne consomment <span className="text-foreground font-medium">aucun crédit</span>.
      </p>
    </section>
  );
};
