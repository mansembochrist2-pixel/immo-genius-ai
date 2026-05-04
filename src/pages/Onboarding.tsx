import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard, Mail, Calendar, Users, FileText, TrendingUp, Radar, MessageSquare,
  ArrowRight, ArrowLeft, Sparkles, CheckCircle2
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { onboardingSchema, validateOrError } from "@/lib/validators";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";

const moduleExplanations = [
  { icon: LayoutDashboard, title: "Dashboard", desc: "Suivre votre activité et vos priorités" },
  { icon: Mail, title: "Inbox", desc: "Gérer vos messages intelligemment" },
  { icon: Calendar, title: "Agenda", desc: "Organiser vos journées" },
  { icon: Users, title: "Mémoire Client", desc: "Suivre vos contacts" },
  { icon: FileText, title: "Documents", desc: "Créer rapidement du contenu" },
  { icon: TrendingUp, title: "Estimation", desc: "Évaluer un bien" },
  { icon: Radar, title: "Radar", desc: "Trouver des opportunités" },
  { icon: MessageSquare, title: "Copilote", desc: "Poser des questions et être accompagné" },
];

const TOTAL_STEPS = 5;

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState("independant");
  const [zone, setZone] = useState("");
  const [objectif, setObjectif] = useState("");
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  const saveAndFinish = async () => {
    const validationError = validateOrError(onboardingSchema, { zone, objectif });
    if (validationError) {
      toast.error(validationError);
      setStep(2);
      return;
    }
    setSaving(true);
    try {
      if (user) {
        const { error } = await supabase.from("profiles").update({
          agency_name: agentType === "agence" ? "Mon agence" : null,
          zone_principale: zone || null,
          onboarding_completed: true,
        } as any).eq("id", user.id);
        if (error) throw error;
      }
      toast.success("Configuration enregistrée");
      navigate("/dashboard");
    } catch (e) {
      handleApiError(e, "Enregistrement de l'onboarding");
    } finally {
      setSaving(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-6">
          <span className="text-2xl font-bold font-display gradient-text">Estate AI</span>
        </div>
        <Progress value={(step / TOTAL_STEPS) * 100} className="h-1.5 mb-8" />

        <Card className="bg-card/90 backdrop-blur-xl border-border/50 shadow-lg">
          <CardContent className="p-8">
            {/* Step 1: Welcome */}
            {step === 1 && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-2xl font-bold font-display">Bienvenue sur Estate AI</h2>
                <p className="text-muted-foreground">Votre copilote intelligent pour gérer et développer votre activité immobilière.</p>
              </div>
            )}

            {/* Step 2: Configuration */}
            {step === 2 && (
              <div className="space-y-6">
                <h2 className="text-xl font-bold font-display text-center">Parlez-nous de vous</h2>
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Type d'agent</Label>
                  <RadioGroup value={agentType} onValueChange={setAgentType} className="flex gap-4">
                    <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-colors ${agentType === "independant" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="independant" className="sr-only" />
                      <p className="font-medium text-sm">Indépendant</p>
                    </label>
                    <label className={`flex-1 cursor-pointer rounded-xl border-2 p-4 text-center transition-colors ${agentType === "agence" ? "border-primary bg-primary/5" : "border-border"}`}>
                      <RadioGroupItem value="agence" className="sr-only" />
                      <p className="font-medium text-sm">Agence</p>
                    </label>
                  </RadioGroup>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zone">Zone géographique</Label>
                  <Input id="zone" placeholder="Ex: Paris 15e, Lyon 3e..." value={zone} onChange={(e) => setZone(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="objectif">Objectif principal <span className="text-muted-foreground">(optionnel)</span></Label>
                  <Input id="objectif" placeholder="Ex: 10 mandats/mois" value={objectif} onChange={(e) => setObjectif(e.target.value)} />
                </div>
              </div>
            )}

            {/* Step 3: Modules */}
            {step === 3 && (
              <div className="space-y-5">
                <h2 className="text-xl font-bold font-display text-center">Vos outils</h2>
                <p className="text-sm text-muted-foreground text-center">8 modules pour couvrir toute votre activité.</p>
                <div className="grid grid-cols-2 gap-3">
                  {moduleExplanations.map((m, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-border/50 bg-muted/30">
                      <m.icon className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium">{m.title}</p>
                        <p className="text-xs text-muted-foreground">{m.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 4: Logic */}
            {step === 4 && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
                  <TrendingUp className="h-8 w-8 text-primary" />
                </div>
                <h2 className="text-xl font-bold font-display">Comment ça fonctionne</h2>
                <p className="text-muted-foreground">Estate AI analyse votre activité et vous aide à prendre les bonnes décisions au bon moment.</p>
                <div className="space-y-3 text-left mt-4">
                  {["L'IA analyse vos données en continu", "Elle détecte les opportunités et les priorités", "Elle vous propose des actions concrètes"].map((t, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                      <CheckCircle2 className="h-5 w-5 text-success shrink-0" />
                      <p className="text-sm">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 5: Ready */}
            {step === 5 && (
              <div className="text-center space-y-4">
                <div className="h-16 w-16 rounded-2xl bg-success/10 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="h-8 w-8 text-success" />
                </div>
                <h2 className="text-2xl font-bold font-display">Vous êtes prêt !</h2>
                <p className="text-muted-foreground">Votre copilote est configuré et prêt à vous accompagner.</p>
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-border/50">
              {step > 1 ? (
                <Button variant="ghost" size="sm" onClick={prev}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
              ) : <div />}
              {step < TOTAL_STEPS ? (
                <Button onClick={next}>
                  Continuer <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button onClick={saveAndFinish} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
                  Accéder à mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">Étape {step} sur {TOTAL_STEPS}</p>
      </div>
    </div>
  );
};

export default Onboarding;
