import { Card, CardContent } from "@/components/ui/card";
import { Lightbulb } from "lucide-react";
import type { ExpertiseInputs, ExpertiseResults } from "@/lib/expertise-calc";
import { compareLMNP } from "@/lib/expertise-calc";

interface Props { inputs: ExpertiseInputs; results: ExpertiseResults; }

/**
 * Encart "Conseil IA" dynamique — résume la situation en 1-2 phrases
 * percutantes et propose un axe d'amélioration majeur.
 */
export function ConseilStrategique({ inputs, results }: Props) {
  const messages: string[] = [];

  if (results.cash_flow_mensuel < -50) {
    messages.push(
      `💡 Votre cash-flow est de ${Math.round(results.cash_flow_mensuel)} €/mois. Les principaux leviers : augmenter l'apport, allonger le crédit à 25 ans, ou passer en location meublée LMNP Réel.`
    );
  } else if (results.cash_flow_mensuel >= 0 && results.cash_flow_mensuel < 200) {
    messages.push(
      `💡 Cash-flow positif léger (${Math.round(results.cash_flow_mensuel)} €/mois). Le dossier s'autofinance — un excellent argument vente pour investisseur prudent.`
    );
  } else if (results.cash_flow_mensuel >= 200) {
    messages.push(
      `💡 Cash-flow excellent (${Math.round(results.cash_flow_mensuel)} €/mois). C'est un dossier "premier de la classe" : mettez-le en avant comme produit rare auprès des investisseurs.`
    );
  }

  if (inputs.type_location === "meublee_lmnp" && inputs.regime_fiscal === "micro_bic") {
    const c = compareLMNP(inputs);
    if (c.recommended === "reel_bic" && c.delta_impot_annuel > 200) {
      messages.push(
        `💡 En basculant au régime LMNP au Réel, vous économisez ${Math.round(c.delta_impot_annuel)} €/an d'impôts (amortissement bâti + mobilier + frais).`
      );
    }
  }

  if (["F", "G", "E"].includes(inputs.dpe) && inputs.cout_travaux === 0) {
    messages.push(
      `💡 DPE ${inputs.dpe} — bien soumis à l'interdiction progressive de louer (2025 G, 2028 F, 2034 E). Une rénovation passage en C génère ~5-10 % de valeur verte à la revente + éligibilité MaPrimeRénov'.`
    );
  }

  if (results.tri_10_ans > 8) {
    messages.push(
      `💡 TRI de ${results.tri_10_ans.toFixed(1).replace(".", ",")} % sur 10 ans — supérieur aux marchés financiers actions historiques (~7 %).`
    );
  } else if (results.tri_10_ans < 3 && results.tri_10_ans > 0) {
    messages.push(
      `⚠️ TRI faible (${results.tri_10_ans.toFixed(1).replace(".", ",")} %) — comparer à un placement sans risque (livret A ~3 %). Vérifier hypothèses ou explorer leviers d'optimisation.`
    );
  }

  if (messages.length === 0) return null;

  return (
    <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/30">
      <CardContent className="pt-4 pb-4 space-y-2">
        <div className="flex items-center gap-2 mb-1">
          <Lightbulb className="h-4 w-4 text-primary" />
          <p className="text-xs font-bold text-primary uppercase tracking-wider">Conseil stratégique IA</p>
        </div>
        {messages.map((m, idx) => (
          <p key={idx} className="text-sm text-foreground/90 leading-relaxed">{m}</p>
        ))}
      </CardContent>
    </Card>
  );
}
