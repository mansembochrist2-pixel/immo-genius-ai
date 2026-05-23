import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Check, Crown, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

const features = [
  "Assistants IA Expert Immobilier & Marketing",
  "Dashboard avancé avec KPIs en temps réel",
  "Gestion prospects illimitée",
  "Tâches intelligentes & suggestions IA",
  "Prospection IA par zone",
  "Génération d'annonces premium",
  "Import CSV / Excel",
  "Analyse photos & OCR automatique",
  "Dictée vocale dans tous les modules",
  "Support prioritaire",
];

const Pricing = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
      <div className="absolute top-1/3 -left-48 w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px]" />
      <div className="absolute bottom-1/3 -right-48 w-[500px] h-[500px] rounded-full bg-info/8 blur-[150px]" />

      <div className="text-center mb-12 relative z-10">
        <h1 className="text-4xl font-bold tracking-tight mb-3 font-display gradient-text">
          Un seul plan, tout inclus
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Accédez à l'intégralité d'ImmoGenius AI pour booster votre activité immobilière.
        </p>
      </div>

      <Card className="max-w-md w-full glow-border bg-card/80 backdrop-blur-xl relative z-10">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-primary" />
            <CardTitle className="text-xl font-display font-bold">ImmoGenius AI Pro</CardTitle>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tracking-tight gradient-text">79€</span>
            <span className="text-muted-foreground text-lg">/mois</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Sans engagement · Essai gratuit 7 jours</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                <span className="text-foreground/80">{f}</span>
              </li>
            ))}
          </ul>
          <Button
            className="w-full text-base py-6"
            onClick={() => navigate(user ? "/settings" : "/signup")}
          >
            Commencer l'essai gratuit <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <p className="text-xs text-center text-muted-foreground">
            Aucun paiement requis pendant la période d'essai
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 text-center relative z-10">
        <Button variant="link" className="text-muted-foreground hover:text-primary" onClick={() => navigate(user ? "/dashboard" : "/login")}>
          {user ? "Retour au dashboard" : "Déjà un compte ? Connectez-vous"}
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
