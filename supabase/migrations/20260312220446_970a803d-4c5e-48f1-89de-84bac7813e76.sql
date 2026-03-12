
-- Add project info and commercial follow-up columns to prospects
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS type_projet text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS delai_projet text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS situation text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS biens_proposes text DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prochain_rappel timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS prochain_rappel_note text DEFAULT NULL;
