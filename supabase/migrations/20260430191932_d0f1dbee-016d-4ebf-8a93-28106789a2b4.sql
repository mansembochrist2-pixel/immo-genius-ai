
DO $$
DECLARE
  demo_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  demo_email text := 'demo@estate-ai.app';
  demo_exists boolean;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = demo_user_id) INTO demo_exists;
  
  IF NOT demo_exists THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at, raw_app_meta_data,
      raw_user_meta_data, is_super_admin, confirmation_token, email_change,
      email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', demo_user_id, 'authenticated', 'authenticated',
      demo_email, crypt('DemoEstate2026!', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Sophie Martin"}'::jsonb,
      false, '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), demo_user_id,
      format('{"sub":"%s","email":"%s"}', demo_user_id, demo_email)::jsonb,
      'email', demo_email, now(), now(), now());
  END IF;

  INSERT INTO public.profiles (id, email, full_name, phone, agency_name, plan, objectif_ca, zone_principale, preferred_language, onboarding_completed)
  VALUES (demo_user_id, demo_email, 'Sophie Martin', '+33 6 12 34 56 78', 'Martin Immobilier Premium', 'pro', 850000, 'Paris 16e', 'fr', true)
  ON CONFLICT (id) DO UPDATE SET 
    full_name = EXCLUDED.full_name, agency_name = EXCLUDED.agency_name,
    objectif_ca = EXCLUDED.objectif_ca, zone_principale = EXCLUDED.zone_principale,
    onboarding_completed = true, plan = 'pro';

  DELETE FROM public.prospects WHERE user_id = demo_user_id;
  DELETE FROM public.events WHERE user_id = demo_user_id;
  DELETE FROM public.tasks WHERE user_id = demo_user_id;
  DELETE FROM public.inbox_messages WHERE user_id = demo_user_id;
  DELETE FROM public.opportunites WHERE user_id = demo_user_id;
  DELETE FROM public.actions_recommandees WHERE user_id = demo_user_id;
  DELETE FROM public.sales WHERE user_id = demo_user_id;
  DELETE FROM public.annonces WHERE user_id = demo_user_id;
  DELETE FROM public.workflows WHERE user_id = demo_user_id;

  -- PROSPECTS (statut: nouveau, contacte, visite, offre, signe, perdu)
  INSERT INTO public.prospects (user_id, nom, telephone, email, statut, source, score_ia, score_urgence, type_projet, type_bien_recherche, secteur_recherche, budget_min, budget_max, delai_projet, motivation, freins, situation, resume_ia, tags, derniere_interaction, prochain_rappel, prochain_rappel_note, taux_signature, canal_prefere, provenance) VALUES
  (demo_user_id, 'Jean & Caroline Dupont', '+33 6 11 22 33 44', 'jean.dupont@gmail.com', 'offre', 'SeLoger', 92, 9, 'Achat résidence principale', 'Appartement 4P', 'Paris 16e - Auteuil', 950000, 1200000, '2-3 mois', 'Agrandissement famille (3e enfant)', 'Vente du bien actuel à finaliser', 'Couple cadres sup, 2 enfants', 'Très motivés, dossier solide. Coup de cœur potentiel.', ARRAY['VIP','Famille','Solvable'], now() - interval '2 days', now() + interval '3 days', 'Envoyer 2 nouvelles annonces ciblées', 75, 'Téléphone', 'Recommandation client'),
  (demo_user_id, 'Marc Lefebvre', '+33 6 22 33 44 55', 'm.lefebvre@outlook.fr', 'contacte', 'LeBonCoin', 68, 5, 'Investissement locatif', 'Studio/T2', 'Paris 11e/20e', 250000, 380000, '6 mois', 'Diversification patrimoine', 'Hésitation sur le quartier', 'Cadre célibataire, 42 ans', 'Investisseur expérimenté. À nourrir avec biens à fort rendement.', ARRAY['Investisseur'], now() - interval '6 days', now() + interval '5 days', 'Proposer simulation rentabilité', 45, 'Email', 'Site web'),
  (demo_user_id, 'Sylvie & Pierre Garnier', '+33 6 33 44 55 66', 'sylvie.garnier@free.fr', 'visite', 'Recommandation', 88, 8, 'Vente résidence principale', 'Maison', 'Boulogne-Billancourt', NULL, NULL, '1-2 mois', 'Départ retraite Sud', 'Attachement émotionnel', 'Couple retraités, maison 180m²', 'Mandat exclusif probable. Estimation 1.45M€.', ARRAY['Vendeur','Mandat'], now() - interval '1 day', now() + interval '1 day', 'Confirmer mandat exclusif', 80, 'Téléphone', 'Bouche-à-oreille'),
  (demo_user_id, 'Amélie Rousseau', '+33 6 44 55 66 77', 'amelie.r@gmail.com', 'nouveau', 'Instagram', 35, 3, 'Achat 1er bien', 'Studio', 'Paris (large)', 180000, 250000, '+1 an', 'Premier achat', 'Apport limité', 'Jeune active 28 ans', 'À recontacter dans 3 mois.', ARRAY['Primo-accédant'], now() - interval '20 days', now() + interval '30 days', 'Recontact trimestriel', 15, 'Email', 'Réseaux sociaux'),
  (demo_user_id, 'Karim Benali', '+33 6 55 66 77 88', 'k.benali@entreprise.com', 'visite', 'Salon Immo', 85, 7, 'Achat famille', 'Maison 5P+', 'Saint-Cloud / Sèvres', 1100000, 1500000, '3 mois', 'Mutation pro Paris', 'Délais de mutation', 'Famille 4 personnes, vient de Lyon', 'Mutation pro confirmée. Visite samedi.', ARRAY['VIP','Mutation'], now() - interval '3 days', now() + interval '2 days', 'Visite confirmée samedi 10h', 70, 'Téléphone', 'Salon professionnel'),
  (demo_user_id, 'Céline Moreau', '+33 6 66 77 88 99', 'celine.moreau@yahoo.fr', 'contacte', 'Site web', 55, 4, 'Vente appartement', 'Appartement 3P', 'Levallois-Perret', NULL, NULL, '6 mois', 'Divorce', 'Désaccord prix avec ex-conjoint', 'Procédure en cours', 'Délicat, approche douce.', ARRAY['Vendeur','Sensible'], now() - interval '8 days', now() + interval '10 days', 'Suivi procédure', 35, 'Email', 'Site web'),
  (demo_user_id, 'Thomas Leroy', '+33 6 77 88 99 00', 't.leroy@startup.io', 'visite', 'LinkedIn', 78, 6, 'Achat résidence', 'Loft/Atypique', 'Paris 10e/11e', 600000, 850000, '2 mois', 'Founder startup levée fonds', 'Recherche bien atypique précis', 'Profil tech, exigeant', 'Cherche du caractère.', ARRAY['VIP','Atypique'], now() - interval '4 days', now() + interval '4 days', 'Visite loft Bichat', 65, 'WhatsApp', 'LinkedIn'),
  (demo_user_id, 'Famille Nakamura', '+33 6 88 99 00 11', 'nakamura.h@expat.com', 'visite', 'Agence partenaire', 60, 5, 'Location longue durée', 'Maison 4P', 'Neuilly-sur-Seine', NULL, NULL, '1 mois', 'Expatriation Japon→France', 'Barrière langue', 'Famille expat 4 personnes', 'Profil expat solide.', ARRAY['Expat','Location'], now() - interval '5 days', now() + interval '3 days', 'Visite EAJ mardi', 50, 'Email', 'Agence partenaire'),
  (demo_user_id, 'Hugo & Marine Petit', '+33 6 99 00 11 22', 'h.petit@gmail.com', 'nouveau', 'Pap.fr', 28, 2, 'Achat primo', 'T2/T3', 'Banlieue ouest', 320000, 420000, '+1 an', 'Mariage prévu', 'Apport en construction', 'Jeune couple', 'Phase de réflexion.', ARRAY['Primo-accédant'], now() - interval '25 days', now() + interval '45 days', 'Newsletter trimestrielle', 12, 'Email', 'PAP'),
  (demo_user_id, 'Isabelle Vidal', '+33 6 10 20 30 40', 'i.vidal@avocat-paris.fr', 'contacte', 'Recommandation', 90, 8, 'Investissement', 'Immeuble', 'Paris 9e/10e', 1800000, 2500000, '3-4 mois', 'Diversification cabinet', 'Validation associés', 'Avocate associée', 'Profil HNW. Priorité.', ARRAY['VIP','HNW','Investisseur'], now() - interval '2 days', now() + interval '2 days', 'RDV cabinet jeudi', 75, 'Téléphone', 'Recommandation notaire'),
  (demo_user_id, 'Antoine Girard', '+33 6 20 30 40 50', 'a.girard@medecin.fr', 'perdu', 'SeLoger', 20, 1, 'Achat résidence', 'Maison', 'Versailles', 800000, 1000000, 'Annulé', 'Mutation annulée', NULL, 'Projet abandonné', 'Conserver en CRM, recontact 1 an.', ARRAY['Perdu'], now() - interval '60 days', NULL, NULL, 0, 'Email', 'SeLoger'),
  (demo_user_id, 'Léa Dubois', '+33 6 30 40 50 60', 'lea.dubois@design.com', 'contacte', 'Instagram', 62, 5, 'Achat résidence', 'Appartement 2P', 'Paris 3e/4e', 480000, 620000, '4-6 mois', 'Indépendante créative', 'Revenus variables BNC', 'Designer freelance 32 ans', 'Dossier banque délicat.', ARRAY['Indépendant'], now() - interval '7 days', now() + interval '7 days', 'Suivi dossier bancaire', 40, 'WhatsApp', 'Instagram');

  INSERT INTO public.events (user_id, titre, description, type, date_debut, date_fin, lieu, statut, source_module) VALUES
  (demo_user_id, 'Visite Dupont — 145 Av. Mozart', 'Famille Dupont, 4P 95m², 1 150 000€.', 'visite', now() + interval '1 day' + interval '10 hours', now() + interval '1 day' + interval '11 hours', '145 Avenue Mozart, 75016 Paris', 'confirme', 'clients'),
  (demo_user_id, 'RDV mandat — Garnier', 'Signature mandat exclusif.', 'rdv', now() + interval '1 day' + interval '14 hours', now() + interval '1 day' + interval '15 hours', '23 Rue de Sèvres, Boulogne', 'confirme', 'clients'),
  (demo_user_id, 'Visite Karim Benali — Saint-Cloud', 'Famille mutation. Maison 5P 180m².', 'visite', now() + interval '2 days' + interval '10 hours', now() + interval '2 days' + interval '11 hours 30 minutes', '12 Rue Royale, 92210 Saint-Cloud', 'confirme', 'clients'),
  (demo_user_id, 'Appel suivi Lefebvre', 'Présenter simulation rentabilité.', 'appel', now() + interval '3 days' + interval '9 hours', now() + interval '3 days' + interval '9 hours 30 minutes', NULL, 'confirme', 'tasks'),
  (demo_user_id, 'Compromis Lambert/Roche', 'Notaire Maître Bernard.', 'rdv', now() + interval '4 days' + interval '14 hours 30 minutes', now() + interval '4 days' + interval '16 hours', 'Étude Bernard, 15 Rue de la Paix', 'confirme', 'clients'),
  (demo_user_id, 'Visite loft Bichat — Leroy', 'Loft 110m², 780 000€.', 'visite', now() + interval '4 days' + interval '11 hours', now() + interval '4 days' + interval '12 hours', '78 Rue Bichat, 75010 Paris', 'confirme', 'clients'),
  (demo_user_id, 'RDV Vidal — Avocat', 'Présentation immeuble Faubourg Saint-Denis.', 'rdv', now() + interval '2 days' + interval '17 hours', now() + interval '2 days' + interval '18 hours', '34 Rue de Rivoli, 75001', 'confirme', 'clients'),
  (demo_user_id, 'Estimation Mme Lefort', 'Estimation maison Vincennes.', 'estimation', now() + interval '5 days' + interval '15 hours', now() + interval '5 days' + interval '16 hours 30 minutes', '8 Rue de Fontenay, Vincennes', 'confirme', 'estimation'),
  (demo_user_id, 'Petit-déjeuner notaires CIN', 'Networking mensuel.', 'rdv', now() + interval '6 days' + interval '8 hours', now() + interval '6 days' + interval '10 hours', 'Hôtel Lutetia, Paris 6e', 'confirme', NULL),
  (demo_user_id, 'Visite Nakamura — EAJ Neuilly', 'Famille japonaise, location.', 'visite', now() + interval '3 days' + interval '15 hours', now() + interval '3 days' + interval '16 hours', '5 Rue Eugène Allard, Neuilly', 'confirme', 'clients'),
  (demo_user_id, 'Signature acte authentique Moreno', 'Vente définitive 142 Bd Voltaire.', 'rdv', now() - interval '2 days' + interval '10 hours', now() - interval '2 days' + interval '11 hours 30 minutes', 'Étude Lambert, Paris 11e', 'confirme', 'clients'),
  (demo_user_id, 'Visite passée — Petit', 'Visite T2 Issy. Pas convaincus.', 'visite', now() - interval '4 days' + interval '14 hours', now() - interval '4 days' + interval '15 hours', '12 Av. Victor Cresson, Issy', 'confirme', 'clients'),
  (demo_user_id, 'Webinar IA & immobilier FNAIM', 'Formation continue.', 'rdv', now() + interval '7 days' + interval '14 hours', now() + interval '7 days' + interval '17 hours', 'Visioconférence Zoom', 'confirme', NULL);

  INSERT INTO public.tasks (user_id, titre, description, priorite, due_date, done, source) VALUES
  (demo_user_id, 'Envoyer 3 annonces ciblées à Dupont', 'Filtrer Auteuil/Passy, 4P, balcon obligatoire', 'haute', CURRENT_DATE + 1, false, 'manual'),
  (demo_user_id, 'Préparer mandat exclusif Garnier', 'Mandat 6 mois, commission 4%', 'haute', CURRENT_DATE + 1, false, 'manual'),
  (demo_user_id, 'Relancer banque dossier Léa Dubois', 'BNP demande complément revenus', 'moyenne', CURRENT_DATE + 2, false, 'manual'),
  (demo_user_id, 'Estimation maison Lefort', 'Préparer comparables DVF', 'moyenne', CURRENT_DATE + 4, false, 'manual'),
  (demo_user_id, 'Photos professionnelles loft Bichat', 'Réserver photographe Studio Wagram', 'moyenne', CURRENT_DATE + 3, false, 'manual'),
  (demo_user_id, 'Diagnostic DPE Garnier', 'Commander Diag-Express', 'haute', CURRENT_DATE + 2, false, 'manual'),
  (demo_user_id, 'Mise à jour annonce Voltaire', 'Baisse prix 5% à valider', 'basse', CURRENT_DATE + 5, false, 'manual'),
  (demo_user_id, 'Confirmer notaire Lambert/Roche', 'Compromis vendredi 14h30', 'urgente', CURRENT_DATE, false, 'manual'),
  (demo_user_id, 'Newsletter mensuelle prospects froids', '32 contacts, sélection biens marquants', 'basse', CURRENT_DATE + 7, false, 'manual'),
  (demo_user_id, 'Note frais déplacement mars', 'Compta agence', 'basse', CURRENT_DATE - 2, true, 'manual');

  INSERT INTO public.inbox_messages (user_id, canal, direction, sujet, contenu, urgence, intention, lu, repondu, analyse_ia, reponses_suggerees) VALUES
  (demo_user_id, 'email', 'entrant', 'URGENT - Visite ce week-end ?', 'Bonjour Sophie, ma femme et moi serions très intéressés pour visiter le 4P av. Mozart ce samedi si possible. Nous sommes prêts à faire une offre rapidement si le bien correspond. Cordialement, Jean Dupont', 9, 'visite', false, false, '{"sentiment":"très positif","intent_score":95,"signal_achat":"fort","resume":"Demande visite urgente avec signal d''offre rapide"}'::jsonb, '["Confirmer samedi 10h - bien Mozart","Proposer 2 créneaux samedi/dimanche","Envoyer fiche bien complète avant visite"]'::jsonb),
  (demo_user_id, 'email', 'entrant', 'Question financement - dossier Lefebvre', 'Bonjour, suite à notre échange, pouvez-vous me transmettre une simulation de rentabilité sur le T2 Bastille ? Quel rendement net espérer ? Merci, Marc', 6, 'information', false, false, '{"sentiment":"neutre-positif","intent_score":68}'::jsonb, '["Envoyer simulation détaillée XLS","Proposer RDV téléphonique 30min","Joindre étude rentabilité quartier"]'::jsonb),
  (demo_user_id, 'whatsapp', 'entrant', NULL, 'Sophie, j''ai vu le loft Bichat sur votre site. Disponible quand pour une visite ? Thomas', 7, 'visite', true, true, '{"sentiment":"positif","intent_score":78}'::jsonb, NULL),
  (demo_user_id, 'email', 'entrant', 'Mandat - documents demandés', 'Madame Martin, voici le titre de propriété et le DPE comme demandé. Avez-vous besoin d''autres pièces avant la signature de mardi ? Pierre Garnier', 5, 'document', false, false, '{"sentiment":"coopératif","intent_score":85}'::jsonb, '["Accuser réception et confirmer RDV mardi","Demander taxe foncière + règlement copro","Préparer mandat à signer"]'::jsonb),
  (demo_user_id, 'sms', 'entrant', NULL, 'Bonjour, suite annonce SeLoger Versailles, pouvez-vous me rappeler ? 06.45.78.12.34', 4, 'qualification', false, false, NULL, NULL),
  (demo_user_id, 'email', 'entrant', 'Réclamation honoraires - Moreno', 'Bonjour, je reviens sur le calcul des honoraires de notre dernière transaction. Pouvez-vous me détailler la TVA appliquée ? Merci, M. Moreno', 7, 'reclamation', false, false, '{"sentiment":"tendu","intent_score":40,"alerte":"À traiter sous 24h"}'::jsonb, '["Détail HT/TTC avec facture","Proposer appel pour expliquer","Joindre mandat signé"]'::jsonb),
  (demo_user_id, 'email', 'sortant', 'Re: Bien 145 Mozart', 'Bonjour M. Dupont, je vous confirme la visite samedi 10h. Voici la fiche détaillée. À samedi, Sophie', 0, NULL, true, true, NULL, NULL),
  (demo_user_id, 'instagram', 'entrant', NULL, 'Salut Sophie, j''ai vu ton post sur le loft. Je suis designer, ça pourrait correspondre. Léa', 5, 'qualification', true, false, '{"sentiment":"positif","intent_score":62}'::jsonb, NULL),
  (demo_user_id, 'email', 'entrant', 'Recommandation client', 'Bonjour Sophie, je vous recommande mes amis Benali qui arrivent de Lyon. Ils cherchent vers Saint-Cloud. Marie L.', 6, 'recommandation', true, true, '{"sentiment":"très positif","intent_score":80}'::jsonb, NULL),
  (demo_user_id, 'email', 'entrant', 'Rappel CIN — petit-déjeuner notaires', 'Confirmez votre présence au petit-déjeuner mensuel CIN Paris Ouest, jeudi 8h00.', 2, 'information', false, false, NULL, NULL);

  INSERT INTO public.opportunites (user_id, titre, zone, type, score, description, sources, donnees, statut) VALUES
  (demo_user_id, 'Quartier en gentrification — Paris 20e', 'Belleville / Ménilmontant', 'opportunite', 87, 'Hausse de 12% des prix sur 12 mois, nouvelle ligne de tramway prévue en 2026.', '["DVF Etalab","Data.gouv","Observatoire local"]'::jsonb, '{"prix_m2":"6 200 €","tendance":"+12%","delai_vente":"45 jours"}'::jsonb, 'nouvelle'),
  (demo_user_id, 'Tension locative forte — Lyon 3e', 'Part-Dieu / Villette', 'opportunite', 92, 'Taux de vacance < 2%, demande locative en hausse de 18%.', '["INSEE","Notaires de France"]'::jsonb, '{"prix_m2":"4 800 €","tendance":"+8%","delai_vente":"32 jours"}'::jsonb, 'nouvelle'),
  (demo_user_id, 'Risque de baisse — Bordeaux Centre', 'Chartrons / Saint-Michel', 'risque', 35, 'Suroffre détectée (+25% d''annonces vs N-1), délais de vente en hausse à 95 jours.', '["DVF Etalab","SeLoger Data"]'::jsonb, '{"prix_m2":"4 950 €","tendance":"-3%","delai_vente":"95 jours"}'::jsonb, 'nouvelle'),
  (demo_user_id, 'Marché dynamique — Nantes Île de Nantes', 'Île de Nantes / Beaulieu', 'opportunite', 78, 'Projets urbains majeurs en cours, prix encore accessibles.', '["DVF Etalab","INSEE","Métropole Nantes"]'::jsonb, '{"prix_m2":"3 900 €","tendance":"+6%","delai_vente":"52 jours"}'::jsonb, 'nouvelle'),
  (demo_user_id, 'Zone premium stable — Neuilly Pasteur', 'Neuilly-sur-Seine - Pasteur', 'opportunite', 82, 'Rotation faible mais transactions de qualité. Demande HNW soutenue.', '["DVF","Notaires Île-de-France"]'::jsonb, '{"prix_m2":"11 800 €","tendance":"+3%","delai_vente":"68 jours"}'::jsonb, 'en_cours'),
  (demo_user_id, 'Saturation luxe — Paris 8e', 'Triangle d''Or', 'risque', 42, 'Délais de vente allongés (+30%), négociation moyenne -8%.', '["DVF Etalab","Barnes Insights"]'::jsonb, '{"prix_m2":"15 200 €","tendance":"-2%","delai_vente":"110 jours"}'::jsonb, 'nouvelle');

  INSERT INTO public.actions_recommandees (user_id, titre, type, priorite, score_pertinence, objectif, action_attendue, risque_si_ignore, source_module, justification_report, donnees_contexte, statut) VALUES
  (demo_user_id, 'Relancer Famille Dupont avec offre exclusive', 'relance', 'haute', 92, 'Concrétiser une offre dans les 7 jours', 'Envoyer 2 nouveaux biens off-market avant samedi', 'Perte d''un mandat acquéreur à 1.1M€ - commission ~33k€', 'inbox', 'Signaux d''achat très forts détectés sur les 3 derniers échanges.', '{"client":"Jean & Caroline Dupont","commission_estimee":33000}'::jsonb, 'en_attente'),
  (demo_user_id, 'Confirmer le mandat exclusif Garnier', 'mandat', 'haute', 88, 'Signature mandat 6 mois à 4%', 'RDV signature mardi 14h - apporter mandat préparé', 'Risque de perte au profit d''un confrère', 'clients', 'Vendeurs réceptifs, dossier complet reçu.', '{"client":"Garnier","commission_estimee":58000}'::jsonb, 'en_attente'),
  (demo_user_id, 'Préparer simulation rentabilité Lefebvre', 'envoi_document', 'moyenne', 72, 'Maintenir l''engagement', 'Envoyer fichier XLS détaillé sous 48h', 'Refroidissement et perte du lead', 'inbox', 'Investisseur expérimenté, demande chiffrée précise.', '{"client":"Marc Lefebvre"}'::jsonb, 'en_attente'),
  (demo_user_id, 'Visite loft Bichat à organiser pour Leroy', 'visite', 'moyenne', 75, 'Closing rapide bien atypique', 'Proposer 3 créneaux cette semaine', 'Bien atypique, peu de prospects qualifiés', 'clients', 'Profil aligné (designer, exigeant).', '{"client":"Thomas Leroy","bien":"Loft Bichat 110m²"}'::jsonb, 'en_attente'),
  (demo_user_id, 'Relance trimestrielle Amélie Rousseau', 'nurturing', 'basse', 35, 'Maintenir le lien long-terme', 'Newsletter ciblée studios', 'Faible - prospect froid', 'clients', 'Pas de signal d''urgence, projet > 1 an.', '{"client":"Amélie Rousseau"}'::jsonb, 'en_attente'),
  (demo_user_id, 'Alerte risque marché Bordeaux', 'veille', 'moyenne', 68, 'Ajuster stratégie portefeuille', 'Revoir prix annonces Bordeaux Centre (-5%)', 'Allongement délais de vente', 'radar', 'Suroffre détectée, négociation à la hausse.', '{"zone":"Bordeaux Chartrons","biens_concernes":2}'::jsonb, 'en_attente');

  INSERT INTO public.sales (user_id, montant, date_vente, description) VALUES
  (demo_user_id, 78000, CURRENT_DATE - 12, 'Vente 142 Bd Voltaire - Moreno (commission 4.8%)'),
  (demo_user_id, 45000, CURRENT_DATE - 35, 'Vente Studio Bastille - Investisseur Chen'),
  (demo_user_id, 92000, CURRENT_DATE - 58, 'Vente Maison Vincennes - Famille Bertrand'),
  (demo_user_id, 38500, CURRENT_DATE - 75, 'Vente T3 Levallois - Mme Aubert'),
  (demo_user_id, 125000, CURRENT_DATE - 105, 'Vente Hôtel particulier Neuilly - Famille Khan'),
  (demo_user_id, 52000, CURRENT_DATE - 145, 'Vente T4 Boulogne - Couple Reynaud'),
  (demo_user_id, 41000, CURRENT_DATE - 200, 'Vente Studio Paris 11e - M. Yamamoto');

  INSERT INTO public.annonces (user_id, adresse, prix, surface, description, contenu_genere) VALUES
  (demo_user_id, '78 Rue Bichat, 75010 Paris', 780000, 110, 'Loft industriel exceptionnel, hauteur sous plafond 4m, verrière, 2 chambres', '{"titre":"Loft d''exception 110m² - Verrière & cachet industriel","accroche":"Rare ! Authentique loft d''artiste","points_forts":["Hauteur sous plafond 4m","Verrière d''origine","2 chambres + bureau","Calme absolu sur cour"]}'::jsonb),
  (demo_user_id, '23 Rue de Sèvres, 92100 Boulogne', 1450000, 180, 'Maison familiale 6 pièces avec jardin 200m², piscine, garage', '{"titre":"Maison familiale 180m² avec piscine - Boulogne Nord","accroche":"Havre de paix au cœur de Boulogne","points_forts":["Jardin 200m² + piscine","6 pièces lumineuses","Garage 2 voitures","Proximité écoles"]}'::jsonb),
  (demo_user_id, '34 Rue de Rivoli, 75001 Paris', 2300000, 320, 'Immeuble de rapport, R+4, 6 lots, rendement 4.8% brut', '{"titre":"Immeuble de rapport Paris 1er - 6 lots","accroche":"Investissement patrimonial premium","points_forts":["6 lots loués","Rendement 4.8% brut","Travaux récents façade","Localisation exceptionnelle"]}'::jsonb);

  INSERT INTO public.workflows (user_id, nom, declencheur, actions, actif, executions, derniere_execution) VALUES
  (demo_user_id, 'Relance prospect chaud sans contact 7j', 'inactivite_7j_statut_chaud', '[{"type":"email","template":"relance_chaud"},{"type":"task","titre":"Appeler le prospect"}]'::jsonb, true, 12, now() - interval '2 days'),
  (demo_user_id, 'Bienvenue nouveau lead', 'creation_prospect', '[{"type":"email","template":"bienvenue"},{"type":"sequence","jours":[1,3,7]}]'::jsonb, true, 47, now() - interval '6 hours'),
  (demo_user_id, 'Alerte signal achat fort', 'inbox_intent_score_sup_85', '[{"type":"notification","priorite":"haute"},{"type":"action_recommandee"}]'::jsonb, true, 8, now() - interval '1 day'),
  (demo_user_id, 'Suivi post-visite J+2', 'visite_terminee', '[{"type":"email","template":"feedback_visite"},{"type":"task","titre":"Recueillir feedback"}]'::jsonb, true, 23, now() - interval '4 days'),
  (demo_user_id, 'Newsletter prospects froids mensuelle', 'mensuel_premier_lundi', '[{"type":"email","template":"newsletter_biens_marquants"}]'::jsonb, false, 3, now() - interval '30 days');

END $$;
