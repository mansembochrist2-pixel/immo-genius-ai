// Edge function: réception du code OAuth → échange contre tokens → stockage chiffré
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const stateRaw = url.searchParams.get("state");
  const error = url.searchParams.get("error");

  const redirectHtml = (target: string, ok: boolean, msg: string) => `<!doctype html><html><body style="font-family:system-ui;padding:40px;text-align:center"><h2>${ok ? "✅" : "❌"} ${msg}</h2><p>Redirection en cours…</p><script>window.location.replace(${JSON.stringify(target)})</script></body></html>`;
  const closeHtml = (msg: string, ok: boolean) => `<!doctype html><html><body style="font-family:system-ui;padding:40px;text-align:center"><h2>${ok ? "✅" : "❌"} ${msg}</h2><p>Vous pouvez fermer cette fenêtre.</p><script>setTimeout(()=>window.close(),2000)</script></body></html>`;

  if (error) {
    return new Response(closeHtml(`Erreur OAuth : ${error}`, false), { headers: { "Content-Type": "text/html" } });
  }
  if (!code || !stateRaw) {
    return new Response(closeHtml("Paramètres manquants", false), { headers: { "Content-Type": "text/html" } });
  }

  try {
    const state = JSON.parse(atob(stateRaw));
    const { userId, provider, redirect_origin, mode } = state;
    const projectId = Deno.env.get("SUPABASE_URL")!.split("//")[1].split(".")[0];
    const callback = `https://${projectId}.supabase.co/functions/v1/oauth-callback`;

    let tokenRes: Response;
    let userInfoUrl = "";
    let userInfoHeader = "";

    if (provider === "gmail") {
      tokenRes = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: (Deno.env.get("GOOGLE_CLIENT_ID") || Deno.env.get("GMAIL_OAUTH_CLIENT_ID"))!,
          client_secret: (Deno.env.get("GOOGLE_CLIENT_SECRET") || Deno.env.get("GMAIL_OAUTH_CLIENT_SECRET"))!,
          redirect_uri: callback,
          grant_type: "authorization_code",
        }),
      });
      userInfoUrl = "https://www.googleapis.com/oauth2/v2/userinfo";
    } else if (provider === "outlook") {
      tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code,
          client_id: Deno.env.get("OUTLOOK_OAUTH_CLIENT_ID")!,
          client_secret: Deno.env.get("OUTLOOK_OAUTH_CLIENT_SECRET")!,
          redirect_uri: callback,
          grant_type: "authorization_code",
        }),
      });
      userInfoUrl = "https://graph.microsoft.com/v1.0/me";
    } else {
      return new Response(closeHtml("Provider invalide", false), { headers: { "Content-Type": "text/html" } });
    }

    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      return new Response(closeHtml(`Échec échange tokens : ${txt.slice(0, 200)}`, false), { headers: { "Content-Type": "text/html" } });
    }
    const tokens = await tokenRes.json();
    userInfoHeader = `Bearer ${tokens.access_token}`;

    const infoRes = await fetch(userInfoUrl, { headers: { Authorization: userInfoHeader } });
    const info = infoRes.ok ? await infoRes.json() : {};
    const email = info.email || info.mail || info.userPrincipalName || null;

    const expiresAt = tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000).toISOString() : null;

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    await admin.from("user_integrations").upsert({
      user_id: userId,
      provider,
      email,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token || null,
      expires_at: expiresAt,
      scope: tokens.scope || null,
      status: "connected",
      last_error: null,
    }, { onConflict: "user_id,provider" });

    if (redirect_origin && provider === "gmail") {
      const tokenParams = new URLSearchParams({ access_token: tokens.access_token, token_type: "bearer" });
      if (tokens.refresh_token) tokenParams.set("refresh_token", tokens.refresh_token);
      if (tokens.expires_in) tokenParams.set("expires_in", String(tokens.expires_in));
      tokenParams.set("provider_token", tokens.access_token);
      tokenParams.set("gmail_connected", "true");
      tokenParams.set("mode", mode === "auth" ? "auth" : "connect");
      return new Response(redirectHtml(`${redirect_origin}#${tokenParams.toString()}`, true, `Gmail connecté : ${email || "compte autorisé"}`), { headers: { "Content-Type": "text/html" } });
    }

    return new Response(closeHtml(`${provider === "gmail" ? "Gmail" : "Outlook"} connecté : ${email}`, true), { headers: { "Content-Type": "text/html" } });
  } catch (e) {
    return new Response(closeHtml(`Erreur : ${String(e).slice(0, 200)}`, false), { headers: { "Content-Type": "text/html" } });
  }
});
