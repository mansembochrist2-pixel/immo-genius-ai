ALTER TABLE public.annonces_pige
  ADD COLUMN IF NOT EXISTS saved_to_vivier boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS zone_recherche text,
  ADD COLUMN IF NOT EXISTS fiche_proprietaire jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX IF NOT EXISTS idx_annonces_pige_user_zone ON public.annonces_pige(user_id, zone_recherche);
CREATE INDEX IF NOT EXISTS idx_annonces_pige_user_vivier ON public.annonces_pige(user_id, saved_to_vivier);