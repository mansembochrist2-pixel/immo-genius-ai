import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Mail, Bot, Users, Zap, TrendingUp, ArrowRight, Target,
  AlertTriangle, Play, CalendarDays, Clock, SkipForward, X, DollarSign, Radar,
  Search, FileText, BarChart3, MessageSquare, Pencil, Check,
} from "lucide-react";
import { ScoreExplainer } from "@/components/ScoreExplainer";
import { toast } from "sonner";
import { useState } from "react";
import { useBusinessData } from "@/contexts/BusinessContext";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { t, lang } = useLanguage();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const [editingCA, setEditingCA] = useState(false);
  const [caInput, setCaInput] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("objectif_ca").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const objectifCa = Number(profile?.objectif_ca) || 0;

  const updateCaMutation = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase.from("profiles").update({ objectif_ca: value } as any).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingCA(false);
      toast.success(lang === "fr" ? "Objectif mis à jour" : "Goal updated");
    },
  });

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: async () => {
      const { count } = await supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("lu", false).eq("direction", "entrant");
      return count ?? 0;
    },
  });

  const { data: oppsCount = 0 } = useQuery({
    queryKey: ["opp-count"],
    queryFn: async () => {
      const { count } = await supabase.from("opportunites").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: clientsActifs = 0 } = useQuery({
    queryKey: ["clients-actifs-count"],
    queryFn: async () => {
      const { count } = await supabase.from("prospects").select("*", { count: "exact", head: true }).in("statut", ["contacte", "visite", "offre"]);
      return count ?? 0;
    },
  });

  const { data: caMois = 0 } = useQuery({
    queryKey: ["ca-mois"],
    queryFn: async () => {
      const debutMois = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split("T")[0];
      const { data } = await supabase.from("sales").select("montant").gte("date_vente", debutMois);
      return (data || []).reduce((s: number, v: any) => s + Number(v.montant), 0);
    },
  });

  const { data: actions = [] } = useQuery({
    queryKey: ["dashboard-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("actions_recommandees")
        .select("id, titre, priorite, score_pertinence, type, donnees_contexte, risque_si_ignore, objectif")
        .eq("statut", "en_attente")
        .order("score_pertinence", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: hotProspects = [] } = useQuery({
    queryKey: ["hot-prospects-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("id, nom, score_ia, taux_signature, statut, derniere_interaction")
        .not("score_ia", "is", null)
        .order("score_ia", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: todayEvents = [] } = useQuery({
    queryKey: ["today-events"],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data } = await supabase
        .from("events")
        .select("id, titre, type, date_debut, lieu, client_id")
        .gte("date_debut", `${today}T00:00:00`)
        .lte("date_debut", `${today}T23:59:59`)
        .order("date_debut", { ascending: true })
        .limit(5);
      return data ?? [];
    },
  });

  const actionMutation = useMutation({
    mutationFn: async ({ id, statut }: { id: string; statut: string }) => {
      const { error } = await supabase.from("actions_recommandees").update({ statut }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["dashboard-actions"] });
      toast.success(lang === "fr" ? "Action mise à jour" : "Action updated");
    },
  });

  const caProgress = objectifCa > 0 ? Math.min(100, Math.round((caMois / objectifCa) * 100)) : 0;

  const alerts: { text: string; type: "warning" | "destructive" | "info"; action: () => void }[] = [];
  if (unreadCount >= 3) alerts.push({ text: `${unreadCount} ${lang === "fr" ? "messages non traités" : "unread messages"}`, type: "warning", action: () => navigate("/inbox") });
  if (actions.some((a: any) => a.priorite === "critique")) alerts.push({ text: lang === "fr" ? "Action critique non lancée" : "Critical action pending", type: "destructive", action: () => {} });
  if (oppsCount > 0) alerts.push({ text: `${oppsCount} ${lang === "fr" ? "opportunité" : "opportunit"}${oppsCount > 1 ? (lang === "fr" ? "s détectée" : "ies detected") : (lang === "fr" ? " détectée" : "y detected")}${oppsCount > 1 ? "s" : ""}`, type: "info", action: () => navigate("/radar") });

  const timeAgo = (d: string | null) => {
    if (!d) return "—";
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  const AI_SUGGESTIONS = [
    { label: lang === "fr" ? "Estimer un bien" : "Estimate property", icon: Search, action: () => navigate("/estimation") },
    { label: lang === "fr" ? "Rédiger une annonce" : "Write a listing", icon: FileText, action: () => navigate("/documents") },
    { label: lang === "fr" ? "Relancer des clients" : "Follow up clients", icon: Users, action: () => navigate("/copilote") },
    { label: lang === "fr" ? "Analyser des opportunités" : "Analyze opportunities", icon: BarChart3, action: () => navigate("/radar") },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">{t("dash.hello")} <span className="gradient-text">{displayName}</span> 👋</h1>
        <p className="page-subtitle">{t("dash.subtitle")}</p>
      </div>

      {/* AI Action Bar */}
      <div className="ai-action-bar mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">{lang === "fr" ? "Que voulez-vous faire aujourd'hui ?" : "What would you like to do today?"}</p>
            <p className="text-xs text-muted-foreground">{lang === "fr" ? "Votre assistant IA est prêt à vous aider" : "Your AI assistant is ready to help"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 cursor-pointer rounded-xl border border-border bg-secondary/50 px-4 py-3 mb-4 hover:border-primary/30 transition-colors" onClick={() => navigate("/copilote")}>
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">{t("copilote.placeholder")}</span>
        </div>
        <div className="flex flex-wrap gap-2">
          {AI_SUGGESTIONS.map(s => (
            <Button key={s.label} variant="outline" size="sm" className="gap-2 rounded-xl border-border hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all" onClick={s.action}>
              <s.icon className="h-3.5 w-3.5" />
              {s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Objectif CA with inline edit */}
        <Card className="bg-card border-border col-span-2 lg:col-span-1 card-shimmer rounded-2xl shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-primary" /> {t("dash.objectif_ca")}</p>
              <button
                className="h-6 w-6 rounded-md hover:bg-muted/20 flex items-center justify-center transition-colors"
                onClick={() => { setEditingCA(!editingCA); setCaInput(objectifCa.toString()); }}
                title={lang === "fr" ? "Modifier l'objectif" : "Edit goal"}
              >
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            {editingCA ? (
              <div className="mt-2 space-y-2">
                <NumberInput
                  value={caInput}
                  onChange={v => setCaInput(v)}
                  placeholder="50 000"
                  className="h-8 text-sm"
                  autoFocus
                  onKeyDown={e => { if (e.key === "Enter") updateCaMutation.mutate(Number(caInput)); if (e.key === "Escape") setEditingCA(false); }}
                />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] flex-1" onClick={() => updateCaMutation.mutate(Number(caInput))}>
                    <Check className="h-3 w-3 mr-1" /> OK
                  </Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingCA(false)}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold mt-2 text-foreground">{caMois.toLocaleString("fr-FR")}€</p>
                {objectifCa > 0 ? (
                  <>
                    <Progress value={caProgress} className="mt-3 h-1.5" />
                    <p className="text-[10px] text-muted-foreground mt-1.5">{caProgress}% {lang === "fr" ? "de" : "of"} {objectifCa.toLocaleString("fr-FR")}€</p>
                  </>
                ) : (
                  <p className="text-[10px] text-muted-foreground mt-2">
                    <button className="text-primary hover:underline" onClick={() => { setEditingCA(true); setCaInput(""); }}>{t("dash.define_objective")}</button>
                  </p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl shadow-sm card-shimmer" onClick={() => navigate("/clients")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Users className="h-3.5 w-3.5 text-primary" /> {t("dash.clients_actifs")}</p>
            <p className="text-2xl font-bold mt-2 text-foreground">{clientsActifs}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">{t("dash.see_clients")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl shadow-sm card-shimmer" onClick={() => navigate("/inbox")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Mail className="h-3.5 w-3.5 text-primary" /> {t("dash.inbox_unread")}</p>
            <p className={`text-2xl font-bold mt-2 ${unreadCount > 0 ? "text-warning" : "text-foreground"}`}>{unreadCount}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">{t("dash.open_inbox")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl shadow-sm card-shimmer" onClick={() => navigate("/radar")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><Radar className="h-3.5 w-3.5 text-primary" /> {t("dash.opportunities")}</p>
            <p className="text-2xl font-bold mt-2 text-foreground">{oppsCount}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">{t("dash.analyze")}</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl shadow-sm card-shimmer" onClick={() => navigate("/agenda")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5 text-primary" /> {t("dash.rdv_today")}</p>
            <p className="text-2xl font-bold mt-2 text-foreground">{todayEvents.length}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">{t("dash.see_agenda")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-8">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer hover:shadow-sm transition-all ${a.type === "destructive" ? "border-destructive/20 bg-destructive/5" : a.type === "warning" ? "border-warning/20 bg-warning/5" : "border-primary/20 bg-primary/5"}`} onClick={a.action}>
              <span className="text-xs font-medium flex items-center gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 ${a.type === "destructive" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-primary"}`} />
                {a.text}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* Actions recommandées + RDV du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> {t("dash.actions_title")}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/copilote")}>{t("common.copilote")} <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">{t("dash.no_actions")}</p>
            ) : (
              <div className="space-y-2">
                {actions.map((a: any) => (
                  <div key={a.id} className="bg-secondary/50 rounded-xl p-3.5 hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{a.titre}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge className={`text-[8px] px-1.5 py-0 ${a.priorite === "critique" ? "bg-destructive/10 text-destructive border-destructive/20" : a.priorite === "haute" ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground"}`}>{a.priorite}</Badge>
                          {(a.donnees_contexte as any)?.client_nom && <span className="text-[10px] text-muted-foreground">👤 {(a.donnees_contexte as any).client_nom}</span>}
                          {a.score_pertinence && <span className="text-[10px] text-muted-foreground">Impact: {a.score_pertinence}/100</span>}
                        </div>
                        {a.risque_si_ignore && <p className="text-[10px] text-destructive/70 mt-1">⚠️ {a.risque_si_ignore}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="default" className="h-7 w-7 rounded-lg" onClick={() => actionMutation.mutate({ id: a.id, statut: "lance" })} title={lang === "fr" ? "Lancer" : "Launch"}><Play className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => actionMutation.mutate({ id: a.id, statut: "reporte" })} title={lang === "fr" ? "Reporter" : "Postpone"}><SkipForward className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground" onClick={() => actionMutation.mutate({ id: a.id, statut: "ignore" })} title={lang === "fr" ? "Ignorer" : "Ignore"}><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> {t("dash.rdv_title")}</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/agenda")}>{t("common.agenda")} <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">{t("dash.no_rdv")}</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((evt: any) => (
                  <div key={evt.id} className="flex items-center gap-3 bg-secondary/50 rounded-xl p-3.5 cursor-pointer hover:bg-secondary transition-colors" onClick={() => navigate("/agenda")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate text-foreground">{evt.titre}</p>
                      <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(evt.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                        {evt.lieu && <span className="truncate">{evt.lieu}</span>}
                      </div>
                    </div>
                    <Badge variant="outline" className="text-[9px] shrink-0">{evt.type}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Prospects chauds */}
      <Card className="bg-card border-border rounded-2xl shadow-sm mb-8">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {t("dash.hot_prospects")}</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/clients")}>{t("dash.see_all")} <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {hotProspects.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">{t("dash.no_hot")}</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hotProspects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3.5 hover:bg-secondary transition-colors">
                  <button className="min-w-0 flex-1 text-left" onClick={() => navigate("/clients")}>
                    <p className="text-xs font-medium truncate text-foreground">{p.nom}</p>
                    <p className="text-[10px] text-muted-foreground mt-1 flex items-center gap-1">
                      <ScoreExplainer type="score_ia" value={p.score_ia} client={p}>
                        <span className="text-primary font-medium">{p.score_ia}/100</span>
                      </ScoreExplainer>
                      <span>•</span>
                      <ScoreExplainer type="taux_signature" value={p.taux_signature} client={p}>
                        <span>Signature: {p.taux_signature ?? 0}%</span>
                      </ScoreExplainer>
                    </p>
                  </button>
                  <TrendingUp className="h-4 w-4 text-primary shrink-0 ml-2" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Dashboard;
