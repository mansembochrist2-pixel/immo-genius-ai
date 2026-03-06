
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  titre TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'rdv',
  date_debut TIMESTAMPTZ NOT NULL,
  date_fin TIMESTAMPTZ,
  client_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  description TEXT,
  lieu TEXT,
  statut TEXT NOT NULL DEFAULT 'confirme',
  source_module TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own events" ON public.events
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

ALTER PUBLICATION supabase_realtime ADD TABLE public.events;
