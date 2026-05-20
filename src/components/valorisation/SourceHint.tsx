import { Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Petite icône (i) qui s'affiche à côté d'un champ pré-rempli par l'IA
 * pour indiquer la source de l'estimation.
 */
export const SourceHint = ({ source }: { source: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center text-muted-foreground hover:text-primary transition-colors"
        aria-label="Source de l'estimation"
      >
        <Info className="h-3 w-3" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-[260px]">
      <p className="text-[11px]">Source : {source}</p>
    </TooltipContent>
  </Tooltip>
);

export const DISCLAIMER_TEXT =
  "Les chiffres présentés constituent une simulation à titre indicatif, basée sur les données fournies et des sources publiques (DVF, INSEE, ADEME, observatoires des loyers, BOFIP). Ils ne valent ni conseil financier, ni conseil juridique, ni conseil fiscal certifié. Toute décision d'investissement doit être validée par un professionnel agréé (notaire, expert-comptable, conseiller en gestion de patrimoine).";
