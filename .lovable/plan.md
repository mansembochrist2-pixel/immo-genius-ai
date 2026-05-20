## Objectif

Tu as identifié 8 problèmes critiques qui se recoupent. Je propose de tout traiter en **une seule passe ciblée** plutôt que lot par lot, parce que plusieurs causes sont communes (compte démo qui switch, AnalysisLoader pas branché partout, plans IA non persistés).

## Diagnostic des causes racines

1. **Compte Sophie Martin** : `AuthContext.tsx` auto-login systématique sur `demo@estate-ai.app`. C'est lui qui crée le switch aléatoire entre ton compte et le démo → casse les requêtes RLS et donne l'impression de "flash" entre modules.
2. **Audit Rihanna qui plante** : `audit-reseau-social` n'a pas de timeout sur Firecrawl, pas de fallback si scraping bloqué, pas de retry. Pas de loader contextuel branché.
3. **Plan Radar régénéré** : `openOrGeneratePlan` appelle l'IA même si `donnees.plan_attaque` existe déjà (la sauvegarde existe mais la lecture ne la priorise pas correctement).
4. **Copilote isolé** : `copilote-agent` n'a pas accès aux tables `prospects/annonces_pige/opportunites/audits_reseaux` dans son contexte. Pas de markdown rendering → texte brutal.
5. **DVF Estimation** : edge function `dvf-lookup` revient mais le composant `EstimationIA` n'affiche peut-être plus les sources retournées (à vérifier).
6. **Loaders manquants** : `AnalysisLoader` existe mais n'est branché que sur Copilote + Dashboard. Manque sur Audit, Radar, Estimation, Mandat, Marketing, Annonce.

## Plan d'action

### Lot A — Stabilité plateforme (priorité absolue)
- **Désactiver l'auto-login démo** dans `AuthContext.tsx`. Si pas de session → redirect login. Plus jamais 2 comptes en parallèle.
- Supprimer toute référence "Sophie Martin" / `demo@estate-ai.app` dans le code.
- Ajouter un `<Suspense>` + skeleton stable sur les routes pour éliminer le flash entre modules.

### Lot B — Loaders unifiés "messages qui tournent"
Brancher `AnalysisLoader` (déjà créé, premium, messages rotatifs, ETA réaliste) sur tous les boutons "Générer/Analyser/Auditer" :
- AuditReseaux (messages spécifiques scraping/IA, ETA 30-90s)
- Radar (analyse zone)
- EstimationIA (DVF + IA)
- Documents (mandat, annonce, marketing)

Tous avec ETA ajusté ("30 à 90 secondes selon la charge") et messages contextuels.

### Lot C — Audit réseaux fiabilisé
- Timeout 25s sur Firecrawl + fallback gracieux sur audit "qualitatif sans scraping" si bloqué (cas Rihanna, comptes protégés).
- Retry 1× sur erreur réseau.
- Filtrer la liste des audits sauvegardés **par plateforme courante** dans `AuditReseaux.tsx`.
- Bouton "Fermer l'audit" pour cacher la carte de résultat.

### Lot D — Radar fix plan persistant
- `openOrGeneratePlan` : si `opportunite.donnees.plan_attaque` existe → ouvrir directement, **jamais** rappeler l'IA.
- Bouton "Fermer l'analyse" pour vider la vue.
- Bouton "Envoyer au Copilote" : push le plan via `sessionStorage` + navigate `/copilote` (corriger le handler cassé).

### Lot E — Copilote branché + UI Claude-like
- `copilote-agent/index.ts` : injecter dans le system prompt un résumé live des dernières données utilisateur (prospects actifs, annonces pigées top, audits réseaux récents, opportunités radar) via requêtes Supabase server-side.
- Rendu des réponses avec `react-markdown` (déjà installé), police Inter/system-ui large, leading-relaxed, espacement aéré entre paragraphes/listes, code blocks stylés. Style Claude.
- Lire `sessionStorage.copilote_context` à l'ouverture pour récupérer le plan Radar envoyé.

### Lot F — Estimation DVF restaurée
- Vérifier `EstimationIA.tsx` : la section "Sources & données" doit afficher `prix_m2_median`, `tension_marche`, `ventes` retournés par `dvf-lookup`.
- Supprimer le code mort lié à anciennes versions (Google Places non utilisé, scrappers obsolètes).

### Lot G — Nettoyage code
- Supprimer fichiers/imports inutilisés (audit rapide via ripgrep).
- Pas de refactor risqué — uniquement suppression de dead code identifié.

## Détails techniques

- **AuthContext** : retirer le bloc `signInWithPassword({email: "demo@estate-ai.app"...})`. Si `!session && !authPage` → `window.location.href = "/login"`.
- **AnalysisLoader** : ajouter prop `messages` custom par module pour personnaliser le ton (ex: Audit → "Scrape du profil…", "Analyse du feed…", "Évaluation du branding…").
- **copilote-agent** : utiliser `createClient` avec service role pour fetch user context, max 50 lignes par table, formaté en bullet markdown injecté avant la question.
- **Copilote UI** : `prose prose-slate max-w-none prose-headings:font-semibold prose-p:leading-7 prose-li:my-1` + `font-feature-settings: "ss01"`.

## Ce que je ne touche pas

- Schéma DB (déjà bon)
- Edge functions qui marchent (chat-copilote legacy, generate-mandat OK)
- Pige IA fonctionnel (le "bug envoi IA" depuis enregistré sera regardé en passant, mais probablement résolu par la stabilité Auth)

## Effort estimé

~12-15 fichiers édités, 0 migration DB, 2 edge functions modifiées (audit + copilote). Une seule grosse passe.

OK pour lancer ?