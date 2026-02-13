import { useRef } from "react";
import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { fileToBase64 } from "@/components/ImageUploadButton";

interface CameraButtonProps {
  onPhotoTaken: (base64: string, file: File) => void;
  disabled?: boolean;
}

export function CameraButton({ onPhotoTaken, disabled }: CameraButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Photo trop lourde (max 10 Mo)");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onPhotoTaken(base64, file);
    } catch {
      toast.error("Erreur lors de la capture");
    }
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          className="shrink-0"
        >
          <Camera className="h-4 w-4" />
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleChange}
          />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Prendre une photo</TooltipContent>
    </Tooltip>
  );
}
