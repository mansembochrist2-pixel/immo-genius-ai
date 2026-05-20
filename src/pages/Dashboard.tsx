import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NumberInput } from "@/components/ui/number-input";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import {
  Bot, Zap, TrendingUp, ArrowRight, Target, AlertTriangle, Play, SkipForward, X, DollarSign,
  Crosshair, Palette, Search, FileText, BarChart3, Phone, Pencil, Check, Sparkles, Info,
} from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { useBusinessData } from "@/contexts/BusinessContext";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { PerformanceWidget } from "@/components/dashboard/PerformanceWidget";

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

  const [editingCA, setEditingCA] = useState(false);
  const [caInput, setCaInput] = useState("");

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("objectif_ca, zone_principale").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const objectifCa = Number((profile as any)?.objectif_ca) || 0;

  const updateCaMutation = useMutation({
    mutationFn: async (value: number) => {
      const { error } = await supabase.from("profiles").update({ objectif_ca: value } as any).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile"] });
      setEditingCA(false);
      toast.success("Objectif mis à jour");
    },
  });

  const caMois = stats.sales.ceMois;
  const caTotal = stats.sales.montantTotal;
  const caProgress = objectifCa > 0 ? Math.min(100, Math.round((caMois / objectifCa) * 100)) : 0;

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

  const { data: topPige = [] } = useQuery({
    queryKey: ["dashboard-pige"],
    queryFn: async () => {
      const { data } = await supabase
        .from("annonces_pige")
        .select("id, titre, ville, prix, score_pigeabilite")
        .order("score_pigeabilite", { ascending: false })
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

  const QUICK_ACTIONS = [
    { label: "Nouvelle pige IA", icon: Phone, action: () => navigate("/chasseur?tab=pige") },
    { label: "Analyser une zone", icon: Search, action: () => navigate("/chasseur?tab=radar") },
    { label: "Estimer un bien", icon: TrendingUp, action: () => navigate("/estimation") },
    { label: "Créer une annonce", icon: FileText, action: () => navigate("/studio") },
    { label: "Coaching IA", icon: BarChart3, action: () => navigate("/copilote") },
  ];

  return (
    <AppLayout>
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
            <p className="text-base font-semibold text-foreground">Que voulez-vous conquérir aujourd'hui ?</p>
            <p className="text-xs text-muted-foreground">Pige, prospection, estimation, contenu — votre arme commerciale IA est prête.</p>
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <Card className="bg-card border-border col-span-2 lg:col-span-1 rounded-2xl shadow-sm">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5"><DollarSign className="h-3.5 w-3.5 text-primary" /> Objectif CA</p>
              <button className="h-6 w-6 rounded-md hover:bg-muted/20 flex items-center justify-center" onClick={() => { setEditingCA(!editingCA); setCaInput(objectifCa.toString()); }}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </button>
            </div>
            {editingCA ? (
              <div className="mt-2 space-y-2">
                <NumberInput value={caInput} onChange={v => setCaInput(v)} placeholder="50 000" className="h-8 text-sm" autoFocus
                  onKeyDown={e => { if (e.key === "Enter") updateCaMutation.mutate(Number(caInput)); if (e.key === "Escape") setEditingCA(false); }} />
                <div className="flex gap-1">
                  <Button size="sm" className="h-6 text-[10px] flex-1" onClick={() => updateCaMutation.mutate(Number(caInput))}><Check className="h-3 w-3 mr-1" /> OK</Button>
                  <Button size="sm" variant="ghost" className="h-6 text-[10px]" onClick={() => setEditingCA(false)}><X className="h-3 w-3" /></Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold mt-2 text-foreground">{caMois.toLocaleString("fr-FR")}€</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">ce mois · Total : {caTotal.toLocaleString("fr-FR")}€</p>
                {objectifCa > 0 ? (
                  <><Progress value={caProgress} className="mt-2 h-1.5" />
                  <p className="text-[10px] text-muted-foreground mt-1.5">{caProgress}% de {objectifCa.toLocaleString("fr-FR")}€</p></>
                ) : (
                  <p className="text-[10px] mt-2"><button className="text-primary hover:underline" onClick={() => { setEditingCA(true); setCaInput(""); }}>Définir objectif →</button></p>
                )}
              </>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/chasseur?tab=pige")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="h-3.5 w-3.5 text-primary" /> Annonces pigées
              <InfoTip>Nombre total d'annonces détectées par votre Pige IA et conservées dans votre vivier. +24h indique les nouvelles entrées depuis hier.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground">{stats.pige.total}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">+{stats.pige.nouvelles} en 24h →</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/chasseur?tab=pige")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Target className="h-3.5 w-3.5 text-primary" /> Score pigeabilité moyen
              <InfoTip>Moyenne des scores IA sur l'ensemble de vos annonces pigées. Le score combine type de vendeur, ancienneté, signaux de baisse, qualité de l'annonce et tension du secteur.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground">{stats.pige.scoreMoyen}<span className="text-sm text-muted-foreground">/100</span></p>
            <p className="text-[10px] text-primary mt-2 font-medium">Top {stats.pige.topScore} →</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/chasseur?tab=radar")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Crosshair className="h-3.5 w-3.5 text-primary" /> Opportunités Radar
              <InfoTip>Opportunités de prospection détectées sur votre secteur (zones tendues, biens à fort potentiel de mandat, signaux de marché).</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground">{stats.opportunites.total}</p>
            <p className="text-[10px] text-primary mt-2 font-medium">Analyser →</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-border cursor-pointer hover:shadow-md hover:border-primary/20 transition-all rounded-2xl" onClick={() => navigate("/studio")}>
          <CardContent className="p-5">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Palette className="h-3.5 w-3.5 text-primary" /> Studio IA
              <InfoTip>Génération d'annonces, posts réseaux, mandats et audits de comptes sociaux propulsés par l'IA.</InfoTip>
            </p>
            <p className="text-2xl font-bold mt-2 text-foreground"><Sparkles className="h-5 w-5 inline text-primary" /></p>
            <p className="text-[10px] text-primary mt-2 font-medium">Créer →</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions + Top Pige */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-card border-border rounded-2xl shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Actions recommandées</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/copilote")}>Copilote <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {actions.length === 0 ? (
              <p className="text-xs text-muted-foreground italic py-4 text-center">Aucune action en attente.</p>
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
                      <div className="flex items-center gap-1 shrink-0">
                        <Button size="icon" variant="default" className="h-7 w-7 rounded-lg" onClick={() => actionMutation.mutate({ id: a.id, statut: "lance" })}><Play className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg" onClick={() => actionMutation.mutate({ id: a.id, statut: "reporte" })}><SkipForward className="h-3 w-3" /></Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 rounded-lg text-muted-foreground" onClick={() => actionMutation.mutate({ id: a.id, statut: "ignore" })}><X className="h-3 w-3" /></Button>
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
              <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Top pige IA</CardTitle>
              <Button variant="ghost" size="sm" className="text-xs h-7 hover:text-primary" onClick={() => navigate("/chasseur?tab=pige")}>Toutes <ArrowRight className="h-3 w-3 ml-1" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            {topPige.length === 0 ? (
              <div className="text-center py-6">
                <Phone className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground italic">Aucune annonce pigée pour l'instant.</p>
                <Button size="sm" variant="outline" className="mt-3 text-xs" onClick={() => navigate("/chasseur?tab=pige")}>Lancer ma première pige</Button>
              </div>
            ) : (
              <div className="space-y-2">
                {topPige.map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-3 cursor-pointer hover:bg-secondary" onClick={() => navigate("/chasseur?tab=pige")}>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{p.titre}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{p.ville || "—"} {p.prix ? `· ${Number(p.prix).toLocaleString("fr-FR")} €` : ""}</p>
                    </div>
                    <Badge className={`text-[10px] shrink-0 ${(p.score_pigeabilite || 0) >= 75 ? "bg-success/15 text-success border-success/30" : (p.score_pigeabilite || 0) >= 50 ? "bg-warning/15 text-warning border-warning/30" : "bg-muted text-muted-foreground"}`}>
                      {p.score_pigeabilite || 0}/100
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Performance KPIs */}
      <PerformanceWidget />
    </AppLayout>
  );
};

export default Dashboard;
