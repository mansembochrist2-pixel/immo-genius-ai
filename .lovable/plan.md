

# Plan de transformation — Estate AI Pro V1

## Vue d'ensemble

Transformation de l'application existante en SaaS premium, en 5 sprints successifs. Chaque sprint produit un livrable fonctionnel.

---

## Sprint 1 — Fondations Backend et Authentification Reelle

### Base de donnees (migrations SQL)

Creer les tables suivantes avec securite RLS stricte (multi-tenant) :

- **profiles** : id (ref auth.users), full_name, email, phone, agency_name, plan (starter/pro/premium), trial_ends_at, created_at
- **prospects** : id, user_id, nom, telephone, email, statut (enum), source, notes, score_ia, created_at, updated_at
- **tasks** : id, user_id, titre, description, priorite (enum), done, due_date, prospect_id (nullable FK), source (manual/ia), created_at
- **conversations** : id, user_id, assistant_type (immobilier/marketing), messages (jsonb), created_at, updated_at
- **annonces** : id, user_id, adresse, prix, surface, description, contenu_genere (jsonb avec variantes), created_at
- **analyses_zone** : id, user_id, adresse, secteur, resultat (jsonb), sources_utilisees (text[]), created_at

Toutes les tables ont une politique RLS : `user_id = auth.uid()` pour SELECT/INSERT/UPDATE/DELETE.

Un trigger `on_auth_user_created` cree automatiquement un profil avec `plan = 'starter'` et `trial_ends_at = now() + 14 days`.

### Authentification reelle

Remplacer le AuthContext mock par l'authentification Lovable Cloud :
- Signup avec email/password (verification email activee)
- Login
- Logout
- Mot de passe oublie (reset par email)
- Session persistante avec auto-refresh

### Migration des pages existantes

Connecter Prospects et Taches a la base de donnees au lieu des donnees mock :
- CRUD complet avec hooks React Query
- Chargement, etats vides, erreurs geres proprement

---

## Sprint 2 — Assistants IA de niveau expert

### Edge Function : `chat-immobilier`

Assistant IA principal avec system prompt expert :

```
Tu es un expert immobilier senior avec 20 ans d'experience en France.
Tu maitrises : legislation (loi Hoguet, Alur, Climat & Resilience),
fiscalite (plus-values, IFI, LMNP, Pinel), diagnostics obligatoires,
procedures notariales, estimation, negociation, mandats, prospection.

Regles :
- Reponds toujours de facon structuree avec des titres
- Cite tes sources juridiques quand applicable
- Propose des plans d'action concrets
- Ne fais jamais d'approximation sur les chiffres legaux
- Ton professionnel, rassurant, pedagogique
```

- Modele : `google/gemini-3-flash-preview` via Lovable AI Gateway
- Streaming SSE token par token
- Historique sauvegarde en base (table conversations)

### Edge Function : `chat-marketing`

Assistant marketing immobilier expert :

```
Tu es un expert en marketing immobilier digital avec 15 ans d'experience.
Tu maitrises : copywriting, Instagram, LinkedIn, Facebook, emailing,
personal branding, growth hacking, SEO immobilier, portails (SeLoger,
Leboncoin, Bien'ici, Logic-Immo).

Regles :
- Propose des strategies actionnables
- Adapte tes conseils au marche francais
- Donne des exemples concrets
- Structure avec titres et puces
```

- Meme architecture streaming
- Accessible depuis une nouvelle page "Marketing IA" avec mode chat

### Edge Function : `generate-annonce`

Generateur d'annonces premium :
- Input : adresse, prix, surface, description, style souhaite
- Output structure (via tool calling) :
  - titre_accrocheur
  - version_courte (portails)
  - version_longue (site web)
  - version_premium (haut de gamme)
  - hashtags[]
  - phrases_accroche[]
- Sauvegarde en base (table annonces)

### Edge Function : `analyze-zone`

Analyse de prospection enrichie :
- System prompt expert en analyse de marche
- Genere : prix/m2 estimes, tendances, opportunites, strategie
- Cite systématiquement : "Sources : DVF (data.gouv.fr), INSEE, bases notariales"
- Sauvegarde en base (table analyses_zone)

### Modifications UI

- **AssistantIA.tsx** : Ajouter onglets "Expert Immobilier" / "Coach Marketing", streaming reel, historique des conversations, indicateur de frappe
- **Marketing.tsx** : Formulaire ameliore avec choix de style, affichage des variantes en onglets, boutons copier par section, mode chat marketing
- **Prospection.tsx** : Affichage structure des resultats avec section sources, historique des analyses

---

## Sprint 3 — Dashboard avance et taches intelligentes

### Dashboard

