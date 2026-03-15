import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Bot, Send, Zap, Target, TrendingUp, CalendarDays, BarChart3, Loader2,
  Plus, MessageSquare, Pencil, Trash2, Clock, Users,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { streamChat } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { VoiceButton } from "@/components/VoiceButton";

interface Message { role: "user" | "assistant"; content: string; }
interface Conversation { id: string; assistant_type: string; messages: Message[]; created_at: string; updated_at: string; }

const QUICK_ACTIONS = [
  { label: "Que faire aujourd'hui ?", icon: CalendarDays, prompt: "Analyse mon agenda, mes messages non lus, mes prospects chauds et mes actions en attente. Dis-moi exactement ce que je dois faire aujourd'hui pour maximiser mon business." },
  { label: "Préparer mon RDV", icon: Target, prompt: "Aide-moi à préparer mon prochain rendez-vous client. Résume le contexte, les points clés à aborder, les objections possibles et la stratégie." },
  { label: "Analyser mon portefeuille", icon: BarChart3, prompt: "Analyse mon portefeuille clients et donne-moi des recommandations stratégiques : qui relancer, qui risque de partir, où est l'argent." },
  { label: "Coaching vente", icon: TrendingUp, prompt: "Donne-moi des conseils de coaching concrets pour améliorer mes performances de vente ce mois-ci." },
  { label: "Relancer mes prospects", icon: Users, prompt: "Identifie les prospects chauds que je n'ai pas relancés et propose-moi un plan de relance priorisé." },
];

