import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Bot, Send, Zap, Target, TrendingUp, Calendar, Users, BarChart3, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";

interface Message {
  role: "user" | "assistant";
  content: string;
}

const QUICK_ACTIONS = [
  { label: "Préparer mon RDV", icon: Calendar, prompt: "Aide-moi à préparer mon prochain rendez-vous client. Quels points clés dois-je aborder ?" },
  { label: "Analyser mon portefeuille", icon: BarChart3, prompt: "Analyse mon portefeuille actuel et donne-moi des recommandations stratégiques." },
  { label: "Prioriser mes actions", icon: Target, prompt: "Quelles sont les actions prioritaires que je devrais faire aujourd'hui pour maximiser mes résultats ?" },
  { label: "Coaching vente", icon: TrendingUp, prompt: "Donne-moi des conseils de coaching pour améliorer mes performances de vente ce mois-ci." },
];

const Copilote = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: stats } = useQuery({
    queryKey: ["copilote-context"],
    queryFn: async () => {
      const [prospects, sales, tasks] = await Promise.all([
        supabase.from("prospects").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("*", { count: "exact", head: true }),
        supabase.from("tasks").select("*", { count: "exact", head: true }).eq("done", false),
      ]);
      return {
        prospects: prospects.count ?? 0,
        sales: sales.count ?? 0,
        tasksEnCours: tasks.count ?? 0,
      };
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const envoyer = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;

    const userMsg: Message = { role: "user", content: msgText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        }
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const businessContext = stats
      ? `CONTEXTE BUSINESS ACTUEL:\n- ${stats.prospects} clients en portefeuille\n- ${stats.sales} ventes réalisées\n- ${stats.tasksEnCours} tâches en cours`
      : "";

    try {
      await streamChat({
        functionName: "chat-copilote",
        messages: [...messages, userMsg],
        businessContext,
        onDelta: upsertAssistant,
        onDone: () => setIsLoading(false),
        onError: (err) => {
          upsertAssistant(`\n\n❌ ${err}`);
          setIsLoading(false);
        },
      });
    } catch {
      setIsLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Bot className="h-7 w-7 text-primary" />
          Copilote <span className="gradient-text">IA Central</span>
        </h1>
        <p className="page-subtitle">Votre assistant stratégique connecté à toutes vos données</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar contexte */}
        <div className="space-y-4">
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Contexte actif
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Clients</span>
                <span className="font-medium">{stats?.prospects ?? "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Ventes</span>
                <span className="font-medium">{stats?.sales ?? "—"}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Tâches actives</span>
                <span className="font-medium">{stats?.tasksEnCours ?? "—"}</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Actions rapides</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {QUICK_ACTIONS.map((action) => (
                <Button
                  key={action.label}
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-xs h-9"
                  onClick={() => envoyer(action.prompt)}
                  disabled={isLoading}
                >
                  <action.icon className="h-3.5 w-3.5 mr-2" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Zone de chat */}
        <Card className="lg:col-span-3 bg-card/60 border-border/30 flex flex-col h-[calc(100vh-220px)]">
          <CardHeader className="pb-2 border-b border-border/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bot className="h-4 w-4 text-primary" /> Copilote Estate AI
              </CardTitle>
              <Badge variant="outline" className="text-[10px]">Gemini Flash</Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-16 w-16 text-primary/20" />
                <div>
                  <p className="text-lg font-medium">Bonjour, je suis votre Copilote IA</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Posez-moi n'importe quelle question sur votre activité, vos clients, ou le marché.
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_ACTIONS.map((a) => (
                    <Badge
                      key={a.label}
                      variant="secondary"
                      className="cursor-pointer hover:bg-primary/20 transition-colors text-xs"
                      onClick={() => envoyer(a.prompt)}
                    >
                      {a.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/20"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : (
                    msg.content
                  )}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted/20 rounded-2xl px-4 py-3">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/20">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Posez une question à votre copilote..."
                className="min-h-[44px] max-h-32 resize-none bg-muted/10 border-border/30"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    envoyer();
                  }
                }}
              />
              <Button onClick={() => envoyer()} disabled={isLoading || !input.trim()} size="icon" className="shrink-0">
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Copilote;
