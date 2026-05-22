import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Brain, Info, BookOpen, FlaskConical, Scale, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { computeExpertise, suggestOptimizations, type ExpertiseInputs, type ExpertiseResults } from "@/lib/expertise-calc";
import { AnalysisLoader } from "@/components/AnalysisLoader";

interface LevierAI {
  titre: string;
  categorie: "fiscal" | "juridique" | "financier" | "travaux" | "marché";
  description: string;
  impact_estime: string;
  complexite: "facile" | "moyenne" | "élevée";
  source?: string;
  patch?: Partial<ExpertiseInputs> | null;
  apply_label?: string;
  compatibilite_score?: number;
  conditions?: string;
}

type DisplayLevier = LevierAI & { origin: "ia" | "moteur"; patch?: Partial<ExpertiseInputs> | null };

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

const ALLOWED_PATCH_KEYS = new Set<keyof ExpertiseInputs>([
  "type_location", "loyer_mensuel", "encadrement_loyer", "loyer_plafond", "charges_copro_annuelles",
  "taxe_fonciere_annuelle", "vacance_locative_pct", "assurance_gli", "assurance_pno", "frais_gestion_pct",
  "entretien_pct", "dpe_cible", "cout_travaux", "aides_renovation", "gain_loyer_post_travaux",
  "economie_charges_post_travaux", "apport", "frais_notaire_pct", "frais_agence", "taux_credit",
  "duree_credit_annees", "regime_fiscal", "tmi", "duree_detention_annees", "revalorisation_annuelle_pct",
]);

function sanitizePatch(patch?: Partial<ExpertiseInputs> | null): Partial<ExpertiseInputs> | null {
  if (!patch || typeof patch !== "object") return null;
  const clean: Partial<ExpertiseInputs> = {};
  for (const [key, value] of Object.entries(patch) as [keyof ExpertiseInputs, any][]) {
    if (!ALLOWED_PATCH_KEYS.has(key) || value == null || value === "") continue;
    (clean as any)[key] = typeof value === "string" && !Number.isNaN(Number(value)) ? Number(value) : value;
  }
  return Object.keys(clean).length ? clean : null;
}

function isContextualLevier(levier: Partial<LevierAI>): boolean {
  const text = `${levier.titre || ""} ${levier.description || ""}`.toLowerCase();
  if (levier.compatibilite_score != null && levier.compatibilite_score < 55) return false;
  if (/\bvefa\b|cibler du neuf|acheter du neuf|bien neuf|frais de notaire réduits/.test(text)) return false;
  return true;
}

function inferPatch(levier: Partial<LevierAI>, inputs: ExpertiseInputs): Partial<ExpertiseInputs> | null {
  const text = `${levier.titre || ""} ${levier.description || ""}`.toLowerCase();
  if (text.includes("courte durée") || text.includes("airbnb")) {
    const factor = inputs.surface >= 18 && inputs.surface <= 65 ? 1.85 : 1.65;
    return {
      type_location: "courte_duree",
      loyer_mensuel: Math.round(inputs.loyer_mensuel * factor),
      vacance_locative_pct: Math.max(20, inputs.vacance_locative_pct),
      frais_gestion_pct: Math.max(20, inputs.frais_gestion_pct),
      regime_fiscal: "reel_bic",
    };
  }
  if (text.includes("lmnp") || text.includes("meubl")) {
    return { type_location: "meublee_lmnp", regime_fiscal: "reel_bic", loyer_mensuel: Math.round(inputs.loyer_mensuel * 1.15) };
  }
  if (text.includes("réel bic") || text.includes("reel bic") || text.includes("amortissement")) {
    return { regime_fiscal: "reel_bic" };
  }
  if (text.includes("micro-bic")) return { regime_fiscal: "micro_bic" };
  if (text.includes("déficit foncier") || text.includes("reel foncier") || text.includes("réel foncier")) {
    return { type_location: "nue", regime_fiscal: "reel_foncier" };
  }
  if (text.includes("renoncer aux travaux") || text.includes("roi négatif")) {
    return { cout_travaux: 0, aides_renovation: 0, gain_loyer_post_travaux: 0, economie_charges_post_travaux: 0 };
  }
  return null;
}

