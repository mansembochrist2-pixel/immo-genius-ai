import { Mic, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";
import { useCallback } from "react";
import { cn } from "@/lib/utils";

interface VoiceButtonProps {
  onInterim?: (text: string) => void;
  onTranscript: (text: string) => void;
  onListeningChange?: (listening: boolean) => void;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
  className?: string;
}

export function VoiceButton({ onTranscript, onInterim, onListeningChange, disabled, size = "icon", className }: VoiceButtonProps) {
  const handleError = useCallback((type: "denied" | "unsupported") => {
    if (type === "denied") toast.error("Autorisez l'accès au microphone dans votre navigateur");
    else toast.error("La saisie vocale nécessite Chrome ou Edge");
  }, []);

  const { isListening, isSupported, startListening, stopListening } = useVoiceInput({
    onFinal: onTranscript,
    onInterim,
    onError: handleError,
  });

  if (!isSupported) return null;

  const toggle = () => {
    if (isListening) {
      stopListening();
      onListeningChange?.(false);
    } else {
      startListening();
      onListeningChange?.(true);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="default"
          size={size}
          onClick={toggle}
          disabled={disabled}
          className={cn(
            "shrink-0 transition-all border",
            isListening
              ? "bg-primary text-primary-foreground border-primary shadow-[0_0_0_4px_hsl(var(--primary)/0.18)] hover:bg-primary/90"
              : "bg-card text-primary border-border hover:bg-primary/5 hover:text-primary",
            className,
          )}
        >
          {isListening ? <Square className="h-4 w-4 fill-current" /> : <Mic className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isListening ? "Arrêter la dictée" : "Dictée vocale"}</TooltipContent>
    </Tooltip>
  );
}
