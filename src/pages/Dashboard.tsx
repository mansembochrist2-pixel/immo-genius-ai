import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Bot, Zap, TrendingUp, ArrowRight, Target, X,
  Crosshair, Palette, Search, FileText, Sparkles, Info, Loader2, Radar as RadarIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useBusinessData } from "@/contexts/BusinessContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const InfoTip = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
        <button type="button" className="h-4 w-4 rounded-full inline-flex items-center justify-center text-muted-foreground/60 hover:text-primary hover:bg-primary/10 transition">
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { stats } = useBusinessData();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const [generatingActions, setGeneratingActions] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("zone_principale").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });


  const { data: actions = [] } = useQuery({
    queryKey: ["dashboard-actions"],
    queryFn: async () => {
      const { data } = await supabase
        .from("actions_recommandees")
        .select("id, titre, priorite, score_pertinence, type, donnees_contexte, risque_si_ignore, objectif")
        .eq("statut", "en_attente")
        .in("source_module", ["radar", "estimation_ia", "studio_ia"])
        .order("score_pertinence", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const { data: topOpps = [] } = useQuery({
    queryKey: ["dashboard-opps"],
    queryFn: async () => {
      const { data } = await supabase
        .from("opportunites")
        .select("id, titre, zone, score, created_at")
        .order("score", { ascending: false })
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

  const generateActions = async () => {
    if (generatingActions) return;
    setGeneratingActions(true);
    try {
      const businessContext = [
        `Opportunités Radar : ${stats.opportunites.total} analyses sauvegardées (top ${stats.opportunites.topScore}/100).`,
        `Modules autorisés pour les recommandations : Radar Prospection, Valorisation, Studio IA.`,
      ].join("\n");
      const { data, error } = await supabase.functions.invoke("generate-actions", { body: { businessContext } });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      if (data?.actions?.length && user) {
        const rows = data.actions.map((a: any) => ({
          user_id: user.id, titre: a.titre, type: a.type || "opportunite", priorite: a.priorite || "moyenne",
          score_pertinence: a.score_pertinence ?? 50, objectif: a.objectif, action_attendue: a.action_attendue,
          risque_si_ignore: a.risque_si_ignore, source_module: a.source_module, donnees_contexte: a,
        }));
        await supabase.from("actions_recommandees").insert(rows);
        queryClient.invalidateQueries({ queryKey: ["dashboard-actions"] });
        toast.success(`${rows.length} actions générées`);
      }
    } catch (e: any) {
      toast.error(e?.message || "Erreur génération");
    } finally {
      setGeneratingActions(false);
    }
  };


  const QUICK_ACTIONS = [
    { label: "Analyser une zone", icon: Search, action: () => navigate("/chasseur") },
    { label: "Estimer un bien", icon: TrendingUp, action: () => navigate("/valorisation/estimation") },
    { label: "Créer une annonce", icon: FileText, action: () => navigate("/studio") },
    { label: "Expertise valorisation", icon: Crosshair, action: () => navigate("/valorisation/expertise") },
  ];

  return (
    <AppLayout>
      <Dialog open={generatingActions}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-primary/30 [&>button]:hidden">
          <AnalysisLoader
            module="Actions recommandées"
            context="analyse de vos modules actifs"
            messages={[
              "Lecture des zones Radar enregistrées…",
              "Croisement avec vos estimations et annonces…",
              "Pondération par score de pertinence métier…",
              "Identification des priorités à fort impact…",
              "Rédaction des actions stratégiques personnalisées…",
            ]}
            eta="20 à 60 secondes"
          />
        </DialogContent>
      </Dialog>
      <div className="page-header">
        <h1 className="page-title">Bonjour <span className="gradient-text">{displayName}</span> 👋</h1>
        <p className="page-subtitle">Votre copilote IA travaille pour vous · {(profile as any)?.zone_principale || "Configurez votre zone dans Paramètres"}</p>
      </div>

      {/* AI Action Bar */}
      <div className="ai-action-bar mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Bot className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-base font-semibold text-foreground">Que voulez-vous transformer en mandat aujourd'hui ?</p>
            <p className="text-xs text-muted-foreground">Piges enregistrées, Radar, estimation, contenu — tout part de vos modules actifs.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {QUICK_ACTIONS.map(s => (
            <Button key={s.label} variant="outline" size="sm" className="gap-2 rounded-xl border-border hover:bg-primary/5 hover:border-primary/30 hover:text-primary transition-all" onClick={s.action}>
              <s.icon className="h-3.5 w-3.5" />{s.label}
            </Button>
          ))}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/chasseur")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <RadarIcon className="h-3.5 w-3.5 text-primary" /> Opportunités Radar
              <InfoTip>Zones analysées sauvegardées sur votre secteur.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground">{stats.opportunites.total}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">Analyser une zone →</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/valorisation/estimation")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-primary" /> Valorisation
              <InfoTip>Estimation DVF & expertise rentabilité.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground"><Target className="h-5 w-5 inline text-primary" /></p>
            <p className="text-[10px] text-primary mt-2 font-medium">Estimer →</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/studio")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Studio IA
              <InfoTip>Génération d'annonces et de mandats.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground"><Sparkles className="h-5 w-5 inline text-primary" /></p>
            <p className="text-[10px] text-primary mt-2 font-medium">Créer →</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions + Top Opportunités */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Actions recommandées</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={generateActions} disabled={generatingActions}>
                {generatingActions ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3 mr-1" />}
                Générer
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <div className="text-center py-6">
                <Bot className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic mb-3">Aucune action en attente.</p>
                <Button size="sm" variant="outline" className="text-xs" onClick={generateActions} disabled={generatingActions}>
                  {generatingActions ? <><Loader2 className="h-3 w-3 animate-spin mr-1" /> Génération…</> : <><Sparkles className="h-3 w-3 mr-1" /> Générer mes actions IA</>}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                {actions.map((a: any) => (
                  <div key={a.id} className="bg-secondary/50 rounded-xl p-3.5 hover:bg-secondary transition-colors">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{a.titre}</p>
                        <div className="flex items-center gap-2 mt-1.5">
                          <Badge className={`text-[8px] px-1.5 py-0 ${a.priorite === "critique" ? "bg-destructive/10 text-destructive border-destructive/20" : a.priorite === "haute" ? "bg-warning/10 text-warning border-warning/20" : "bg-muted text-muted-foreground"}`}>{a.priorite}</Badge>
                          {a.score_pertinence && <span className="text-[10px] text-muted-foreground">Impact: {a.score_pertinence}/100</span>}
                        </div>
                        {a.risque_si_ignore && <p className="text-[10px] text-destructive/70 mt-1">⚠️ {a.risque_si_ignore}</p>}
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive shrink-0"
                        title="Retirer cette action"
                        onClick={() => actionMutation.mutate({ id: a.id, statut: "ignore" })}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
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
              <CardTitle className="text-sm flex items-center gap-2"><RadarIcon className="h-4 w-4 text-primary" /> Top opportunités Radar</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/chasseur")}>Toutes <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {topOpps.length === 0 ? (
              <div className="text-center py-6">
                <RadarIcon className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic">Aucune opportunité enregistrée.</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => navigate("/chasseur")}>Ouvrir le Radar</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {topOpps.map((p: any, index: number) => (
                  <div key={p.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3 cursor-pointer hover:bg-secondary" onClick={() => navigate("/chasseur")}>
                    <Badge variant="outline" className="mr-2 h-6 w-6 p-0 justify-center shrink-0 text-[10px]">{index + 1}</Badge>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.titre}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.zone || "—"}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${(p.score || 0) >= 75 ? "bg-success/15 text-success border-success/30" : (p.score || 0) >= 50 ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground"}`}>
                      {p.score || 0}/100
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

    </AppLayout>
  );
};

export default Dashboard;
