import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Mail, Bot, Users, Zap, TrendingUp, ArrowRight, Target,
  AlertTriangle, Play, CalendarDays, Clock, SkipForward, X, DollarSign, Radar,
} from "lucide-react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  // Profile (for objectif_ca)
  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("objectif_ca").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const objectifCa = Number(profile?.objectif_ca) || 0;

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
      toast.success("Action mise à jour");
    },
  });

  // CA progress
  const caProgress = objectifCa > 0 ? Math.min(100, Math.round((caMois / objectifCa) * 100)) : 0;

  // Alerts
  const alerts: { text: string; type: "warning" | "destructive" | "info"; action: () => void }[] = [];
  if (unreadCount >= 3) alerts.push({ text: `${unreadCount} messages non traités`, type: "warning", action: () => navigate("/inbox") });
  if (actions.some((a: any) => a.priorite === "critique")) alerts.push({ text: "Action critique non lancée", type: "destructive", action: () => {} });
  if (oppsCount > 0) alerts.push({ text: `${oppsCount} opportunité${oppsCount > 1 ? "s" : ""} détectée${oppsCount > 1 ? "s" : ""}`, type: "info", action: () => navigate("/radar") });

  const timeAgo = (d: string | null) => {
    if (!d) return "—";
    const diff = Date.now() - new Date(d).getTime();
    const hrs = Math.floor(diff / 3600000);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Bonjour, <span className="gradient-text">{displayName}</span> 👋</h1>
        <p className="page-subtitle">Qu'est-ce que vous devez faire aujourd'hui pour avancer votre business ?</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* Objectif CA */}
        <Card className="bg-card/60 border-border/30 col-span-2 lg:col-span-1 card-shimmer">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="h-3 w-3" /> Objectif CA</p>
            <p className="text-xl font-bold mt-1">{caMois.toLocaleString("fr-FR")}€</p>
            {objectifCa > 0 ? (
              <>
                <Progress value={caProgress} className="mt-2 h-1.5" />
                <p className="text-[10px] text-muted-foreground mt-1">{caProgress}% de {objectifCa.toLocaleString("fr-FR")}€</p>
              </>
            ) : (
              <p className="text-[10px] text-muted-foreground mt-1">
                <button className="text-primary hover:underline" onClick={() => navigate("/settings")}>Définir objectif →</button>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Clients actifs */}
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/clients")}>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Users className="h-3 w-3" /> Clients actifs</p>
            <p className="text-xl font-bold mt-1">{clientsActifs}</p>
            <p className="text-[10px] text-primary mt-1">Voir les fiches →</p>
          </CardContent>
        </Card>

        {/* Inbox non lus */}
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/inbox")}>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Mail className="h-3 w-3" /> Inbox non lus</p>
            <p className={`text-xl font-bold mt-1 ${unreadCount > 0 ? "text-warning" : ""}`}>{unreadCount}</p>
            <p className="text-[10px] text-primary mt-1">Ouvrir l'inbox →</p>
          </CardContent>
        </Card>

        {/* Opportunités */}
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/copilote")}>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Radar className="h-3 w-3" /> Opportunités</p>
            <p className="text-xl font-bold mt-1">{oppsCount}</p>
            <p className="text-[10px] text-primary mt-1">Analyser →</p>
          </CardContent>
        </Card>

        {/* RDV du jour count */}
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/agenda")}>
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><CalendarDays className="h-3 w-3" /> RDV aujourd'hui</p>
            <p className="text-xl font-bold mt-1">{todayEvents.length}</p>
            <p className="text-[10px] text-primary mt-1">Voir l'agenda →</p>
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 mb-6">
          {alerts.map((a, i) => (
            <div key={i} className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer hover:bg-muted/10 transition-colors ${a.type === "destructive" ? "border-destructive/30 bg-destructive/5" : a.type === "warning" ? "border-warning/30 bg-warning/5" : "border-info/30 bg-info/5"}`} onClick={a.action}>
              <span className="text-xs font-medium flex items-center gap-2">
                <AlertTriangle className={`h-3.5 w-3.5 ${a.type === "destructive" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"}`} />
                {a.text}
              </span>
              <ArrowRight className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
          ))}
        </div>
      )}

      {/* Actions recommandées + RDV du jour */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Actions recommandées</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/copilote")}>Copilote <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Aucune action en attente. Utilisez le Copilote pour en générer.</p>
            ) : (
              <div className="space-y-2">
                {actions.map((a: any) => (
                  <div key={a.id} className="bg-muted/10 rounded-lg p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium">{a.titre}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-[8px] px-1 py-0 ${a.priorite === "critique" ? "bg-destructive/20 text-destructive" : a.priorite === "haute" ? "bg-warning/20 text-warning" : "bg-muted/30 text-muted-foreground"}`}>{a.priorite}</Badge>
                          {(a.donnees_contexte as any)?.client_nom && <span className="text-[10px] text-muted-foreground">👤 {(a.donnees_contexte as any).client_nom}</span>}
                          {a.score_pertinence && <span className="text-[10px] text-muted-foreground">Impact: {a.score_pertinence}/100</span>}
                        </div>
                        {a.risque_si_ignore && <p className="text-[10px] text-destructive/70 mt-1">⚠️ {a.risque_si_ignore}</p>}
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="default" className="h-7 w-7" onClick={() => actionMutation.mutate({ id: a.id, statut: "lance" })} title="Lancer"><Play className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => actionMutation.mutate({ id: a.id, statut: "reporte" })} title="Reporter"><SkipForward className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={() => actionMutation.mutate({ id: a.id, statut: "ignore" })} title="Ignorer"><X className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><CalendarDays className="h-4 w-4 text-primary" /> Rendez-vous du jour</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/agenda")}>Agenda <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {todayEvents.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Rien de prévu aujourd'hui</p>
            ) : (
              <div className="space-y-2">
                {todayEvents.map((evt: any) => (
                  <div key={evt.id} className="flex items-center gap-3 bg-muted/10 rounded-lg p-3 cursor-pointer hover:bg-muted/20" onClick={() => navigate("/agenda")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{evt.titre}</p>
                      <div className="flex items-center gap-2 mt-0.5 text-[10px] text-muted-foreground">
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
      <Card className="bg-card/60 border-border/30 mb-6">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Prospects chauds</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/clients")}>Voir tout <ArrowRight className="h-3 w-3 ml-1" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          {hotProspects.length === 0 ? (
            <p className="text-xs text-muted-foreground italic py-4 text-center">Aucun prospect chaud. Enrichissez vos fiches clients avec l'IA.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {hotProspects.map((p: any) => (
                <div key={p.id} className="flex items-center justify-between bg-muted/10 rounded-lg p-3 cursor-pointer hover:bg-muted/20" onClick={() => navigate("/clients")}>
                  <div className="min-w-0">
                    <p className="text-xs font-medium truncate">{p.nom}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      <span className="text-primary font-medium">{p.score_ia}/100</span> • Signature: {p.taux_signature ?? 0}%
                    </p>
                    <p className="text-[10px] text-muted-foreground">Dernière interaction: {timeAgo(p.derniere_interaction)}</p>
                  </div>
                  <Badge variant="outline" className="text-[9px] shrink-0">{p.statut}</Badge>
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
