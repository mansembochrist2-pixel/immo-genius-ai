// founder-stats — public stats for the landing page founder badge.
// Returns: { taken, total, remaining } for the "Fondateur" pricing slots.
// No auth required (public marketing endpoint).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.95.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const FOUNDER_TOTAL = 30;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } },
    );
    const { count, error } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("plan", "founder");

    if (error) throw error;

    const taken = count ?? 0;
    const remaining = Math.max(0, FOUNDER_TOTAL - taken);

    return new Response(
      JSON.stringify({ taken, total: FOUNDER_TOTAL, remaining }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    console.error("founder-stats error:", e);
    return new Response(
      JSON.stringify({ taken: 0, total: FOUNDER_TOTAL, remaining: FOUNDER_TOTAL }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  }
});
