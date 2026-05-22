import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Sparkles, Brain, ArrowUpRight, CheckCircle2, Info, TrendingUp, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  compareLMNP,
  suggestOptimizations,
  type ExpertiseInputs,
  type ExpertiseResults,
} from "@/lib/expertise-calc";
import { AnalysisLoader } from "@/components/AnalysisLoader";

interface LevierAI {
  titre: string;
  categorie: "fiscal" | "juridique" | "financier" | "travaux" | "marché";
  description: string;
  impact_estime: string;
  complexite: "facile" | "moyenne" | "élevée";
  source?: string;
}

interface Props {
  inputs: ExpertiseInputs;
  results: ExpertiseResults;
  onApply: (patch: Partial<ExpertiseInputs>) => void;
}

const CAT_COLORS: Record<string, string> = {
  fiscal: "bg-blue-50 text-blue-700 border-blue-200",
  juridique: "bg-purple-50 text-purple-700 border-purple-200",
  financier: "bg-emerald-50 text-emerald-700 border-emerald-200",
  travaux: "bg-amber-50 text-amber-700 border-amber-200",
  marché: "bg-rose-50 text-rose-700 border-rose-200",
};
const COMPLEX_COLORS: Record<string, string> = {
  facile: "text-emerald-600",
  moyenne: "text-amber-600",
  élevée: "text-rose-600",
};

const fmtEur = (n: number) => `${Math.round(n).toLocaleString("fr-FR")} €`;

/**
 * Stratège IA — Cerveau central d'optimisation patrimoniale.
 * Fusionne :
 *  - Suggestions déterministes (avec Apply en 1 clic et recalcul temps réel)
 *  - Comparateur fiscal LMNP (si pertinent)
 *  - Leviers avancés générés par GPT-5.5 (fiscal, juridique, patrimonial)
 */
