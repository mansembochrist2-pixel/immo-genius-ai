import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText } from "lucide-react";

const MentionsLegales = () => (
  <AppLayout>
    <div className="page-header">
      <h1 className="page-title flex items-center gap-2"><FileText className="h-6 w-6 text-accent" /> Mentions légales</h1>
    </div>
    <Card className="max-w-3xl">
      <CardHeader><CardTitle className="text-lg font-sans">Mentions légales</CardTitle></CardHeader>
      <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-4">
        <h3>Éditeur du site</h3>
        <p>Estate AI — SAS<br />Les informations légales complètes de l'éditeur seront renseignées dans les paramètres de la plateforme.</p>

        <h3>Hébergement</h3>
        <p>Ce site est hébergé par Lovable Cloud.<br />Contact : support@lovable.dev</p>

        <h3>Propriété intellectuelle</h3>
        <p>L'ensemble des contenus (textes, images, logos, interface) présents sur ce site sont protégés par le droit d'auteur. Toute reproduction est interdite sans autorisation écrite préalable.</p>

        <h3>Responsabilité</h3>
        <p>Les informations fournies par l'intelligence artificielle sont à titre indicatif et ne sauraient se substituer à un conseil juridique, fiscal ou professionnel. L'éditeur décline toute responsabilité quant à l'utilisation des contenus générés.</p>

        <h3>Contact</h3>
        <p>Pour toute question : <a href="mailto:contact@estate-ai.fr">contact@estate-ai.fr</a></p>
      </CardContent>
    </Card>
  </AppLayout>
);

export default MentionsLegales;
