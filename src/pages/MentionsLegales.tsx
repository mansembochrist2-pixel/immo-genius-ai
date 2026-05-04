import { LegalLayout } from "@/components/LegalLayout";

const MentionsLegales = () => (
  <LegalLayout title="Mentions légales">
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
  </LegalLayout>
);

export default MentionsLegales;
