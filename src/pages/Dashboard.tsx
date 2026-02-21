import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Mail, Bot, Radar, Users, Zap, TrendingUp, ArrowRight, Target,
  AlertTriangle, Play, Shield, BarChart3, Clock, Loader2,
} from "lucide-react";
import { useState, useCallback } from "react";
import { toast } from "sonner";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["client-count"],
    queryFn: async () => {
      const { count } = await supabase.from("prospects").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: salesTotal = 0 } = useQuery({
    queryKey: ["sales-total"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("montant");
      return data?.reduce((sum: number, s: any) => sum + Number(s.montant), 0) ?? 0;
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
      const { count } = await supabase.from("opportunites").select("*", { count: "exact", head: true }).eq("type", "opportunite");
      return count ?? 0;
    },
  });

  const { data: criticalActions = [] } = useQuery({
    queryKey: ["critical-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("actions_recommandees")
        .select("id, titre, priorite, score_pertinence, type, donnees_contexte")
        .eq("statut", "en_attente")
        .order("score_pertinence", { ascending: false })
        .limit(3);
      return data ?? [];
    },
  });

  const { data: hotProspects = [] } = useQuery({
    queryKey: ["hot-prospects-dash"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("id, nom, score_ia, taux_signature, statut")
        .gte("score_ia", 60)
        .order("score_ia", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  // Business Index calculation
  const [showDetail, setShowDetail] = useState(false);
  const { data: businessIndex } = useQuery({
    queryKey: ["business-index"],
    queryFn: async () => {
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      
      const [salesMonth, prospectsActive, messagesNonLus, oppsNonTraitees, prospectsInactifs] = await Promise.all([
        supabase.from("sales").select("montant").gte("date_vente", debutMois.split("T")[0]),
        supabase.from("prospects").select("*", { count: "exact", head: true }).in("statut", ["contacte", "visite", "offre"]),
        supabase.from("inbox_messages").select("*", { count: "exact", head: true }).eq("lu", false).eq("direction", "entrant"),
        supabase.from("opportunites").select("*", { count: "exact", head: true }).eq("statut", "nouvelle"),
        supabase.from("prospects").select("*", { count: "exact", head: true }).in("statut", ["nouveau", "contacte"]).lt("updated_at", new Date(Date.now() - 7 * 86400000).toISOString()),
      ]);

      const caMois = (salesMonth.data || []).reduce((s: number, v: any) => s + Number(v.montant), 0);
      const actifs = prospectsActive.count ?? 0;
      const nonLus = messagesNonLus.count ?? 0;
      const nonTraitees = oppsNonTraitees.count ?? 0;
      const inactifs = prospectsInactifs.count ?? 0;

      // Scoring: higher is better
      const scoreReactivite = Math.max(0, 100 - nonLus * 15);
      const scoreOpps = Math.max(0, 100 - nonTraitees * 10);
      const scoreActifs = Math.min(100, actifs * 20);
      const scoreInactifs = Math.max(0, 100 - inactifs * 15);
      const index = Math.round((scoreReactivite + scoreOpps + scoreActifs + scoreInactifs) / 4);

      return {
        index, caMois, actifs, nonLus, nonTraitees, inactifs,
        scoreReactivite, scoreOpps, scoreActifs, scoreInactifs,
      };
    },
  });

  const indexColor = (businessIndex?.index ?? 0) >= 70 ? "text-success" : (businessIndex?.index ?? 0) >= 40 ? "text-warning" : "text-destructive";

  const MODULES = [
    { title: "Centre d'Actions", description: "Actions IA recommandées", icon: Zap, route: "/actions", stat: `${criticalActions.length} actions`, statColor: criticalActions.length > 0 ? "text-warning" : "text-success" },
    { title: "Inbox Intelligence", description: "Messages analysés par l'IA", icon: Mail, route: "/inbox", stat: `${unreadCount} non lus`, statColor: unreadCount > 0 ? "text-warning" : "text-success" },
    { title: "Copilote IA", description: "Assistant stratégique", icon: Bot, route: "/copilote", stat: "Actif", statColor: "text-success" },
    { title: "Radar Stratégique", description: "Opportunités & Plans d'attaque", icon: Radar, route: "/radar", stat: `${oppsCount} opportunités`, statColor: "text-primary" },
    { title: "Mémoire Client", description: "Profils intelligents", icon: Users, route: "/clients", stat: `${clientCount} clients`, statColor: "text-muted-foreground" },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">
          Bonjour, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p className="page-subtitle">Votre copilote immobilier stratégique</p>
      </div>

      {/* Business Index + KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        <Card
          className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all col-span-2 lg:col-span-1"
          onClick={() => setShowDetail(!showDetail)}
        >
          <CardContent className="p-4 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Indice Business</p>
            <p className={`text-3xl font-bold mt-1 ${indexColor}`}>{businessIndex?.index ?? "—"}</p>
            <p className="text-[10px] text-muted-foreground mt-1">/ 100 ce mois</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA ce mois</p>
            <p className="text-xl font-bold mt-1">{(businessIndex?.caMois ?? 0).toLocaleString("fr-FR")}€</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clients actifs</p>
            <p className="text-xl font-bold mt-1">{businessIndex?.actifs ?? 0}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inbox non lus</p>
            <p className={`text-xl font-bold mt-1 ${unreadCount > 0 ? "text-warning" : ""}`}>{unreadCount}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opportunités</p>
            <p className="text-xl font-bold mt-1">{oppsCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Business Index Detail Panel */}
      {showDetail && businessIndex && (
        <Card className="mb-6 bg-card/60 border-primary/20 glow-border">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <BarChart3 className="h-4 w-4 text-primary" /> Détail Indice Business
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: "Réactivité inbox", value: businessIndex.scoreReactivite, detail: `${businessIndex.nonLus} non lus` },
                { label: "Opps. traitées", value: businessIndex.scoreOpps, detail: `${businessIndex.nonTraitees} en attente` },
                { label: "Pipeline actif", value: businessIndex.scoreActifs, detail: `${businessIndex.actifs} actifs` },
                { label: "Relances", value: businessIndex.scoreInactifs, detail: `${businessIndex.inactifs} inactifs` },
              ].map((item) => (
                <div key={item.label} className="bg-muted/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className={`text-lg font-bold mt-1 ${item.value >= 70 ? "text-success" : item.value >= 40 ? "text-warning" : "text-destructive"}`}>
                    {item.value}/100
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{item.detail}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Critical actions + hot prospects */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recommandation IA prioritaire */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> Actions recommandées
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/actions")}>
                Voir tout <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {criticalActions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Aucune action en attente. Allez au Centre d'Actions pour en générer.
              </p>
            ) : (
              <div className="space-y-2">
                {criticalActions.map((a: any) => (
                  <div key={a.id} className="flex items-center justify-between bg-muted/10 rounded-lg p-3">
                    <div className="min-w-0">
                      <p className="text-xs font-medium truncate">{a.titre}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge className={`text-[8px] px-1 py-0 ${a.priorite === "critique" ? "bg-destructive/20 text-destructive" : "bg-warning/20 text-warning"}`}>
                          {a.priorite}
                        </Badge>
                        {(a.donnees_contexte as any)?.client_nom && (
                          <span className="text-[10px] text-muted-foreground">👤 {(a.donnees_contexte as any).client_nom}</span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" className="h-7 text-xs shrink-0" onClick={() => navigate("/actions")}>
                      <Play className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Hot prospects */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" /> Prospects chauds
              </CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7" onClick={() => navigate("/clients")}>
                Voir tout <ArrowRight className="h-3 w-3 ml-1" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {hotProspects.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">
                Aucun prospect chaud. Enrichissez vos fiches clients avec l'IA.
              </p>
            ) : (
              <div className="space-y-2">
                {hotProspects.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-muted/10 rounded-lg p-3 cursor-pointer hover:bg-muted/20" onClick={() => navigate("/clients")}>
                    <div>
                      <p className="text-xs font-medium">{p.nom}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Score: {p.score_ia}/100 • Signature: {p.taux_signature ?? 0}%</p>
                    </div>
                    <Badge variant="outline" className="text-[9px]">{p.statut}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <Card
              key={mod.title}
              className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all group"
              onClick={() => navigate(mod.route)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <mod.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className={`text-[10px] ${mod.statColor}`}>
                    {mod.stat}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
