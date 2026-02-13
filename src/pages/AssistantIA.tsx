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

interface Message {
  role: "user" | "assistant";
  content: string;
}

const WELCOME: Record<string, string> = {
  immobilier: "Bonjour ! Je suis votre expert immobilier IA. Posez-moi vos questions sur la législation, la fiscalité, l'estimation, la négociation ou la prospection. 🏡",
  marketing: "Bonjour ! Je suis votre coach marketing immobilier IA. Demandez-moi des stratégies de communication, du copywriting, des conseils réseaux sociaux ou emailing. 📣",
};

const AssistantIA = () => {
  const [tab, setTab] = useState<"immobilier" | "marketing">("immobilier");
  const [input, setInput] = useState("");
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
    if (!input.trim() || isLoading) return;
    const userMsg: Message = { role: "user", content: input };
    const newMessages = [...messages, userMsg];

    setConversations(prev => ({ ...prev, [tab]: newMessages }));
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const functionName = tab === "immobilier" ? "chat-immobilier" : "chat-marketing";

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
        messages: newMessages.filter(m => m.role === "user" || m.content !== WELCOME[tab]),
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          toast.error(err);
          setIsLoading(false);
        },
      });
    } catch {
      toast.error("Erreur de connexion au service IA");
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyer();
    }
  };

  const clearConversation = () => {
    setConversations(prev => ({ ...prev, [tab]: [{ role: "assistant", content: WELCOME[tab] }] }));
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Bot className="h-6 w-6 text-accent" /> Assistant IA</h1>
        <p className="page-subtitle">Vos experts immobilier et marketing alimentés par l'IA</p>
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
                      m.role === "user"
                        ? "bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}>
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
              <div className="border-t p-4 flex gap-3">
                <Textarea
                  placeholder={key === "immobilier" ? "Posez votre question immobilière..." : "Demandez un conseil marketing..."}
                  value={key === tab ? input : ""}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  className="resize-none min-h-[44px]"
                  disabled={isLoading}
                />
                <Button onClick={envoyer} size="icon" className="shrink-0" disabled={isLoading || !input.trim()}>
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
