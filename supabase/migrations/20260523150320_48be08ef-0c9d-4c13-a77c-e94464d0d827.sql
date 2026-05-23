
-- Add credit tracking columns to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS credits_remaining integer NOT NULL DEFAULT 50,
  ADD COLUMN IF NOT EXISTS credits_reset_at timestamptz NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month');

-- AI usage log
CREATE TABLE IF NOT EXISTS public.ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  function_name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_log_user_time ON public.ai_usage_log (user_id, created_at DESC);

ALTER TABLE public.ai_usage_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own ai usage"
  ON public.ai_usage_log FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- No INSERT policy: inserts happen only via SECURITY DEFINER function below

-- Atomic credit check + consume + log
CREATE OR REPLACE FUNCTION public.check_and_consume_ai_credit(
  _user_id uuid,
  _function_name text,
  _per_minute_limit integer DEFAULT 10
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _plan text;
  _credits integer;
  _reset_at timestamptz;
  _monthly_quota integer;
  _recent_calls integer;
BEGIN
  -- Per-minute rate limit
  SELECT count(*) INTO _recent_calls
  FROM public.ai_usage_log
  WHERE user_id = _user_id
    AND created_at > now() - interval '1 minute';

  IF _recent_calls >= _per_minute_limit THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'rate_limit', 'retry_after_seconds', 60);
  END IF;

  SELECT plan, credits_remaining, credits_reset_at
    INTO _plan, _credits, _reset_at
  FROM public.profiles
  WHERE id = _user_id
  FOR UPDATE;

  IF _plan IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'no_profile');
  END IF;

  _monthly_quota := CASE lower(_plan)
    WHEN 'pro' THEN 150
    WHEN 'expert' THEN 500
    ELSE 50
  END;

  -- Monthly reset
  IF now() >= _reset_at THEN
    _credits := _monthly_quota;
    _reset_at := date_trunc('month', now()) + interval '1 month';
  END IF;

  IF _credits <= 0 THEN
    UPDATE public.profiles
      SET credits_remaining = _credits, credits_reset_at = _reset_at
      WHERE id = _user_id;
    RETURN jsonb_build_object('ok', false, 'reason', 'quota_exhausted', 'plan', _plan);
  END IF;

  UPDATE public.profiles
    SET credits_remaining = _credits - 1,
        credits_reset_at = _reset_at
    WHERE id = _user_id;

  INSERT INTO public.ai_usage_log (user_id, function_name)
    VALUES (_user_id, _function_name);

  RETURN jsonb_build_object(
    'ok', true,
    'credits_remaining', _credits - 1,
    'plan', _plan,
    'reset_at', _reset_at
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.check_and_consume_ai_credit(uuid, text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.check_and_consume_ai_credit(uuid, text, integer) TO authenticated, service_role;
