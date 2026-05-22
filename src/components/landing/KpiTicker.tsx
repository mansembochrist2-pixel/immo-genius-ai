/**
 * Looping marquee with KPI / city pills — gives a "live" SaaS feel.
 */
const items = [
  "Pige IA · 12 nouvelles annonces",
  "Lyon 6 · score 87",
  "Paris 16 · vendeur détecté",
  "Bordeaux · DVF +4,3%",
  "Estimation · 3 dossiers prêts",
  "Mandat IA · généré en 28s",
  "Marseille 8 · zone porteuse",
  "Copilote · 5 actions priorisées",
  "Nantes · radar 91/100",
  "Toulouse · +6 piges chaudes",
  "Annecy · valorisation +8,1%",
  "Studio IA · post LinkedIn prêt",
];

export function KpiTicker() {
  const doubled = [...items, ...items];
  return (
    <div className="ticker py-4 border-y border-border/50 bg-surface-1/40 backdrop-blur-sm">
      <div className="ticker-track">
        {doubled.map((label, i) => (
          <div key={i} className="flex items-center gap-3 shrink-0">
            <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />
            <span className="text-mono text-xs uppercase tracking-wider text-muted-foreground">
              {label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
