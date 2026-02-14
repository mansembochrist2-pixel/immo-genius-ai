
-- Fix trial period to 7 days instead of 14
ALTER TABLE public.profiles ALTER COLUMN trial_ends_at SET DEFAULT (now() + '7 days'::interval);
