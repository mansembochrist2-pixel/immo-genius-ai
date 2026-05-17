
-- Drop deprecated tables
DROP TABLE IF EXISTS public.inbox_messages CASCADE;
DROP TABLE IF EXISTS public.events CASCADE;
DROP TABLE IF EXISTS public.user_integrations CASCADE;

-- Remove old cron jobs if exist
DO $$
BEGIN
  PERFORM cron.unschedule('sync-all-gmail-every-2-min');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  PERFORM cron.unschedule('sync-all-gmail');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- Create annonces_pige table
CREATE TABLE public.annonces_pige (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  source TEXT NOT NULL DEFAULT 'manuel',
  url TEXT,
  titre TEXT NOT NULL,
  description TEXT,
  prix NUMERIC,
  surface NUMERIC,
  pieces INTEGER,
  ville TEXT,
  code_postal TEXT,
  adresse TEXT,
  agence TEXT,
  type_bien TEXT,
  date_publication TIMESTAMP WITH TIME ZONE,
  photos JSONB DEFAULT '[]'::jsonb,
  score_pigeabilite INTEGER DEFAULT 0,
  analyse_ia JSONB DEFAULT '{}'::jsonb,
  statut TEXT NOT NULL DEFAULT 'nouvelle',
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.annonces_pige ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own annonces_pige"
ON public.annonces_pige
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_annonces_pige_user ON public.annonces_pige(user_id, created_at DESC);
CREATE INDEX idx_annonces_pige_score ON public.annonces_pige(user_id, score_pigeabilite DESC);

CREATE TRIGGER update_annonces_pige_updated_at
BEFORE UPDATE ON public.annonces_pige
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
