import { useRef } from "react";
import { ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

interface ImageUploadButtonProps {
  onImageSelected: (base64: string, file: File) => void;
  disabled?: boolean;
  accept?: string;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function ImageUploadButton({ onImageSelected, disabled, accept = "image/*" }: ImageUploadButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Image trop lourde (max 10 Mo)");
      return;
    }
    try {
      const base64 = await fileToBase64(file);
      onImageSelected(base64, file);
    } catch {
      toast.error("Erreur lors du chargement de l'image");
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
          <ImagePlus className="h-4 w-4" />
          <input ref={inputRef} type="file" accept={accept} className="hidden" onChange={handleChange} />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Envoyer une photo</TooltipContent>
    </Tooltip>
  );
}
