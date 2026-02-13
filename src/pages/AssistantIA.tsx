import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot, Send } from "lucide-react";
import { toast } from "sonner";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const mockResponses: Record<string, string> = {
  default: "Je suis votre assistant IA immobilier. Je peux vous aider avec la rédaction d'annonces, l'analyse de marché, les conseils de négociation, et plus encore. Comment puis-je vous aider ?",
};

const AssistantIA = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Bonjour ! Je suis votre assistant IA Estate AI. Posez-moi une question sur l'immobilier, la rédaction d'annonces, les stratégies de prospection, ou tout autre sujet. 🏡" },
  ]);

  const envoyer = () => {
    if (!input.trim()) return;
    const userMsg: Message = { role: "user", content: input };
    const response = `Merci pour votre question ! Voici mon analyse :\n\n${input.length > 30 ? "C'est une excellente question. " : ""}En tant qu'assistant IA spécialisé en immobilier, je vous recommande de :\n\n1. **Analyser le marché local** pour comprendre les tendances actuelles\n2. **Adapter votre stratégie** en fonction du type de bien\n3. **Mettre en avant les points forts** de chaque propriété\n\n💡 N'hésitez pas à me poser d'autres questions pour approfondir ce sujet !`;
    const assistantMsg: Message = { role: "assistant", content: response };
    setMessages([...messages, userMsg, assistantMsg]);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      envoyer();
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Bot className="h-6 w-6 text-accent" /> Assistant IA</h1>
        <p className="page-subtitle">Votre copilote immobilier intelligent</p>
      </div>

      <Card className="flex flex-col" style={{ height: "calc(100vh - 220px)" }}>
        <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-xl px-4 py-3 text-sm leading-relaxed ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground"
              }`}>
                <pre className="whitespace-pre-wrap font-sans">{m.content}</pre>
              </div>
            </div>
          ))}
        </CardContent>
        <div className="border-t p-4 flex gap-3">
          <Textarea
            placeholder="Posez votre question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            className="resize-none min-h-[44px]"
          />
          <Button onClick={envoyer} size="icon" className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </Card>
    </AppLayout>
  );
};

export default AssistantIA;
