# Plan d'amélioration globale — Estate AI

Demande très large (10 chantiers). Je propose de la traiter en **4 vagues** ordonnées par dépendance : la synchronisation des données débloque tout le reste, donc elle passe en premier.

---

## Vague 1 — Fondations data (CRITIQUE)

**Objectif : une seule source de vérité partagée entre Dashboard, Copilote, widgets.**

1. **Étendre `BusinessContext`** pour exposer aussi : inbox non lus, opportunités (radar), événements agenda à venir, actions recommandées. Aujourd'hui il ne couvre que prospects/sales/tasks.
2. **Refactor `Dashboard`, `SalesWidget`, `Copilote`** pour consommer **uniquement** `useBusinessData()` (suppression des `useQuery` redondants qui causent les écarts CA 0€ vs 378 500€).
3. Ajouter aux subscriptions Realtime du `BusinessProvider` les tables : `inbox_messages`, `opportunites`, `events`, `actions_recommandees`.
4. `getAIContext()` enrichi avec inbox/opportunités/agenda → le Copilote voit exactement ce que voit le Dashboard.

**Résultat** : chiffres identiques partout, mises à jour temps réel sur tous les modules.

---

## Vague 2 — Intelligence connectée (Copilote actif + Actions recommandées)

5. **Widget "Actions recommandées" du Dashboard** (point 2 de la demande)
   - Lit la table existante `actions_recommandees`.
   - Nouvelle edge function `generate-actions-auto` qui scanne inbox non lus + prospects chauds + opportunités + RDV à venir et insère 3-5 actions priorisées.
   - Bouton "Exécuter" par action (ouvre le module concerné avec contexte) + bouton "Demander au Copilote".
   - Trigger : auto-régénération toutes les heures + bouton manuel.

6. **Copilote agent actif** (point 9)
   - Nouvelle edge function `copilote-agent` avec **tool calling** (function calling OpenAI) :
     - `archive_emails(ids)`, `mark_emails_read(ids)`, `create_task(...)`, `create_event(...)`, `update_prospect_status(...)`.
   - UI Copilote : bandeau "Action proposée — Confirmer / Annuler" (validation humaine obligatoire, conformément à la mémoire projet).
   - Suppression de l'affichage du nom de modèle IA dans l'UI.

7. **Connectivité modules** (point 10) : audit + ajout des liens manquants : bouton "Envoyer en mémoire client" depuis Inbox, "Créer document depuis estimation" depuis Estimation.

---

## Vague 3 — Modules métier (Documents, Inbox, Agenda, Radar, Estimation)

8. **Documents IA** (point 3) — le plus gros morceau
   - Bouton micro intégré au formulaire mandat (réutilise `useVoiceInput`).
   - Edge function `extract-mandat-fields` : reçoit transcription → renvoie JSON structuré (nom, prénom, adresse, prix, type) → injection dans champs.
   - Fix bug templates personnalisés : vérifier `templates` table/state actuel (besoin de regarder le code pour confirmer le bug).
   - Lecture intelligente template uploadé : edge function `analyze-template` (parse docx → liste champs détectés → mapping auto).

9. **Inbox** (point 6)
   - Catégorie "Urgent" = `urgence >= 7` OU intention `chaud/offre`.
   - Badges colorés Tous (gris) / Urgent (rouge) / Non lus (bleu) avec compteurs corrects.
   - Marquage auto `lu = true` à l'ouverture + invalidation des compteurs.
   - Tooltip "i" sur sentiment/score/priorité (réutilise `ScoreExplainer`).

10. **Agenda** (point 7) : limiter chaque event à `date_debut` (un seul jour), card compacte. Investigation du composant `AgendaWeekView` nécessaire.

11. **Radar** (point 5) : remplacer empty state par illustration + CTA, ajouter bouton "i" tooltip sur score moyen expliquant la pondération (DVF, liquidité, dispersion).

12. **Estimation** (point 4)
   - Export `.docx` via `lib/docx-export.ts` (existe déjà) — ajouter template estimation complète.
   - Supprimer le bouton "charger un secteur de test".

---

## Vague 4 — Sauvegardes / Archivage

13. **Section "Messages archivés"** dans `/sauvegardes`
    - Ajouter colonne `archived_at` à `inbox_messages` (migration).
    - Bouton "Archiver" dans Inbox → set `archived_at = now()`.
    - Page Sauvegardes : liste archivés, restaurer (`archived_at = null`), supprimer définitivement.
    - Inbox filtre out les archivés par défaut.

---

## Détails techniques

- **Migrations DB nécessaires** : `inbox_messages.archived_at TIMESTAMPTZ`, éventuellement index sur `actions_recommandees(user_id, statut, score_pertinence)`.
- **Nouvelles edge functions** : `generate-actions-auto`, `copilote-agent` (tool calling), `extract-mandat-fields`, `analyze-template`.
- **Realtime** : ajouter 4 tables au channel existant `business-sync`.
- **Pas de changement** : routing, auth, design system (tokens existants suffisent).

---

## Estimation & livraison

Plan trop volumineux pour un seul tour. Je propose de **livrer vague par vague**, en validant avec toi entre chaque (sinon risque de régression massive).

**Question avant de démarrer** : on commence par la Vague 1 (fondations data, sans laquelle le reste est bancal) — OK ? Ou tu préfères prioriser une vague spécifique en premier (ex : Documents IA dictée vocale qui est très visible) ?
