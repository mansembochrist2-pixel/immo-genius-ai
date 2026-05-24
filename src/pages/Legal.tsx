import { LegalLayout } from "@/components/LegalLayout";

const Legal = () => (
  <LegalLayout title="Légal & RGPD">
    <p className="text-sm">
      Cette page consolide les <strong>Mentions légales</strong>, la <strong>Politique de confidentialité (RGPD)</strong>,
      les <strong>Conditions Générales d'Utilisation</strong> et la <strong>Politique cookies</strong> d'ImmoGenius AI.
    </p>

    {/* ====== MENTIONS LÉGALES ====== */}
    <h2 id="mentions" className="font-display text-2xl font-semibold mt-10 mb-2">Mentions légales</h2>

    <h3>Éditeur du site</h3>
    <p>ImmoGenius AI — SAS<br />Les informations légales complètes de l'éditeur seront renseignées dans les paramètres de la plateforme.</p>

    <h3>Hébergement</h3>
    <p>Ce site est hébergé sur infrastructure cloud européenne.<br />Contact technique : <a href="mailto:contact@immogenius.ai">contact@immogenius.ai</a></p>

    <h3>Propriété intellectuelle</h3>
    <p>L'ensemble des contenus (textes, images, logos, interface) présents sur ce site sont protégés par le droit d'auteur. Toute reproduction est interdite sans autorisation écrite préalable.</p>

    <h3>Responsabilité</h3>
    <p>Les informations fournies par l'intelligence artificielle sont à titre indicatif et ne sauraient se substituer à un conseil juridique, fiscal ou professionnel. L'éditeur décline toute responsabilité quant à l'utilisation des contenus générés.</p>

    {/* ====== RGPD ====== */}
    <h2 id="rgpd" className="font-display text-2xl font-semibold mt-12 mb-2">Politique de confidentialité — RGPD</h2>

    <h3>1. Responsable du traitement</h3>
    <p>ImmoGenius AI — SAS<br />Email RGPD : <a href="mailto:rgpd@immogenius.ai">rgpd@immogenius.ai</a></p>

    <h3>2. Données collectées</h3>
    <ul>
      <li><strong>Données d'inscription :</strong> nom, email, téléphone, nom d'agence</li>
      <li><strong>Données métier :</strong> annonces, piges, opportunités, analyses de zones, expertises, audits réseaux sociaux</li>
      <li><strong>Données techniques :</strong> logs de connexion, adresse IP, navigateur</li>
    </ul>

    <h3>3. Finalités</h3>
    <ul>
      <li>Fournir les services de la plateforme (IA, marketing, prospection)</li>
      <li>Gérer l'abonnement et la facturation</li>
      <li>Améliorer les services et l'expérience utilisateur</li>
    </ul>

    <h3>4. Sécurité</h3>
    <ul>
      <li><strong>TLS 1.3</strong> pour le chiffrement en transit</li>
      <li><strong>AES-256</strong> pour le chiffrement au repos des données sensibles</li>
      <li><strong>Row Level Security (RLS) Postgres</strong> : isolation stricte par compte agent</li>
      <li><strong>MFA</strong> obligatoire pour tous les comptes administrateurs</li>
      <li>Surveillance des intrusions et journalisation des accès sensibles</li>
    </ul>

    <h3>5. Conservation</h3>
    <p>Les données sont conservées pendant la durée de l'abonnement et 3 ans après la résiliation, conformément aux obligations légales. Suppression définitive sous 30 jours sur simple demande.</p>

    <h3>6. Vos droits</h3>
    <ul>
      <li><strong>Accès :</strong> demander une copie de vos données (export JSON disponible dans Paramètres)</li>
      <li><strong>Rectification :</strong> corriger vos informations</li>
      <li><strong>Suppression :</strong> demander l'effacement de vos données</li>
      <li><strong>Portabilité :</strong> exporter vos données dans un format lisible</li>
      <li><strong>Opposition :</strong> vous opposer à certains traitements</li>
    </ul>
    <p>Pour exercer vos droits : <a href="mailto:rgpd@immogenius.ai">rgpd@immogenius.ai</a></p>

    <h3>7. Sous-traitants</h3>
    <p>Infrastructure cloud européenne (hébergement, base de données), Stripe (paiement), fournisseurs IA partenaires (génération de contenu). Tous encadrés par des contrats conformes RGPD.</p>

    <h3>8. Transferts hors UE</h3>
    <p>Certains sous-traitants peuvent traiter des données hors UE, dans le cadre de garanties contractuelles conformes au RGPD (clauses contractuelles types).</p>

    {/* ====== CGU ====== */}
    <h2 id="cgu" className="font-display text-2xl font-semibold mt-12 mb-2">Conditions Générales d'Utilisation</h2>

    <h3>1. Objet</h3>
    <p>Les présentes CGU régissent l'utilisation de la plateforme ImmoGenius AI, service SaaS destiné aux professionnels de l'immobilier.</p>

    <h3>2. Inscription</h3>
    <p>L'accès au service nécessite la création d'un compte avec une adresse email valide. L'utilisateur s'engage à fournir des informations exactes.</p>

    <h3>3. Utilisation du service</h3>
    <p>L'utilisateur s'engage à utiliser le service conformément à sa destination professionnelle. Toute utilisation abusive, frauduleuse ou contraire aux bonnes mœurs est interdite.</p>

    <h3>4. Intelligence artificielle</h3>
    <p>Les contenus générés par l'IA sont fournis à titre d'aide à la décision. L'utilisateur reste seul responsable de l'utilisation des contenus générés et de leur conformité réglementaire (Hoguet, ALUR, etc.).</p>

    <h3>5. Données</h3>
    <p>L'utilisateur reste propriétaire de ses données. ImmoGenius AI s'engage à protéger ces données conformément au RGPD et à sa politique de confidentialité.</p>

    <h3>6. Responsabilité</h3>
    <p>ImmoGenius AI ne garantit pas l'exactitude des contenus générés par l'IA. Le service est fourni « en l'état ». La responsabilité est limitée au montant de l'abonnement mensuel.</p>

    <h3>7. Résiliation</h3>
    <p>L'utilisateur peut résilier à tout moment depuis les paramètres de son compte. Les données seront conservées pendant 30 jours après résiliation puis supprimées.</p>

    <h3>8. Droit applicable</h3>
    <p>Les présentes CGU sont régies par le droit français. Tout litige relève de la compétence des tribunaux compétents.</p>

    {/* ====== COOKIES ====== */}
    <h2 id="cookies" className="font-display text-2xl font-semibold mt-12 mb-2">Politique cookies</h2>
    <p>
      Nous utilisons exclusivement des cookies strictement nécessaires au fonctionnement du site (session, préférences).
      Aucun cookie publicitaire ni de traçage tiers n'est déposé. La durée de conservation des cookies n'excède pas <strong>13 mois</strong>,
      conformément aux recommandations CNIL. Vous pouvez à tout moment ajuster vos préférences depuis le bandeau de consentement.
    </p>

    <h3>Contact</h3>
    <p>Pour toute question : <a href="mailto:contact@immogenius.ai">contact@immogenius.ai</a></p>
  </LegalLayout>
);

export default Legal;
