// Shared AI rate-limit / credit consumption helper.
// Calls the SECURITY DEFINER RPC `check_and_consume_ai_credit` via service role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

export type RateLimitOutcome =
  | { ok: true; credits_remaining: number; plan: string; reset_at: string }
  | { ok: false; status: number; error: string; retry_after_seconds?: number };

export async function consumeAiCredit(
  userId: string,
  functionName: string,
  perMinuteLimit = 10,
): Promise<RateLimitOutcome> {
  const url = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) {
    // Fail-open if misconfigured, but log for visibility.
    console.error("Rate limit misconfigured: missing service role env");
    return { ok: true, credits_remaining: -1, plan: "unknown", reset_at: "" };
  }

  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data, error } = await admin.rpc("check_and_consume_ai_credit", {
    _user_id: userId,
    _function_name: functionName,
    _per_minute_limit: perMinuteLimit,
  });

  if (error) {
    console.error("rate-limit RPC error:", error);
    // Fail-open on infra error
    return { ok: true, credits_remaining: -1, plan: "unknown", reset_at: "" };
  }

  const res = data as {
    ok: boolean;
    reason?: string;
    credits_remaining?: number;
    plan?: string;
    reset_at?: string;
    retry_after_seconds?: number;
  };

  if (res?.ok) {
    return {
      ok: true,
      credits_remaining: res.credits_remaining ?? -1,
      plan: res.plan ?? "unknown",
      reset_at: res.reset_at ?? "",
    };
  }

  if (res?.reason === "rate_limit") {
    return {
      ok: false,
      status: 429,
      error: "Trop d'appels en peu de temps, réessayez dans une minute.",
      retry_after_seconds: res.retry_after_seconds ?? 60,
    };
  }
  if (res?.reason === "quota_exhausted") {
    return {
      ok: false,
      status: 402,
      error: "Quota mensuel atteint. Mettez à niveau votre plan pour continuer.",
    };
  }
  return { ok: false, status: 403, error: "Accès refusé" };
}
