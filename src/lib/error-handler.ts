import { toast } from "sonner";

/**
 * Centralized error handler for Supabase / edge function calls.
 * Detects known error codes (402, 429, network) and shows user-friendly French messages.
 * Returns a string suitable for inline display.
 */
export function handleApiError(err: unknown, context?: string): string {
  const e = err as any;
  const message = e?.message || e?.error || "";
  const status = e?.status || e?.statusCode || e?.context?.status;

  // Lovable AI Gateway specific
  if (status === 402 || /402|crédits|credits/i.test(message)) {
    const msg = "💳 Vos crédits IA sont épuisés. Rechargez votre compte pour continuer.";
    toast.error(msg, { duration: 6000, description: "Allez dans Réglages → Facturation" });
    return msg;
  }
  if (status === 429 || /429|trop de requ/i.test(message)) {
    const msg = "⏱️ Trop de requêtes — patientez quelques secondes puis réessayez.";
    toast.error(msg);
    return msg;
  }
  if (/failed to fetch|network|load failed|networkerror/i.test(message)) {
    const msg = "📡 Connexion réseau interrompue. Vérifiez votre internet et réessayez.";
    toast.error(msg);
    return msg;
  }
  if (status === 401 || /jwt|unauthor|non auth/i.test(message)) {
    const msg = "🔒 Session expirée. Reconnectez-vous.";
    toast.error(msg);
    return msg;
  }

  const fallback = message || "Une erreur inattendue s'est produite.";
  toast.error(context ? `${context} — ${fallback}` : fallback);
  return fallback;
}

/** Detect if an error response indicates AI credits exhausted (for inline UI). */
export function isCreditsError(err: unknown): boolean {
  const e = err as any;
  const message = e?.message || e?.error || "";
  const status = e?.status || e?.statusCode;
  return status === 402 || /402|crédits|credits/i.test(message);
}
