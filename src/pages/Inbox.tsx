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
} from "lucide-react";
import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────
interface InboxMessage {
  id: string;
  canal: string;
  direction: string;
  sujet: string | null;
  contenu: string;
  client_id: string | null;
  urgence: number | null;
  intention: string | null;
  lu: boolean | null;
  repondu: boolean | null;
  analyse_ia: any;
  reponses_suggerees: any;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface AIAnalysis {
  intention: string;
  urgence: number;
  sentiment: string;
  stress_level: number;
  key_points: string[];
  reponses: {
    professionnelle: string;
    commerciale: string;
    empathique: string;
  };
}

// ─── Helpers ──────────────────────────────────────
const canalIcons: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
  appel: PhoneCall,
};

const urgenceColors: Record<number, string> = {
  0: "text-muted-foreground",
  1: "text-muted-foreground",
  2: "text-info",
  3: "text-warning",
  4: "text-destructive",
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
};

// ─── Demo data seeder ─────────────────────────────
const DEMO_MESSAGES_SEED = [
  {
    canal: "email", direction: "entrant",
    sujet: "Demande de visite — Appartement T3 Paris 11",
    contenu: "Bonjour, je suis très intéressé par l'appartement T3 que vous proposez rue Oberkampf. Serait-il possible d'organiser une visite cette semaine ? J'ai un budget de 450 000€ et je cherche activement depuis 2 mois.",
    urgence: 3, intention: "Visite", lu: false, repondu: false,
  },
  {
    canal: "whatsapp", direction: "entrant",
    sujet: null,
    contenu: "Bonjour, j'ai vu votre annonce sur SeLoger pour la maison à Vincennes. Le prix est-il négociable ? Nous sommes prêts à faire une offre rapidement si le prix baisse de 5%.",
    urgence: 2, intention: "Négociation", lu: true, repondu: false,
  },
  {
    canal: "email", direction: "sortant",
    sujet: "Re: Estimation de votre bien — Confirmation",
    contenu: "Suite à notre échange, je vous confirme que l'estimation sera réalisée jeudi à 14h. Je viendrai avec les comparatifs du quartier.",
    urgence: 1, intention: "Suivi", lu: true, repondu: true,
  },
  {
    canal: "sms", direction: "entrant",
    sujet: null,
    contenu: "Pouvez-vous me rappeler svp ? J'ai une question urgente sur le compromis. Le notaire m'a envoyé un document que je ne comprends pas.",
    urgence: 4, intention: "Urgence", lu: false, repondu: false,
  },
  {
    canal: "email", direction: "entrant",
    sujet: "Recherche T2 lumineux — Budget 300K",
    contenu: "Bonjour Maître, je suis en recherche active d'un T2 lumineux dans le 15ème arrondissement, idéalement avec balcon. Mon budget est de 300 000€. Avez-vous quelque chose à me proposer ?",
    urgence: 2, intention: "Information", lu: false, repondu: false,
  },
];

