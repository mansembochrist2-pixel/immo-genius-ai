import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Sparkles, Brain, Info, BookOpen, FlaskConical, Scale } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExpertiseInputs, ExpertiseResults } from "@/lib/expertise-calc";
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

/**
 * Stratège IA — Stratégies patrimoniales avancées.
 * Pas d'auto-apply : montages complexes (SCI à l'IS, démembrement, holding…)
 * qui nécessitent notaire/comptable. Boutons "Étudier" / "Simuler" uniquement.
 */
export function StrategeIA({ inputs, results }: Props) {
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
      setLeviersAI(Array.isArray(data.leviers) ? data.leviers : []);
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
                Montages patrimoniaux avancés (SCI à l'IS, démembrement, déficit foncier,
                holding, dispositifs fiscaux…). Ces stratégies nécessitent un notaire,
                un comptable ou un avocat fiscaliste — pas de bouton "Appliquer" automatique,
                uniquement "Étudier" / "Simuler" / "Comparer".
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

          {!loading && leviersAI.length > 0 && (
            <div className="space-y-3">
              {diagnostic && (
                <p className="text-sm font-medium text-foreground/90 italic border-l-2 border-primary pl-3 py-1">
                  {diagnostic}
                </p>
              )}
              {leviersAI.map((l, i) => (
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
