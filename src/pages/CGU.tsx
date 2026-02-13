import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollText } from "lucide-react";

const CGU = () => (
  <AppLayout>
    <div className="page-header">
      <h1 className="page-title flex items-center gap-2"><ScrollText className="h-6 w-6 text-accent" /> Conditions Générales d'Utilisation</h1>
    </div>
    <Card className="max-w-3xl">
      <CardHeader><CardTitle className="text-lg font-sans">CGU — Estate AI</CardTitle></CardHeader>
      <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <h3>1. Objet</h3>
        <p>Les présentes CGU régissent l'utilisation de la plateforme Estate AI, service SaaS destiné aux professionnels de l'immobilier.</p>

        <h3>2. Inscription</h3>
        <p>L'accès au service nécessite la création d'un compte avec une adresse email valide. L'utilisateur s'engage à fournir des informations exactes.</p>

        <h3>3. Abonnement</h3>
        <p>L'abonnement est proposé à 79€/mois sans engagement, avec une période d'essai de 7 jours. Le renouvellement est automatique. La résiliation prend effet à la fin de la période en cours.</p>

        <h3>4. Utilisation du service</h3>
        <p>L'utilisateur s'engage à utiliser le service conformément à sa destination professionnelle. Toute utilisation abusive, frauduleuse ou contraire aux bonnes mœurs est interdite.</p>

        <h3>5. Intelligence artificielle</h3>
        <p>Les contenus générés par l'IA sont fournis à titre d'aide à la décision. L'utilisateur reste seul responsable de l'utilisation des contenus générés et de leur conformité réglementaire.</p>

        <h3>6. Données</h3>
        <p>L'utilisateur reste propriétaire de ses données. Estate AI s'engage à protéger ces données conformément au RGPD et à sa politique de confidentialité.</p>

        <h3>7. Responsabilité</h3>
        <p>Estate AI ne garantit pas l'exactitude des contenus générés par l'IA. Le service est fourni « en l'état ». La responsabilité est limitée au montant de l'abonnement mensuel.</p>

        <h3>8. Résiliation</h3>
        <p>L'utilisateur peut résilier à tout moment depuis les paramètres de son compte. Les données seront conservées pendant 30 jours après résiliation.</p>

        <h3>9. Droit applicable</h3>
        <p>Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux de [Ville].</p>
      </CardContent>
    </Card>
  </AppLayout>
);

export default CGU;
