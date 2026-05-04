import { useEffect, useState } from "react";
import { Radar, Sparkles, CheckCircle2 } from "lucide-react";

interface Props {
  onComplete: () => void;
  durationMs?: number;
  messages?: string[];
}

const DEFAULT_MESSAGES = [
  "Connexion établie…",
  "L'IA analyse vos 50 derniers échanges…",
  "Identification de vos priorités…",
];

/**
 * "Wow effect" transition shown after OAuth or onboarding completion.
 * Pure presentational — calls onComplete() when finished.
 */
export const AnalysisTransition = ({ onComplete, durationMs = 2800, messages = DEFAULT_MESSAGES }: Props) => {
  const [msgIdx, setMsgIdx] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    const stepDuration = durationMs / messages.length;
    const interval = setInterval(() => {
      setMsgIdx((i) => Math.min(i + 1, messages.length - 1));
    }, stepDuration);
    const finish = setTimeout(() => {
      setDone(true);
      setTimeout(onComplete, 400);
    }, durationMs);
    return () => {
      clearInterval(interval);
      clearTimeout(finish);
    };
  }, [durationMs, messages.length, onComplete]);

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in duration-300">
      <div className="text-center max-w-md">
        {/* Animated radar */}
        <div className="relative mx-auto mb-8 h-32 w-32">
          <div className="absolute inset-0 rounded-full bg-primary/5 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-4 rounded-full bg-primary/15 flex items-center justify-center">
            {done ? (
              <CheckCircle2 className="h-12 w-12 text-success animate-in zoom-in duration-300" />
            ) : (
              <Radar className="h-12 w-12 text-primary animate-spin" style={{ animationDuration: "3s" }} />
            )}
          </div>
          {/* Sparkle accents */}
          <Sparkles className="absolute -top-2 -right-2 h-5 w-5 text-accent animate-pulse" />
          <Sparkles className="absolute -bottom-1 -left-1 h-4 w-4 text-accent animate-pulse" style={{ animationDelay: "0.5s" }} />
        </div>

        <h2 className="text-2xl font-bold font-display mb-3">
          {done ? "C'est prêt !" : "Analyse en cours"}
        </h2>
        <p className="text-muted-foreground min-h-[1.5rem] transition-all">
          {done ? "Votre tableau de bord est prêt." : messages[msgIdx]}
        </p>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 mt-6">
          {messages.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i <= msgIdx ? "w-6 bg-primary" : "w-1.5 bg-border"
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
