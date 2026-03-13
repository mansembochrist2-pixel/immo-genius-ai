import { useState, useCallback, useRef } from "react";

interface UseVoiceInputOptions {
  onInterim?: (text: string) => void;
  onFinal?: (text: string) => void;
  onError?: (type: "denied" | "unsupported") => void;
}

export function useVoiceInput({ onInterim, onFinal, onError }: UseVoiceInputOptions) {
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  const isSafari = typeof navigator !== "undefined" && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const SR = typeof window !== "undefined" ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition : null;
  const isSupported = !!SR;

  const startListening = useCallback((): boolean => {
    if (!SR) {
      onError?.("unsupported");
      return false;
    }

    try {
      const recognition = new SR();
      recognition.lang = "fr-FR";
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += transcript;
          } else {
            interim += transcript;
          }
        }
        if (final) onFinal?.(final);
        if (interim) onInterim?.(interim);
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed") {
          onError?.("denied");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsListening(true);
      return true;
    } catch {
      onError?.("unsupported");
      return false;
    }
  }, [SR, onInterim, onFinal, onError]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);

  return { isListening, isSupported, isSafari, startListening, stopListening };
}
