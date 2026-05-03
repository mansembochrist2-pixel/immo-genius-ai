import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Mail, MessageSquare, Phone, Search, Zap, Clock, AlertTriangle,
  CheckCircle, Send, Loader2, Eye, EyeOff, Sparkles, Copy, PhoneCall,
  Users, Target, Brain, Archive, Info,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { VoiceButton } from "@/components/VoiceButton";

interface InboxMessage {
  id: string; canal: string; direction: string; sujet: string | null;
  contenu: string; client_id: string | null; urgence: number | null;
  intention: string | null; lu: boolean | null; repondu: boolean | null;
  analyse_ia: any; reponses_suggerees: any; created_at: string;
  updated_at: string; user_id: string; archived_at: string | null;
}

interface AIAnalysis {
  intention: string; urgence: number; sentiment: string; stress_level: number;
  key_points: string[];
  reponses: { professionnelle: string; commerciale: string; empathique: string; };
}

const canalIcons: Record<string, typeof Mail> = { email: Mail, whatsapp: MessageSquare, sms: Phone, appel: PhoneCall };
const urgenceColors: Record<number, string> = { 0: "text-muted-foreground", 1: "text-muted-foreground", 2: "text-info", 3: "text-warning", 4: "text-destructive" };
const urgenceBadge: Record<number, { label: string; className: string; tooltip: string }> = {
  0: { label: "Info", className: "bg-muted/40 text-muted-foreground border-muted", tooltip: "Aucune urgence détectée — message informatif" },
  1: { label: "Faible", className: "bg-muted/40 text-muted-foreground border-muted", tooltip: "Faible urgence — peut attendre quelques jours" },
  2: { label: "Normal", className: "bg-info/15 text-info border-info/40", tooltip: "Urgence normale — répondre sous 24-48h" },
  3: { label: "Important", className: "bg-warning/15 text-warning border-warning/40", tooltip: "Important — répondre dans la journée pour ne pas perdre l'opportunité" },
  4: { label: "Urgent", className: "bg-destructive/15 text-destructive border-destructive/40 animate-pulse", tooltip: "URGENT — action immédiate requise (closing, litige, deadline critique)" },
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
};

const DEMO_MESSAGES_SEED = [
  { canal: "email", direction: "entrant", sujet: "Demande de visite — Appartement T3 Paris 11", contenu: "Bonjour, je suis très intéressé par l'appartement T3 que vous proposez rue Oberkampf. Serait-il possible d'organiser une visite cette semaine ? J'ai un budget de 450 000€ et je cherche activement depuis 2 mois.", urgence: 3, intention: "Visite", lu: false, repondu: false },
  { canal: "whatsapp", direction: "entrant", sujet: null, contenu: "Bonjour, j'ai vu votre annonce sur SeLoger pour la maison à Vincennes. Le prix est-il négociable ? Nous sommes prêts à faire une offre rapidement si le prix baisse de 5%.", urgence: 2, intention: "Négociation", lu: true, repondu: false },
  { canal: "email", direction: "sortant", sujet: "Re: Estimation de votre bien — Confirmation", contenu: "Suite à notre échange, je vous confirme que l'estimation sera réalisée jeudi à 14h. Je viendrai avec les comparatifs du quartier.", urgence: 1, intention: "Suivi", lu: true, repondu: true },
  { canal: "sms", direction: "entrant", sujet: null, contenu: "Pouvez-vous me rappeler svp ? J'ai une question urgente sur le compromis. Le notaire m'a envoyé un document que je ne comprends pas.", urgence: 4, intention: "Urgence", lu: false, repondu: false },
  { canal: "email", direction: "entrant", sujet: "Recherche T2 lumineux — Budget 300K", contenu: "Bonjour Maître, je suis en recherche active d'un T2 lumineux dans le 15ème arrondissement, idéalement avec balcon. Mon budget est de 300 000€. Avez-vous quelque chose à me proposer ?", urgence: 2, intention: "Information", lu: false, repondu: false },
];