const Copilote = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Load conversations list
  const { data: conversations = [] } = useQuery({
    queryKey: ["copilote-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("assistant_type", "copilote")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Conversation[];
    },
    enabled: !!user,
  });

  // Business context
  const { data: ctx } = useQuery({
    queryKey: ["copilote-full-context"],
    queryFn: async () => {
      const [prospectsRes, salesRes, tasksRes, inboxRes, oppsRes, recentClientsRes, eventsRes] = await Promise.all([
        supabase.from("prospects").select("*", { count: "exact", head: true }),
        supabase.from("sales").select("montant, date_vente, description").order("date_vente", { ascending: false }).limit(5),
        supabase.from("actions_recommandees").select("titre, priorite, date_suggeree, statut").eq("statut", "en_attente").order("score_pertinence", { ascending: false }).limit(10),
        supabase.from("inbox_messages").select("canal, sujet, contenu, intention, urgence, lu, repondu, created_at, direction").order("created_at", { ascending: false }).limit(10),
        supabase.from("opportunites").select("titre, zone, score, type, description").order("score", { ascending: false }).limit(5),
        supabase.from("prospects").select("nom, statut, motivation, freins, budget_min, budget_max, secteur_recherche, score_ia, derniere_interaction").order("updated_at", { ascending: false }).limit(10),
        supabase.from("events").select("titre, type, date_debut, lieu").gte("date_debut", new Date().toISOString().split("T")[0] + "T00:00:00").order("date_debut").limit(5),
      ]);
      const salesData = salesRes.data || [];
      const caTotal = salesData.reduce((s, v) => s + Number(v.montant), 0);
      return {
        prospects: prospectsRes.count ?? 0, sales: salesData.length, caTotal,
        actions: tasksRes.data || [], inbox: inboxRes.data || [],
        opportunities: oppsRes.data || [], recentClients: recentClientsRes.data || [],
        recentSales: salesData, inboxUnread: (inboxRes.data || []).filter((m: any) => !m.lu).length,
        todayEvents: eventsRes.data || [],
      };
    },
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Save conversation
  const saveMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      if (!user) return;
      if (activeConvId) {
        await supabase.from("conversations").update({ messages: msgs as any, updated_at: new Date().toISOString() }).eq("id", activeConvId);
      } else {
        const { data, error } = await supabase.from("conversations").insert({
          user_id: user.id, assistant_type: "copilote", messages: msgs as any,
        }).select("id").single();
        if (error) throw error;
        setActiveConvId(data.id);
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["copilote-conversations"] }),
  });

  const deleteConv = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, id) => {
      if (activeConvId === id) { setActiveConvId(null); setMessages([]); }
      queryClient.invalidateQueries({ queryKey: ["copilote-conversations"] });
    },
  });

  const loadConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages(conv.messages as Message[]);
  };

  const newConversation = () => {
    setActiveConvId(null);
    setMessages([]);
  };

  const envoyer = async (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText || isLoading) return;
    const userMsg: Message = { role: "user", content: msgText };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    setInput("");
    setIsLoading(true);

    let assistantSoFar = "";
    const upsertAssistant = (chunk: string) => {
      assistantSoFar += chunk;
      setMessages(prev => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: assistantSoFar } : m));
        return [...prev, { role: "assistant", content: assistantSoFar }];
      });
    };

    const buildBusinessContext = () => {
      if (!ctx) return "";
      const lines = [
        `📊 CONTEXTE BUSINESS :`,
        `- ${ctx.prospects} clients en portefeuille | CA total: ${ctx.caTotal.toLocaleString("fr-FR")} €`,
        `- ${ctx.inboxUnread} messages non lus | ${ctx.actions.length} actions en attente`,
        `- ${ctx.opportunities.length} opportunités radar | ${ctx.todayEvents.length} RDV aujourd'hui`,
      ];
      if (ctx.todayEvents.length > 0) {
        lines.push(`\n📅 AGENDA DU JOUR :`);
        ctx.todayEvents.forEach((e: any) => lines.push(`  • ${e.titre} (${e.type}) — ${new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${e.lieu ? " — " + e.lieu : ""}`));
      }
      if (ctx.recentClients.length > 0) {
        lines.push(`\n👥 DERNIERS CLIENTS :`);
        ctx.recentClients.slice(0, 5).forEach((c: any) => {
          lines.push(`  • ${c.nom} (${c.statut}) Score: ${c.score_ia ?? "?"}/100${c.secteur_recherche ? " | " + c.secteur_recherche : ""}`);
        });
      }
      if (ctx.actions.length > 0) {
        lines.push(`\n⚡ ACTIONS EN ATTENTE :`);
        ctx.actions.slice(0, 5).forEach((t: any) => lines.push(`  • [${t.priorite}] ${t.titre}`));
      }
      if (ctx.inbox.length > 0) {
        lines.push(`\n📬 DERNIERS MESSAGES :`);
        ctx.inbox.slice(0, 3).forEach((m: any) => {
          lines.push(`  • [${m.canal}] ${m.sujet || m.contenu.slice(0, 50) + "..."} | ${m.lu ? "lu" : "NON LU"}${(m.urgence ?? 0) >= 3 ? " ⚠️" : ""}`);
        });
      }
      if (ctx.opportunities.length > 0) {
        lines.push(`\n🎯 OPPORTUNITÉS :`);
        ctx.opportunities.slice(0, 3).forEach((o: any) => lines.push(`  • ${o.titre} (${o.zone || "?"}) — Score: ${o.score}/100`));
      }
      return lines.join("\n");
    };

    try {
      await streamChat({
        functionName: "chat-copilote",
        messages: newMsgs,
        businessContext: buildBusinessContext(),
        onDelta: upsertAssistant,
        onDone: () => {
          setIsLoading(false);
          // Save conversation after completion
          setMessages(prev => {
            saveMutation.mutate(prev);
            return prev;
          });
        },
        onError: (err) => { upsertAssistant(`\n\n❌ ${err}`); setIsLoading(false); },
      });
    } catch { setIsLoading(false); }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return "maintenant";
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Bot className="h-7 w-7 text-primary" />
          Copilote <span className="gradient-text">Stratégique</span>
        </h1>
        <p className="page-subtitle">Votre assistant stratégique connecté à toutes vos données</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar: history + context */}
        <div className="space-y-4">
          {/* Conversations */}
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Conversations</CardTitle>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={newConversation}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 max-h-48 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucune conversation</p>
              ) : conversations.map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs group ${activeConvId === c.id ? "bg-primary/10 text-primary" : "hover:bg-muted/10"}`} onClick={() => loadConversation(c)}>
                  <MessageSquare className="h-3 w-3 shrink-0" />
                  <span className="truncate flex-1">
                    {(c.messages as Message[])?.[0]?.content?.slice(0, 40) || "Nouvelle conversation"}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.updated_at)}</span>
                  <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); deleteConv.mutate(c.id); }}><Trash2 className="h-2.5 w-2.5" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Context */}
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Contexte actif</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Clients", value: ctx?.prospects ?? "—" },
                { label: "CA Total", value: ctx ? ctx.caTotal.toLocaleString("fr-FR") + " €" : "—" },
                { label: "Inbox non lus", value: ctx?.inboxUnread ?? "—" },
                { label: "Opportunités", value: ctx?.opportunities?.length ?? "—" },
                { label: "RDV aujourd'hui", value: ctx?.todayEvents?.length ?? "—" },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-medium">{i.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2"><CardTitle className="text-sm">Actions rapides</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {QUICK_ACTIONS.map(a => (
                <Button key={a.label} variant="ghost" size="sm" className="w-full justify-start text-xs h-8 gap-2" onClick={() => envoyer(a.prompt)} disabled={isLoading}>
                  <a.icon className="h-3.5 w-3.5" />{a.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card className="lg:col-span-3 bg-card/60 border-border/30 flex flex-col h-[calc(100vh-220px)]">
          <CardHeader className="pb-2 border-b border-border/20">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Copilote Estate AI</CardTitle>
              <Badge variant="outline" className="text-[10px]">GPT-5.2</Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-16 w-16 text-primary/20" />
                <div>
                  <p className="text-lg font-medium">Bonjour, je suis votre Copilote Stratégique</p>
                  <p className="text-sm text-muted-foreground mt-1">Posez-moi n'importe quelle question sur votre activité, vos clients, ou votre stratégie.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center max-w-md">
                  {QUICK_ACTIONS.map(a => (
                    <Badge key={a.label} variant="secondary" className="cursor-pointer hover:bg-primary/20 transition-colors text-xs" onClick={() => envoyer(a.prompt)}>{a.label}</Badge>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/20"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm prose-invert max-w-none"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-muted/20 rounded-2xl px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border/20">
            <div className="flex gap-2">
              <Textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Posez une question à votre copilote..."
                className="min-h-[44px] max-h-32 resize-none bg-muted/10 border-border/30"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              />
              <VoiceButton
                onTranscript={(text) => setInput(prev => prev + " " + text)}
                disabled={isLoading}
              />
              <Button onClick={() => envoyer()} disabled={isLoading || !input.trim()} size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Copilote;
