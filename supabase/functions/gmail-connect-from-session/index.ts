// Edge function: enregistre les tokens Google OAuth (issus de la session Supabase)
// dans user_integrations pour permettre la synchro Gmail continue.
// Appelée automatiquement par AuthContext juste après un login/connect Google.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: userErr } = await userClient.auth.getUser(authHeader.replace("Bearer ", ""));
    if (userErr || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body = await req.json();
    const { provider_token, provider_refresh_token, expires_in } = body || {};
    if (!provider_token) {
      return new Response(JSON.stringify({ error: "provider_token missing" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const expiresAt = expires_in ? new Date(Date.now() + Number(expires_in) * 1000).toISOString() : null;
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // On préserve un éventuel refresh_token déjà stocké si Google n'en renvoie pas un nouveau
    const { data: existing } = await admin.from("user_integrations")
      .select("refresh_token")
      .eq("user_id", user.id)
      .eq("provider", "gmail")
      .maybeSingle();

    await admin.from("user_integrations").upsert({
      user_id: user.id,
      provider: "gmail",
      email: user.email ?? null,
      access_token: provider_token,
      refresh_token: provider_refresh_token || existing?.refresh_token || null,
      expires_at: expiresAt,
      scope: "https://www.googleapis.com/auth/gmail.readonly",
      status: "connected",
      last_error: null,
    }, { onConflict: "user_id,provider" });

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
