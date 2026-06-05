
ALTER TABLE public.analyses_zone ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.annonces ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.expertise_reports ADD COLUMN IF NOT EXISTS titre TEXT;
ALTER TABLE public.opportunites ADD COLUMN IF NOT EXISTS titre_custom TEXT;

CREATE TABLE IF NOT EXISTS public.mandats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  titre TEXT,
  type_mandat TEXT NOT NULL,
  informations TEXT,
  contenu TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mandats TO authenticated;
GRANT ALL ON public.mandats TO service_role;

ALTER TABLE public.mandats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mandats" ON public.mandats
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_mandats_user ON public.mandats(user_id, created_at DESC);

CREATE TRIGGER update_mandats_updated_at
  BEFORE UPDATE ON public.mandats
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
