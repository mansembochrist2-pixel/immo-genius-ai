import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Crosshair, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

const Onboarding = () => {
  const [zone, setZone] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const finish = async () => {
    if (!zone.trim()) {
      toast.error("Indiquez votre zone principale pour commencer");
      return;
    }
    setSaving(true);
    try {
      if (user) {
        const { error } = await supabase.from("profiles").update({
          zone_principale: zone,
          onboarding_completed: true,
        } as any).eq("id", user.id);
        if (error) throw error;
      }
      sessionStorage.setItem("pige_zone_initiale", zone);
      navigate("/chasseur");
    } catch (e) {
      handleApiError(e, "Enregistrement de l'onboarding");
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold font-display gradient-text">Estate AI</span>
        </div>

        <Card className="bg-card/90 backdrop-blur-xl border-border/50 shadow-lg">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-3">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                <Crosshair className="h-7 w-7 text-primary" />
              </div>
              <h2 className="text-2xl font-bold font-display">Votre arme commerciale IA</h2>
              <p className="text-sm text-muted-foreground">
                Estate IA est votre copilote pour la conquête de mandats. Indiquez votre secteur, on s'occupe du reste.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="zone" className="text-sm font-medium">Votre zone principale de prospection</Label>
              <Input
                id="zone"
                placeholder="Ex : Paris 15e, Lyon 3e, Bordeaux Centre..."
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                autoFocus
                onKeyDown={(e) => { if (e.key === "Enter") finish(); }}
              />
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3 text-accent" />
                Le Radar et la Pige IA cibleront automatiquement cette zone.
              </p>
            </div>

            <Button onClick={finish} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : null}
              Lancer Estate IA <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Onboarding;
