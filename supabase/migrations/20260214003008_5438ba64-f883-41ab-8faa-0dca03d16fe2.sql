
-- Add provenance column to prospects
ALTER TABLE public.prospects ADD COLUMN IF NOT EXISTS provenance TEXT DEFAULT NULL;

-- Create sales table for revenue tracking
CREATE TABLE public.sales (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  prospect_id UUID REFERENCES public.prospects(id) ON DELETE SET NULL,
  montant NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  date_vente DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on sales
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own sales"
  ON public.sales FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own sales"
  ON public.sales FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sales"
  ON public.sales FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sales"
  ON public.sales FOR DELETE
  USING (auth.uid() = user_id);
