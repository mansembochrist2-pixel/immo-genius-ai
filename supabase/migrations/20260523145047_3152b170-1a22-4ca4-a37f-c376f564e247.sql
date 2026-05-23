
-- 1) expertise_reports: re-scope policies to authenticated role
DROP POLICY IF EXISTS "Users can view their own expertise reports" ON public.expertise_reports;
DROP POLICY IF EXISTS "Users can insert their own expertise reports" ON public.expertise_reports;
DROP POLICY IF EXISTS "Users can update their own expertise reports" ON public.expertise_reports;
DROP POLICY IF EXISTS "Users can delete their own expertise reports" ON public.expertise_reports;

CREATE POLICY "Users can view their own expertise reports"
  ON public.expertise_reports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expertise reports"
  ON public.expertise_reports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expertise reports"
  ON public.expertise_reports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expertise reports"
  ON public.expertise_reports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- 2) Revoke EXECUTE on SECURITY DEFINER functions (only used by internal triggers)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.update_updated_at_column() FROM anon, authenticated, public;

-- 3) Realtime channel authorization: only allow users to subscribe to topics they own
ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can only subscribe to their own topics" ON realtime.messages;
CREATE POLICY "Users can only subscribe to their own topics"
  ON realtime.messages FOR SELECT TO authenticated
  USING (
    realtime.topic() LIKE '%' || auth.uid()::text || '%'
    OR realtime.topic() = auth.uid()::text
  );

DROP POLICY IF EXISTS "Users can only broadcast to their own topics" ON realtime.messages;
CREATE POLICY "Users can only broadcast to their own topics"
  ON realtime.messages FOR INSERT TO authenticated
  WITH CHECK (
    realtime.topic() LIKE '%' || auth.uid()::text || '%'
    OR realtime.topic() = auth.uid()::text
  );
