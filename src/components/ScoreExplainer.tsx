import { Info, Brain, TrendingUp, AlertTriangle } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type ScoreType = "score_ia" | "taux_signature" | "score_urgence" | "score_pertinence";

interface ScoreExplainerProps {
  type: ScoreType;
  value: number | null | undefined;
  client?: any;
  context?: any;
  className?: string;
  children?: React.ReactNode;
}

interface Criterion {
  label: string;
  weight: string;
  detail: string;
  status: "positive" | "neutral" | "negative";
}

const buildCriteria = (type: ScoreType, c: any = {}): Criterion[] => {
  const criteria: Criterion[] = [];

  if (type === "score_ia") {
    criteria.push({
      label: "Complétude de la fiche",
      weight: "25%",
      detail: c.email && c.telephone && c.budget_max ? "Identité, contact et budget renseignés" : "Données partielles — enrichissez la fiche",
      status: c.email && c.telephone && c.budget_max ? "positive" : "negative",
    });
    criteria.push({
      label: "Engagement client",
      weight: "30%",
      detail: c.derniere_interaction
        ? `Dernière interaction : ${new Date(c.derniere_interaction).toLocaleDateString("fr-FR")}`
        : "Aucune interaction enregistrée",
      status: c.derniere_interaction ? "positive" : "negative",
    });
    criteria.push({
      label: "Avancement du projet",
      weight: "25%",
      detail: c.statut === "offre" || c.statut === "visite"
        ? `Statut avancé : ${c.statut}`
        : `Statut : ${c.statut || "nouveau"} — phase amont`,
      status: c.statut === "offre" || c.statut === "visite" ? "positive" : "neutral",
    });
    criteria.push({
      label: "Clarté motivation/freins",
      weight: "20%",
      detail: c.motivation && c.freins ? "Motivation et freins identifiés" : "À approfondir lors du prochain échange",
      status: c.motivation && c.freins ? "positive" : "neutral",
    });
  }

  if (type === "taux_signature") {
    criteria.push({
      label: "Adéquation budget / marché",
      weight: "35%",
      detail: c.budget_max
        ? `Budget max : ${Number(c.budget_max).toLocaleString("fr-FR")} €`
        : "Budget non renseigné",
      status: c.budget_max ? "positive" : "negative",
    });
    criteria.push({
      label: "Délai de projet",
      weight: "30%",
      detail: c.delai_projet || "Non précisé — impact négatif sur la prévisibilité",
      status: c.delai_projet === "Urgent" || c.delai_projet === "3 mois" ? "positive" : "neutral",
    });
    criteria.push({
      label: "Statut commercial",
      weight: "25%",
      detail: `Statut actuel : ${c.statut || "nouveau"}`,
      status: c.statut === "offre" ? "positive" : c.statut === "perdu" ? "negative" : "neutral",
    });
    criteria.push({
      label: "Historique d'interactions",
      weight: "10%",
      detail: c.resume_ia ? "Résumé IA disponible" : "Pas encore d'analyse IA",
      status: c.resume_ia ? "positive" : "neutral",
    });
  }

  if (type === "score_urgence") {
    criteria.push({
      label: "Délai annoncé",
      weight: "40%",
      detail: c.delai_projet || "Non précisé",
      status: c.delai_projet === "Urgent" ? "negative" : "neutral",
    });
    criteria.push({
      label: "Inactivité récente",
      weight: "30%",
      detail: c.derniere_interaction
        ? `Dernier contact : ${new Date(c.derniere_interaction).toLocaleDateString("fr-FR")}`
        : "Aucun contact enregistré — risque de perte",
      status: c.derniere_interaction ? "positive" : "negative",
    });
    criteria.push({
      label: "Freins identifiés",
      weight: "20%",
      detail: c.freins ? c.freins.slice(0, 80) : "Aucun frein identifié",
      status: c.freins ? "negative" : "positive",
    });
    criteria.push({
      label: "Statut critique",
      weight: "10%",
      detail: c.statut === "offre" ? "Phase d'offre — fenêtre courte" : `Statut : ${c.statut}`,
      status: c.statut === "offre" ? "negative" : "neutral",
    });
  }

  if (type === "score_pertinence") {
    criteria.push({
      label: "Source de la suggestion",
      weight: "30%",
      detail: c.source_module || "moteur décisionnel central",
      status: "neutral",
    });
    criteria.push({
      label: "Priorité business",
      weight: "40%",
      detail: c.priorite ? `Priorité ${c.priorite}` : "Priorité moyenne",
      status: c.priorite === "haute" ? "positive" : "neutral",
    });
    criteria.push({
      label: "Actualité",
      weight: "30%",
      detail: c.date_suggeree
        ? `Suggérée pour le ${new Date(c.date_suggeree).toLocaleDateString("fr-FR")}`
        : "Pas de date cible",
      status: "neutral",
    });
  }

  return criteria;
};

