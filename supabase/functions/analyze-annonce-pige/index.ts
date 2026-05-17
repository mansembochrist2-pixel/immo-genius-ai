// Edge function: génère stratégie/script de pige IA pour UNE annonce
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { annonce_id } = await req.json();
    if (!annonce_id) {
      return new Response(JSON.stringify({ error: "annonce_id requis" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Non authentifié" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: annonce, error: annErr } = await supabase
      .from("annonces_pige").select("*").eq("id", annonce_id).single();
    if (annErr || !annonce) {
      return new Response(JSON.stringify({ error: "Annonce introuvable" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const prompt = `Tu es un coach senior en pige immobilière française. Pour l'annonce suivante, génère une stratégie complète d'approche du vendeur.

ANNONCE :
- Titre : ${annonce.titre}
- Prix : ${annonce.prix ? annonce.prix + " €" : "N/C"}
- Surface : ${annonce.surface ? annonce.surface + " m²" : "N/C"}
- Pièces : ${annonce.pieces || "N/C"}
- Ville : ${annonce.ville || "N/C"} ${annonce.code_postal || ""}
- Type : ${annonce.type_bien || "N/C"}
- Vendeur : ${annonce.agence || "N/C"}
- Description : ${annonce.description || "N/C"}
- Score pigeabilité : ${annonce.score_pigeabilite}/100

Retourne UNIQUEMENT un JSON valide (sans markdown) :
{
  "accroche": "phrase d'accroche puissante 1 ligne pour ouvrir l'appel",
  "script_appel": "script complet d'appel en 4-6 lignes, ton humain et chaleureux, posant des questions ouvertes",
  "failles": ["faille marketing 1", "faille 2", "faille 3"],
  "contre_objections": [
    {"objection": "Je vends en direct, pas besoin d'agence", "reponse": "..."},
    {"objection": "J'ai déjà une agence", "reponse": "..."},
    {"objection": "Vos honoraires sont trop élevés", "reponse": "..."}
  ],
  "opportunites": ["levier commercial 1", "levier 2", "levier 3"],
  "arguments_negociation": ["argument 1", "argument 2"],
  "strategie_approche": "résumé en 2 phrases de la meilleure approche"
}`;

    const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      if (r.status === 429) return new Response(JSON.stringify({ error: "Rate limit." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (r.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error(`Gateway ${r.status}: ${txt}`);
    }

    const data = await r.json();
    const content: string = data.choices?.[0]?.message?.content || "";
    let strategy: any = {};
    try {
      const m = content.match(/\{[\s\S]*\}/);
      if (m) strategy = JSON.parse(m[0]);
    } catch (_) {}

    const merged = { ...(annonce.analyse_ia || {}), ...strategy, generated: true };
    await supabase.from("annonces_pige").update({ analyse_ia: merged, statut: "analysee" }).eq("id", annonce_id);

    return new Response(JSON.stringify({ ok: true, analyse: merged }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String((e as Error).message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
