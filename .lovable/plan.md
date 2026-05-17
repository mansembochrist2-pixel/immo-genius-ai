# Restructuration Estate IA → "Copilote IA de conquête de mandats"

## Nouvelle vision
Estate IA n'est plus un CRM. C'est un **copilote IA Zero Friction** orienté conquête de mandats, prospection, estimation et création de contenu.

## 1. Suppressions massives

### Modules supprimés (UI + routes + composants + données)
- **Inbox Intelligence** (page Inbox, composants, tables `inbox_messages`)
- **Mémoire Client / Clients CRM** (page Clients, ClientDetail)
- **Agenda IA** (page Agenda, composants agenda/, table `events`)
- **Synchronisation Gmail** (toutes edge functions `gmail-*`, `sync-emails`, `sync-all-gmail`, `oauth-init`, `oauth-callback`, `analyze-inbox`, `gmail-connect-from-session`)
- **AuthComplete / GoogleSignInButton / gmailOAuth.ts** (flow OAuth Gmail)
- Widgets dashboard CRM (HotProspects email-based, RappelsWidget agenda)
- Cron job sync-all-gmail
- Routes : `/inbox`, `/agenda`, `/clients`, `/auth/complete`

### Auth simplifiée
- Garder auth email/password Supabase basique uniquement
- Supprimer toute logique Google OAuth avec scopes Gmail
- Onboarding : juste demander **ville/zone principale** → entrée immédiate

## 2. Nouvelle architecture de navigation

Sidebar réduite à :
1. **Dashboard**
2. **Chasseur de Mandats IA** (parent) → onglets internes
   - Radar Prospection (existant amélioré)
   - Pige IA (nouveau)
3. **Estimation IA** (conservé, polish premium)
4. **Studio IA** (renommage de Documents IA)
5. **Copilote** (recentré coach commercial)
6. **Settings**

## 3. Module "Chasseur de Mandats IA"

Route `/chasseur` avec deux onglets :

### Radar Prospection
- Garde la base existante (`/radar` → intégré)
- Améliorations UI : badges premium, hiérarchie visuelle scores, sensation "radar stratégique"

### Pige IA (nouveau)
Pour chaque annonce détectée → génération IA :
- Phrase d'accroche personnalisée
- Script d'appel
- Contre-objections
- Failles détectées
- Score de **Pigeabilité** (ancienneté, qualité photos/texte, cohérence prix, urgence, baisse prix)

Affichage : cartes annonces avec score visuel fort + panneau latéral "Stratégie de pige IA".

### Backend data
- Table `annonces_pige` (source, url, titre, prix, surface, ville, date_publication, photos, description, score_pigeabilite, analyse_ia jsonb, statut)
- Edge function `analyze-annonce-pige` (Lovable AI Gemini)
- Architecture connecteurs extensible (Leboncoin, SeLoger, etc.) → **phase 1 : seeder + ingestion manuelle URL + analyse IA**. Scraping multi-source = phase 2 (poser l'archi, pas implémenter tous les connecteurs maintenant).
- Cron quotidien `refresh-pige` pour rescorer

## 4. Studio IA (ex Documents IA)
- Renommer route `/documents` → `/studio`
- Renommer partout : sidebar, CTA, titres
- Sections : Annonces, Posts réseaux sociaux, Scripts vidéos, Emails commerciaux, Scripts d'appel, Brochures
- UI premium type "studio créatif"

## 5. Copilote Stratégique
- Garder `/copilote`
- Retirer toute injection de contexte Inbox/Mémoire client/Emails
- Nouveau system prompt : coach négociation immobilier, scripts pige, obtention mandats exclusifs
- Suggestions prompts mises à jour

## 6. Dashboard refait
Widgets nouveaux :
- Opportunités détectées aujourd'hui (count `annonces_pige` créées <24h)
- Score moyen de pigeabilité
- Nouveaux biens à piger (top 5)
- Estimations créées (count)
- Scripts IA générés (count studio)
- Actions recommandées (existant, mais filtré sans contexte email)
- CTA principaux : "Lancer une pige", "Nouvelle estimation", "Studio IA"

Supprimer : HotProspects email, RappelsWidget agenda, stats CRM.

## 7. Onboarding ultra-court
1 seule étape : ville + zone principale → redirect `/chasseur` avec radar pré-rempli.

## 8. Migration BDD
- DROP tables : `inbox_messages`, `events`, `user_integrations` (si plus utilisée)
- DROP cron `sync-all-gmail`
- CREATE table `annonces_pige` avec RLS user-scoped
- Garder : `profiles`, `prospects`, `opportunites`, `sales`, `tasks`, `actions_recommandees`, `analyses_zone`, `annonces`, `conversations`, `workflows`, `api_connections`

## Détails techniques

**Fichiers supprimés** :
- `src/pages/Inbox.tsx`, `Agenda.tsx`, `Clients.tsx`, `AuthComplete.tsx`
- `src/components/agenda/*`, `src/components/clients/*`, `GoogleSignInButton.tsx`
- `src/components/dashboard/HotProspects.tsx`, `RappelsWidget.tsx`
- `src/lib/gmailOAuth.ts`
- `supabase/functions/oauth-init`, `oauth-callback`, `sync-emails`, `sync-all-gmail`, `gmail-connect-from-session`, `analyze-inbox`

**Fichiers créés** :
- `src/pages/Chasseur.tsx` (onglets Radar + Pige)
- `src/pages/PigeIA.tsx` (ou sous-composant)
- `src/pages/Studio.tsx` (renommé de Documents)
- `src/components/dashboard/OpportunitiesToday.tsx`, `PigeabiliteScore.tsx`, `StudioActivity.tsx`
- `supabase/functions/analyze-annonce-pige/index.ts`
- `supabase/functions/refresh-pige/index.ts`

**Fichiers modifiés** :
- `src/App.tsx` (routes)
- `src/components/AppSidebar.tsx` (nav)
- `src/pages/Dashboard.tsx` (widgets)
- `src/pages/Onboarding.tsx` (1 étape)
- `src/pages/Login.tsx`, `Signup.tsx` (retrait Google OAuth)
- `src/pages/Copilote.tsx` (recentrage prompt)
- `src/pages/Radar.tsx` (polish + intégration parent Chasseur)
- `supabase/functions/copilote-agent` (system prompt)

## Hors-scope (à confirmer / phase 2)
- Connecteurs scraping live Leboncoin/SeLoger (légalement sensibles, nécessitent infra dédiée) → phase 1 = ingestion par URL + seeds + architecture extensible prête.
- Génération vidéo IA Studio.
- Migration de données existantes Inbox/Agenda (perdues à la suppression — confirmer OK).

## Confirmation requise
1. **OK pour DROP des tables `inbox_messages`, `events`, `user_integrations`** ? (perte définitive des données)
2. **OK pour scraping différé** (phase 1 = ingestion URL + IA, phase 2 = connecteurs sources) ?
3. **Auth : on garde email/password Supabase uniquement** (suppression totale du bouton Google) ?
