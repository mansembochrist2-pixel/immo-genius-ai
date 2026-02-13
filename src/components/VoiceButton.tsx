import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { toast } from "sonner";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  size?: "default" | "sm" | "icon";
}

export function VoiceButton({ onTranscript, disabled, size = "icon" }: VoiceButtonProps) {
  const { isListening, isSupported, startListening, stopListening } = useVoiceInput(onTranscript);

  if (!isSupported) return null;

  const toggle = () => {
    if (isListening) {
      stopListening();
    } else {
      const ok = startListening();
      if (!ok) toast.error("La reconnaissance vocale n'est pas disponible");
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
      <TooltipContent>{isListening ? "Arrêter" : "Dictée vocale"}</TooltipContent>
    </Tooltip>
  );
}
