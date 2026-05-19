import { useEffect, useState } from "react";
import { Brain, Sparkles, CheckCircle2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface Props {
  /** Module title, e.g. "Pige IA", "Audit réseaux", "Estimation IA" */
  module: string;
  /** Optional context, e.g. "Paris 18e" or "@compte_instagram" */
  context?: string;
  /** Custom rotating messages. Defaults are pro & generic. */
  messages?: string[];
  /** Optional ETA hint shown discreetly */
  eta?: string;
  /** Compact mode (no card wrapper) */
  inline?: boolean;
}

const DEFAULT_MESSAGES = [
  "Connexion aux sources de données…",
  "Collecte des signaux de marché…",
  "Recoupement avec les références du secteur…",
  "Analyse sémantique par l'IA…",
  "Pondération des critères et scoring…",
  "Mise en forme des résultats…",
];

/**
 * Premium loader displayed during any AI analysis on the platform.
 * Rotates professional, contextual messages so the user knows
 * exactly what is happening behind the scenes.
 */
export const AnalysisLoader = ({
  module,
  context,
  messages = DEFAULT_MESSAGES,
  eta = "10 à 30 secondes",
  inline = false,
}: Props) => {
  const [idx, setIdx] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    const msgTimer = setInterval(() => setIdx((i) => (i + 1) % messages.length), 2200);
    const secTimer = setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      clearInterval(msgTimer);
      clearInterval(secTimer);
    };
  }, [messages.length]);

  const body = (
    <div className="flex flex-col items-center text-center py-10 px-6">
      {/* Animated AI badge */}
      <div className="relative h-16 w-16 mb-5">
        <div className="absolute inset-0 rounded-2xl bg-primary/10 animate-ping" />
        <div className="absolute inset-1 rounded-2xl bg-primary/15 animate-pulse" />
        <div className="absolute inset-2 rounded-xl bg-primary/20 flex items-center justify-center">
          <Brain className="h-7 w-7 text-primary" />
        </div>
        <Sparkles className="absolute -top-1 -right-1 h-4 w-4 text-accent animate-pulse" />
      </div>

      <p className="text-sm font-semibold text-foreground">
        {module} {context && <span className="text-primary">· {context}</span>}
      </p>

      <div className="mt-3 min-h-[2.5rem] flex items-center justify-center gap-2 max-w-md">
        <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
        <p key={idx} className="text-xs text-muted-foreground animate-in fade-in slide-in-from-bottom-1 duration-300">
          {messages[idx]}
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center justify-center gap-1.5 mt-4">
        {messages.map((_, i) => (
          <div
            key={i}
            className={`h-1 rounded-full transition-all duration-500 ${
              i <= idx ? "w-5 bg-primary" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>

      <div className="flex items-center gap-1.5 mt-5 text-[10px] text-muted-foreground/80">
        <CheckCircle2 className="h-3 w-3 text-success/70" />
        <span>Traitement sécurisé · Estimation {eta} · {elapsed}s</span>
      </div>
    </div>
  );

  if (inline) return body;

  return (
    <Card className="rounded-2xl border-dashed border-primary/20 bg-gradient-to-b from-primary/[0.02] to-transparent">
      <CardContent className="p-0">{body}</CardContent>
    </Card>
  );
};
