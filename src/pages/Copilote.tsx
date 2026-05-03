import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Bot, Send, Zap, Target, TrendingUp, CalendarDays, BarChart3, Loader2,
  Plus, MessageSquare, Pencil, Trash2, Clock, Users, Search, Check, X,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { streamChat } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { VoiceButton } from "@/components/VoiceButton";
import { toast } from "sonner";
import { useBusinessData } from "@/contexts/BusinessContext";

interface Message { role: "user" | "assistant"; content: string; }
interface Conversation { id: string; assistant_type: string; messages: Message[]; created_at: string; updated_at: string; }

const Copilote = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { stats, getAIContext } = useBusinessData();
  const queryClient = useQueryClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Check for prefilled message from Radar
  useEffect(() => {
    const prefill = sessionStorage.getItem("copilote_prefill");
    if (prefill) {
      sessionStorage.removeItem("copilote_prefill");
      setTimeout(() => envoyer(prefill), 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const QUICK_ACTIONS = [
    { label: lang === "fr" ? "Que faire aujourd'hui ?" : "What to do today?", icon: CalendarDays, prompt: lang === "fr" ? "Analyse mon agenda, mes messages non lus, mes prospects chauds et mes actions en attente. Dis-moi exactement ce que je dois faire aujourd'hui pour maximiser mon business." : "Analyze my agenda, unread messages, hot prospects and pending actions. Tell me exactly what I should do today." },
    { label: lang === "fr" ? "Préparer mon RDV" : "Prepare my meeting", icon: Target, prompt: lang === "fr" ? "Aide-moi à préparer mon prochain rendez-vous client." : "Help me prepare for my next client meeting." },
    { label: lang === "fr" ? "Analyser mon portefeuille" : "Analyze portfolio", icon: BarChart3, prompt: lang === "fr" ? "Analyse mon portefeuille clients et donne-moi des recommandations." : "Analyze my client portfolio and give recommendations." },
    { label: lang === "fr" ? "Coaching vente" : "Sales coaching", icon: TrendingUp, prompt: lang === "fr" ? "Donne-moi des conseils concrets pour améliorer mes performances de vente." : "Give me concrete tips to improve my sales performance." },
    { label: lang === "fr" ? "Relancer mes prospects" : "Follow up prospects", icon: Users, prompt: lang === "fr" ? "Identifie les prospects chauds que je n'ai pas relancés et propose un plan de relance." : "Identify hot prospects I haven't followed up and propose a plan." },
  ];

  const { data: conversations = [] } = useQuery({
    queryKey: ["copilote-conversations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("*").eq("assistant_type", "copilote").order("updated_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Conversation[];
    },
    enabled: !!user,
  });

  const filteredConversations = conversations.filter(c => {
    if (!convSearch) return true;
    const firstMsg = (c.messages as Message[])?.[0]?.content || "";
    return firstMsg.toLowerCase().includes(convSearch.toLowerCase());
  });

  // Données complémentaires pour la sidebar (détails non couverts par BusinessContext)
  const { data: ctxExtras } = useQuery({
    queryKey: ["copilote-extras"],
    queryFn: async () => {
      const [oppsRes, recentClientsRes, eventsRes] = await Promise.all([
        supabase.from("opportunites").select("titre, zone, score, type, description").order("score", { ascending: false }).limit(5),
        supabase.from("prospects").select("nom, statut, motivation, freins, budget_min, budget_max, secteur_recherche, score_ia, derniere_interaction").order("updated_at", { ascending: false }).limit(10),
        supabase.from("events").select("titre, type, date_debut, lieu").gte("date_debut", new Date().toISOString().split("T")[0] + "T00:00:00").order("date_debut").limit(5),
      ]);
      return {
        opportunities: oppsRes.data || [],
        recentClients: recentClientsRes.data || [],
        todayEvents: eventsRes.data || [],
      };
    },
    enabled: !!user,
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const saveMutation = useMutation({
    mutationFn: async (msgs: Message[]) => {
      if (!user) return;
      if (activeConvId) {
        await supabase.from("conversations").update({ messages: msgs as any, updated_at: new Date().toISOString() }).eq("id", activeConvId);
      } else {
        const { data, error } = await supabase.from("conversations").insert({ user_id: user.id, assistant_type: "copilote", messages: msgs as any }).select("id").single();
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

  // Rename conversation (store name as first message prefix or as metadata - we use first message approach)
  const renameConv = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      // We store the name by updating the conversation - for simplicity we just update the UI label
      // Since the schema uses messages jsonb, we add a __name field
      const conv = conversations.find(c => c.id === id);
      if (!conv) return;
      const msgs = [...(conv.messages as any)];
      // Store name in a metadata-like approach
      await supabase.from("conversations").update({
        messages: [{ role: "system", content: `__name:${name}` }, ...msgs.filter((m: any) => !m.content?.startsWith("__name:"))] as any,
        updated_at: new Date().toISOString(),
      }).eq("id", id);
    },
    onSuccess: () => {
      setEditingName(null);
      queryClient.invalidateQueries({ queryKey: ["copilote-conversations"] });
      toast.success(lang === "fr" ? "Conversation renommée" : "Conversation renamed");
    },
  });

  const getConvName = (conv: Conversation) => {
    const msgs = conv.messages as Message[];
    const nameMsg = msgs.find(m => m.content?.startsWith("__name:"));
    if (nameMsg) return nameMsg.content.replace("__name:", "");
    const firstUserMsg = msgs.find(m => m.role === "user" && !m.content?.startsWith("__name:"));
    return firstUserMsg?.content?.slice(0, 40) || (lang === "fr" ? "Nouvelle conversation" : "New conversation");
  };

  const loadConversation = (conv: Conversation) => {
    setActiveConvId(conv.id);
    setMessages((conv.messages as Message[]).filter(m => !m.content?.startsWith("__name:")));
  };

  const newConversation = () => { setActiveConvId(null); setMessages([]); };

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
      const lines = [getAIContext()];
      if (ctxExtras?.todayEvents?.length) {
        lines.push(`\n📅 AGENDA DU JOUR :`);
        ctxExtras.todayEvents.forEach((e: any) => lines.push(`  • ${e.titre} (${e.type}) — ${new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}${e.lieu ? " — " + e.lieu : ""}`));
      }
      if (ctxExtras?.recentClients?.length) {
        lines.push(`\n👥 CLIENTS RÉCENTS :`);
        ctxExtras.recentClients.slice(0, 5).forEach((c: any) => lines.push(`  • ${c.nom} (${c.statut}) Score: ${c.score_ia ?? "?"}/100`));
      }
      if (ctxExtras?.opportunities?.length) {
        lines.push(`\n🎯 OPPORTUNITÉS RADAR :`);
        ctxExtras.opportunities.slice(0, 5).forEach((o: any) => lines.push(`  • [${o.score}/100] ${o.titre}${o.zone ? " — " + o.zone : ""}`));
      }
      return lines.join("\n");
    };

    try {
      await streamChat({
        functionName: "chat-copilote",
        messages: newMsgs,
        businessContext: buildBusinessContext(),
        onDelta: upsertAssistant,
        onDone: () => { setIsLoading(false); setMessages(prev => { saveMutation.mutate(prev); return prev; }); },
        onError: (err) => { upsertAssistant(`\n\n❌ ${err}`); setIsLoading(false); },
      });
    } catch { setIsLoading(false); }
  };

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 1) return lang === "fr" ? "maintenant" : "now";
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Bot className="h-7 w-7 text-primary" />
          {lang === "fr" ? "Copilote" : "Strategic"} <span className="gradient-text">{lang === "fr" ? "Stratégique" : "Copilot"}</span>
        </h1>
        <p className="page-subtitle">{lang === "fr" ? "Votre assistant stratégique connecté à toutes vos données" : "Your strategic assistant connected to all your data"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="space-y-4">
          {/* Conversations with search */}
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> {lang === "fr" ? "Conversations" : "Conversations"}</CardTitle>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={newConversation}><Plus className="h-3.5 w-3.5" /></Button>
              </div>
              <div className="relative mt-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                <Input placeholder={lang === "fr" ? "Rechercher..." : "Search..."} value={convSearch} onChange={e => setConvSearch(e.target.value)} className="pl-7 h-7 text-xs" />
              </div>
            </CardHeader>
            <CardContent className="space-y-1 max-h-48 overflow-y-auto">
              {filteredConversations.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">{lang === "fr" ? "Aucune conversation" : "No conversations"}</p>
              ) : filteredConversations.map(c => (
                <div key={c.id} className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors text-xs group ${activeConvId === c.id ? "bg-primary/10 text-primary" : "hover:bg-secondary"}`}>
                  {editingName === c.id ? (
                    <div className="flex items-center gap-1 flex-1">
                      <Input value={editNameValue} onChange={e => setEditNameValue(e.target.value)} className="h-6 text-xs flex-1" autoFocus
                        onKeyDown={e => { if (e.key === "Enter") renameConv.mutate({ id: c.id, name: editNameValue }); if (e.key === "Escape") setEditingName(null); }}
                      />
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => renameConv.mutate({ id: c.id, name: editNameValue })}><Check className="h-2.5 w-2.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5" onClick={() => setEditingName(null)}><X className="h-2.5 w-2.5" /></Button>
                    </div>
                  ) : (
                    <>
                      <MessageSquare className="h-3 w-3 shrink-0" />
                      <span className="truncate flex-1" onClick={() => loadConversation(c)}>{getConvName(c)}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(c.updated_at)}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0" onClick={(e) => { e.stopPropagation(); setEditingName(c.id); setEditNameValue(getConvName(c)); }}><Pencil className="h-2.5 w-2.5" /></Button>
                      <Button size="icon" variant="ghost" className="h-5 w-5 opacity-0 group-hover:opacity-100 shrink-0 text-destructive" onClick={(e) => { e.stopPropagation(); deleteConv.mutate(c.id); }}><Trash2 className="h-2.5 w-2.5" /></Button>
                    </>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Context */}
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {lang === "fr" ? "Contexte actif" : "Active Context"}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {[
                { label: "Clients", value: ctx?.prospects ?? "—" },
                { label: lang === "fr" ? "CA Total" : "Total Revenue", value: ctx ? ctx.caTotal.toLocaleString("fr-FR") + " €" : "—" },
                { label: lang === "fr" ? "Inbox non lus" : "Unread inbox", value: ctx?.inboxUnread ?? "—" },
                { label: lang === "fr" ? "Opportunités" : "Opportunities", value: ctx?.opportunities?.length ?? "—" },
                { label: lang === "fr" ? "RDV aujourd'hui" : "Today's meetings", value: ctx?.todayEvents?.length ?? "—" },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-medium">{i.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{lang === "fr" ? "Actions rapides" : "Quick Actions"}</CardTitle></CardHeader>
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
        <Card className="lg:col-span-3 bg-card border-border rounded-2xl shadow-sm flex flex-col h-[calc(100vh-140px)] min-h-[700px]">
          <CardHeader className="pb-2 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Copilote Estate AI</CardTitle>
              <Badge variant="outline" className="text-[10px]">GPT-5.2</Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-16 w-16 text-primary/20" />
                <div>
                  <p className="text-lg font-medium">{lang === "fr" ? "Bonjour, je suis votre Copilote Stratégique" : "Hello, I'm your Strategic Copilot"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{lang === "fr" ? "Posez-moi n'importe quelle question sur votre activité." : "Ask me anything about your business."}</p>
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
                <div className={`max-w-[92%] rounded-2xl px-5 py-4 text-[15px] leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary"}`}>
                  {msg.role === "assistant" ? (
                    <div className="prose prose-sm max-w-none prose-p:my-2 prose-headings:mt-3 prose-headings:mb-2"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <div className="flex justify-start">
                <div className="bg-secondary rounded-2xl px-4 py-3"><Loader2 className="h-4 w-4 animate-spin text-primary" /></div>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-border">
            <div className="flex gap-2">
              <Textarea value={input} onChange={e => setInput(e.target.value)} placeholder={lang === "fr" ? "Posez une question à votre copilote..." : "Ask your copilot a question..."} className="min-h-[60px] max-h-48 resize-none bg-secondary border-border text-[15px]"
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); envoyer(); } }}
              />
              <VoiceButton onTranscript={(text) => setInput(prev => prev + " " + text)} disabled={isLoading} />
              <Button onClick={() => envoyer()} disabled={isLoading || !input.trim()} size="icon" className="shrink-0"><Send className="h-4 w-4" /></Button>
            </div>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Copilote;
