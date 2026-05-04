import { LegalLayout } from "@/components/LegalLayout";

const PolitiqueConfidentialite = () => (
  <LegalLayout title="Politique de confidentialité — RGPD">
    <h3>1. Responsable du traitement</h3>
    <p>Estate AI — [Adresse du siège]<br />Email : contact@estate-ai.fr</p>

    <h3>2. Données collectées</h3>
    <ul>
      <li><strong>Données d'inscription :</strong> nom, email, téléphone, nom d'agence</li>
      <li><strong>Données métier :</strong> prospects, tâches, annonces, analyses de zones</li>
      <li><strong>Données techniques :</strong> logs de connexion, adresse IP, navigateur</li>
    </ul>

    <h3>3. Finalités du traitement</h3>
    <ul>
      <li>Fournir les services de la plateforme (CRM, IA, marketing)</li>
      <li>Gérer l'abonnement et la facturation</li>
      <li>Améliorer les services et l'expérience utilisateur</li>
    </ul>

    <h3>4. Base légale</h3>
    <p>Le traitement repose sur l'exécution du contrat (abonnement) et le consentement de l'utilisateur.</p>

    <h3>5. Durée de conservation</h3>
    <p>Les données sont conservées pendant la durée de l'abonnement et 3 ans après la résiliation, conformément aux obligations légales.</p>

    <h3>6. Vos droits (RGPD)</h3>
    <ul>
      <li><strong>Accès :</strong> demander une copie de vos données</li>
      <li><strong>Rectification :</strong> corriger vos informations</li>
      <li><strong>Suppression :</strong> demander l'effacement de vos données</li>
      <li><strong>Portabilité :</strong> exporter vos données dans un format lisible</li>
      <li><strong>Opposition :</strong> vous opposer à certains traitements</li>
    </ul>
    <p>Pour exercer vos droits : <a href="mailto:rgpd@estate-ai.fr">rgpd@estate-ai.fr</a></p>

    <h3>7. Sous-traitants</h3>
    <p>Lovable Cloud (hébergement, base de données), Stripe (paiement), Google AI (intelligence artificielle).</p>

    <h3>8. Transferts hors UE</h3>
    <p>Certains sous-traitants peuvent traiter des données hors UE, dans le cadre de garanties contractuelles conformes au RGPD.</p>

    <h3>9. Cookies</h3>
    <p>Nous utilisons des cookies strictement nécessaires au fonctionnement du site. Aucun cookie publicitaire n'est utilisé.</p>
  </LegalLayout>
);

export default PolitiqueConfidentialite;