const titleByType: Record<ScoreType, { label: string; icon: any; max: string }> = {
  score_ia: { label: "Score IA Global", icon: Brain, max: "/100" },
  taux_signature: { label: "Probabilité de signature", icon: TrendingUp, max: "%" },
  score_urgence: { label: "Risque de perte / Urgence", icon: AlertTriangle, max: "/10" },
  score_pertinence: { label: "Pertinence de l'action", icon: Brain, max: "/100" },
};

export const ScoreExplainer = ({ type, value, client, context, className, children }: ScoreExplainerProps) => {
  const meta = titleByType[type];
  const Icon = meta.icon;
  const criteria = buildCriteria(type, { ...client, ...context });

  const synthese = value == null
    ? "Aucune donnée — lancez un recalcul IA pour obtenir une analyse."
    : type === "taux_signature"
      ? value >= 60 ? "Excellente probabilité — privilégiez la finalisation rapide."
        : value >= 30 ? "Probabilité moyenne — relancez avec un argument personnalisé."
        : "Probabilité faible — repositionnez la stratégie."
      : type === "score_urgence"
        ? value >= 7 ? "Risque ÉLEVÉ — action immédiate recommandée."
          : value >= 4 ? "Surveillance requise dans les 7 jours."
          : "Situation maîtrisée — suivi normal."
      : type === "score_ia"
        ? value >= 75 ? "Profil prioritaire — lead chaud."
          : value >= 50 ? "Profil intéressant — à qualifier."
          : "Profil froid — à enrichir."
      : value >= 70 ? "Action hautement recommandée."
        : "Action à considérer selon planning.";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn(
            "inline-flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity",
            className
          )}
        >
          {children}
          <Info className="h-3 w-3 text-muted-foreground/60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border/40 bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Icon className="h-4 w-4 text-primary" /> {meta.label}
            </h4>
            <Badge variant="outline" className="text-xs font-mono">
              {value ?? "—"}{meta.max}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{synthese}</p>
        </div>
        <div className="p-4 space-y-2.5 max-h-80 overflow-y-auto">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
            Critères pris en compte
          </p>
          {criteria.map((c, i) => (
            <div key={i} className="border border-border/30 rounded-md p-2.5 bg-card/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium">{c.label}</p>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  c.status === "positive" && "bg-success/10 text-success",
                  c.status === "negative" && "bg-destructive/10 text-destructive",
                  c.status === "neutral" && "bg-muted/40 text-muted-foreground",
                )}>
                  {c.weight}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{c.detail}</p>
            </div>
          ))}
        </div>
        <div className="border-t border-border/30 bg-muted/20 px-4 py-2">
          <p className="text-[10px] text-muted-foreground italic">
            Calcul algorithmique basé sur les données de la fiche. Précision améliorée par l'enrichissement IA.
          </p>
        </div>
      </PopoverContent>
    </Popover>
  );
};
