CREATE OR REPLACE FUNCTION public.check_and_consume_ai_credit(_user_id uuid, _function_name text, _per_minute_limit integer DEFAULT 10)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _plan text;
  _credits integer;
  _reset_at timestamptz;
  _monthly_quota integer;
  _recent_calls integer;
BEGIN
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

  -- Plan unique "pro" = 120 crédits / mois. Tout autre plan (legacy ou trial) = 120 aussi.
  _monthly_quota := 120;

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
$function$;