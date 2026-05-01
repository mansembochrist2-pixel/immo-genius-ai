// Edge function: recherche web grounding via Lovable AI Gateway (Gemini)
// Retourne réponse + sources citées
import { corsHeaders } from "https://esm.sh/@supabase/supabase-js@2.95.0/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { query, context } = await req.json();
    if (!query || typeof query !== "string") {
      return new Response(JSON.stringify({ error: "query required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const systemPrompt = `Tu es un assistant pour agents immobiliers français. Réponds en français, factuel, avec sources. Cite TOUJOURS des dates et URLs vérifiables. ${context || ""}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: query },
        ],
        tools: [{ type: "google_search" }],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit, réessayez dans un instant." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway error ${r.status}: ${txt}`);
    }

    const data = await r.json();
    const message = data.choices?.[0]?.message;
    const answer = message?.content || "";
    const grounding = message?.grounding_metadata || data.choices?.[0]?.grounding_metadata || null;

    const sources = grounding?.grounding_chunks?.map((c: any) => ({
      title: c.web?.title || "",
      url: c.web?.uri || "",
    })).filter((s: any) => s.url) || [];

    return new Response(JSON.stringify({ answer, sources, raw_grounding: grounding }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
