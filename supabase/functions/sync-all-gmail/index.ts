// Edge function appelée par pg_cron toutes les 2 minutes.
// Pour chaque user ayant une intégration Gmail "connected", on déclenche
// une synchro des 50 derniers emails.
// Pas d'auth utilisateur : on s'authentifie en service-role.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function refreshGmail(refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GOOGLE_CLIENT_ID")!,
      client_secret: Deno.env.get("GOOGLE_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return r.ok ? await r.json() : null;
}

async function syncOne(admin: any, integ: any) {
  let accessToken = integ.access_token;
  if (!accessToken) return { userId: integ.user_id, error: "no access_token" };

  // Refresh si expiré
  if (integ.expires_at && new Date(integ.expires_at) < new Date(Date.now() + 30_000)) {
    if (!integ.refresh_token) return { userId: integ.user_id, error: "expired, no refresh_token" };
    const refreshed = await refreshGmail(integ.refresh_token);
    if (refreshed?.access_token) {
      accessToken = refreshed.access_token;
      await admin.from("user_integrations").update({
        access_token: refreshed.access_token,
        expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
        refresh_token: refreshed.refresh_token || integ.refresh_token,
      }).eq("id", integ.id);
    } else {
      await admin.from("user_integrations").update({ status: "error", last_error: "refresh failed" }).eq("id", integ.id);
      return { userId: integ.user_id, error: "refresh failed" };
    }
  }

  const list = await fetch(
    "https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX",
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!list.ok) {
    const txt = await list.text();
    await admin.from("user_integrations").update({ status: "error", last_error: txt.slice(0, 500) }).eq("id", integ.id);
    return { userId: integ.user_id, error: `list ${list.status}` };
  }
  const { messages: ids } = await list.json();
  let inserted = 0;

  for (const m of ids || []) {
    const { data: exists } = await admin.from("inbox_messages")
      .select("id").eq("user_id", integ.user_id).eq("source_externe_id", m.id).maybeSingle();
    if (exists) continue;

    const detail = await fetch(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    if (!detail.ok) continue;
    const d = await detail.json();
    const headers = d.payload?.headers || [];
    const get = (n: string) => headers.find((h: any) => h.name === n)?.value || "";
    const isUnread = (d.labelIds || []).includes("UNREAD");
    await admin.from("inbox_messages").insert({
      user_id: integ.user_id,
      canal: "email",
      direction: "entrant",
      sujet: get("Subject"),
      contenu: `De: ${get("From")}\n\n${d.snippet || ""}`,
      source_externe_id: m.id,
      lu: !isUnread,
    });
    inserted++;
  }

  await admin.from("user_integrations").update({
    last_sync_at: new Date().toISOString(),
    last_error: null,
    status: "connected",
  }).eq("id", integ.id);
  return { userId: integ.user_id, inserted };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: integrations, error } = await admin
      .from("user_integrations")
      .select("*")
      .eq("provider", "gmail")
      .eq("status", "connected");
    if (error) throw error;

    const results = [];
    for (const integ of integrations || []) {
      try {
        results.push(await syncOne(admin, integ));
      } catch (e) {
        results.push({ userId: integ.user_id, error: String(e).slice(0, 200) });
      }
    }
    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
