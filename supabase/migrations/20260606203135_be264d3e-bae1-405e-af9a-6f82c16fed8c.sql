ALTER TABLE public.profiles ALTER COLUMN credits_remaining SET DEFAULT 120;

UPDATE public.profiles
SET credits_remaining = 120
WHERE credits_remaining = 50;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, credits_remaining)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    120
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.profiles.full_name),
        credits_remaining = GREATEST(public.profiles.credits_remaining, 120);
  RETURN NEW;
END;
$function$;