const Inbox = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("tous");
  const [replyText, setReplyText] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase.from("inbox_messages").select("*").is("archived_at", null).order("created_at", { ascending: false });
      if (error) throw error;
      return data as InboxMessage[];
    },
    enabled: !!user,
  });

  const archiveMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbox_messages").update({ archived_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      queryClient.invalidateQueries({ queryKey: ["archived-messages"] });
      setSelectedId(null);
      toast.success(lang === "fr" ? "Message archivé" : "Message archived");
    },
  });

  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const rows = DEMO_MESSAGES_SEED.map((m, i) => ({ ...m, user_id: user.id, created_at: new Date(Date.now() - (i * 1000 * 60 * 60 * (i + 1))).toISOString() }));
      const { error } = await supabase.from("inbox_messages").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }); toast.success("Données de démo chargées"); },
  });

  useEffect(() => {
    if (!loadingMessages && messages.length === 0 && user) seedMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMessages, messages.length, user]);

  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, lu }: { id: string; lu: boolean }) => {
      const { error } = await supabase.from("inbox_messages").update({ lu }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }),
  });

  const sendReplyMutation = useMutation({
    mutationFn: async ({ originalId, text }: { originalId: string; text: string }) => {
      if (!user) return;
      const original = messages.find((m) => m.id === originalId);
      const { error: insertErr } = await supabase.from("inbox_messages").insert({
        user_id: user.id, canal: original?.canal || "email", direction: "sortant",
        sujet: original?.sujet ? `Re: ${original.sujet}` : null, contenu: text,
        client_id: original?.client_id, lu: true, repondu: true,
      });
      if (insertErr) throw insertErr;
      await supabase.from("inbox_messages").update({ repondu: true }).eq("id", originalId);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }); setReplyText(""); toast.success(lang === "fr" ? "Réponse envoyée" : "Reply sent"); },
    onError: () => toast.error(lang === "fr" ? "Erreur lors de l'envoi" : "Send error"),
  });

  const analyzeMessage = useCallback(async (msg: InboxMessage) => {
    setAnalyzingId(msg.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-inbox", { body: { message: msg.contenu, clientName: "", canal: msg.canal } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("inbox_messages").update({ analyse_ia: data, reponses_suggerees: data.reponses, intention: data.intention, urgence: data.urgence }).eq("id", msg.id);
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      toast.success(lang === "fr" ? "Analyse IA terminée" : "AI analysis complete");
    } catch (e: any) {
      toast.error(e?.message || "Erreur d'analyse IA");
    } finally { setAnalyzingId(null); }
  }, [queryClient, lang]);

  // Auto-mark as read when selecting
  useEffect(() => {
    if (selectedId) {
      const msg = messages.find((m) => m.id === selectedId);
      if (msg && !msg.lu) toggleReadMutation.mutate({ id: selectedId, lu: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // Filtering with "envoyes" tab
  const filtered = messages.filter((m) => {
    const matchSearch = !search || m.contenu.toLowerCase().includes(search.toLowerCase()) || (m.sujet && m.sujet.toLowerCase().includes(search.toLowerCase()));
    if (tab === "non-lus") return matchSearch && !m.lu;
    if (tab === "urgents") return matchSearch && (m.urgence ?? 0) >= 3;
    // "entrants" tab removed (redundant with main view)
    if (tab === "envoyes") return matchSearch && m.direction === "sortant";
    return matchSearch;
  });

  const selected = messages.find((m) => m.id === selectedId);
  const unreadCount = messages.filter((m) => !m.lu).length;
  const analysis: AIAnalysis | null = selected?.analyse_ia as AIAnalysis | null;
  const suggestions = selected?.reponses_suggerees as AIAnalysis["reponses"] | null;

  // Derive sender name from subject or canal
  const getSenderName = (msg: InboxMessage) => {
    if (msg.direction === "sortant") return lang === "fr" ? "Vous" : "You";
    if (msg.sujet) {
      // Try to extract name from common patterns
      const match = msg.contenu.match(/^(?:Bonjour|Hello|Cher|Chère)\s+(?:Maître\s+)?([A-ZÀ-Ü][a-zà-ÿ]+(?:\s[A-ZÀ-Ü][a-zà-ÿ]+)?)/);
      if (match) return match[1];
    }
    return msg.canal === "email" ? "Contact email" : msg.canal === "whatsapp" ? "Contact WhatsApp" : msg.canal === "sms" ? "Contact SMS" : "Contact";
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Mail className="h-7 w-7 text-primary" />
              {t("inbox.title")} <span className="gradient-text">{t("inbox.intelligence")}</span>
            </h1>
            <p className="page-subtitle">{t("inbox.subtitle")}</p>
          </div>
          {unreadCount > 0 && (
            <Badge variant="outline" className="border-warning/30 text-warning">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {unreadCount} {lang === "fr" ? `non lu${unreadCount > 1 ? "s" : ""}` : "unread"}
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* Message list */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder={t("inbox.search")} value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/50" />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full bg-card/60">
              <TabsTrigger value="tous" className="flex-1 text-xs">{t("inbox.all")}</TabsTrigger>
              <TabsTrigger value="non-lus" className="flex-1 text-xs">{t("inbox.unread")}</TabsTrigger>
              <TabsTrigger value="urgents" className="flex-1 text-xs">{t("inbox.urgent")}</TabsTrigger>
              <TabsTrigger value="envoyes" className="flex-1 text-xs">{lang === "fr" ? "Envoyés" : "Sent"}</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {loadingMessages ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">{lang === "fr" ? "Aucun message" : "No messages"}</p>
            ) : (
              filtered.map((msg) => {
                const Icon = canalIcons[msg.canal] || Mail;
                return (
                  <Card key={msg.id} className={`cursor-pointer transition-all hover:border-primary/40 ${selectedId === msg.id ? "border-primary/60 bg-primary/5" : "bg-card/60 border-border/30"} ${!msg.lu ? "border-l-2 border-l-primary" : ""}`} onClick={() => setSelectedId(msg.id)}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${urgenceColors[msg.urgence ?? 0]}`} />
                          <span className={`text-sm truncate ${!msg.lu ? "font-semibold" : ""}`}>
                            {getSenderName(msg)}
                          </span>
                          {msg.direction === "sortant" && <Badge variant="outline" className="text-[8px] px-1 py-0">{lang === "fr" ? "Envoyé" : "Sent"}</Badge>}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(msg.created_at)}</span>
                      </div>
                      {msg.sujet && <p className="text-xs text-muted-foreground mt-1 truncate">{msg.sujet}</p>}
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{msg.contenu}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {msg.intention && <Badge variant="secondary" className="text-[9px] px-1.5 py-0">{msg.intention}</Badge>}
                        {msg.repondu && <CheckCircle className="h-3 w-3 text-success" />}
                        {(msg.urgence ?? 0) >= 3 && <AlertTriangle className={`h-3 w-3 ${urgenceColors[msg.urgence ?? 0]}`} />}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* Message detail */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {selected ? (
            <Card className="bg-card/60 border-border/30 flex flex-col flex-1 min-h-0">
              <CardHeader className="pb-3 border-b border-border/20 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">{selected.sujet || `${lang === "fr" ? "Message" : "Message"} ${selected.canal}`}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <span className="font-medium text-foreground">{getSenderName(selected)}</span>
                      <span>•</span>
                      <Clock className="h-3 w-3" />
                      {new Date(selected.created_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}
                      <span>•</span>
                      {selected.canal}
                      <span>•</span>
                      {selected.direction === "entrant" ? (lang === "fr" ? "Reçu" : "Received") : (lang === "fr" ? "Envoyé" : "Sent")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => toggleReadMutation.mutate({ id: selected.id, lu: !selected.lu })}>
                      {selected.lu ? (<><EyeOff className="h-3 w-3 mr-1" /> {lang === "fr" ? "Non lu" : "Unread"}</>) : (<><Eye className="h-3 w-3 mr-1" /> {lang === "fr" ? "Lu" : "Read"}</>)}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-8 text-xs" onClick={() => archiveMutation.mutate(selected.id)} disabled={archiveMutation.isPending}>
                      <Archive className="h-3 w-3 mr-1" /> {lang === "fr" ? "Archiver" : "Archive"}
                    </Button>
                    <Badge variant="outline" className={`text-xs ${urgenceColors[selected.urgence ?? 0]}`}>
                      {lang === "fr" ? "Urgence" : "Urgency"} {selected.urgence ?? 0}/4
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{selected.contenu}</p>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" disabled={analyzingId === selected.id} onClick={() => analyzeMessage(selected)}>
                    {analyzingId === selected.id ? (<><Loader2 className="h-3 w-3 animate-spin" /> {t("inbox.analyzing")}</>) : (<><Brain className="h-3 w-3" /> {t("inbox.analyze")}</>)}
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => navigate("/clients")}>
                    <Users className="h-3 w-3" /> {lang === "fr" ? "Voir mémoire client" : "View client memory"}
                  </Button>
                </div>

                {analysis && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {lang === "fr" ? "Analyse IA" : "AI Analysis"}</h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {[
                        { label: "Intention", value: analysis.intention },
                        { label: lang === "fr" ? "Chaleur" : "Warmth", value: `${analysis.urgence}/4`, color: urgenceColors[analysis.urgence] },
                        { label: "Sentiment", value: analysis.sentiment },
                        { label: "Scoring", value: `${analysis.stress_level}/5` },
                      ].map((item) => (
                        <div key={item.label} className="bg-muted/10 rounded-lg p-3 text-center">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                          <p className={`text-sm font-medium mt-1 ${item.color || ""}`}>{item.value}</p>
                        </div>
                      ))}
                    </div>
                    {analysis.key_points?.length > 0 && (
                      <div className="bg-muted/10 rounded-lg p-3">
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">{lang === "fr" ? "Points clés" : "Key points"}</p>
                        <ul className="space-y-1">
                          {analysis.key_points.map((pt, i) => (
                            <li key={i} className="text-xs text-muted-foreground flex items-start gap-2"><span className="text-primary mt-0.5">•</span> {pt}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> {lang === "fr" ? "Réponse optimisée IA" : "AI Optimized Response"}</h3>
                  {suggestions ? (
                    <div className="space-y-2">
                      {([
                        { key: "professionnelle" as const, label: lang === "fr" ? "Professionnelle" : "Professional" },
                        { key: "commerciale" as const, label: lang === "fr" ? "Commerciale" : "Commercial" },
                        { key: "empathique" as const, label: lang === "fr" ? "Empathique" : "Empathetic" },
                      ]).map(({ key, label }) => (
                        <Card key={key} className="bg-muted/10 border-border/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="text-[9px]">{label}</Badge>
                              <div className="flex gap-1">
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => { navigator.clipboard.writeText(suggestions[key]); toast.success(t("common.copied")); }}>
                                  <Copy className="h-3 w-3 mr-1" /> {t("common.copy")}
                                </Button>
                                <Button size="sm" variant="ghost" className="text-xs h-7" onClick={() => setReplyText(suggestions[key])}>
                                  {lang === "fr" ? "Utiliser" : "Use"}
                                </Button>
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground">{suggestions[key]}</p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      {lang === "fr" ? "Cliquez sur « Analyser ce contact » pour des réponses optimisées" : "Click 'Analyze this contact' for optimized responses"}
                    </p>
                  )}
                </div>
              </div>

              <div className="p-4 border-t border-border/20 shrink-0">
                <div className="flex gap-2">
                  <VoiceButton onTranscript={(text) => setReplyText(prev => prev + " " + text)} />
                  <Textarea value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t("inbox.reply_placeholder")} className="min-h-[44px] max-h-32 resize-none bg-muted/10 border-border/30"
                    onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); if (replyText.trim()) sendReplyMutation.mutate({ originalId: selected.id, text: replyText.trim() }); } }}
                  />
                  <Button onClick={() => sendReplyMutation.mutate({ originalId: selected.id, text: replyText.trim() })} disabled={!replyText.trim() || sendReplyMutation.isPending} size="icon" className="shrink-0">
                    {sendReplyMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-card/60 border-border/30 flex-1 flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">{t("inbox.select_message")}</p>
                <p className="text-xs text-muted-foreground/60">{t("inbox.subtitle")}</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Inbox;
