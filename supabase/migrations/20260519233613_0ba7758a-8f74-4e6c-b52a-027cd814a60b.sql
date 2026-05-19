CREATE TABLE public.audits_reseaux (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  plateforme TEXT NOT NULL,
  url TEXT NOT NULL,
  handle TEXT,
  profil_data JSONB NOT NULL DEFAULT '{}'::jsonb,
  analyse_ia JSONB NOT NULL DEFAULT '{}'::jsonb,
  metrics JSONB NOT NULL DEFAULT '{}'::jsonb,
  score_global INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.audits_reseaux ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own audits_reseaux"
  ON public.audits_reseaux FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_audits_reseaux_user_plat ON public.audits_reseaux(user_id, plateforme, created_at DESC);

CREATE TRIGGER update_audits_reseaux_updated_at
  BEFORE UPDATE ON public.audits_reseaux
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();