import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, TrendingUp, Wallet, Gauge, PiggyBank } from "lucide-react";
import type { ExpertiseResults } from "@/lib/expertise-calc";

const fmtEur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")} %`;

interface Props { results: ExpertiseResults; }

const TOOLTIPS: Record<string, string> = {
  net_net: "La rentabilité Nette-Nette intègre TOUT : loyers, vacance, charges, taxes, gestion, entretien ET impôts. C'est le seul vrai indicateur de performance — celui que les pros utilisent.",
  cashflow: "C'est l'argent qui reste réellement sur votre compte chaque mois après crédit, charges et impôts. Positif = votre bien s'autofinance et vous rapporte. Négatif = il vous coûte chaque mois (effort d'épargne).",
  tri: "Le TRI (Taux de Rentabilité Interne) est le baromètre de la performance globale sur 10 ans. Il intègre les loyers, le remboursement du capital, la plus-value à la revente et la fiscalité. Au-delà de 8 %, c'est un excellent placement.",
  effort: "Combien il vous faut sortir de votre poche chaque mois pour faire vivre l'investissement. À zéro = autofinancement total. C'est l'indicateur clé pour vendre un bien à un investisseur prudent.",
};

export function PremiumKpis({ results }: Props) {
  const cf = results.cash_flow_mensuel;
  const cfTone = cf >= 0 ? "positive" : cf >= -100 ? "warning" : "negative";

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      <Kpi
        icon={<Gauge className="h-4 w-4" />}
        label="Rendement Net-Net"
        value={fmtPct(results.rentabilite_nette_nette)}
        tooltip={TOOLTIPS.net_net}
        tone="primary"
      />
      <Kpi
        icon={<Wallet className="h-4 w-4" />}
        label="Cash-flow / mois"
        value={fmtEur(cf)}
        tooltip={TOOLTIPS.cashflow}
        tone={cfTone}
      />
      <Kpi
        icon={<TrendingUp className="h-4 w-4" />}
        label="TRI sur 10 ans"
        value={fmtPct(results.tri_10_ans)}
        tooltip={TOOLTIPS.tri}
        tone="primary"
      />
      <Kpi
        icon={<PiggyBank className="h-4 w-4" />}
        label="Effort d'épargne / mois"
        value={fmtEur(results.effort_epargne_mensuel)}
        tooltip={TOOLTIPS.effort}
        tone={results.effort_epargne_mensuel === 0 ? "positive" : results.effort_epargne_mensuel < 100 ? "warning" : "negative"}
      />
    </div>
  );
}

function Kpi({
  icon, label, value, tooltip, tone,
}: {
  icon: React.ReactNode; label: string; value: string; tooltip: string;
  tone: "primary" | "positive" | "warning" | "negative";
}) {
  const styles = {
    primary: "border-primary/30 [&_.kpi-value]:text-primary [&_.kpi-icon]:text-primary",
    positive: "border-emerald-300 bg-emerald-50/30 [&_.kpi-value]:text-emerald-700 [&_.kpi-icon]:text-emerald-600",
    warning: "border-amber-300 bg-amber-50/30 [&_.kpi-value]:text-amber-700 [&_.kpi-icon]:text-amber-600",
    negative: "border-destructive/40 bg-destructive/5 [&_.kpi-value]:text-destructive [&_.kpi-icon]:text-destructive",
  }[tone];

  return (
    <Card className={`bg-card/60 border shadow-sm transition-all hover:shadow-md ${styles}`}>
      <CardContent className="pt-4 pb-3">
        <div className="flex items-center justify-between mb-1.5">
          <span className="kpi-icon">{icon}</span>
          <Tooltip>
            <TooltipTrigger asChild>
              <button type="button" className="text-muted-foreground/60 hover:text-primary">
                <Info className="h-3 w-3" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="max-w-[300px] text-[11px] leading-relaxed">
              {tooltip}
            </TooltipContent>
          </Tooltip>
        </div>
        <p className="text-[10px] uppercase text-muted-foreground tracking-wider font-medium">{label}</p>
        <p className="kpi-value text-xl font-bold mt-1">{value}</p>
      </CardContent>
    </Card>
  );
}
