import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es ImmoGenius AI Agent, un copilote stratégique CAPABLE D'AGIR pour un agent immobilier.

Tu disposes d'outils pour modifier les données (emails, tâches, événements, prospects). Utilise-les SEULEMENT quand l'utilisateur demande explicitement une action ou que c'est manifestement souhaité.

Règles :
1. Avant d'agir, vérifie le CONTEXTE BUSINESS pour identifier les bons IDs (emails, prospects).
2. Tu peux enchaîner plusieurs outils (ex : archiver 5 emails de pub d'un coup).
3. Après chaque action, explique brièvement ce que tu as fait.
4. Si une demande est ambiguë (quel email ?), pose UNE question avant d'agir.
5. Ne JAMAIS inventer d'IDs. Utilise uniquement ceux du contexte.
6. Réponse finale en markdown structuré, mentionne explicitement les actions exécutées.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "mark_email_read",
      description: "Marque un email de l'inbox comme lu.",
      parameters: {
        type: "object",
        properties: { message_id: { type: "string", description: "UUID de inbox_messages" } },
        required: ["message_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "categorize_email",
      description: "Met à jour l'intention et l'urgence d'un email.",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          intention: { type: "string", description: "ex: prospection, mandat, relance, spam, support" },
          urgence: { type: "integer", minimum: 0, maximum: 5 },
        },
        required: ["message_id"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description: "Crée une tâche à faire pour l'agent.",
      parameters: {
        type: "object",
        properties: {
          titre: { type: "string" },
          description: { type: "string" },
          due_date: { type: "string", description: "YYYY-MM-DD" },
          priorite: { type: "string", enum: ["basse", "moyenne", "haute"] },
          prospect_id: { type: "string" },
        },
        required: ["titre"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_event",
      description: "Crée un événement dans l'agenda (RDV, visite, appel...).",
      parameters: {
        type: "object",
        properties: {
          titre: { type: "string" },
          date_debut: { type: "string", description: "ISO 8601 datetime" },
          date_fin: { type: "string", description: "ISO 8601 datetime" },
          type: { type: "string", enum: ["rdv", "visite", "appel", "signature", "autre"] },
          lieu: { type: "string" },
          description: { type: "string" },
          client_id: { type: "string" },
        },
        required: ["titre", "date_debut"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_prospect_status",
      description: "Met à jour le statut d'un prospect.",
      parameters: {
        type: "object",
        properties: {
          prospect_id: { type: "string" },
          statut: { type: "string", enum: ["nouveau", "en_cours", "chaud", "froid", "signe", "perdu"] },
        },
        required: ["prospect_id", "statut"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "reply_email_suggestion",
      description: "Sauvegarde une réponse suggérée pour un email (l'agent validera avant l'envoi).",
      parameters: {
        type: "object",
        properties: {
          message_id: { type: "string" },
          reply_text: { type: "string" },
        },
        required: ["message_id", "reply_text"],
      },
    },
  },
];

async function runTool(supabase: any, userId: string, name: string, args: any) {
  switch (name) {
    case "mark_email_read": {
      const { error } = await supabase.from("inbox_messages").update({ lu: true }).eq("id", args.message_id);
      if (error) throw error;
      return { success: true, action: `Email ${args.message_id} marqué comme lu` };
    }
    case "categorize_email": {
      const patch: any = {};
      if (args.intention) patch.intention = args.intention;
      if (typeof args.urgence === "number") patch.urgence = args.urgence;
      const { error } = await supabase.from("inbox_messages").update(patch).eq("id", args.message_id);
      if (error) throw error;
      return { success: true, action: `Email catégorisé (${args.intention ?? "—"}, urgence ${args.urgence ?? "—"})` };
    }
    case "create_task": {
      const { data, error } = await supabase.from("tasks").insert({
        user_id: userId,
        titre: args.titre,
        description: args.description ?? null,
        due_date: args.due_date ?? null,
        priorite: args.priorite ?? "moyenne",
        prospect_id: args.prospect_id ?? null,
        source: "ia",
      }).select("id").single();
      if (error) throw error;
      return { success: true, action: `Tâche créée : "${args.titre}"`, id: data.id };
    }
    case "create_event": {
      const { data, error } = await supabase.from("events").insert({
        user_id: userId,
        titre: args.titre,
        date_debut: args.date_debut,
        date_fin: args.date_fin ?? null,
        type: args.type ?? "rdv",
        lieu: args.lieu ?? null,
        description: args.description ?? null,
        client_id: args.client_id ?? null,
        source_module: "copilote-agent",
      }).select("id").single();
      if (error) throw error;
      return { success: true, action: `Événement créé : "${args.titre}" le ${args.date_debut}`, id: data.id };
    }
    case "update_prospect_status": {
      const { error } = await supabase.from("prospects").update({ statut: args.statut }).eq("id", args.prospect_id);
      if (error) throw error;
      return { success: true, action: `Statut prospect → ${args.statut}` };
    }
    case "reply_email_suggestion": {
      const { data: cur } = await supabase.from("inbox_messages").select("reponses_suggerees").eq("id", args.message_id).single();
      const arr = Array.isArray(cur?.reponses_suggerees) ? cur.reponses_suggerees : [];
      arr.unshift({ text: args.reply_text, source: "agent", created_at: new Date().toISOString() });
      const { error } = await supabase.from("inbox_messages").update({ reponses_suggerees: arr }).eq("id", args.message_id);
      if (error) throw error;
      return { success: true, action: `Réponse suggérée enregistrée` };
    }
  }
  return { success: false, error: "Outil inconnu" };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const _token = authHeader.replace("Bearer ", "");
    const { data: claimsRes } = await supabase.auth.getClaims(_token);
    const userId = claimsRes?.claims?.sub;
    if (!userId) return new Response(JSON.stringify({ error: "Session invalide" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    const user = { id: userId };

    // --- rate limit / quota ---
    const _rl = await consumeAiCredit(user.id, "copilote-agent");
    if (!_rl.ok) {
      const _h: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) _h["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers: _h });
    }


    const { messages, businessContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY manquant");

    const conv: any[] = [
      { role: "system", content: SYSTEM_PROMPT + (businessContext ? `\n\n${businessContext}` : "") },
      ...messages,
    ];
    const executedActions: string[] = [];

    // Loop: max 5 rounds of tool calling
    for (let round = 0; round < 5; round++) {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({ model: "google/gemini-2.5-flash", messages: conv, tools: TOOLS, tool_choice: "auto" }),
      });

      if (!r.ok) {
        const t = await r.text();
        console.error("AI error", r.status, t);
        if (r.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        if (r.status === 429) return new Response(JSON.stringify({ error: "Trop de requêtes." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
        return new Response(JSON.stringify({ error: "Erreur IA" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const data = await r.json();
      const msg = data.choices?.[0]?.message;
      if (!msg) break;

      const toolCalls = msg.tool_calls;
      if (!toolCalls || toolCalls.length === 0) {
        return new Response(JSON.stringify({ content: msg.content || "", actions: executedActions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      conv.push(msg);
      for (const tc of toolCalls) {
        let args: any = {};
        try { args = JSON.parse(tc.function.arguments || "{}"); } catch {}
        let result: any;
        try {
          result = await runTool(supabase, user.id, tc.function.name, args);
          if (result.success && result.action) executedActions.push(result.action);
        } catch (e: any) {
          result = { success: false, error: e.message || "Erreur" };
        }
        conv.push({ role: "tool", tool_call_id: tc.id, content: JSON.stringify(result) });
      }
    }

    return new Response(JSON.stringify({ content: "Limite d'itérations atteinte.", actions: executedActions }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e: any) {
    console.error("copilote-agent error:", e);
    return new Response(JSON.stringify({ error: e?.message || "Erreur inconnue" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
