CREATE TABLE public.expertise_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  adresse TEXT NOT NULL,
  type_bien TEXT,
  objectif_client TEXT,
  inputs JSONB NOT NULL DEFAULT '{}'::jsonb,
  results JSONB NOT NULL DEFAULT '{}'::jsonb,
  narrative JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.expertise_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own expertise reports"
ON public.expertise_reports FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expertise reports"
ON public.expertise_reports FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expertise reports"
ON public.expertise_reports FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expertise reports"
ON public.expertise_reports FOR DELETE
USING (auth.uid() = user_id);

CREATE INDEX idx_expertise_reports_user ON public.expertise_reports(user_id, created_at DESC);

CREATE TRIGGER update_expertise_reports_updated_at
BEFORE UPDATE ON public.expertise_reports
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();