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
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-4 py-16">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3" style={{ fontFamily: "'Playfair Display', serif" }}>
          Un seul plan, tout inclus
        </h1>
        <p className="text-muted-foreground text-lg max-w-md mx-auto">
          Accédez à l'intégralité d'Estate AI pour booster votre activité immobilière.
        </p>
      </div>

      <Card className="max-w-md w-full border-2 border-accent shadow-lg">
        <CardHeader className="text-center pb-2">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-6 w-6 text-accent" />
            <CardTitle className="text-xl font-sans font-bold">Estate AI Pro</CardTitle>
          </div>
          <div className="flex items-baseline justify-center gap-1">
            <span className="text-5xl font-bold tracking-tight">79€</span>
            <span className="text-muted-foreground text-lg">/mois</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2">Sans engagement · Essai gratuit 7 jours</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <ul className="space-y-3">
            {features.map((f, i) => (
              <li key={i} className="flex items-start gap-3 text-sm">
                <Check className="h-4 w-4 text-accent shrink-0 mt-0.5" />
                <span>{f}</span>
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

      <div className="mt-8 text-center">
        <Button variant="link" onClick={() => navigate(user ? "/" : "/login")}>
          {user ? "Retour au dashboard" : "Déjà un compte ? Connectez-vous"}
        </Button>
      </div>
    </div>
  );
};

export default Pricing;