export function StrategeIA({ inputs, results, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string>("");
  const [leviersAI, setLeviersAI] = useState<LevierAI[]>([]);

  const proposals = useMemo(() => suggestOptimizations(inputs, results), [inputs, results]);
  const isLMNP = inputs.type_location === "meublee_lmnp";
  const lmnpComp = useMemo(() => (isLMNP ? compareLMNP(inputs) : null), [inputs, isLMNP]);

  const lancer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("expertise-optimizer", {
        body: { inputs, results },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDiagnostic(data.diagnostic || "");
      setLeviersAI(Array.isArray(data.leviers) ? data.leviers : []);
      toast.success("Analyse stratégique générée");
    } catch (e: any) {
      toast.error(e.message || "Erreur de l'analyse stratégique");
    } finally {
      setLoading(false);
    }
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="bg-gradient-to-br from-primary/5 via-card/60 to-amber-50/30 border-primary/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Stratège IA — Optimisation patrimoniale
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[320px] text-[11px] leading-relaxed">
                Le cerveau stratégique du module. Combine un moteur déterministe
                (leviers chiffrés appliquables en 1 clic) et une IA patrimoniale
                avancée (GPT-5.5) qui propose des montages fiscaux et juridiques
                au-delà des optimisations classiques.
              </TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="ml-auto text-[10px]">GPT-5.5</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Comparateur fiscal LMNP — affiché si pertinent, compact */}
          {lmnpComp && (
            <div className="rounded-lg border border-primary/20 bg-background/60 p-3">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
                <Zap className="h-3 w-3 text-primary" />
                Régime fiscal recommandé
              </p>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div>
                  <p className="text-sm font-semibold">
                    {lmnpComp.recommended === "reel_bic" ? "Réel BIC (amortissement)" : "Micro-BIC (abattement 50%)"}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    Économie d'impôt :{" "}
                    <span className="font-semibold text-emerald-700">
                      {fmtEur(Math.abs(lmnpComp.delta_impot_annuel))}/an
                    </span>{" "}
                    · Cash-flow :{" "}
                    <span className="font-semibold text-primary">
                      {lmnpComp.delta_cashflow_mensuel >= 0 ? "+" : ""}
                      {fmtEur(lmnpComp.delta_cashflow_mensuel)}/mois
                    </span>
                  </p>
                </div>
                {inputs.regime_fiscal !== lmnpComp.recommended && (
                  <Button
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() => {
                      onApply({ regime_fiscal: lmnpComp.recommended });
                      toast.success(`Régime ${lmnpComp.recommended === "reel_bic" ? "Réel BIC" : "Micro-BIC"} appliqué`);
                    }}
                  >
                    Appliquer <ArrowUpRight className="h-3 w-3 ml-1" />
                  </Button>
                )}
                {inputs.regime_fiscal === lmnpComp.recommended && (
                  <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-[10px]">
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Déjà appliqué
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Leviers déterministes — chiffrés, appliquables */}
          {proposals.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3 text-primary" />
                Leviers d'optimisation chiffrés ({proposals.length})
              </p>
              {proposals.map((p) => {
                const blocked = p.id === "loyer_bloque";
                const isWarning = p.id === "no_travaux";
                return (
                  <div
                    key={p.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border bg-background/70 transition-all hover:border-primary/40 ${
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
                          toast.success("Paramètre appliqué — résultats mis à jour en temps réel.");
                        }}
                      >
                        Appliquer
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Bloc IA avancée */}
          <div className="pt-2 border-t border-border/20">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3 w-3 text-primary" />
              Leviers patrimoniaux avancés (IA)
            </p>

            {loading && (
              <AnalysisLoader
                module="Stratège patrimonial GPT-5.5"
                context={inputs.adresse || undefined}
                inline
                messages={[
                  "Analyse du dossier (acquisition, financement, fiscalité)…",
                  "Recherche de montages juridiques pertinents (SCI, holding, démembrement)…",
                  "Évaluation des dispositifs fiscaux 2025-2026…",
                  "Arbitrage rentabilité / valorisation / stratégie long terme…",
                  "Chiffrage des économies estimées…",
                  "Mise en forme des recommandations…",
                ]}
                eta="30 à 90 secondes — cela peut prendre une minute ou plus"
              />
            )}

            {!loading && leviersAI.length === 0 && (
              <>
                <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
                  Analyse patrimoniale avancée : démembrement, holding SCI à l'IS, déficit foncier,
                  dispositifs fiscaux, refinancement. L'IA inspecte votre dossier et propose 3 à 6
                  leviers d'élite au-delà des optimisations chiffrées ci-dessus.
                </p>
                <Button
                  onClick={lancer}
                  disabled={loading || !inputs.adresse || !inputs.prix_acquisition}
                  className="w-full"
                  size="sm"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  Lancer l'analyse stratégique IA
                </Button>
              </>
            )}

            {!loading && leviersAI.length > 0 && (
              <div className="space-y-3">
                {diagnostic && (
                  <p className="text-sm font-medium text-foreground/90 italic border-l-2 border-primary pl-3 py-1">
                    {diagnostic}
                  </p>
                )}
                {leviersAI.map((l, i) => (
                  <div key={i} className="rounded-lg border border-border/30 bg-background/70 p-3 space-y-1.5">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <p className="text-sm font-semibold">{l.titre}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge className={`text-[10px] border ${CAT_COLORS[l.categorie] || ""}`}>{l.categorie}</Badge>
                        <span className={`text-[10px] font-medium ${COMPLEX_COLORS[l.complexite] || ""}`}>
                          ● {l.complexite}
                        </span>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">{l.description}</p>
                    <div className="flex items-center justify-between gap-2 pt-1">
                      <p className="text-xs font-bold text-primary">{l.impact_estime}</p>
                      {l.source && (
                        <p className="text-[10px] text-muted-foreground italic">{l.source}</p>
                      )}
                    </div>
                  </div>
                ))}
                <Button variant="ghost" size="sm" onClick={lancer} disabled={loading} className="w-full text-xs">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Régénérer l'analyse IA
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}
