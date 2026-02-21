
-- Table for AI-recommended actions
CREATE TABLE public.actions_recommandees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  client_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  type TEXT NOT NULL DEFAULT 'relance',
  titre TEXT NOT NULL,
  objectif TEXT,
  action_attendue TEXT,
  risque_si_ignore TEXT,
  priorite TEXT NOT NULL DEFAULT 'moyenne',
  score_pertinence INTEGER DEFAULT 50,
  statut TEXT NOT NULL DEFAULT 'en_attente',
  date_suggeree TIMESTAMP WITH TIME ZONE,
  justification_report TEXT,
  source_module TEXT,
  donnees_contexte JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.actions_recommandees ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own actions" ON public.actions_recommandees
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_actions_recommandees_updated_at
  BEFORE UPDATE ON public.actions_recommandees
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.actions_recommandees;
