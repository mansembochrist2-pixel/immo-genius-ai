import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";
import { useCallback } from "react";

interface VoiceButtonProps {
  onInterim?: (text: string) => void;
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
}

export function VoiceButton({ onTranscript, onInterim, disabled, size = "icon" }: VoiceButtonProps) {
  const handleError = useCallback((type: "denied" | "unsupported") => {
    if (type === "denied") toast.error("Autorisez l'accès au microphone dans votre navigateur");
    else toast.error("La saisie vocale nécessite Chrome ou Edge");
  }, []);

  const { isListening, isSupported, isSafari, startListening, stopListening } = useVoiceInput({
    onFinal: onTranscript,
    onInterim,
    onError: handleError,
  });

  if (!isSupported) return null;

  const toggle = () => {
    if (isListening) {
      stopListening();
    } else {
      if (isSafari) {
        toast.warning("Safari a un support limité. Utilisez Chrome ou Edge pour de meilleurs résultats.");
      }
      startListening();
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
