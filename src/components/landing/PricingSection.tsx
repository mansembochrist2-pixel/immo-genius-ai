import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Check, Sparkles, Zap, Crown, ArrowRight, Building2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Plan {
  name: string;
  tagline: string;
  price: number;
  daily: number;
  icon: typeof Sparkles;
  highlight?: boolean;
  perks: string[];
}

const PLANS: Plan[] = [
  {
    name: "Starter",
    tagline: "Pour démarrer votre conquête de mandats",
    price: 59,
    daily: 50,
    icon: Sparkles,
    perks: [
      "Accès complet à tous les modules",
      "50 crédits rechargés chaque matin",
      "Crédits non utilisés cumulés (rollover)",
      "Pige IA + Radar + Estimation + Studio",
      "Copilote stratégique illimité en conseil",
      "Support email sous 24 h",
    ],
  },
  {
    name: "Pro",
    tagline: "Le choix des agents qui signent",
    price: 119,
    daily: 150,
    icon: Zap,
    highlight: true,
    perks: [
      "Tout du plan Starter, sans limite d'usage humain",
      "150 crédits rechargés chaque matin",
      "Cumul mensuel jusqu'à votre rythme réel",
      "Audits IA réseaux sociaux illimités",
      "Génération de mandats Hoguet / ALUR prioritaire",
      "Support prioritaire & accompagnement onboarding",
    ],
  },
  {
    name: "Expert",
    tagline: "Agences & top performers",
    price: 249,
    daily: 500,
    icon: Crown,
    perks: [
      "Tout du plan Pro, conçu pour les gros volumes",
      "500 crédits rechargés chaque matin",
      "Rollover massif pour campagnes intensives",
      "Multi-zones & multi-cibles en parallèle",
      "Accès anticipé aux nouvelles fonctionnalités",
      "Account manager dédié",
    ],
  },
];

/** Animated price counter — counts from 0 to target when in viewport */
const AnimatedPrice = ({ value, durationMs = 1400 }: { value: number; durationMs?: number }) => {
  const [display, setDisplay] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setStarted(true)),
      { threshold: 0.3 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    const start = performance.now();
    let raf = 0;
    const tick = (t: number) => {
      const p = Math.min(1, (t - start) / durationMs);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(eased * value));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, value, durationMs]);

  return (
    <span ref={ref} className="tabular-nums">{display}</span>
  );
};

export const PricingSection = () => {
  const navigate = useNavigate();
  return (
    <section id="tarifs" className="max-w-7xl mx-auto px-6 py-24 relative">
      {/* Subtle blueprint accents */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.04]"
           style={{ backgroundImage: "linear-gradient(hsl(var(--primary)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--primary)) 1px, transparent 1px)", backgroundSize: "48px 48px" }} />

      <div className="text-center max-w-2xl mx-auto mb-14 relative">
        <div className="eyebrow justify-center mb-4">
          <span className="h-px w-8 bg-primary/60" /> Tarifs
        </div>
        <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
          Choisissez votre <span className="gradient-text">rythme de chasse</span>.
        </h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Toute la plateforme dans chaque plan. Seul votre quota quotidien de crédits change — et ce que vous n'utilisez pas est <span className="text-foreground font-medium">cumulé pour le lendemain</span>.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 relative">
        {PLANS.map((plan) => {
          const Icon = plan.icon;
          return (
            <div
              key={plan.name}
              className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-300 ${
                plan.highlight
                  ? "border-primary/60 bg-gradient-to-b from-primary/[0.08] to-surface-1 shadow-[0_30px_80px_-30px_hsl(var(--primary)/0.5)] md:-translate-y-2"
                  : "border-border/70 bg-surface-1 hover:border-primary/30"
              }`}
            >
              {plan.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 chip border-primary/50 text-primary bg-background">
                  <Sparkles className="h-3 w-3" /> Le plus choisi
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div className={`h-11 w-11 rounded-xl grid place-items-center ${plan.highlight ? "bg-primary/15 border border-primary/40" : "bg-primary/10 border border-primary/20"}`}>
                  <Icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <div>
                  <p className="font-display text-xl font-semibold leading-none">{plan.name}</p>
                  <p className="text-xs text-muted-foreground mt-1">{plan.tagline}</p>
                </div>
              </div>

              {/* Animated price */}
              <div className="my-3">
                <div className="flex items-end gap-1.5">
                  <span className="font-display text-5xl md:text-6xl font-semibold leading-none tracking-tight">
                    <AnimatedPrice value={plan.price} />
                    <span className="text-2xl align-top ml-0.5">€</span>
                  </span>
                  <span className="text-sm text-muted-foreground pb-2">HT / mois</span>
                </div>
                {/* Animated fill bar */}
                <div className="mt-4 h-1.5 rounded-full bg-border/60 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-accent rounded-full origin-left"
                    style={{
                      width: `${(plan.daily / 500) * 100}%`,
                      animation: "pricing-fill 1.6s cubic-bezier(.22,.61,.36,1) both",
                    }}
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1.5">
                  <Building2 className="h-3 w-3 text-primary" />
                  <span><span className="text-foreground font-semibold tabular-nums">{plan.daily}</span> crédits rechargés chaque matin · cumulables</span>
                </p>
              </div>

              <ul className="space-y-2.5 my-5 flex-1">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex items-start gap-2.5 text-sm">
                    <Check className={`h-4 w-4 mt-0.5 shrink-0 ${plan.highlight ? "text-primary" : "text-success"}`} />
                    <span className="text-foreground/90 leading-snug">{perk}</span>
                  </li>
                ))}
              </ul>

              <Button
                onClick={() => navigate("/signup")}
                size="lg"
                variant={plan.highlight ? "default" : "outline"}
                className={`w-full rounded-xl mt-auto ${plan.highlight ? "shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]" : ""}`}
              >
                Choisir {plan.name} <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-10 max-w-2xl mx-auto">
        Tous les plans incluent <span className="text-foreground font-medium">100 % de la plateforme</span> : Pige IA, Radar, Estimation, Expertise, Studio IA, Copilote, audits réseaux sociaux. Vos crédits non utilisés sont <span className="text-foreground font-medium">automatiquement cumulés</span> sur votre solde mensuel — vous ne perdez jamais ce que vous n'avez pas consommé.
      </p>

      <style>{`
        @keyframes pricing-fill {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }
      `}</style>
    </section>
  );
};
