import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import {
  LayoutDashboard, Mail, Calendar, Users, FileText, TrendingUp, Radar, MessageSquare,
  ArrowRight, ArrowLeft, Sparkles, CheckCircle2, ShieldCheck, Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { onboardingSchema, validateOrError } from "@/lib/validators";
import { handleApiError } from "@/lib/error-handler";
import { toast } from "sonner";
import { AnalysisTransition } from "@/components/AnalysisTransition";

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

const TOTAL_STEPS = 6;

const Onboarding = () => {
  const [step, setStep] = useState(1);
  const [agentType, setAgentType] = useState("independant");
  const [zone, setZone] = useState("");
  const [objectif, setObjectif] = useState("");
  const [saving, setSaving] = useState(false);
  const [showTransition, setShowTransition] = useState(false);
  const [gmailReady, setGmailReady] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_integrations")
      .select("id")
      .eq("provider", "gmail")
      .eq("status", "connected")
      .maybeSingle()
      .then(({ data }) => setGmailReady(!!data));
  }, [user]);

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
      // Show "wow" transition before redirecting
      setShowTransition(true);
    } catch (e) {
      handleApiError(e, "Enregistrement de l'onboarding");
      setSaving(false);
    }
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  const prev = () => setStep((s) => Math.max(s - 1, 1));

  if (showTransition) {
    return <AnalysisTransition onComplete={() => navigate("/dashboard")} />;
  }

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

            {/* Step 4: Connect mailbox (NEW) */}
            {step === 4 && (
              <div className="space-y-6">
                <div className="text-center space-y-2">
                  <div className="h-14 w-14 rounded-2xl bg-accent/10 flex items-center justify-center mx-auto">
                    <Zap className="h-7 w-7 text-accent" strokeWidth={1.5} />
                  </div>
                  <h2 className="text-xl font-bold font-display">Branchez le cerveau de votre agence</h2>
                  <p className="text-sm text-muted-foreground">
                    Estate IA a besoin de lire vos échanges pour détecter vos futures ventes.
                    <br />Connexion 100% sécurisée.
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={() => connectMail("gmail")}
                    disabled={connectingProvider !== null}
                    variant="outline"
                    className="w-full h-12 justify-center gap-3 border-2"
                  >
                    {connectingProvider === "gmail" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.61z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>
                    )}
                    Continuer avec Google
                  </Button>
                  <Button
                    onClick={() => connectMail("outlook")}
                    disabled={connectingProvider !== null}
                    variant="outline"
                    className="w-full h-12 justify-center gap-3 border-2"
                  >
                    {connectingProvider === "outlook" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <svg className="h-5 w-5" viewBox="0 0 24 24"><path fill="#0078D4" d="M7 4h10a3 3 0 013 3v10a3 3 0 01-3 3H7a3 3 0 01-3-3V7a3 3 0 013-3z"/><path fill="#fff" d="M12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 1.5a2 2 0 110 4 2 2 0 010-4z"/></svg>
                    )}
                    Continuer avec Outlook
                  </Button>
                </div>

                {/* Reassurance micro-copy */}
                <div className="space-y-2 pt-2">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Lock className="h-3.5 w-3.5 text-success shrink-0" />
                    <span><strong className="text-foreground">Zéro stockage</strong> — nous ne lisons pas vos mots de passe.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ShieldCheck className="h-3.5 w-3.5 text-success shrink-0" />
                    <span><strong className="text-foreground">Confidentialité absolue</strong> — seule l'IA analyse les textes.</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
                    <span><strong className="text-foreground">Déconnexion en 1 clic</strong> à tout moment.</span>
                  </div>
                </div>

                <button
                  onClick={skipMailConnection}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors underline-offset-2 hover:underline"
                >
                  Passer cette étape — je connecterai plus tard
                </button>
              </div>
            )}

            {/* Step 5: Logic */}
            {step === 5 && (
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

            {/* Step 6: Ready */}
            {step === 6 && (
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
                <Button variant="ghost" size="sm" onClick={prev} disabled={connectingProvider !== null || saving}>
                  <ArrowLeft className="h-4 w-4 mr-1" /> Retour
                </Button>
              ) : <div />}
              {step < TOTAL_STEPS ? (
                step === 4 ? (
                  // No "Continue" button on mail connection step — user must connect or skip
                  <div />
                ) : (
                  <Button onClick={next}>
                    Continuer <ArrowRight className="h-4 w-4 ml-1" />
                  </Button>
                )
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
