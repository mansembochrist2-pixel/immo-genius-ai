## Objectif

Transformer le module "Chasseur de Mandats IA" d'un générateur de stratégie en un véritable outil opérationnel de pige + corriger la lenteur de navigation entre modules.

---

## 1. Enrichissement des données annonces (backend `search-pige-zone`)

Ajouter l'extraction et le stockage de :
- **Vendeur** : type (particulier/agence), nom/agence si dispo, téléphone, email (si présent légalement dans l'annonce)
- **Localisation fine** : quartier, rue approximative, résidence, étage, proximité commerces
- **Signaux marché** : ancienneté annonce (jours en ligne), baisse de prix détectée, republish, multi-diffusion (présence sur plusieurs plateformes)
- **Qualité annonce** : nombre de photos, qualité description (longueur, structure), photos amateurs vs pro
- **Données marché** : prix/m², comparaison vs moyenne quartier, tension secteur

Migration DB : ajouter colonnes `contact_vendeur` (jsonb), `signaux_marche` (jsonb), `qualite_annonce` (jsonb), `categorie_opportunite` (text: top/moyenne/faible/surveiller).

## 2. Logique de scoring "mandatabilité" enrichie

Refonte `score_pigeabilite` avec critères pondérés explicites :
- Particulier (+30) / Agence exclusive (-20)
- Annonce récente <7j (+15)
- Baisse prix détectée (+20)
- Multi-diffusion agence (+15 = signal mandat simple faible)
- Photos amateurs (+10)
- Description courte/faible (+10)
- Prix sous marché (+15)
- Zone tendue (+10)

Stocker `score_breakdown` (jsonb) avec détail de chaque critère pour l'affichage explicatif.

## 3. Categorisation et affichage de TOUTES les annonces

- Supprimer le filtrage agressif qui vide l'UI
- Afficher 4 catégories : **Top opportunités** (>75), **Moyennes** (50-75), **Faibles** (25-50), **À surveiller** (<25)
- Tabs/sections dans `PigeIA.tsx` pour naviguer

## 4. Workflow opérationnel (statuts pige)

Ajouter statuts : `a_appeler`, `contacte`, `relance`, `rdv_pris`, `mandat_signe`, `refus`, `a_surveiller`.
- Kanban ou dropdown rapide sur chaque carte annonce
- Filtrage par statut

## 5. Score IA expliqué (UI)

Popover détaillé sur le score (réutiliser pattern `ScoreExplainer.tsx`) :
- Liste des critères avec poids et statut (+/-)
- Synthèse : "Probabilité de mandat estimée : élevée/moyenne/faible"
- Justification narrative

## 6. Sauvegarde des stratégies IA

- Les stratégies sont déjà stockées dans `analyse_ia` — ajouter UI pour les **éditer**, **versionner**, **exporter** (PDF/copier)
- Bouton "Régénérer" + "Restaurer version précédente"

## 7. Copilot vraiment connecté

Étendre le `sessionStorage.copilote_prefill` avec contexte complet :
- Lien annonce, données bien, scores + breakdown, contact vendeur, stratégie générée, faiblesses, secteur, comparables, prix/m²
- Pré-injecter un message système contextuel dans `chat-copilote`
- Boutons d'actions rapides dans le Copilot : "Comment l'appeler ?", "Écris un SMS", "WhatsApp", "Contourner objection honoraires", "Stratégie 14 jours"

## 8. Insights marché (nouvelle section)

Edge function `analyze-zone-insights` qui agrège les annonces d'une zone et génère :
- "Forte tension vendeurs"
- "Les T3 partent vite"
- "Beaucoup de particuliers"
- "Prix surévalués"
- "Fort potentiel mandat exclusif"

Affiché en haut du module quand une zone est analysée.

## 9. Fluidité de navigation entre modules

Problème : écran noir/lag entre routes.

Causes probables : pas de code-splitting maîtrisé, re-mount complet du layout, queries non préchargées.

Actions :
- Convertir les routes en `React.lazy()` + `Suspense` avec skeleton stable
- Stabiliser `AppLayout` (ne pas remonter sidebar/header entre routes)
- Activer `staleTime` raisonnable sur React Query pour éviter refetch systématique
- Précharger les modules au hover des liens sidebar (`onMouseEnter` → `import()`)
- Vérifier les transitions Framer Motion qui pourraient causer le flash noir

## Technique

**Fichiers backend modifiés :**
- `supabase/functions/search-pige-zone/index.ts` — extraction enrichie (contact, signaux marché, qualité)
- `supabase/functions/analyze-annonce-pige/index.ts` — scoring détaillé + breakdown
- **Nouveau** `supabase/functions/analyze-zone-insights/index.ts` — insights marché agrégés

**Migration DB :**
- `annonces_pige` : `contact_vendeur jsonb`, `signaux_marche jsonb`, `qualite_annonce jsonb`, `score_breakdown jsonb`, `categorie_opportunite text`, statut élargi

**Fichiers frontend modifiés :**
- `src/components/chasseur/PigeIA.tsx` — tabs catégories, statuts workflow, score explainer, insights, contact vendeur
- `src/pages/Copilote.tsx` + `supabase/functions/chat-copilote/index.ts` — contexte pige enrichi, actions rapides
- `src/App.tsx` — `React.lazy` + Suspense pour toutes les routes
- `src/components/AppLayout.tsx` / `AppSidebar.tsx` — préchargement au hover, layout stable

## Ordre d'exécution

1. Migration DB (nouvelles colonnes)
2. Refonte backend scraping + scoring
3. UI workflow + catégories + explainer
4. Copilot connecté + insights marché
5. Optimisation navigation (lazy + preload)
