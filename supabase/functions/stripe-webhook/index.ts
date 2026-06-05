// Stripe webhook — synchronise `profiles.plan` & `credits_remaining`
// in reaction to subscription lifecycle events.
//
// Set `STRIPE_WEBHOOK_SECRET` in the project secrets and configure the
// endpoint in the Stripe dashboard to:
//   <SUPABASE_URL>/functions/v1/stripe-webhook
// Listening to: customer.subscription.created / updated / deleted
//                checkout.session.completed
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0?target=deno";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "stripe-signature, content-type",
};

// Plan unique "ImmoGenius Pro" + variante "founder" (tarif à vie). Même quota IA.
const PLAN_QUOTA: Record<string, number> = {
  pro: 120,
  founder: 120,
};

const PRICE_PRO = "price_1Tf2FPRzj9nL3WboOW5Ct37a";
const PRICE_FOUNDER = "price_1Tf2GYRzj9nL3Wbo9S7kmoA2";

// Map a Stripe price → plan code.
function planFromPriceId(priceId?: string | null): "pro" | "founder" {
  if (priceId === PRICE_FOUNDER) return "founder";
  return "pro";
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    console.error("stripe-webhook misconfigured: missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Webhook not configured", { status: 500 });
  }

  const sig = req.headers.get("stripe-signature");
  if (!sig) return new Response("Missing signature", { status: 400 });

  const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
  const rawBody = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error("Invalid Stripe signature:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  async function resolveUserId(customerId: string, fallback?: string | null): Promise<string | null> {
    if (fallback) return fallback;
    try {
      const customer = await stripe.customers.retrieve(customerId);
      if (!customer || customer.deleted) return null;
      const meta = (customer as Stripe.Customer).metadata?.supabase_user_id;
      if (meta) return meta;
      const email = (customer as Stripe.Customer).email;
      if (!email) return null;
      const { data } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
      return data?.id ?? null;
    } catch (e) {
      console.error("resolveUserId error:", e);
      return null;
    }
  }

  async function applyPlan(userId: string, plan: "starter" | "pro" | "expert") {
    const quota = PLAN_QUOTA[plan];
    const resetAt = new Date();
    resetAt.setUTCMonth(resetAt.getUTCMonth() + 1, 1);
    resetAt.setUTCHours(0, 0, 0, 0);
    const { error } = await admin
      .from("profiles")
      .update({
        plan,
        credits_remaining: quota,
        credits_reset_at: resetAt.toISOString(),
      })
      .eq("id", userId);
    if (error) console.error("applyPlan update error:", error);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const s = event.data.object as Stripe.Checkout.Session;
        const userId = await resolveUserId(s.customer as string, (s.metadata?.supabase_user_id ?? s.client_reference_id) as string | null);
        if (userId) await applyPlan(userId, "pro");
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(sub.customer as string, sub.metadata?.supabase_user_id ?? null);
        if (!userId) break;
        const status = sub.status;
        if (status === "active" || status === "trialing" || status === "past_due") {
          const priceId = sub.items?.data?.[0]?.price?.id;
          await applyPlan(userId, planFromPriceId(priceId));
        } else {
          await applyPlan(userId, "starter");
        }
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = await resolveUserId(sub.customer as string, sub.metadata?.supabase_user_id ?? null);
        if (userId) await applyPlan(userId, "starter");
        break;
      }
      default:
        break;
    }
  } catch (err) {
    console.error("stripe-webhook handler error:", err);
    return new Response("Handler error", { status: 500 });
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