/**
 * Stratège IA — stratégies patrimoniales et leviers applicables.
 * Les actions réellement modélisables modifient les paramètres d'expertise en direct.
 */
export function StrategeIA({ inputs, results, onApply }: Props) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string>("");
  const [leviersAI, setLeviersAI] = useState<LevierAI[]>([]);
  const [studyLevier, setStudyLevier] = useState<LevierAI | null>(null);
  const [studyMode, setStudyMode] = useState<"etudier" | "simuler" | "comparer">("etudier");

  const lancer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("expertise-optimizer", {
        body: { inputs, results },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDiagnostic(data.diagnostic || "");
      setLeviersAI(Array.isArray(data.leviers) ? data.leviers.filter(isContextualLevier) : []);
      toast.success("Analyse stratégique générée");
    } catch (e: any) {
      toast.error(e.message || "Erreur de l'analyse stratégique");
    } finally {
      setLoading(false);
    }
  };

  const openStudy = (l: LevierAI, mode: "etudier" | "simuler" | "comparer") => {
    setStudyLevier(l);
    setStudyMode(mode);
  };

  const operationalLeviers = useMemo<DisplayLevier[]>(() => {
    if (!diagnostic && leviersAI.length === 0) return [];
    return suggestOptimizations(inputs, results)
      .filter((p) => p.id !== "loyer_bloque")
      .map((p) => ({
        titre: p.label,
        categorie: (p.id === "no_travaux" || p.id === "renovation_energetique" ? "travaux" : "financier") as LevierAI["categorie"],
        description: p.description,
        impact_estime: `Cash-flow ${p.delta_cashflow_mensuel >= 0 ? "+" : ""}${Math.round(p.delta_cashflow_mensuel)} €/mois`,
        complexite: "facile" as const,
        source: p.source || "Moteur de calcul interne — impact recalculé sur les paramètres saisis",
        patch: p.patch,
        apply_label: "Appliquer",
        origin: "moteur" as const,
      }));
  }, [diagnostic, inputs, leviersAI.length, results]);

  const displayLeviers = useMemo<DisplayLevier[]>(() => {
    const ai = leviersAI.map((l) => ({ ...l, patch: sanitizePatch(l.patch) || inferPatch(l, inputs), origin: "ia" as const }));
    return [...ai, ...operationalLeviers].filter(isContextualLevier);
  }, [inputs, leviersAI, operationalLeviers]);

  const applyLevier = (levier: DisplayLevier) => {
    const patch = sanitizePatch(levier.patch) || inferPatch(levier, inputs);
    if (!patch || Object.keys(patch).length === 0) {
      openStudy(levier, "etudier");
      toast.info("Cette stratégie doit être étudiée avec un notaire/comptable avant d'être modélisée.");
      return;
    }
    onApply(patch);
    const next = computeExpertise({ ...inputs, ...patch });
    const delta = next.cash_flow_mensuel - results.cash_flow_mensuel;
    toast.success(`Stratégie appliquée — cash-flow ${delta >= 0 ? "+" : ""}${Math.round(delta)} €/mois.`);
  };

  return (
    <TooltipProvider delayDuration={200}>
      <Card className="bg-gradient-to-br from-primary/5 via-card/60 to-amber-50/30 border-primary/30 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="h-4 w-4 text-primary" />
            Stratège IA — Stratégies patrimoniales avancées
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-primary">
                  <Info className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-[340px] text-[11px] leading-relaxed">
                Les leviers modélisables peuvent être appliqués aux paramètres d'expertise :
                loyers, fiscalité, financement, charges ou travaux. Les montages juridiques lourds
                restent à valider avec notaire, expert-comptable ou avocat fiscaliste.
              </TooltipContent>
            </Tooltip>
            <Badge variant="outline" className="ml-auto text-[10px]">Estate AI</Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          {loading && (
            <AnalysisLoader
              module="Stratège patrimonial Estate AI"
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
              eta="Cela peut prendre une minute ou plus"
            />
          )}

          {!loading && leviersAI.length === 0 && (
            <>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Analyse patrimoniale avancée : démembrement, holding SCI à l'IS, déficit foncier,
                dispositifs fiscaux, refinancement. L'IA inspecte votre dossier et propose
                3 à 6 leviers d'élite pour maximiser la valorisation patrimoniale du client.
              </p>
              <Button
                onClick={lancer}
                disabled={loading || !inputs.adresse || !inputs.prix_acquisition}
                className="w-full"
                size="sm"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Lancer l'analyse stratégique
              </Button>
            </>
          )}

          {!loading && displayLeviers.length > 0 && (
            <div className="space-y-3">
              {diagnostic && (
                <p className="text-sm font-medium text-foreground/90 italic border-l-2 border-primary pl-3 py-1">
                  {diagnostic}
                </p>
              )}
              {displayLeviers.map((l, i) => (
                <div key={i} className="rounded-lg border border-border/30 bg-background/70 p-3 space-y-2">
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
                  <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
                    <p className="text-xs font-bold text-primary">{l.impact_estime}</p>
                    {l.source && (
                      <p className="text-[10px] text-muted-foreground italic">{l.source}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 pt-1.5 border-t border-border/20 flex-wrap">
                    <Button size="sm" className="h-7 text-[11px]" onClick={() => applyLevier(l)}>
                      <CheckCircle2 className="h-3 w-3 mr-1" /> {l.patch ? (l.apply_label || "Appliquer") : "Appliquer / étudier"}
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openStudy(l, "etudier")}>
                      <BookOpen className="h-3 w-3 mr-1" /> Étudier
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openStudy(l, "simuler")}>
                      <FlaskConical className="h-3 w-3 mr-1" /> Simuler
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => openStudy(l, "comparer")}>
                      <Scale className="h-3 w-3 mr-1" /> Comparer scénarios
                    </Button>
                  </div>
                </div>
              ))}
              <Button variant="ghost" size="sm" onClick={lancer} disabled={loading} className="w-full text-xs">
                <Sparkles className="h-3 w-3 mr-1" />
                Régénérer l'analyse
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!studyLevier} onOpenChange={(o) => !o && setStudyLevier(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {studyMode === "etudier" && <><BookOpen className="h-4 w-4 text-primary" /> Étudier la stratégie</>}
              {studyMode === "simuler" && <><FlaskConical className="h-4 w-4 text-primary" /> Simulation</>}
              {studyMode === "comparer" && <><Scale className="h-4 w-4 text-primary" /> Comparer scénarios</>}
            </DialogTitle>
            <DialogDescription className="text-sm font-medium text-foreground pt-2">
              {studyLevier?.titre}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">{studyLevier?.description}</p>
            <div className="rounded-md bg-primary/5 border border-primary/20 p-3">
              <p className="text-xs font-semibold text-primary mb-1">Impact estimé</p>
              <p className="text-sm">{studyLevier?.impact_estime}</p>
            </div>
            <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
              <p className="text-[11px] text-amber-900 leading-relaxed">
                <span className="font-semibold">⚠ Action recommandée :</span> cette stratégie nécessite l'accompagnement
                d'un notaire, d'un expert-comptable ou d'un avocat fiscaliste avant toute mise en œuvre. Estate AI
                fournit ici une analyse indicative, pas une décision opérationnelle.
              </p>
            </div>
            {studyLevier?.source && (
              <p className="text-[11px] text-muted-foreground italic">Source : {studyLevier.source}</p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}
