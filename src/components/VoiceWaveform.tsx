import { cn } from "@/lib/utils";

interface VoiceWaveformProps {
  active: boolean;
  className?: string;
  bars?: number;
  label?: string;
}

export function VoiceWaveform({ active, className, bars = 18, label = "Écoute en cours…" }: VoiceWaveformProps) {
  if (!active) return null;
  return (
    <div className={cn("flex items-center gap-2 text-xs text-primary", className)} aria-live="polite">
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-60 animate-ping" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
      </span>
      <div className="flex items-end gap-[3px] h-4">
        {Array.from({ length: bars }).map((_, i) => (
          <span
            key={i}
            className="block w-[2px] rounded-full bg-primary/70"
            style={{
              animation: `voice-bar 1s ease-in-out ${i * 80}ms infinite`,
            }}
          />
        ))}
      </div>
      <span className="font-medium tracking-tight">{label}</span>
      <style>{`
        @keyframes voice-bar {
          0%, 100% { height: 20%; opacity: 0.55; }
          50% { height: 100%; opacity: 1; }
        }
      `}</style>
    </div>
  );
}
