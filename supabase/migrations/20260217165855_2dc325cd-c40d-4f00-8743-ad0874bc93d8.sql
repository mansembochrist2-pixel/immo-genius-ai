
-- Enrichir la table prospects pour devenir "Mémoire Client Vivante"
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS budget_min numeric,
  ADD COLUMN IF NOT EXISTS budget_max numeric,
  ADD COLUMN IF NOT EXISTS motivation text,
  ADD COLUMN IF NOT EXISTS freins text,
  ADD COLUMN IF NOT EXISTS strategie_adaptee text,
  ADD COLUMN IF NOT EXISTS taux_signature numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS type_bien_recherche text,
  ADD COLUMN IF NOT EXISTS secteur_recherche text,
  ADD COLUMN IF NOT EXISTS canal_prefere text,
  ADD COLUMN IF NOT EXISTS derniere_interaction timestamp with time zone,
  ADD COLUMN IF NOT EXISTS score_urgence integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS resume_ia text,
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Créer la table inbox_messages pour le module Inbox Intelligence
CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  client_id uuid REFERENCES public.prospects(id) ON DELETE SET NULL,
  canal text NOT NULL DEFAULT 'email',
  direction text NOT NULL DEFAULT 'entrant',
  sujet text,
  contenu text NOT NULL,
  analyse_ia jsonb,
  urgence integer DEFAULT 0,
  intention text,
  lu boolean DEFAULT false,
  repondu boolean DEFAULT false,
  reponses_suggerees jsonb,
  source_externe_id text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own inbox messages"
  ON public.inbox_messages FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_inbox_messages_updated_at
  BEFORE UPDATE ON public.inbox_messages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer la table opportunites pour le Radar
CREATE TABLE IF NOT EXISTS public.opportunites (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  type text NOT NULL DEFAULT 'zone',
  titre text NOT NULL,
  description text,
  zone text,
  score integer DEFAULT 0,
  donnees jsonb,
  sources jsonb DEFAULT '[]'::jsonb,
  statut text DEFAULT 'nouvelle',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.opportunites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own opportunites"
  ON public.opportunites FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_opportunites_updated_at
  BEFORE UPDATE ON public.opportunites
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Créer la table api_connections pour l'API Manager
CREATE TABLE IF NOT EXISTS public.api_connections (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  service text NOT NULL,
  statut text DEFAULT 'non_connecte',
  config jsonb DEFAULT '{}'::jsonb,
  derniere_sync timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.api_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own api connections"
  ON public.api_connections FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Créer la table workflows pour l'automatisation
CREATE TABLE IF NOT EXISTS public.workflows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  nom text NOT NULL,
  declencheur text NOT NULL,
  actions jsonb DEFAULT '[]'::jsonb,
  actif boolean DEFAULT true,
  executions integer DEFAULT 0,
  derniere_execution timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own workflows"
  ON public.workflows FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
