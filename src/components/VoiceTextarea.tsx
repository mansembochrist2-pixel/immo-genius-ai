import { Textarea, TextareaProps } from "@/components/ui/textarea";
import { VoiceButton } from "@/components/VoiceButton";
import { cn } from "@/lib/utils";

interface VoiceTextareaProps extends TextareaProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  voiceDisabled?: boolean;
}

export function VoiceTextarea({ className, onTranscript, onInterim, voiceDisabled, ...props }: VoiceTextareaProps) {
  return (
    <div className="relative">
      <Textarea className={cn("pr-14", className)} {...props} />
      <VoiceButton
        onTranscript={onTranscript}
        onInterim={onInterim}
        disabled={voiceDisabled || props.disabled}
        size="icon"
        className="absolute bottom-2 right-2 h-9 w-9 border-border/40 bg-background/90 shadow-sm backdrop-blur hover:bg-accent"
      />
    </div>
  );
}