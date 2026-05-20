import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Bot, Send, Zap, Target, TrendingUp, BarChart3,
  Plus, MessageSquare, Pencil, Trash2, Search, Check, X, HelpCircle, BookmarkCheck, Crosshair, FileText,
} from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { streamChat } from "@/lib/ai-stream";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactMarkdown from "react-markdown";
import { VoiceButton } from "@/components/VoiceButton";
import { Switch } from "@/components/ui/switch";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { useBusinessData } from "@/contexts/BusinessContext";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { useNavigate } from "react-router-dom";

interface Message { role: "user" | "assistant"; content: string; actions?: string[]; }
interface Conversation { id: string; assistant_type: string; messages: Message[]; created_at: string; updated_at: string; }

const Copilote = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const { stats, getAIContext } = useBusinessData();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [activeConvId, setActiveConvId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState("");
  const [convSearch, setConvSearch] = useState("");
  const agentMode = false;
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
    { label: lang === "fr" ? "Priorités mandats" : "Mandate priorities", icon: Zap, prompt: lang === "fr" ? "Analyse uniquement mes piges enregistrées, leurs scores et mes opportunités Radar. Donne-moi les 3 actions prioritaires pour décrocher un mandat cette semaine." : "Analyze only my saved Pige IA listings, their scores and Radar opportunities. Give me the top 3 actions to win a mandate this week." },
    { label: lang === "fr" ? "Top piges" : "Top listings", icon: BookmarkCheck, prompt: lang === "fr" ? "Classe mes piges enregistrées par priorité commerciale. Pour chaque bien, explique le score et l'action immédiate à faire." : "Rank my saved listings by commercial priority. For each property, explain the score and the immediate action." },
    { label: lang === "fr" ? "Script vendeur" : "Seller script", icon: Target, prompt: lang === "fr" ? "À partir de mes meilleures piges enregistrées, prépare un script d'appel vendeur court, naturel et orienté mandat exclusif." : "Based on my best saved listings, prepare a short natural seller call script focused on exclusive mandate conversion." },
    { label: lang === "fr" ? "Stratégie zone" : "Zone strategy", icon: Crosshair, prompt: lang === "fr" ? "Analyse mes opportunités Radar sauvegardées et propose une stratégie de prospection terrain sur la meilleure zone actuelle." : "Analyze my saved Radar opportunities and propose a field prospecting strategy for the current best zone." },
    { label: lang === "fr" ? "Audit offre" : "Offer audit", icon: FileText, prompt: lang === "fr" ? "Aide-moi à transformer mes données Pige IA et Radar en une offre commerciale claire pour convaincre un propriétaire vendeur." : "Help me turn my Pige IA and Radar data into a clear commercial offer for a property seller." },
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
      const [oppsRes, pigeRes] = await Promise.all([
        supabase.from("opportunites").select("titre, zone, score, type, description, donnees").order("score", { ascending: false }).limit(8),
        supabase.from("annonces_pige").select("titre, ville, prix, score_pigeabilite, contact_vendeur, signaux_marche, analyse_ia, notes_agent, saved_to_vivier").eq("saved_to_vivier", true).order("score_pigeabilite", { ascending: false }).limit(10),
      ]);
      return {
        opportunities: oppsRes.data || [],
        pigeTop: pigeRes.data || [],
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
      if (ctxExtras?.pigeTop?.length) {
        lines.push(`\n🔖 PIGES ENREGISTRÉES PRIORITAIRES :`);
        ctxExtras.pigeTop.slice(0, 8).forEach((p: any, i: number) => {
          const vendeur = p.contact_vendeur?.type || "vendeur à qualifier";
          lines.push(`  ${i + 1}. [${p.score_pigeabilite ?? "?"}/100] ${p.titre}${p.ville ? " — " + p.ville : ""} · ${vendeur}${p.prix ? " · " + Number(p.prix).toLocaleString("fr-FR") + " €" : ""}`);
        });
      }
      if (ctxExtras?.opportunities?.length) {
        lines.push(`\n🎯 OPPORTUNITÉS RADAR :`);
        ctxExtras.opportunities.slice(0, 5).forEach((o: any) => lines.push(`  • [${o.score}/100] ${o.titre}${o.zone ? " — " + o.zone : ""}`));
      }
      lines.push(`\n⚠️ Contrainte produit : ne pas proposer d'actions liées aux anciens modules prospects/clients, ventes/CA, inbox, agenda IA ou mémoire client.`);
      return lines.join("\n");
    };

    try {
      if (agentMode) {
        const { data, error } = await supabase.functions.invoke("copilote-agent", {
          body: { messages: newMsgs, businessContext: buildBusinessContext() },
        });
        if (error || data?.error) {
          upsertAssistant(`\n\n❌ ${data?.error || error?.message || "Erreur"}`);
        } else {
          let content = data?.content || "";
          if (data?.actions?.length) {
            content = `**✅ Actions exécutées :**\n${data.actions.map((a: string) => `- ${a}`).join("\n")}\n\n${content}`;
            toast.success(`${data.actions.length} action(s) exécutée(s)`);
            queryClient.invalidateQueries();
          }
          upsertAssistant(content);
        }
        setIsLoading(false);
        setMessages(prev => { saveMutation.mutate(prev); return prev; });
      } else {
        await streamChat({
          functionName: "chat-copilote",
          messages: newMsgs,
          businessContext: buildBusinessContext(),
          onDelta: upsertAssistant,
          onDone: () => { setIsLoading(false); setMessages(prev => { saveMutation.mutate(prev); return prev; }); },
          onError: (err) => { upsertAssistant(`\n\n❌ ${err}`); setIsLoading(false); },
        });
      }
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
            <CardContent className="space-y-1 max-h-36 lg:max-h-44 overflow-y-auto">
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
            <CardContent className="space-y-2.5">
              {[
                { label: "Piges enregistrées", value: stats.pige.total },
                { label: "Score moyen vivier", value: `${stats.pige.scoreMoyen}/100` },
                { label: lang === "fr" ? "Analyses Radar" : "Radar analyses", value: stats.opportunites.total },
              ].map(i => (
                <div key={i.label} className="flex justify-between text-xs">
                  <span className="text-muted-foreground">{i.label}</span>
                  <span className="font-medium">{i.value}</span>
                </div>
              ))}
              <p className="text-[10px] leading-relaxed text-muted-foreground pt-2 border-t border-border/50">
                Connecté aux modules actuels : Pige IA, Radar, Estimation et Studio. Les anciens modules clients, CA, agenda et inbox sont exclus du raisonnement.
              </p>
            </CardContent>
          </Card>

          {/* Quick actions */}
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardHeader className="pb-2"><CardTitle className="text-sm">{lang === "fr" ? "Actions rapides" : "Quick Actions"}</CardTitle></CardHeader>
            <CardContent className="space-y-1.5">
              {QUICK_ACTIONS.map(a => (
                <Button key={a.label} variant="ghost" size="sm" className="w-full justify-start text-xs min-h-8 h-auto py-2 gap-2 whitespace-normal text-left" onClick={() => envoyer(a.prompt)} disabled={isLoading}>
                  <a.icon className="h-3.5 w-3.5" />{a.label}
                </Button>
              ))}
            </CardContent>
          </Card>

          {/* Aide / FAQ */}
          <Card className="bg-card border-border rounded-2xl shadow-sm">
            <CardContent className="p-4">
              <Button variant="outline" size="sm" className="w-full justify-start text-xs gap-2 h-9" onClick={() => navigate("/faq")}>
                <HelpCircle className="h-3.5 w-3.5 text-primary" />
                {lang === "fr" ? "Centre d'aide & FAQ" : "Help center & FAQ"}
              </Button>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                {lang === "fr" ? "Plus de 40 réponses détaillées sur tous les modules." : "40+ detailed answers across all modules."}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Chat */}
        <Card className="lg:col-span-3 bg-card border-border rounded-2xl shadow-sm flex flex-col h-[calc(100vh-170px)] min-h-[560px] lg:min-h-[620px]">
          <CardHeader className="pb-2 border-b border-border">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2"><Bot className="h-4 w-4 text-primary" /> Copilote Estate AI</CardTitle>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary gap-1">
                <Zap className="h-2.5 w-2.5" /> {lang === "fr" ? "Données live synchronisées" : "Live data synced"}
              </Badge>
            </div>
          </CardHeader>

          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-5">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-4">
                <Bot className="h-16 w-16 text-primary/20" />
                <div>
                  <p className="text-lg font-medium">{lang === "fr" ? "Prêt à prioriser vos prochains mandats" : "Ready to prioritize your next mandates"}</p>
                  <p className="text-sm text-muted-foreground mt-1">{lang === "fr" ? "Je travaille avec vos piges enregistrées, vos analyses Radar, vos estimations et votre Studio IA." : "I work with your saved listings, Radar analyses, valuations and AI Studio."}</p>
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
                <div
                  className={`max-w-[92%] rounded-2xl px-5 py-4 ${msg.role === "user" ? "bg-primary text-primary-foreground text-[15px] leading-relaxed" : "bg-card border border-border/50 shadow-sm"}`}
                  style={msg.role === "assistant" ? { fontFamily: '-apple-system, "SF Pro Text", "Inter", system-ui, sans-serif' } : undefined}
                >
                  {msg.role === "assistant" ? (
                    <div className="prose prose-base max-w-none text-[15.5px] leading-7
                      prose-p:my-3 prose-p:text-foreground
                      prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-5 prose-headings:mb-2
                      prose-h1:text-lg prose-h2:text-base prose-h3:text-[15px]
                      prose-strong:text-foreground prose-strong:font-semibold
                      prose-ul:my-3 prose-ol:my-3 prose-li:my-1.5 prose-li:leading-7
                      prose-a:text-primary prose-a:no-underline hover:prose-a:underline
                      prose-code:text-primary prose-code:bg-primary/5 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none
                      prose-blockquote:border-l-primary/40 prose-blockquote:text-muted-foreground prose-blockquote:italic
                      prose-hr:my-5 prose-hr:border-border/50">
                      <ReactMarkdown>{msg.content}</ReactMarkdown>
                    </div>
                  ) : msg.content}
                </div>
              </div>
            ))}

            {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
              <AnalysisLoader
                module="Copilote"
                context={lang === "fr" ? "Analyse de votre contexte business" : "Analyzing your business context"}
                messages={lang === "fr" ? [
                  "Connexion aux données live…",
                  "Lecture de vos piges enregistrées…",
                  "Croisement avec vos opportunités Radar…",
                  "Construction de la réponse stratégique…",
                ] : [
                  "Connecting to live data…",
                  "Reading saved listings…",
                  "Cross-referencing radar opportunities…",
                  "Building strategic answer…",
                ]}
                inline
              />
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
