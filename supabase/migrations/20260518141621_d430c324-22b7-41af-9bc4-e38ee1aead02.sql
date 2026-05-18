ALTER TABLE public.annonces_pige
  ADD COLUMN IF NOT EXISTS contact_vendeur jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS signaux_marche jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS qualite_annonce jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS score_breakdown jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS categorie_opportunite text DEFAULT 'moyenne',
  ADD COLUMN IF NOT EXISTS notes_agent text,
  ADD COLUMN IF NOT EXISTS workflow_statut text DEFAULT 'a_appeler';

CREATE INDEX IF NOT EXISTS idx_annonces_pige_user_categorie ON public.annonces_pige(user_id, categorie_opportunite);
CREATE INDEX IF NOT EXISTS idx_annonces_pige_user_workflow ON public.annonces_pige(user_id, workflow_statut);