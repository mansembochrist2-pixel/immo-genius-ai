# Plan d'exécution — ImmoGenius AI

Travail en 2 grandes phases. Chaque phase sera vérifiée par compilation TypeScript avant de passer à la suivante.

---

## PHASE 1 — Suppressions

### 1.1 Copilote (suppression complète)
- Supprimer `src/pages/Copilote.tsx`
- Supprimer `supabase/functions/chat-copilote/` (+ delete edge function déployée)
- Retirer la route `/copilote` dans `src/App.tsx`
- Retirer le préload dans `src/lib/routeLoader.ts`
- Retirer l'entrée sidebar dans `src/components/AppSidebar.tsx`
- Chercher toute autre référence (`rg copilote`) → nettoyer

### 1.2 Pige IA (suppression complète)
- Supprimer `src/components/chasseur/PigeIA.tsx`
- Supprimer `supabase/functions/search-pige-zone/` et `supabase/functions/analyze-annonce-pige/` (+ delete deployées)
- Dans `src/pages/Chasseur.tsx` : retirer les Tabs, garder uniquement `RadarContent` directement
- Renommer "Chasseur de Mandats" → simplification visuelle (titre = "Radar de Prospection")
- `rg pige` → nettoyer

### 1.3 Studio IA — nettoyer
- Lire `src/pages/Studio*` ou équivalent pour voir la structure des onglets
- Supprimer onglets "Posts réseaux sociaux" et "Audit réseaux sociaux"
- Supprimer `src/components/studio/AuditReseaux.tsx`
- Supprimer `supabase/functions/audit-reseau-social/` et `supabase/functions/generate-marketing/` (+ delete déployées)
- Garder onglets "Annonce" + "Mandat"

### 1.4 Sidebar — renommage
- "Chasseur de Mandats" → "Radar" (icône `Radar` au lieu de `Crosshair`)
- URL reste `/chasseur` (ou renommer plus tard si nécessaire) — on garde `/chasseur` pour éviter de casser des liens
- Retirer "Copilote"

### 1.5 Vérification build
- `bunx tsc --noEmit` → aucune erreur, aucune référence morte

---

## PHASE 2 — Intégrations données publiques

### 2.1 Enrichir `dvf-lookup` + `analyze-zone` avec DPE ADEME
- Dans `dvf-lookup` : après récupération section cadastrale, appeler ADEME `data.ademe.fr/data-fair/api/v1/datasets/dpe-v2-logements-existants/lines?qs=code_insee_ban:{codeCommune}` (ou filtre `code_postal_ban`)
- Calculer : nb DPE F, nb DPE G, % du parc, échantillon d'adresses
- Renvoyer dans payload sous clé `dpe_degrades`
- Dans `analyze-zone` : ajouter ces données au prompt IA pour générer la section "Pression réglementaire vendeur (DPE F/G)"

