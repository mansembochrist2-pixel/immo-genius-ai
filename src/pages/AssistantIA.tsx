import { useState, useRef, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bot, Send, Building2, Megaphone, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { streamChat } from "@/lib/ai-stream";
import ReactMarkdown from "react-markdown";
import { VoiceButton } from "@/components/VoiceButton";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { CameraButton } from "@/components/CameraButton";

type ContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

interface Message {
  role: "user" | "assistant";
  content: string;
  imageUrl?: string;
}

const WELCOME: Record<string, string> = {
  immobilier: "Bonjour ! Je suis votre expert immobilier IA. Posez-moi vos questions sur la législation, la fiscalité, l'estimation, la négociation ou la prospection. Vous pouvez aussi m'envoyer des photos ou utiliser la dictée vocale. 🏡🎤📷",
  marketing: "Bonjour ! Je suis votre coach marketing immobilier IA. Demandez-moi des stratégies, du copywriting, des conseils réseaux sociaux. Envoyez-moi des photos de biens ou utilisez la voix ! 📣🎤📷",
};

const AssistantIA = () => {
  const [tab, setTab] = useState<"immobilier" | "marketing">("immobilier");
  const [input, setInput] = useState("");
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [conversations, setConversations] = useState<Record<string, Message[]>>({
    immobilier: [{ role: "assistant", content: WELCOME.immobilier }],
    marketing: [{ role: "assistant", content: WELCOME.marketing }],
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  const messages = conversations[tab];

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const envoyer = async () => {
    if ((!input.trim() && !pendingImage) || isLoading) return;

    const displayContent = input.trim() || (pendingImage ? "📷 Photo envoyée" : "");
    const userMsg: Message = { role: "user", content: displayContent, imageUrl: pendingImage || undefined };
    const newMessages = [...messages, userMsg];

    setConversations(prev => ({ ...prev, [tab]: newMessages }));
    setInput("");
    const imageToSend = pendingImage;
    setPendingImage(null);
    setIsLoading(true);

    let apiContent: string | ContentPart[];
    if (imageToSend) {
      const parts: ContentPart[] = [];
      parts.push({ type: "text", text: input.trim() || "Analyse cette image en détail." });
      parts.push({ type: "image_url", image_url: { url: imageToSend } });
      apiContent = parts;
    } else {
      apiContent = input.trim();
    }

    let assistantSoFar = "";
    const functionName = tab === "immobilier" ? "chat-immobilier" : "chat-marketing";

    const apiMessages = newMessages
      .filter(m => m.role === "user" || m.content !== WELCOME[tab])
      .map((m, i) => {
        if (i === newMessages.length - 1 && m.role === "user") {
          return { role: "user" as const, content: apiContent };
        }
        return { role: m.role, content: m.content };
      });

    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setConversations(prev => {
        const current = prev[tab];
        const last = current[current.length - 1];
        if (last?.role === "assistant" && current.length > newMessages.length) {
          return { ...prev, [tab]: current.map((m, i) => i === current.length - 1 ? { ...m, content: assistantSoFar } : m) };
        }
        return { ...prev, [tab]: [...current, { role: "assistant", content: assistantSoFar }] };
      });
    };

    try {
      await streamChat({
        functionName,
        messages: apiMessages,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => { toast.error(err); setIsLoading(false); },
      });
    } catch {
      toast.error("Erreur de connexion au service IA");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); }
  };

  const clearConversation = () => {
    setConversations(prev => ({ ...prev, [tab]: [{ role: "assistant", content: WELCOME[tab] }] }));
    setPendingImage(null);
  };

  const handleImageSelected = (base64: string) => {
    setPendingImage(base64);
    toast.success("Photo prête à envoyer");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Bot className="h-6 w-6 text-accent" /> Assistant IA</h1>
        <p className="page-subtitle">Vos experts immobilier et marketing — voix, photos et texte</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "immobilier" | "marketing")} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="immobilier" className="gap-2"><Building2 className="h-4 w-4" /> Expert Immobilier</TabsTrigger>
            <TabsTrigger value="marketing" className="gap-2"><Megaphone className="h-4 w-4" /> Coach Marketing</TabsTrigger>
          </TabsList>
          <Button variant="outline" size="sm" onClick={clearConversation}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Effacer
          </Button>
        </div>

        {(["immobilier", "marketing"] as const).map(key => (
          <TabsContent key={key} value={key} className="mt-0">
            <Card className="flex flex-col" style={{ height: "calc(100vh - 260px)" }}>
              <CardContent ref={key === tab ? scrollRef : undefined} className="flex-1 overflow-y-auto p-4 space-y-4">
                {conversations[key].map((m, i) => (
                  <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                      m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"
                    }`}>
                      {m.imageUrl && (
                        <img src={m.imageUrl} alt="Uploaded" className="rounded-lg mb-2 max-h-48 object-cover" />
                      )}
                      {m.role === "assistant" ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none">
                          <ReactMarkdown>{m.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{m.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && tab === key && messages[messages.length - 1]?.role === "user" && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-xl px-4 py-3">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
              </CardContent>

              {pendingImage && key === tab && (
                <div className="border-t px-4 py-2 flex items-center gap-2">
                  <img src={pendingImage} alt="Preview" className="h-12 w-12 rounded object-cover" />
                  <span className="text-xs text-muted-foreground flex-1">Photo prête à envoyer</span>
                  <Button variant="ghost" size="sm" onClick={() => setPendingImage(null)}>✕</Button>
                </div>
              )}

              <div className="border-t p-4 flex gap-2">
                <VoiceButton
                  onTranscript={(text) => setInput(prev => prev ? `${prev} ${text}` : text)}
                  disabled={isLoading}
                />
                <ImageUploadButton
                  onImageSelected={handleImageSelected}
                  disabled={isLoading}
                />
                <CameraButton
                  onPhotoTaken={handleImageSelected}
                  disabled={isLoading}
                />
                <Textarea
                  placeholder={key === "immobilier" ? "Posez votre question immobilière..." : "Demandez un conseil marketing..."}
                  value={key === tab ? input : ""}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="resize-none min-h-[44px]"
                  disabled={isLoading}
                />
                <Button onClick={envoyer} size="icon" className="shrink-0" disabled={isLoading || (!input.trim() && !pendingImage)}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          </TabsContent>
        ))}
      </Tabs>
    </AppLayout>
  );
};

export default AssistantIA;
