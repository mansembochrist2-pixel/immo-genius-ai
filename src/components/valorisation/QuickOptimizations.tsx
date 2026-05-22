import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Zap, Info, CheckCircle2, ArrowUpRight, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { toast } from "sonner";
import {
  compareLMNP,
  suggestOptimizations,
  type ExpertiseInputs,
  type ExpertiseResults,
} from "@/lib/expertise-calc";

interface Props {
  inputs: ExpertiseInputs;
  results: ExpertiseResults;
  onApply: (patch: Partial<ExpertiseInputs>) => void;
}

const fmtEur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/**
 * Optimisations rapides — leviers déterministes, chiffrés, applicables en 1 clic.
 * Recalcul temps réel des KPIs après application.
 */
export function QuickOptimizations({ inputs, results, onApply }: Props) {
  const proposals = useMemo(() => suggestOptimizations(inputs, results), [inputs, results]);
  const isLMNP = inputs.type_location === "meublee_lmnp";
  const lmnpComp = useMemo(() => (isLMNP ? compareLMNP(inputs) : null), [inputs, isLMNP]);

  const hasContent =
    proposals.length > 0 ||
    (lmnpComp && inputs.regime_fiscal !== lmnpComp.recommended);

  if (!hasContent) return null;

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="bg-gradient-to-br from-emerald-50/40 via-card/60 to-card/60 border-emerald-200/40 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Zap className="h-4 w-4 text-emerald-600" />
            Optimisations rapides
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[320px] text-[11px] leading-relaxed">
                Leviers chiffrés et appliquables en 1 clic — impact direct sur le cash-flow,
                la fiscalité et la rentabilité. Les KPIs et graphiques se mettent à jour en temps réel.
              </TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="ml-auto text-[10px] bg-emerald-50 text-emerald-700 border-emerald-200">
              Apply en 1 clic
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-3">
          {/* Comparateur fiscal LMNP */}
          {lmnpComp && inputs.regime_fiscal !== lmnpComp.recommended && (
            <div className="rounded-lg border border-emerald-200 bg-background/70 p-3 flex items-center justify-between gap-3 flex-wrap">
              <div className="min-w-0">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                  Régime fiscal recommandé : {lmnpComp.recommended === "reel_bic" ? "Réel BIC (amortissement)" : "Micro-BIC (abattement 50%)"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Économie d'impôt : <span className="font-semibold text-emerald-700">{fmtEur(Math.abs(lmnpComp.delta_impot_annuel))}/an</span>
                  {" · "}Cash-flow :{" "}
                  <span className="font-semibold text-primary">
                    {lmnpComp.delta_cashflow_mensuel >= 0 ? "+" : ""}{fmtEur(lmnpComp.delta_cashflow_mensuel)}/mois
                  </span>
                </p>
              </div>
              <Button
                size="sm"
                className="h-8 text-xs shrink-0"
                onClick={() => {
                  onApply({ regime_fiscal: lmnpComp.recommended });
                  toast.success(`Régime ${lmnpComp.recommended === "reel_bic" ? "Réel BIC" : "Micro-BIC"} appliqué`);
                }}
              >
                Appliquer <ArrowUpRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          )}

          {proposals.map((p) => {
            const blocked = p.id === "loyer_bloque";
            const isWarning = p.id === "no_travaux";
            return (
              <div
                key={p.id}
                className={`flex items-start gap-3 p-3 rounded-lg border bg-background/70 transition-all hover:border-emerald-300 ${
                  isWarning ? "border-amber-300 bg-amber-50/40" : "border-border/30"
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold">{p.label}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">{p.description}</p>
                  {!blocked && (
                    <p className={`text-[11px] font-bold mt-1.5 ${isWarning ? "text-amber-700" : "text-emerald-700"}`}>
                      Impact cash-flow : {p.delta_cashflow_mensuel >= 0 ? "+" : ""}
                      {Math.round(p.delta_cashflow_mensuel)} €/mois
                    </p>
                  )}
                </div>
                {!blocked && (
                  <Button
                    size="sm"
                    variant={isWarning ? "outline" : "default"}
                    className="h-8 text-xs shrink-0"
                    onClick={() => {
                      onApply(p.patch);
                      toast.success("Levier appliqué — résultats mis à jour en temps réel.");
                    }}
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Appliquer
                  </Button>
                )}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
