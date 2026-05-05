// Edge function: synchronise les emails récents Gmail/Outlook → table inbox_messages
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

async function refreshGmail(refreshToken: string) {
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("GMAIL_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("GMAIL_OAUTH_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });
  return r.ok ? await r.json() : null;
}

async function refreshOutlook(refreshToken: string) {
  const r = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: Deno.env.get("OUTLOOK_OAUTH_CLIENT_ID")!,
      client_secret: Deno.env.get("OUTLOOK_OAUTH_CLIENT_SECRET")!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
      scope: "offline_access Mail.Read User.Read",
    }),
  });
  return r.ok ? await r.json() : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims } = await supabase.auth.getClaims(authHeader.replace("Bearer ", ""));
    if (!claims?.claims) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const userId = claims.claims.sub;

    const { provider } = await req.json();
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: integ } = await admin.from("user_integrations").select("*").eq("user_id", userId).eq("provider", provider).maybeSingle();
    if (!integ) return new Response(JSON.stringify({ error: "Not connected" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    let accessToken = integ.access_token;
    if (integ.expires_at && new Date(integ.expires_at) < new Date()) {
      const refreshed = provider === "gmail" ? await refreshGmail(integ.refresh_token) : await refreshOutlook(integ.refresh_token);
      if (refreshed?.access_token) {
        accessToken = refreshed.access_token;
        await admin.from("user_integrations").update({
          access_token: refreshed.access_token,
          expires_at: refreshed.expires_in ? new Date(Date.now() + refreshed.expires_in * 1000).toISOString() : null,
          refresh_token: refreshed.refresh_token || integ.refresh_token,
        }).eq("id", integ.id);
      }
    }

    const messages: any[] = [];

    if (provider === "gmail") {
      // 50 derniers emails (lus + non lus), boîte principale (INBOX)
      const list = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=50&labelIds=INBOX", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!list.ok) throw new Error(`Gmail list failed: ${await list.text()}`);
      const { messages: ids } = await list.json();
      for (const m of ids || []) {
        const detail = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`, { headers: { Authorization: `Bearer ${accessToken}` } });
        if (!detail.ok) continue;
        const d = await detail.json();
        const headers = d.payload?.headers || [];
        const get = (n: string) => headers.find((h: any) => h.name === n)?.value || "";
        const isUnread = (d.labelIds || []).includes("UNREAD");
        messages.push({
          source_externe_id: m.id,
          sujet: get("Subject"),
          contenu: d.snippet || "",
          contact: get("From"),
          lu: !isUnread,
        });
      }
    } else {
      const list = await fetch("https://graph.microsoft.com/v1.0/me/messages?$top=20&$select=id,subject,bodyPreview,from,receivedDateTime&$filter=isRead eq false&$orderby=receivedDateTime desc", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!list.ok) throw new Error(`Outlook list failed: ${await list.text()}`);
      const { value } = await list.json();
      for (const m of value || []) {
        messages.push({
          source_externe_id: m.id,
          sujet: m.subject,
          contenu: m.bodyPreview || "",
          contact: m.from?.emailAddress?.address || "",
        });
      }
    }

    let inserted = 0;
    for (const msg of messages) {
      const { data: exists } = await admin.from("inbox_messages").select("id").eq("user_id", userId).eq("source_externe_id", msg.source_externe_id).maybeSingle();
      if (exists) continue;
      await admin.from("inbox_messages").insert({
        user_id: userId,
        canal: "email",
        direction: "entrant",
        sujet: msg.sujet,
        contenu: `De: ${msg.contact}\n\n${msg.contenu}`,
        source_externe_id: msg.source_externe_id,
        lu: msg.lu ?? false,
      });
      inserted++;
    }

    await admin.from("user_integrations").update({ last_sync_at: new Date().toISOString(), last_error: null }).eq("id", integ.id);

    return new Response(JSON.stringify({ success: true, inserted, total: messages.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
