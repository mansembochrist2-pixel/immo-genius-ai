type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };
type MsgContent = string | ContentPart[];
type Msg = { role: "user" | "assistant"; content: MsgContent };

export async function streamChat({
  functionName,
  messages,
  businessContext,
  onDelta,
  onDone,
  onError,
}: {
  functionName: string;
  messages: Msg[];
  businessContext?: string;
  onDelta: (deltaText: string) => void;
  onDone: () => void;
  onError: (error: string) => void;
}) {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;

  // Use the authenticated user's session JWT so edge functions can verify identity.
  const { supabase } = await import("@/integrations/supabase/client");
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    onError("🔒 Session expirée. Reconnectez-vous.");
    return;
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    },
    body: JSON.stringify({ messages, businessContext }),
  });

  if (!resp.ok) {
    const data = await resp.json().catch(() => ({ error: "Erreur réseau" }));
    let msg = data.error || `Erreur ${resp.status}`;
    if (resp.status === 402) msg = "💳 Crédits IA bêta épuisés. Contactez l’équipe ImmoGenius AI pour recharger votre accès.";
    else if (resp.status === 429) msg = "⏱️ Trop de requêtes — patientez quelques secondes.";
    else if (resp.status === 401) msg = "🔒 Session expirée. Reconnectez-vous.";
    onError(msg);
    return;
  }

  if (!resp.body) {
    onError("Pas de réponse du serveur");
    return;
  }

  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  let textBuffer = "";
  let streamDone = false;

  while (!streamDone) {
    const { done, value } = await reader.read();
    if (done) break;
    textBuffer += decoder.decode(value, { stream: true });

    let newlineIndex: number;
    while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
      let line = textBuffer.slice(0, newlineIndex);
      textBuffer = textBuffer.slice(newlineIndex + 1);

      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (line.startsWith(":") || line.trim() === "") continue;
      if (!line.startsWith("data: ")) continue;

      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") {
        streamDone = true;
        break;
      }

      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch {
        textBuffer = line + "\n" + textBuffer;
        break;
      }
    }
  }

  // Final flush
  if (textBuffer.trim()) {
    for (let raw of textBuffer.split("\n")) {
      if (!raw) continue;
      if (raw.endsWith("\r")) raw = raw.slice(0, -1);
      if (raw.startsWith(":") || raw.trim() === "") continue;
      if (!raw.startsWith("data: ")) continue;
      const jsonStr = raw.slice(6).trim();
      if (jsonStr === "[DONE]") continue;
      try {
        const parsed = JSON.parse(jsonStr);
        const content = parsed.choices?.[0]?.delta?.content as string | undefined;
        if (content) onDelta(content);
      } catch { /* ignore */ }
    }
  }

  onDone();
}