### 2.2 Edge function `loyer-reference` (nouvelle)
- Pattern : auth JWT, pas de `consumeAiCredit` (pas d'IA)
- Input : `{ adresse }` → géocoder via BAN → ville + code postal
- Source : dataset `encadrement-des-loyers` (Paris + autres villes encadrées). Endpoint : `https://www.data.gouv.fr/api/1/datasets/r/...` — récupérer le CSV/JSON le plus à jour ou utiliser `tabular-api.data.gouv.fr`
- Retour : `{ zone, loyer_ref_m2, loyer_ref_minore, loyer_ref_majore, type: 'meublé'|'nu', applicable: bool }`
- Si zone non encadrée → `{ applicable: false }`
- Brancher dans le Simulateur Investisseur : quand checkbox `encadrement_loyer` est cochée, fetch + auto-remplir le loyer plafond

### 2.3 Edge function `prix-marche-insee` (nouvelle)
- Auth JWT, pas d'IA
- Input : `{ code_commune, code_departement }`
- API INSEE BDM : `https://api.insee.fr/series/BDM/V1/data/SERIES_BDM/...` (indices Notaires-INSEE, séries par département)
- Note : INSEE BDM requiert souvent un token gratuit ; alternative = endpoint public `bdm.insee.fr/series/sdmx/data/...` (sans token)
- Retour : `{ evolution_3_ans: [{annee, indice, variation_pct}], commune, departement }`
- Utilisé par `generate-estimation` pour enrichir "tendances du marché"

### 2.4 Estimation — rapport pro
- Dans `generate-estimation` : ajouter à la réponse JSON un champ `transactions_comparables: [{ rue, date, surface, prix, prix_m2 }]` (5 dernières DVF de la zone via `dvf-lookup`)
- Améliorer `src/lib/expertise-export.ts` (ou créer `estimation-export.ts`) pour DOCX premium :
  - Police : Garamond / Cambria pour titres, Calibri 11 pour corps
  - Page de garde avec logo ImmoGenius + titre + adresse + date
  - En-tête / pied de page avec pagination
  - Sections : Synthèse exécutive · Caractéristiques du bien · Analyse du marché local (INSEE) · Transactions comparables (tableau DVF) · DPE & cadre réglementaire · Méthodologie · Conclusion & fourchette de prix
  - Tableau "Transactions comparables" stylé (bordures fines, en-tête bleu nuit, alternance lignes)
  - Encadré "Sources" en fin de document
- Idem côté PDF (si export PDF existe via `expertise-export.ts`) ou ajouter via `jsPDF` / impression

### 2.5 Radar — heatmap Mapbox
- Ajouter `mapbox-gl` : `bun add mapbox-gl @types/mapbox-gl`
- Variable env : demander à l'utilisateur d'ajouter `VITE_MAPBOX_TOKEN` (instruction in-app, pas via secrets car publique côté client). Pour un build sans token, afficher fallback "Configure VITE_MAPBOX_TOKEN pour activer la carte".
- Composant `src/components/chasseur/RadarHeatmap.tsx` : Map centrée sur la zone, points DVF colorés par prix/m² (échelle vert→orange→rouge via quantiles), couche heatmap d'intensité (`mapbox-gl` heatmap layer)
- Affiché en haut du résultat dans `RadarContent.tsx`

### 2.6 Sources citées
- Composant `src/components/SourcesFooter.tsx` réutilisable listant : DVF (data.gouv/Etalab), DPE (ADEME), Encadrement loyers (Ministère du Logement), Prix marché (INSEE), Cadastre (IGN/Géoplateforme)
- Inclure dans : rapport estimation (DOCX), analyse de zone (UI), expertise

---

## Étapes techniques

1. Confirmer le plan
2. Phase 1 : suppressions en parallèle + delete des edge functions
3. Phase 1 : build check
4. Phase 2.1 : DPE dans dvf-lookup + analyze-zone (déploiement)
5. Phase 2.2 : `loyer-reference` + intégration Simulateur
6. Phase 2.3 : `prix-marche-insee` + intégration Estimation
7. Phase 2.4 : refonte rapport DOCX Estimation
8. Phase 2.5 : Heatmap Mapbox (demander `VITE_MAPBOX_TOKEN` à l'utilisateur)
9. Phase 2.6 : Sources footer + intégration partout
10. Build final + tests

## Points à confirmer avant exécution

- **Mapbox** : OK pour ajouter `mapbox-gl` (~200 KB gzippé) et utiliser `VITE_MAPBOX_TOKEN` côté client ? (Le token public Mapbox peut être restreint par domaine, donc c'est safe en clair.) Alternative gratuite sans clé : MapLibre + tuiles OSM — dis-moi si tu préfères.
- **INSEE BDM** : l'API officielle nécessite un token gratuit. Veux-tu que je demande `INSEE_API_TOKEN` comme secret, ou que j'utilise les fichiers CSV publics téléchargeables sans clé (mis à jour trimestriellement) ?
- **Encadrement loyers** : la donnée la plus à jour est par commune (Paris, Lille, Lyon, Bordeaux, Montpellier, Plaine Commune, Est Ensemble). Je télécharge le dernier dataset officiel et le cache dans la fonction edge ?

Une fois ces 3 points tranchés, je peux lancer toute la chaîne d'un coup.