- **Graphiques** : ajout de recharts pour evolution mensuelle (prospects, taches completees, conversions)
- **KPI dynamiques** : calcules depuis la base de donnees en temps reel
- **Cartes cliquables** : navigation vers la page correspondante
- **Section "Alertes IA"** : widget avec suggestions basees sur l'activite recente
- **Section "Prospects chauds"** : top 5 prospects par score
- **Boutons d'action rapide** : ajouter prospect, creer tache, generer annonce

### Taches intelligentes

- Edge function `suggest-tasks` : analyse les prospects recents et propose des taches (via tool calling)
- Bouton "Suggestions IA" sur la page Taches
- Chaque suggestion affiche un bouton "Creer cette tache" (validation humaine obligatoire)
- Ajout de champs : due_date, description, liaison prospect

### Prospects enrichis

- Ajout de champs : source, notes, score IA
- Edge function `enrich-prospect` : a partir du nom/email, genere des suggestions de notes et un score de priorite
- Bouton "Enrichir via IA" sur chaque prospect

---

## Sprint 4 — Monetisation Stripe et parametres

### Integration Stripe

- Activer le connecteur Stripe de Lovable
- Plan unique a 79 euros/mois
- Essai gratuit 14 jours sans CB
- Pages `/pricing` et `/billing`
- Webhooks pour gestion du statut d'abonnement
- Blocage automatique si plan expire (redirection vers /pricing)
- Gestion annulation/reactivation

### Page Parametres

Nouvelle page `/settings` avec onglets :
- **Profil** : nom, email, agence, telephone
- **Abonnement** : plan actuel, facturation, historique
- **Integrations** : liste Gmail, Outlook, HubSpot, Apimo avec statut "Bientot disponible"
- **Securite** : changer mot de passe, supprimer compte, exporter donnees

---

## Sprint 5 — UX premium, securite et RGPD

### Ameliorations UX

- Animations de transition entre pages (fade-in existant + slide)
- Skeleton loaders sur toutes les listes
- Tooltips sur les boutons d'action
- Confirmation avant suppression (AlertDialog)
- Messages toast contextualises
- Etats vides illustres

### RGPD et legal

- Pages statiques : `/mentions-legales`, `/confidentialite`, `/cgu`
- Bandeau de consentement cookies (si analytics ajoute)
- Bouton "Exporter mes donnees" dans parametres
- Bouton "Supprimer mon compte" avec confirmation

### Commande vocale (preparation)

- Architecture preparee pour ElevenLabs (composant VoiceInput reutilisable)
- Necessitera une cle API ElevenLabs pour activation
- Non active par defaut dans la V1

---

## Architecture technique

```text
src/
  components/
    AppLayout.tsx          (existant, ameliore)
    AppSidebar.tsx         (existant, ameliore avec badge plan)
    NavLink.tsx            (existant)
    dashboard/
      StatsCards.tsx
      PerformanceChart.tsx
      HotProspects.tsx
      AIAlerts.tsx
      QuickActions.tsx
    prospects/
      ProspectTable.tsx
      ProspectForm.tsx
      ProspectEnrich.tsx
    tasks/
      TaskTable.tsx
      TaskForm.tsx
      TaskSuggestions.tsx
    ai/
      ChatInterface.tsx     (composant reutilisable streaming)
      AnnonceGenerator.tsx
      ZoneAnalyzer.tsx
    settings/
      ProfileTab.tsx
      BillingTab.tsx
      IntegrationsTab.tsx
      SecurityTab.tsx
    ui/ (existant)
  contexts/
    AuthContext.tsx          (reecrit pour auth reelle)
  hooks/
    use-prospects.ts
    use-tasks.ts
    use-conversations.ts
    use-annonces.ts
    use-profile.ts
    use-streaming-chat.ts
  lib/
    utils.ts (existant)
    ai-stream.ts            (utilitaire SSE parsing)
  pages/
    Login.tsx / Signup.tsx / ForgotPassword.tsx (reecrits)
    Dashboard.tsx           (ameliore)
    Prospects.tsx           (connecte DB)
    Taches.tsx              (connecte DB)
    Marketing.tsx           (ameliore avec IA reelle)
    Prospection.tsx         (ameliore avec IA reelle)
    AssistantIA.tsx         (reecrits avec 2 assistants)
    Settings.tsx            (nouveau)
    Pricing.tsx             (nouveau)
    Billing.tsx             (nouveau)
    MentionsLegales.tsx     (nouveau)
    Confidentialite.tsx     (nouveau)

supabase/functions/
    chat-immobilier/index.ts
    chat-marketing/index.ts
    generate-annonce/index.ts
    analyze-zone/index.ts
    suggest-tasks/index.ts
    enrich-prospect/index.ts
```

---

## Ordre d'implementation recommande

Je recommande de commencer par le **Sprint 1** (base de donnees + auth reelle), puis enchainer sprint par sprint. Chaque sprint est testable independamment.

Le Sprint 1 seul transforme deja l'application d'un prototype en un produit fonctionnel avec persistance des donnees et authentification securisee.

