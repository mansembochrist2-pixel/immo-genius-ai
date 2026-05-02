import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SYSTEM_PROMPT = `Tu es un analyste CRM expert immobilier. Tu reçois l'historique d'échanges email avec UN contact.

Mission : transformer ces emails en MÉMOIRE CLIENT structurée et actionnable.

Méthode :
1. Lire TOUS les échanges (contexte global, pas message isolé)
2. Détecter les signaux faibles : intentions implicites, niveau d'urgence, motivations cachées, freins
3. Classer le contact (UN seul type) :
   - "vendeur" : signaux de mise en vente d'un bien
   - "acheteur" : recherche active d'achat
   - "prospect" : intérêt général, pas encore qualifié
   - "client_actif" : transaction en cours
   - "prestataire" : notaire, diagnostiqueur, artisan, banque → À EXCLURE du CRM
4. Évaluer maturité (1-5) et score d'intérêt (0-100) avec justification chiffrée
5. Ne JAMAIS inventer : si une donnée manque, mets null

Utilise OBLIGATOIREMENT la fonction extract_memory.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { contact_email, contact_name, emails } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY missing");

    const userPrompt = `Contact : ${contact_name || contact_email}
Email : ${contact_email}
Nombre d'échanges : ${emails?.length || 0}

Historique (du plus ancien au plus récent) :
${(emails || []).map((e: any, i: number) => `--- Email ${i + 1} (${e.date || "?"}, ${e.direction || "?"}) ---\nSujet: ${e.subject || ""}\n${e.body || ""}`).join("\n\n")}

Analyse cette mémoire client.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-pro",
        messages: [{ role: "system", content: SYSTEM_PROMPT }, { role: "user", content: userPrompt }],
        tools: [{
          type: "function",
          function: {
            name: "extract_memory",
            description: "Mémoire client structurée",
            parameters: {
              type: "object",
              properties: {
                type_profil: { type: "string", enum: ["vendeur", "acheteur", "prospect", "client_actif", "prestataire"] },
                exclure_du_crm: { type: "boolean", description: "true si prestataire" },
                niveau_maturite: { type: "number", description: "1=froid, 5=prêt à signer" },
                score_interet: { type: "number", description: "0-100" },
                justification_score: { type: "string" },
                intentions_detectees: { type: "array", items: { type: "string" } },
                signaux_faibles: { type: "array", items: { type: "string" } },
                budget_min: { type: ["number", "null"] },
                budget_max: { type: ["number", "null"] },
                secteur_recherche: { type: ["string", "null"] },
                type_bien: { type: ["string", "null"] },
                motivation: { type: ["string", "null"] },
                freins: { type: ["string", "null"] },
                prochaine_action_recommandee: { type: "string" },
                resume: { type: "string", description: "3-5 phrases synthétiques" },
              },
              required: ["type_profil", "exclure_du_crm", "niveau_maturite", "score_interet", "justification_score", "intentions_detectees", "signaux_faibles", "prochaine_action_recommandee", "resume"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "extract_memory" } },
        reasoning: { effort: "medium" },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit" }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "Crédits IA épuisés" }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const t = await response.text();
      console.error("AI error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return new Response(JSON.stringify({ error: "Pas d'analyse" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    const memory = JSON.parse(toolCall.function.arguments);

    // Auto-upsert dans prospects si non-prestataire et user authentifié
    const authHeader = req.headers.get("Authorization");
    if (authHeader && !memory.exclure_du_crm) {
      try {
        const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: authHeader } } });
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const statutMap: Record<string, string> = { vendeur: "qualifie", acheteur: "qualifie", prospect: "nouveau", client_actif: "negociation" };
          await supabase.from("prospects").upsert({
            user_id: user.id, nom: contact_name || contact_email, email: contact_email,
            statut: (statutMap[memory.type_profil] || "nouveau") as any,
            source: "email_ia",
            score_ia: memory.score_interet,
            motivation: memory.motivation,
            freins: memory.freins,
            budget_min: memory.budget_min, budget_max: memory.budget_max,
            secteur_recherche: memory.secteur_recherche,
            type_bien_recherche: memory.type_bien,
            resume_ia: memory.resume,
            tags: [memory.type_profil, ...(memory.intentions_detectees || [])].slice(0, 5),
          }, { onConflict: "user_id,email" } as any);
        }
      } catch (e) { console.error("upsert prospect failed:", e); }
    }

    return new Response(JSON.stringify(memory), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("analyze-client-memory error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
