import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";
import { useRef, useCallback } from "react";

interface VoiceButtonProps {
  /** Called with interim text while speaking (for real-time preview) */
  onInterim?: (text: string) => void;
  /** Called with final confirmed text to append */
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
}

export function VoiceButton({ onTranscript, onInterim, disabled, size = "icon" }: VoiceButtonProps) {
  const handleFinal = useCallback((text: string) => {
    onTranscript(text);
  }, [onTranscript]);

  const handleInterim = useCallback((text: string) => {
    onInterim?.(text);
  }, [onInterim]);

  const { isListening, isSupported, isSafari, startListening, stopListening } = useVoiceInput({
    onFinal: handleFinal,
    onInterim: handleInterim,
  });

  if (!isSupported) return null;

  const toggle = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isSafari) {
        toast.warning("Safari a un support limité de la saisie vocale. Utilisez Chrome ou Edge pour de meilleurs résultats.");
      }
      const result = startListening();
      if (result === "unsupported") {
        toast.error("La saisie vocale nécessite Chrome ou Edge");
      } else if (result === "denied") {
        toast.error("Autorisez l'accès au microphone dans votre navigateur");
      }
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant={isListening ? "destructive" : "outline"}
          size={size}
          onClick={toggle}
          disabled={disabled}
          className={`shrink-0 ${isListening ? "animate-pulse" : ""}`}
        >
          {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{isListening ? "Arrêter la dictée" : "Dictée vocale"}</TooltipContent>
    </Tooltip>
  );
}
