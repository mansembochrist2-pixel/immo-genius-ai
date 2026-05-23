import { LegalLayout } from "@/components/LegalLayout";

const CGU = () => (
  <LegalLayout title="Conditions Générales d'Utilisation">
    <h3>1. Objet</h3>
    <p>Les présentes CGU régissent l'utilisation de la plateforme ImmoGenius AI, service SaaS destiné aux professionnels de l'immobilier.</p>

    <h3>2. Inscription</h3>
    <p>L'accès au service nécessite la création d'un compte avec une adresse email valide. L'utilisateur s'engage à fournir des informations exactes.</p>

    <h3>3. Bêta privée</h3>
    <p>Pendant la phase de bêta privée, l'accès est gratuit pour les utilisateurs sélectionnés. Les conditions tarifaires post-bêta seront communiquées en priorité aux bêta-testeurs.</p>

    <h3>4. Utilisation du service</h3>
    <p>L'utilisateur s'engage à utiliser le service conformément à sa destination professionnelle. Toute utilisation abusive, frauduleuse ou contraire aux bonnes mœurs est interdite.</p>

    <h3>5. Intelligence artificielle</h3>
    <p>Les contenus générés par l'IA sont fournis à titre d'aide à la décision. L'utilisateur reste seul responsable de l'utilisation des contenus générés et de leur conformité réglementaire.</p>

    <h3>6. Données</h3>
    <p>L'utilisateur reste propriétaire de ses données. ImmoGenius AI s'engage à protéger ces données conformément au RGPD et à sa politique de confidentialité.</p>

    <h3>7. Responsabilité</h3>
    <p>ImmoGenius AI ne garantit pas l'exactitude des contenus générés par l'IA. Le service est fourni « en l'état ». La responsabilité est limitée au montant de l'abonnement mensuel.</p>

    <h3>8. Résiliation</h3>
    <p>L'utilisateur peut résilier à tout moment depuis les paramètres de son compte. Les données seront conservées pendant 30 jours après résiliation.</p>

    <h3>9. Droit applicable</h3>
    <p>Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux de [Ville].</p>
  </LegalLayout>
);

export default CGU;
