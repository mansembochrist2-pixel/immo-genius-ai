import { supabase } from "@/integrations/supabase/client";

type GmailOAuthMode = "auth" | "connect";

export const startGmailOAuth = async (mode: GmailOAuthMode = "auth") => {
  const redirectPath = mode === "connect" ? "/auth/complete?gmail=connected" : "/auth/complete";
  const { data, error } = await supabase.functions.invoke("oauth-init", {
    body: {
      provider: "gmail",
      mode,
      redirect_origin: `${window.location.origin}${redirectPath}`,
    },
  });

  if (error) throw error;
  if ((data as any)?.error) throw new Error((data as any).error);
  if (!(data as any)?.url) throw new Error("URL OAuth Gmail manquante");

  window.location.assign((data as any).url);
};