// ─── Component ────────────────────────────────────
const Inbox = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState("tous");
  const [replyText, setReplyText] = useState("");
  const [analyzingId, setAnalyzingId] = useState<string | null>(null);

  // ─── Fetch messages from DB ───────────────────
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ["inbox-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as InboxMessage[];
    },
    enabled: !!user,
  });

  // ─── Seed demo data if empty ──────────────────
  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!user) return;
      const rows = DEMO_MESSAGES_SEED.map((m, i) => ({
        ...m,
        user_id: user.id,
        created_at: new Date(Date.now() - (i * 1000 * 60 * 60 * (i + 1))).toISOString(),
      }));
      const { error } = await supabase.from("inbox_messages").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      toast.success("Données de démo chargées");
    },
  });

  useEffect(() => {
    if (!loadingMessages && messages.length === 0 && user) {
      seedMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingMessages, messages.length, user]);

  // ─── Mark read/unread ─────────────────────────
  const toggleReadMutation = useMutation({
    mutationFn: async ({ id, lu }: { id: string; lu: boolean }) => {
      const { error } = await supabase.from("inbox_messages").update({ lu }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["inbox-messages"] }),
  });

  // ─── Send reply ───────────────────────────────
  const sendReplyMutation = useMutation({
    mutationFn: async ({ originalId, text }: { originalId: string; text: string }) => {
      if (!user) return;
      const original = messages.find((m) => m.id === originalId);
      const { error: insertErr } = await supabase.from("inbox_messages").insert({
        user_id: user.id,
        canal: original?.canal || "email",
        direction: "sortant",
        sujet: original?.sujet ? `Re: ${original.sujet}` : null,
        contenu: text,
        client_id: original?.client_id,
        lu: true,
        repondu: true,
      });
      if (insertErr) throw insertErr;
      // Mark original as replied
      const { error: updateErr } = await supabase
        .from("inbox_messages")
        .update({ repondu: true })
        .eq("id", originalId);
      if (updateErr) throw updateErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      setReplyText("");
      toast.success("Réponse envoyée");
    },
    onError: () => toast.error("Erreur lors de l'envoi"),
  });

  // ─── AI analysis ──────────────────────────────
  const analyzeMessage = useCallback(async (msg: InboxMessage) => {
    setAnalyzingId(msg.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-inbox", {
        body: { message: msg.contenu, clientName: "", canal: msg.canal },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Save analysis back to DB
      await supabase.from("inbox_messages").update({
        analyse_ia: data,
        reponses_suggerees: data.reponses,
        intention: data.intention,
        urgence: data.urgence,
      }).eq("id", msg.id);

      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      toast.success("Analyse IA terminée");
    } catch (e: any) {
      toast.error(e?.message || "Erreur d'analyse IA");
    } finally {
      setAnalyzingId(null);
    }
  }, [queryClient]);

  // ─── Auto-mark as read on select ──────────────
  useEffect(() => {
    if (selectedId) {
      const msg = messages.find((m) => m.id === selectedId);
      if (msg && !msg.lu) {
        toggleReadMutation.mutate({ id: selectedId, lu: true });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId]);

  // ─── Filtering ────────────────────────────────
  const filtered = messages.filter((m) => {
    const matchSearch =
      !search ||
      m.contenu.toLowerCase().includes(search.toLowerCase()) ||
      (m.sujet && m.sujet.toLowerCase().includes(search.toLowerCase()));

    if (tab === "non-lus") return matchSearch && !m.lu;
    if (tab === "urgents") return matchSearch && (m.urgence ?? 0) >= 3;
    if (tab === "entrants") return matchSearch && m.direction === "entrant";
    return matchSearch;
  });

  const selected = messages.find((m) => m.id === selectedId);
  const unreadCount = messages.filter((m) => !m.lu).length;
  const analysis: AIAnalysis | null = selected?.analyse_ia as AIAnalysis | null;
  const suggestions = selected?.reponses_suggerees as AIAnalysis["reponses"] | null;

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Mail className="h-7 w-7 text-primary" />
              Inbox <span className="gradient-text">Intelligence</span>
            </h1>
            <p className="page-subtitle">Messages centralisés et analysés par l'IA</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <Badge variant="outline" className="border-warning/30 text-warning">
                <AlertTriangle className="h-3 w-3 mr-1" />
                {unreadCount} non lu{unreadCount > 1 ? "s" : ""}
              </Badge>
            )}
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
              Données de démo
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* ─── Message list ─────────────────────── */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border/50"
            />
          </div>

          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="w-full bg-card/60">
              <TabsTrigger value="tous" className="flex-1 text-xs">Tous</TabsTrigger>
              <TabsTrigger value="non-lus" className="flex-1 text-xs">Non lus</TabsTrigger>
              <TabsTrigger value="urgents" className="flex-1 text-xs">Urgents</TabsTrigger>
              <TabsTrigger value="entrants" className="flex-1 text-xs">Entrants</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {loadingMessages ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-8">Aucun message</p>
            ) : (
              filtered.map((msg) => {
                const Icon = canalIcons[msg.canal] || Mail;
                return (
                  <Card
                    key={msg.id}
                    className={`cursor-pointer transition-all hover:border-primary/40 ${
                      selectedId === msg.id
                        ? "border-primary/60 bg-primary/5"
                        : "bg-card/60 border-border/30"
                    } ${!msg.lu ? "border-l-2 border-l-primary" : ""}`}
                    onClick={() => setSelectedId(msg.id)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className={`h-4 w-4 shrink-0 ${urgenceColors[msg.urgence ?? 0]}`} />
                          <span className={`text-sm truncate ${!msg.lu ? "font-semibold" : ""}`}>
                            {msg.canal === "email" ? "Email" : msg.canal === "whatsapp" ? "WhatsApp" : msg.canal === "sms" ? "SMS" : msg.canal}
                          </span>
                          {msg.direction === "sortant" && (
                            <Badge variant="outline" className="text-[8px] px-1 py-0">Envoyé</Badge>
                          )}
                        </div>
                        <span className="text-[10px] text-muted-foreground shrink-0">
                          {timeAgo(msg.created_at)}
                        </span>
                      </div>
                      {msg.sujet && (
                        <p className="text-xs text-muted-foreground mt-1 truncate">{msg.sujet}</p>
                      )}
                      <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{msg.contenu}</p>
                      <div className="flex items-center gap-2 mt-2">
                        {msg.intention && (
                          <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                            {msg.intention}
                          </Badge>
                        )}
                        {msg.repondu && <CheckCircle className="h-3 w-3 text-success" />}
                        {(msg.urgence ?? 0) >= 3 && (
                          <AlertTriangle className={`h-3 w-3 ${urgenceColors[msg.urgence ?? 0]}`} />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </div>

        {/* ─── Message detail + reply ──────────── */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {selected ? (
            <Card className="bg-card/60 border-border/30 flex flex-col flex-1 min-h-0">
              {/* Header */}
              <CardHeader className="pb-3 border-b border-border/20 shrink-0">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base">
                      {selected.sujet || `Message ${selected.canal}`}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1 flex items-center gap-2">
                      <Clock className="h-3 w-3" />
                      {new Date(selected.created_at).toLocaleString("fr-FR")}
                      <span>•</span>
                      {selected.canal}
                      <span>•</span>
                      {selected.direction === "entrant" ? "Reçu" : "Envoyé"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs"
                      onClick={() =>
                        toggleReadMutation.mutate({ id: selected.id, lu: !selected.lu })
                      }
                    >
                      {selected.lu ? (
                        <><EyeOff className="h-3 w-3 mr-1" /> Non lu</>
                      ) : (
                        <><Eye className="h-3 w-3 mr-1" /> Lu</>
                      )}
                    </Button>
                    <Badge variant="outline" className={`text-xs ${urgenceColors[selected.urgence ?? 0]}`}>
                      Urgence {selected.urgence ?? 0}/4
                    </Badge>
                  </div>
                </div>
              </CardHeader>

              {/* Scrollable content */}
              <div className="flex-1 overflow-y-auto p-4 space-y-5 min-h-0">
                {/* Message body */}
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-sm leading-relaxed">{selected.contenu}</p>
                </div>

                {/* AI Analysis */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold flex items-center gap-2">
                      <Zap className="h-4 w-4 text-primary" /> Analyse IA
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs"
                      disabled={analyzingId === selected.id}
                      onClick={() => analyzeMessage(selected)}
                    >
                      {analyzingId === selected.id ? (
                        <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analyse...</>
                      ) : (
                        <><Sparkles className="h-3 w-3 mr-1" /> {analysis ? "Ré-analyser" : "Analyser"}</>
                      )}
                    </Button>
                  </div>

                  {analysis ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: "Intention", value: analysis.intention },
                          { label: "Urgence", value: `${analysis.urgence}/4`, color: urgenceColors[analysis.urgence] },
                          { label: "Sentiment", value: analysis.sentiment },
                          { label: "Stress", value: `${analysis.stress_level}/5` },
                        ].map((item) => (
                          <div key={item.label} className="bg-muted/10 rounded-lg p-3 text-center">
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
                              {item.label}
                            </p>
                            <p className={`text-sm font-medium mt-1 ${item.color || ""}`}>
                              {item.value}
                            </p>
                          </div>
                        ))}
                      </div>
                      {analysis.key_points?.length > 0 && (
                        <div className="bg-muted/10 rounded-lg p-3">
                          <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">
                            Points clés
                          </p>
                          <ul className="space-y-1">
                            {analysis.key_points.map((pt, i) => (
                              <li key={i} className="text-xs text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5">•</span> {pt}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">
                      Cliquez sur « Analyser » pour obtenir l'analyse IA de ce message
                    </p>
                  )}
                </div>

                {/* Suggested replies */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Réponses suggérées</h3>
                  {suggestions ? (
                    <div className="space-y-2">
                      {(
                        [
                          { key: "professionnelle" as const, label: "Professionnelle" },
                          { key: "commerciale" as const, label: "Commerciale" },
                          { key: "empathique" as const, label: "Empathique" },
                        ] as const
                      ).map(({ key, label }) => (
                        <Card key={key} className="bg-muted/10 border-border/20">
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between mb-2">
                              <Badge variant="secondary" className="text-[9px]">{label}</Badge>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7"
                                  onClick={() => {
                                    navigator.clipboard.writeText(suggestions[key]);
                                    toast.success("Copié !");
                                  }}
                                >
                                  <Copy className="h-3 w-3 mr-1" /> Copier
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-xs h-7"
                                  onClick={() => setReplyText(suggestions[key])}
                                >
                                  Utiliser
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
                      Lancez l'analyse IA pour générer des réponses adaptées
                    </p>
                  )}
                </div>
              </div>

              {/* Reply bar */}
              <div className="p-4 border-t border-border/20 shrink-0">
                <div className="flex gap-2">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Répondre à ce message..."
                    className="min-h-[44px] max-h-32 resize-none bg-muted/10 border-border/30"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        if (replyText.trim()) {
                          sendReplyMutation.mutate({
                            originalId: selected.id,
                            text: replyText.trim(),
                          });
                        }
                      }
                    }}
                  />
                  <Button
                    onClick={() =>
                      sendReplyMutation.mutate({
                        originalId: selected.id,
                        text: replyText.trim(),
                      })
                    }
                    disabled={!replyText.trim() || sendReplyMutation.isPending}
                    size="icon"
                    className="shrink-0"
                  >
                    {sendReplyMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          ) : (
            <Card className="bg-card/60 border-border/30 flex-1 flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">Sélectionnez un message</p>
                <p className="text-xs text-muted-foreground/60">
                  Cliquez sur un message à gauche pour voir le détail et répondre
                </p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Inbox;
