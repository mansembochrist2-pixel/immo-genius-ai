
-- 1) Restreindre toutes les policies "public" → "authenticated"
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT schemaname, tablename, policyname
    FROM pg_policies
    WHERE schemaname='public' AND 'public' = ANY(roles)
  LOOP
    EXECUTE format('ALTER POLICY %I ON %I.%I TO authenticated', r.policyname, r.schemaname, r.tablename);
  END LOOP;
END$$;

-- 2) Bloquer l'accès direct aux tokens OAuth via API (PostgREST)
REVOKE SELECT (access_token, refresh_token) ON public.user_integrations FROM anon, authenticated;
REVOKE UPDATE (access_token, refresh_token) ON public.user_integrations FROM anon, authenticated;
REVOKE INSERT (access_token, refresh_token) ON public.user_integrations FROM anon, authenticated;
