import { TrendingUp, BadgeEuro } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Props {
  current: "estimation" | "expertise";
}

/**
 * Switch entre les deux sous-modules de "Valorisation" :
 * - Estimation (valeur de marché)
 * - Expertise & Rendement (analyse financière)
 *
 * Visuel inspiré du switch Radar/Pige du Chasseur de Mandats.
 */
export const ValorisationTabs = ({ current }: Props) => {
  const base =
    "flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-all";
  const active = "bg-background text-primary shadow-sm";
  const inactive = "text-muted-foreground hover:text-foreground";

  return (
    <div className="inline-flex bg-muted/40 border border-border/40 rounded-lg p-1 mb-6 w-full max-w-md">
      <NavLink
        to="/valorisation/estimation"
        className={cn(base, current === "estimation" ? active : inactive)}
      >
        <TrendingUp className="h-4 w-4" /> Estimation
      </NavLink>
      <NavLink
        to="/valorisation/expertise"
        className={cn(base, current === "expertise" ? active : inactive)}
      >
        <BadgeEuro className="h-4 w-4" /> Expertise & Rendement
      </NavLink>
    </div>
  );
};
