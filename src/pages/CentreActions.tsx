import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Zap, AlertTriangle, Clock, Target, Play, CalendarClock, X, Loader2,
  TrendingUp, Users, Mail, Radar, RefreshCw, Shield,
} from "lucide-react";
import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";

const prioriteConfig: Record<string, { color: string; label: string }> = {
  critique: { color: "bg-destructive/20 text-destructive", label: "Critique" },
  haute: { color: "bg-warning/20 text-warning", label: "Haute" },
  moyenne: { color: "bg-info/20 text-info", label: "Moyenne" },
  basse: { color: "bg-muted text-muted-foreground", label: "Basse" },
};

const typeIcons: Record<string, typeof Zap> = {
  relance: Clock,
  rdv: CalendarClock,
  negociation: TrendingUp,
  alerte_risque: AlertTriangle,
  opportunite: Target,
  suivi: Users,
};

const sourceLabels: Record<string, string> = {
  inbox: "Inbox",
  clients: "Clients",
  radar: "Radar",
  ventes: "Ventes",
};

const CentreActions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: actions = [], isLoading } = useQuery({
    queryKey: ["actions-recommandees"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("actions_recommandees")
        .select("*")
        .neq("statut", "ignoree")
        .order("score_pertinence", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const updateAction = useMutation({
    mutationFn: async ({ id, statut, justification }: { id: string; statut: string; justification?: string }) => {
      const updates: any = { statut };
      if (justification) updates.justification_report = justification;
      const { error } = await supabase.from("actions_recommandees").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["actions-recommandees"] });
      toast.success("Action mise à jour");
    },
  });

  const generateActions = useCallback(async () => {
    if (!user) return;
    setIsGenerating(true);
    try {
      // Gather context from all modules
      const [prospectsRes, inboxRes, oppsRes, salesRes] = await Promise.all([
        supabase.from("prospects").select("nom, statut, score_ia, score_urgence, derniere_interaction, motivation, freins, taux_signature").order("updated_at", { ascending: false }).limit(15),
        supabase.from("inbox_messages").select("canal, sujet, contenu, intention, urgence, lu, repondu, created_at, direction").eq("direction", "entrant").order("created_at", { ascending: false }).limit(15),
        supabase.from("opportunites").select("titre, zone, score, type, description").order("score", { ascending: false }).limit(10),
        supabase.from("sales").select("montant, date_vente, description").order("date_vente", { ascending: false }).limit(5),
      ]);

      const ctx = [
        "👥 CLIENTS:",
        ...(prospectsRes.data || []).map((c: any) => `  • ${c.nom} (${c.statut}) — Score IA: ${c.score_ia ?? "?"}, Urgence: ${c.score_urgence ?? "?"}, Signature: ${c.taux_signature ?? "?"}%${c.derniere_interaction ? `, Dernière interaction: ${c.derniere_interaction}` : ""}`),
        "\n📬 INBOX (non traités):",
        ...(inboxRes.data || []).filter((m: any) => !m.repondu).map((m: any) => `  • [${m.canal}] ${m.sujet || m.contenu.slice(0, 80)}... | Urgence: ${m.urgence}/4 | ${m.lu ? "lu" : "NON LU"} | ${m.created_at}`),
        "\n🎯 OPPORTUNITÉS:",
        ...(oppsRes.data || []).map((o: any) => `  • ${o.titre} (${o.zone}) — Score: ${o.score}/100 — ${o.type}`),
        "\n💰 VENTES RÉCENTES:",
        ...(salesRes.data || []).map((v: any) => `  • ${Number(v.montant).toLocaleString("fr-FR")}€ — ${v.description || "?"} (${v.date_vente})`),
      ].join("\n");

      const { data, error } = await supabase.functions.invoke("generate-actions", {
        body: { businessContext: ctx },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Clear old pending actions and insert new ones
      await supabase.from("actions_recommandees").delete().eq("statut", "en_attente").eq("user_id", user.id);

      const newActions = (data.actions || []).map((a: any) => ({
        user_id: user.id,
        type: a.type || "suivi",
        titre: a.titre,
        objectif: a.objectif,
        action_attendue: a.action_attendue,
        risque_si_ignore: a.risque_si_ignore,
        priorite: a.priorite || "moyenne",
        score_pertinence: a.score_pertinence || 50,
        statut: "en_attente",
        source_module: a.source_module || "clients",
        date_suggeree: a.date_suggeree_delai_heures
          ? new Date(Date.now() + a.date_suggeree_delai_heures * 3600000).toISOString()
          : null,
        donnees_contexte: { client_nom: a.client_nom },
      }));

      if (newActions.length > 0) {
        const { error: insertErr } = await supabase.from("actions_recommandees").insert(newActions);
        if (insertErr) throw insertErr;
      }

      queryClient.invalidateQueries({ queryKey: ["actions-recommandees"] });
      toast.success(`${newActions.length} actions générées par l'IA`);
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de la génération");
    } finally {
      setIsGenerating(false);
    }
  }, [user, queryClient]);

  const critiques = actions.filter((a: any) => a.priorite === "critique" || a.score_pertinence >= 80);
  const hautes = actions.filter((a: any) => a.priorite === "haute" && a.score_pertinence < 80);
  const autres = actions.filter((a: any) => !["critique", "haute"].includes(a.priorite) && a.score_pertinence < 80);

  const renderAction = (action: any) => {
    const Icon = typeIcons[action.type] || Zap;
    const pConfig = prioriteConfig[action.priorite] || prioriteConfig.moyenne;
    const clientNom = (action.donnees_contexte as any)?.client_nom;

    return (
      <Card key={action.id} className="bg-card/60 border-border/30 hover:border-primary/30 transition-all">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-4 w-4 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium">{action.titre}</p>
                  <Badge className={`text-[9px] px-1.5 py-0 ${pConfig.color}`}>{pConfig.label}</Badge>
                  {action.source_module && (
                    <Badge variant="outline" className="text-[8px] px-1 py-0">{sourceLabels[action.source_module] || action.source_module}</Badge>
                  )}
                </div>
                {clientNom && <p className="text-xs text-primary/70 mt-0.5">👤 {clientNom}</p>}
                {action.objectif && <p className="text-xs text-muted-foreground mt-1">{action.objectif}</p>}
                {action.action_attendue && (
                  <p className="text-xs mt-1"><span className="text-muted-foreground">→</span> {action.action_attendue}</p>
                )}
                {action.risque_si_ignore && (
                  <p className="text-[11px] text-destructive/80 mt-1 flex items-center gap-1">
                    <Shield className="h-3 w-3" /> {action.risque_si_ignore}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground">
                  <span>Score: {action.score_pertinence}/100</span>
                  {action.date_suggeree && (
                    <span className="flex items-center gap-1">
                      <CalendarClock className="h-3 w-3" />
                      {new Date(action.date_suggeree).toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              <Button
                size="sm"
                className="h-7 text-xs gap-1"
                onClick={() => updateAction.mutate({ id: action.id, statut: "lancee" })}
              >
                <Play className="h-3 w-3" /> Lancer
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs gap-1"
                onClick={() => updateAction.mutate({ id: action.id, statut: "reportee", justification: "Reporté par l'agent" })}
              >
                <CalendarClock className="h-3 w-3" /> Reporter
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs gap-1 text-muted-foreground"
                onClick={() => {
                  const raison = prompt("Raison de l'ignorance :");
                  if (raison) updateAction.mutate({ id: action.id, statut: "ignoree", justification: raison });
                }}
              >
                <X className="h-3 w-3" /> Ignorer
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Zap className="h-7 w-7 text-primary" />
              Centre <span className="gradient-text">d'Actions</span>
            </h1>
            <p className="page-subtitle">Actions recommandées par l'IA — priorisées automatiquement</p>
          </div>
          <Button onClick={generateActions} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Analyser & Générer
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions critiques</p>
            <p className="text-2xl font-bold mt-1 text-destructive">{critiques.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Priorité haute</p>
            <p className="text-2xl font-bold mt-1 text-warning">{hautes.length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">En attente</p>
            <p className="text-2xl font-bold mt-1">{actions.filter((a: any) => a.statut === "en_attente").length}</p>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Lancées</p>
            <p className="text-2xl font-bold mt-1 text-success">{actions.filter((a: any) => a.statut === "lancee").length}</p>
          </CardContent>
        </Card>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : actions.length === 0 ? (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="py-16 text-center">
            <Zap className="h-14 w-14 text-muted-foreground/20 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">Aucune action en attente</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Cliquez sur « Analyser & Générer » pour que l'IA analyse vos données et recommande des actions.
            </p>
            <Button onClick={generateActions} disabled={isGenerating}>
              {isGenerating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Lancer l'analyse IA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {critiques.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <AlertTriangle className="h-4 w-4 text-destructive" /> Actions critiques
              </h2>
              <div className="space-y-3">{critiques.map(renderAction)}</div>
            </div>
          )}
          {hautes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Target className="h-4 w-4 text-warning" /> Priorité haute
              </h2>
              <div className="space-y-3">{hautes.map(renderAction)}</div>
            </div>
          )}
          {autres.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-muted-foreground" /> Autres actions
              </h2>
              <div className="space-y-3">{autres.map(renderAction)}</div>
            </div>
          )}
        </div>
      )}
    </AppLayout>
  );
};

export default CentreActions;
