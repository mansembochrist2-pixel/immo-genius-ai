import { useState } from "react";
import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { VoiceButton } from "@/components/VoiceButton";
import { VoiceWaveform } from "@/components/VoiceWaveform";
import { cn } from "@/lib/utils";

interface VoiceTextareaProps extends TextareaProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  voiceDisabled?: boolean;
}

export function VoiceTextarea({ className, onTranscript, onInterim, voiceDisabled, ...props }: VoiceTextareaProps) {
  const [listening, setListening] = useState(false);

  return (
    <div
      className={cn(
        "relative w-full rounded-2xl border border-border bg-card transition-all",
        "focus-within:border-primary/40 focus-within:shadow-[0_0_0_4px_hsl(var(--primary)/0.08)]",
        listening && "border-primary/50 shadow-[0_0_0_4px_hsl(var(--primary)/0.12)]",
      )}
    >
      <Textarea
        className={cn(
          "w-full border-0 bg-transparent rounded-2xl px-4 pt-3 pb-12 text-[15px] leading-relaxed",
          "focus-visible:ring-0 focus-visible:ring-offset-0 resize-none",
          className,
        )}
        {...props}
      />
      <div className="absolute inset-x-3 bottom-2 flex items-center justify-between gap-3 pointer-events-none">
        <VoiceWaveform active={listening} className="pointer-events-none" />
        <div className="ml-auto pointer-events-auto">
          <VoiceButton
            onTranscript={onTranscript}
            onInterim={onInterim}
            onListeningChange={setListening}
            disabled={voiceDisabled || props.disabled}
            size="icon"
            className="h-9 w-9 rounded-xl"
          />
        </div>
      </div>
    </div>
  );
}
