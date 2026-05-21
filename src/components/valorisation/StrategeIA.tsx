import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2, Brain } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { ExpertiseInputs, ExpertiseResults } from "@/lib/expertise-calc";

interface Levier {
  titre: string;
  categorie: "fiscal" | "juridique" | "financier" | "travaux" | "marché";
  description: string;
  impact_estime: string;
  complexite: "facile" | "moyenne" | "élevée";
  source?: string;
}

interface Props { inputs: ExpertiseInputs; results: ExpertiseResults; }

const COLORS: Record<string, string> = {
  fiscal: "bg-blue-100 text-blue-800 border-blue-300",
  juridique: "bg-purple-100 text-purple-800 border-purple-300",
  financier: "bg-emerald-100 text-emerald-800 border-emerald-300",
  travaux: "bg-amber-100 text-amber-800 border-amber-300",
  marché: "bg-rose-100 text-rose-800 border-rose-300",
};
const COMPLEX: Record<string, string> = {
  facile: "text-emerald-700",
  moyenne: "text-amber-700",
  élevée: "text-rose-700",
};

export function StrategeIA({ inputs, results }: Props) {
  const [loading, setLoading] = useState(false);
  const [diagnostic, setDiagnostic] = useState<string>("");
  const [leviers, setLeviers] = useState<Levier[]>([]);

  const lancer = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("expertise-optimizer", {
        body: { inputs, results },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setDiagnostic(data.diagnostic || "");
      setLeviers(Array.isArray(data.leviers) ? data.leviers : []);
      toast.success("Analyse stratégique générée");
    } catch (e: any) {
      toast.error(e.message || "Erreur de l'analyse stratégique");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-primary/5 via-card/60 to-amber-50/40 border-primary/30 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-primary" />
          Stratège IA — Leviers d'optimisation avancés
          <Badge variant="outline" className="ml-auto text-[10px]">GPT-5.4</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {leviers.length === 0 ? (
          <>
            <p className="text-xs text-muted-foreground">
              Analyse patrimoniale avancée : démembrement, holding, déficit foncier, dispositifs fiscaux,
              refinancement, restructuration juridique… L'IA inspecte votre dossier et propose 3 à 6
              leviers d'élite, au-delà des optimisations classiques.
            </p>
            <Button
              onClick={lancer}
              disabled={loading || !inputs.adresse || !inputs.prix_acquisition}
              className="w-full"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
              {loading ? "Analyse en cours…" : "Lancer l'analyse stratégique IA"}
            </Button>
          </>
        ) : (
          <>
            {diagnostic && (
              <p className="text-sm font-medium text-foreground/90 italic border-l-2 border-primary pl-3 py-1">
                {diagnostic}
              </p>
            )}
            <div className="space-y-2">
              {leviers.map((l, i) => (
                <div key={i} className="rounded-lg border border-border/30 bg-background/70 p-3 space-y-1.5">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{l.titre}</p>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Badge className={`text-[10px] border ${COLORS[l.categorie] || ""}`}>{l.categorie}</Badge>
                      <span className={`text-[10px] font-medium ${COMPLEX[l.complexite] || ""}`}>
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
            </div>
            <Button variant="ghost" size="sm" onClick={lancer} disabled={loading} className="w-full text-xs">
              {loading ? <Loader2 className="h-3 w-3 mr-1 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
              Régénérer l'analyse
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
