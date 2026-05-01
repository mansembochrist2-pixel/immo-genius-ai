// Edge function: démarre le flow OAuth Gmail ou Outlook
// Renvoie l'URL d'autorisation à laquelle rediriger l'agent
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsErr } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const userId = claimsData.claims.sub;

    const { provider, redirect_origin } = await req.json();
    if (!["gmail", "outlook"].includes(provider)) {
      return new Response(JSON.stringify({ error: "Invalid provider" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const projectId = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const callback = `https://${projectId}.supabase.co/functions/v1/oauth-callback`;
    const state = btoa(JSON.stringify({ userId, provider, redirect_origin }));

    let authUrl: string;

    if (provider === "gmail") {
      const clientId = Deno.env.get("GMAIL_OAUTH_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "GMAIL_OAUTH_CLIENT_ID not configured. Add it in project secrets.", missing_secret: "GMAIL_OAUTH_CLIENT_ID" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const scopes = ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/userinfo.email"].join(" ");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        scope: scopes,
        access_type: "offline",
        prompt: "consent",
        state,
      });
      authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
    } else {
      const clientId = Deno.env.get("OUTLOOK_OAUTH_CLIENT_ID");
      if (!clientId) {
        return new Response(JSON.stringify({ error: "OUTLOOK_OAUTH_CLIENT_ID not configured. Add it in project secrets.", missing_secret: "OUTLOOK_OAUTH_CLIENT_ID" }), { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const scopes = ["offline_access", "Mail.Read", "User.Read"].join(" ");
      const params = new URLSearchParams({
        client_id: clientId,
        redirect_uri: callback,
        response_type: "code",
        scope: scopes,
        response_mode: "query",
        state,
      });
      authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params}`;
    }

    return new Response(JSON.stringify({ url: authUrl }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
