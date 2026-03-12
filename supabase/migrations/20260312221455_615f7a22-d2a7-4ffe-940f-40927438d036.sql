
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS objectif_ca numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS zone_principale text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS logo_url text DEFAULT NULL;
