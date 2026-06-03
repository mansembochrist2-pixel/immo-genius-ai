import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";
import { consumeAiCredit } from "../_shared/rate-limit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `Tu es un expert immobilier français senior (20 ans d'expérience), spécialisé dans l'estimation de biens.

══════ RÈGLES ABSOLUES ══════
1. Tu produis TOUJOURS une estimation chiffrée, même en l'absence de comparables DVF directs.
2. INTERDIT de refuser, de dire "je ne peux pas estimer", de demander plus de données.
3. Si DVF présent : ancre ton estimation sur les ventes listées (cite-en 3 minimum dans l'argumentaire).
4. Si DVF absent : bascule en mode estimation sectorielle (connaissance marché ville/quartier 2024-2026, indice INSEE si fourni). Marque clairement "estimation sectorielle, fiabilité moyenne" dans methode_estimation.
5. Prix_min / prix_moyen / prix_max / recommandation_prix / prix_m2_secteur sont OBLIGATOIRES et numériques (entiers en euros).
6. Fourchette réaliste : prix_min ≈ prix_moyen × 0.92, prix_max ≈ prix_moyen × 1.08, recommandation ≈ prix_moyen × 1.03 (haut de fourchette pour négociation).

══════ STYLE ══════
- Prose fluide, professionnelle, zéro bullet point.
- Cite les sources (DVF Etalab, INSEE Notaires, observatoires).
- Ton d'expert qui parle à un confrère agent.

Utilise OBLIGATOIREMENT la fonction estimer_bien.`;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    // --- Auth ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _authClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const _token = authHeader.replace("Bearer ", "");
    const { data: _authData, error: _authError } = await _authClient.auth.getClaims(_token);
    if (_authError || !_authData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const _userId = _authData.claims.sub;

    // --- Rate limit ---
    const _rl = await consumeAiCredit(_userId, "generate-estimation");
    if (!_rl.ok) {
      const headers: Record<string, string> = { ...corsHeaders, "Content-Type": "application/json" };
      if (_rl.retry_after_seconds) headers["Retry-After"] = String(_rl.retry_after_seconds);
      return new Response(JSON.stringify({ error: _rl.error }), { status: _rl.status, headers });
    }

    const body = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { adresse, surface, pieces, etage, etat, dpe, annee_construction, parking, cave, balcon, ascenseur, gardien, type_bien, details_supplementaires, dvf_data, insee_data } = body;

    // === Bloc données réelles ===
    let dataBlock = "";
    let hasDvf = false;
    if (dvf_data && Array.isArray(dvf_data.ventes_all) && dvf_data.ventes_all.length > 0) {
      hasDvf = true;
      const ventes = dvf_data.ventes_all.slice(0, 15);
      const lignes = ventes.map((v: any) => {
        const addr = [v.adresse_numero, v.adresse_nom_voie].filter(Boolean).join(" ") || "Adresse partielle";
        const d = v.date_mutation ? new Date(v.date_mutation).toLocaleDateString("fr-FR") : "?";
        return `- ${addr} (${v.code_postal || ""} ${v.nom_commune || ""}) — ${v.surface_reelle_bati} m², ${v.nombre_pieces_principales || "?"} pièces, vendu ${Math.round(v.valeur_fonciere).toLocaleString("fr-FR")} € (${v.prix_m2?.toLocaleString("fr-FR")} €/m²) le ${d}`;
      }).join("\n");
      dataBlock += `\n\n=== TRANSACTIONS DVF RÉELLES (data.gouv / Etalab) ===
Secteur : ${dvf_data.ville || ""} ${dvf_data.code_postal || ""}
Nombre de ventes comparables : ${dvf_data.nb_ventes_filtrees}
Prix médian secteur : ${dvf_data.prix_m2_median?.toLocaleString("fr-FR")} €/m²
Tension marché : ${dvf_data.tension_marche} (${dvf_data.volume_12_mois} ventes sur 12 mois)

Ventes à citer dans l'argumentaire :
${lignes}`;
    } else {
      const ville = dvf_data?.ville || adresse;
      dataBlock += `\n\n=== DVF INDISPONIBLE — MODE ESTIMATION SECTORIELLE ===
Aucune vente DVF directe sur cette parcelle exacte.
Tu DOIS estimer en t'appuyant sur ta connaissance du marché ${ville} 2024-2026 (prix moyens par arrondissement/quartier, dynamique récente).
Indique dans methode_estimation : "Estimation sectorielle (fiabilité moyenne) — marché ${ville} 2024-2026, pas de DVF spécifique sur la parcelle."`;
    }

    if (insee_data && (insee_data.variation_3_ans_pct != null || insee_data.dernier_indice != null)) {
      dataBlock += `\n\n=== INDICE NOTAIRES-INSEE ===
Dernier indice : ${insee_data.dernier_indice ?? "n/a"}
Variation cumulée 3 ans : ${insee_data.variation_3_ans_pct != null ? insee_data.variation_3_ans_pct + " %" : "n/a"}
Source : INSEE. Mentionne cet indice dans tendance_12_mois.`;
    }

    const equipements = [parking && "parking", cave && "cave", balcon && "balcon/terrasse", ascenseur && "ascenseur", gardien && "gardien"].filter(Boolean).join(", ") || "aucun";

    const userPrompt = `Estime ce bien :
- Adresse : ${adresse}
- Type : ${type_bien || "appartement"}
- Surface : ${surface || "?"} m²
- Pièces : ${pieces || "?"}
- Étage : ${etage || "Non précisé"}
- État : ${etat || "bon"}
- DPE : ${dpe || "Non précisé"}
- Année construction : ${annee_construction || "Non précisée"}
- Équipements : ${equipements}
- Détails : ${details_supplementaires || "—"}
${dataBlock}

CONSIGNE : Appelle la fonction estimer_bien avec TOUS les champs numériques remplis (jamais null, jamais 0). ${hasDvf ? "Cite 3 ventes DVF précises dans argumentaire_prix et historique_ventes." : "Estime sur connaissance sectorielle et indique-le clairement."}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-5.2",
        max_completion_tokens: 4000,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "estimer_bien",
            description: "Produit une estimation immobilière complète et chiffrée",
            parameters: {
              type: "object",
              properties: {
                prix_min: { type: "number", description: "Prix minimum réaliste en euros (entier)" },
                prix_moyen: { type: "number", description: "Prix de marché médian en euros (entier)" },
                prix_max: { type: "number", description: "Prix maximum réaliste en euros (entier)" },
                prix_m2_secteur: { type: "number", description: "Prix au m² du secteur en euros (entier)" },
                recommandation_prix: { type: "number", description: "Prix de mise en vente recommandé en euros (entier)" },
                comparaison_quartier: { type: "string", description: "Comparaison avec le quartier, 3-5 phrases" },
                historique_ventes: { type: "string", description: "Description des ventes récentes similaires citant adresses et prix" },
                tendance_12_mois: { type: "string", description: "Tendance avec pourcentage chiffré" },
                argumentaire_prix: { type: "string", description: "Argumentaire long justifiant le prix recommandé, citant DVF" },
                analyse_marche: { type: "string", description: "Analyse longue du marché local" },
                methode_estimation: { type: "string", description: "Méthode utilisée, niveau de fiabilité" },
                conclusion: { type: "string", description: "Conclusion et recommandation de mise en vente" },
              },
              required: ["prix_min", "prix_moyen", "prix_max", "prix_m2_secteur", "recommandation_prix", "comparaison_quartier", "historique_ventes", "tendance_12_mois", "argumentaire_prix", "analyse_marche", "methode_estimation", "conclusion"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "estimer_bien" } },
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Trop de requêtes, réessayez." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Crédits IA épuisés." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "Erreur du service IA" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      console.error("No tool_call in response", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({ error: "L'IA n'a pas pu produire d'estimation, réessayez." }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const rawArgs: string = toolCall.function.arguments ?? "";
    let estimation: any;
    try {
      estimation = JSON.parse(rawArgs);
    } catch (e) {
      // Repair attempt
      let repaired = rawArgs;
      const quotes = (repaired.match(/(?<!\\)"/g) || []).length;
      if (quotes % 2 === 1) repaired += '"';
      let braces = 0, brackets = 0;
      for (const c of repaired) {
        if (c === "{") braces++; else if (c === "}") braces--;
        else if (c === "[") brackets++; else if (c === "]") brackets--;
      }
      while (brackets-- > 0) repaired += "]";
      while (braces-- > 0) repaired += "}";
      try {
        estimation = JSON.parse(repaired);
      } catch {
        return new Response(JSON.stringify({ error: "Réponse IA tronquée, réessayez." }), {
          status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Garde-fou : si un champ numérique manque ou = 0, on synthétise à partir de DVF/INSEE
    const surfaceN = Number(surface) || 0;
    const fallbackM2 = dvf_data?.prix_m2_median || estimation.prix_m2_secteur || 4000;
    if (!estimation.prix_m2_secteur || estimation.prix_m2_secteur <= 0) estimation.prix_m2_secteur = Math.round(fallbackM2);
    if (!estimation.prix_moyen || estimation.prix_moyen <= 0) estimation.prix_moyen = Math.round(estimation.prix_m2_secteur * surfaceN);
    if (!estimation.prix_min || estimation.prix_min <= 0) estimation.prix_min = Math.round(estimation.prix_moyen * 0.92);
    if (!estimation.prix_max || estimation.prix_max <= 0) estimation.prix_max = Math.round(estimation.prix_moyen * 1.08);
    if (!estimation.recommandation_prix || estimation.recommandation_prix <= 0) estimation.recommandation_prix = Math.round(estimation.prix_moyen * 1.03);

    return new Response(JSON.stringify(estimation), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-estimation error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Erreur inconnue" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
