import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info, Sparkles, TrendingUp, CheckCircle2, ArrowUpRight } from "lucide-react";
import {
  compareLMNP,
  suggestOptimizations,
  type ExpertiseInputs,
  type ExpertiseResults,
} from "@/lib/expertise-calc";

const fmtEur = (n: number) =>
  `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmtPct = (n: number) => `${n.toFixed(2).replace(".", ",")} %`;

interface Props {
  inputs: ExpertiseInputs;
  results: ExpertiseResults;
  onApply: (patch: Partial<ExpertiseInputs>) => void;
}

/**
 * Bloc d'intelligence fiscale & financière :
 *  - Comparaison Micro-BIC vs Réel BIC (uniquement si LMNP)
 *  - Suggestions d'optimisation appliquables en 1 clic (toujours visible)
 */
export const FiscalOptimizer = ({ inputs, results, onApply }: Props) => {
  const isLMNP = inputs.type_location === "meublee_lmnp";
  const comp = isLMNP ? compareLMNP(inputs) : null;
  const proposals = suggestOptimizations(inputs, results);
  const cashflowFaible = results.cash_flow_mensuel < 100;

  return (
    <div className="space-y-4">
      {comp && (
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Comparateur fiscal LMNP
              <Tooltip>
                <TooltipTrigger asChild>
                  <button type="button" className="text-muted-foreground hover:text-primary">
                    <Info className="h-3.5 w-3.5" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-[320px] text-[11px] leading-relaxed">
                  <p className="font-semibold mb-1">Amortissement LMNP au Réel</p>
                  <p>
                    En LMNP au Réel, vous déduisez chaque année une fraction du prix du bien
                    (bâti ~2,5 %/an sur 33 ans, mobilier ~14 %/an sur 7 ans) et des frais de
                    notaire (sur 10 ans). Résultat : l'impôt sur les loyers tombe souvent à
                    <b> zéro pendant 8 à 15 ans</b>, sans créer de déficit (art. 39 C CGI).
                    Source : BOFIP BIC-AMT, barèmes des experts-comptables spécialisés en LMNP.
                  </p>
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {(["micro_bic", "reel_bic"] as const).map((key) => {
                const r = comp[key];
                const isReco = comp.recommended === key;
                return (
                  <div
                    key={key}
                    className={`rounded-lg border p-3 transition-all ${
                      isReco
                        ? "border-primary/60 bg-primary/5 shadow-sm"
                        : "border-border/30 bg-muted/10"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold">{r.label}</p>
                      {isReco && (
                        <Badge className="bg-primary/20 text-primary border-0 text-[10px]">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          Recommandé
                        </Badge>
                      )}
                    </div>
                    <dl className="space-y-1 text-xs">
                      <Line k="Base imposable" v={fmtEur(r.base_imposable)} />
                      <Line k="Impôt sur le revenu" v={fmtEur(r.impot_revenu)} />
                      <Line k="Prélèvements sociaux" v={fmtEur(r.prelevements_sociaux)} />
                      <Line k="Impôt total" v={fmtEur(r.impot_total)} bold />
                      <Line
                        k="Cash-flow / mois"
                        v={fmtEur(r.cashflow_mensuel)}
                        bold
                        accent={r.cashflow_mensuel >= 0}
                        negative={r.cashflow_mensuel < 0}
                      />
                      <Line k="Rentabilité nette-nette" v={fmtPct(r.rentabilite_nette_nette)} />
                    </dl>
                    {key === "reel_bic" && r.details && (
                      <div className="mt-2 pt-2 border-t border-border/20 text-[10px] text-muted-foreground space-y-0.5">
                        <p>Amortissement bâti : {fmtEur(r.details.amort_bati)}/an</p>
                        <p>Amortissement mobilier : {fmtEur(r.details.amort_mobilier)}/an</p>
                        <p>Amortissement frais notaire : {fmtEur(r.details.amort_notaire)}/an</p>
                        <p className="font-medium">
                          Total déductible (amort. utilisé) :{" "}
                          {fmtEur(r.details.amort_utilise)}/an
                        </p>
                      </div>
                    )}
                    {inputs.regime_fiscal !== key && (
                      <Button
                        size="sm"
                        variant={isReco ? "default" : "outline"}
                        className="w-full mt-3 h-7 text-xs"
                        onClick={() => onApply({ regime_fiscal: key })}
                      >
                        Appliquer ce régime
                        <ArrowUpRight className="h-3 w-3 ml-1" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
            <p className="text-[10px] text-muted-foreground italic mt-3">
              Source : BOFIP-Impôts (BIC-CHAMP, BIC-AMT), barèmes UNPI / experts-comptables LMNP 2025.
              Estimation à confirmer par un expert-comptable.
            </p>
          </CardContent>
        </Card>
      )}

      {(cashflowFaible || proposals.length > 0) && (
        <Card
          className={`border ${
            cashflowFaible ? "border-amber-300 bg-amber-50/40" : "border-border/30 bg-card/60"
          }`}
        >
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-primary" />
              {cashflowFaible
                ? `Cash-flow faible (${fmtEur(results.cash_flow_mensuel)}/mois) — leviers d'optimisation`
                : "Suggestions d'optimisation"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proposals.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Aucun levier supplémentaire détecté pour ce dossier — la configuration est déjà optimisée.
              </p>
            ) : (
              <div className="space-y-2">
                {proposals.map((p) => {
                  const blocked = p.id === "loyer_bloque";
                  return (
                    <div
                      key={p.id}
                      className="flex items-start gap-3 p-3 rounded-lg border border-border/30 bg-background/60"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{p.label}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{p.description}</p>
                        {!blocked && (
                          <p className="text-[11px] font-semibold text-success mt-1">
                            Impact estimé : +{Math.round(p.delta_cashflow_mensuel)} €/mois
                          </p>
                        )}
                      </div>
                      {!blocked && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs shrink-0"
                          onClick={() => onApply(p.patch)}
                        >
                          Appliquer
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

const Line = ({
  k, v, bold, accent, negative,
}: { k: string; v: string; bold?: boolean; accent?: boolean; negative?: boolean }) => (
  <div className="flex items-center justify-between">
    <dt className="text-muted-foreground">{k}</dt>
    <dd
      className={`${bold ? "font-bold" : "font-medium"} ${
        accent ? "text-primary" : ""
      } ${negative ? "text-destructive" : ""}`}
    >
      {v}
    </dd>
  </div>
);
