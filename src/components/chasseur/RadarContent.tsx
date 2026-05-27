import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import {
  MapPin, TrendingUp, AlertTriangle, Sparkles, Target, ArrowRight,
  Radar as RadarIcon, Trash2, Play, Building2, Flame,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { RadarHeatmap } from "@/components/chasseur/RadarHeatmap";
import { SourcesFooter } from "@/components/SourcesFooter";

interface Analyse {
  prix_m2_moyen?: string;
  tendance?: string;
  liquidite?: string;
  delai_vente?: string;
  score_opportunite?: number;
  score_risque?: number;
  niveau_global?: string;
  classification?: "opportunite" | "risque";
  justification_score?: string;
  strategie?: string;
  analyse_strategique?: {
    resume_marche?: string;
    positionnement?: string;
    concurrence?: string;
    attractivite?: string;
  };
  opportunites?: string[];
  risques?: string[];
  plan_action?: { si_opportunite?: string[]; si_risque?: string[] };
  micro_secteurs?: { nom: string; niveau_opportunite: string; justification: string }[];
  profils_vendeurs_probables?: { type_bien: string; situation_probable: string; argument_approche: string }[];
  sources?: string[];
  fraicheur_donnees?: string;
  score_vendeur?: number;
  signaux_vendeurs?: string[];
  evolution_depuis_derniere?: string;
  dvf_raw?: any;
  dpe_degrades?: { nb_f: number; nb_g: number; sample?: string[]; total_echantillon?: number } | null;
}

interface OpportuniteRow {
  id: string;
  titre: string;
  zone: string | null;
  score: number | null;
  statut: string | null;
  created_at: string;
  donnees: any;
}

const scoreColor = (score?: number) => {
  if (score == null) return "text-muted-foreground";
  if (score >= 70) return "text-success";
  if (score >= 40) return "text-warning";
  return "text-destructive";
};

export const RadarContent = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [adresse, setAdresse] = useState("");
  const [secteur, setSecteur] = useState("prospection vendeurs");
  const [loading, setLoading] = useState(false);
  const [analyse, setAnalyse] = useState<Analyse | null>(null);
  const [opportunites, setOpportunites] = useState<OpportuniteRow[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data, error } = await supabase
        .from("opportunites")
        .select("id, titre, zone, score, statut, created_at, donnees")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (!error && data) setOpportunites(data as OpportuniteRow[]);
    })();
  }, [user, refreshKey]);

  const lancerAnalyse = async () => {
    if (!adresse.trim()) {
      toast({ title: "Adresse requise", description: "Indique une zone à analyser.", variant: "destructive" });
      return;
    }
    setLoading(true);
    setAnalyse(null);
    try {
      // Reprend la dernière analyse de la même zone pour comparaison
      const previous = opportunites.find((o) => (o.zone || "").toLowerCase() === adresse.trim().toLowerCase());
      const { data, error } = await supabase.functions.invoke("analyze-zone", {
        body: {
          adresse,
          secteur,
          previousAnalysis: previous?.donnees?.analyse ?? null,
          previousDate: previous?.created_at ?? null,
        },
      });
      if (error) throw error;
      const a = (data?.analyse || data) as Analyse;
      setAnalyse(a);

      // Sauvegarde en opportunite
      await supabase.from("opportunites").insert({
        user_id: user!.id,
        type: "zone",
        titre: `Radar — ${adresse}`,
        zone: adresse,
        description: a.strategie?.slice(0, 280) || null,
        score: Number(a.score_opportunite) || 0,
        donnees: { analyse: a, secteur } as any,
        sources: (a.sources || []).map((s) => ({ name: s })) as any,
        statut: "nouvelle",
      } as any);
      setRefreshKey((k) => k + 1);
      toast({ title: "Analyse terminée", description: "Zone enregistrée dans tes opportunités." });
    } catch (e: any) {
      console.error(e);
      toast({
        title: "Analyse impossible",
        description: e?.message || "Le service IA est temporairement indisponible.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const supprimer = async (id: string) => {
    await supabase.from("opportunites").delete().eq("id", id);
    setRefreshKey((k) => k + 1);
  };

  const envoyerAuCopilote = (opp: OpportuniteRow) => {
    sessionStorage.setItem(
      "copilote_context",
      JSON.stringify({
        type: "radar_opportunite",
        zone: opp.zone,
        titre: opp.titre,
        analyse: opp.donnees?.analyse ?? null,
      }),
    );
    navigate("/copilote");
  };

  return (
    <div className="space-y-6">
      {/* Input bar */}
      <Card className="border-primary/20">
        <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <RadarIcon className="h-4 w-4 text-primary" />
            Analyse stratégique d'une zone de prospection
          </div>
          <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3">
            <AddressAutocomplete
              value={adresse}
              onChange={setAdresse}
              placeholder="Adresse, quartier, ville..."
            />
            <Input
              placeholder="Cible (ex : appartements, maisons…)"
              value={secteur}
              onChange={(e) => setSecteur(e.target.value)}
              disabled={loading}
            />
            <Button onClick={lancerAnalyse} disabled={loading} className="gap-2">
              <Sparkles className="h-4 w-4" /> Analyser
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <AnalysisLoader
          module="Radar Prospection"
          context={adresse}
          messages={[
            "Récupération des données DVF (Etalab)…",
            "Analyse de la tension et des prix au m²…",
            "Détection des micro-secteurs et signaux vendeurs…",
            "Préparation de ton plan d'action…",
          ]}
          eta="30 à 90 secondes selon la charge"
        />
      )}

      {analyse && !loading && <AnalyseView analyse={analyse} />}

      {/* Historique */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4 text-primary" /> Opportunités sauvegardées
          </CardTitle>
        </CardHeader>
        <CardContent>
          {opportunites.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune analyse pour l'instant. Lance ta première analyse de zone ci-dessus.</p>
          ) : (
            <div className="grid gap-3">
              {opportunites.map((opp) => (
                <div
                  key={opp.id}
                  className="flex items-center justify-between gap-3 p-3 rounded-lg border border-border/70 hover:border-primary/30 bg-surface-1/40"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-3.5 w-3.5 text-primary shrink-0" />
                      <p className="text-sm font-medium truncate">{opp.titre}</p>
                      {opp.score != null && (
                        <Badge variant="outline" className={`ml-auto ${scoreColor(opp.score)}`}>
                          {opp.score}/100
                        </Badge>
                      )}
                    </div>
                    {opp.donnees?.analyse?.strategie && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{opp.donnees.analyse.strategie}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button size="sm" variant="ghost" onClick={() => setAnalyse(opp.donnees?.analyse)} title="Rouvrir">
                      <Play className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => envoyerAuCopilote(opp)} title="Envoyer au Copilote">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => supprimer(opp.id)} title="Supprimer">
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

const AnalyseView = ({ analyse }: { analyse: Analyse }) => {
  const opp = analyse.score_opportunite ?? 0;
  const risk = analyse.score_risque ?? 0;
  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {analyse.niveau_global || "Analyse de zone"}
          </span>
          {analyse.fraicheur_donnees && (
            <Badge variant="outline" className="text-[10px]">{analyse.fraicheur_donnees}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KPI label="Opportunité" value={`${opp}/100`} cls={scoreColor(opp)} icon={<TrendingUp className="h-3.5 w-3.5" />} />
          <KPI label="Risque" value={`${risk}/100`} cls={scoreColor(100 - risk)} icon={<AlertTriangle className="h-3.5 w-3.5" />} />
          <KPI label="Prix médian" value={analyse.prix_m2_moyen || "—"} icon={<Building2 className="h-3.5 w-3.5" />} />
          <KPI label="Liquidité" value={analyse.liquidite || "—"} icon={<TrendingUp className="h-3.5 w-3.5" />} />
        </div>

        {analyse.strategie && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-sm leading-relaxed">{analyse.strategie}</p>
          </div>
        )}

        <Tabs defaultValue="actions">
          <TabsList className="grid grid-cols-4 max-w-xl">
            <TabsTrigger value="actions">Plan d'action</TabsTrigger>
            <TabsTrigger value="zones">Micro-secteurs</TabsTrigger>
            <TabsTrigger value="profils">Profils vendeurs</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          <TabsContent value="actions" className="space-y-3 mt-4">
            {analyse.plan_action?.si_opportunite?.length ? (
              <List title="Si opportunité — actions terrain" items={analyse.plan_action.si_opportunite} tone="success" />
            ) : null}
            {analyse.plan_action?.si_risque?.length ? (
              <List title="Si risque — actions prudence" items={analyse.plan_action.si_risque} tone="warning" />
            ) : null}
          </TabsContent>

          <TabsContent value="zones" className="space-y-2 mt-4">
            {(analyse.micro_secteurs || []).map((m, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">{m.nom}</p>
                  <Badge variant="outline" className="text-[10px] capitalize">{m.niveau_opportunite}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{m.justification}</p>
              </div>
            ))}
            {!analyse.micro_secteurs?.length && <p className="text-sm text-muted-foreground">Aucun micro-secteur identifié.</p>}
          </TabsContent>

          <TabsContent value="profils" className="space-y-2 mt-4">
            {(analyse.profils_vendeurs_probables || []).map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
                <p className="text-sm font-medium">{p.type_bien}</p>
                <p className="text-xs text-muted-foreground mt-1"><strong>Situation :</strong> {p.situation_probable}</p>
                <p className="text-xs text-muted-foreground"><strong>Approche :</strong> {p.argument_approche}</p>
              </div>
            ))}
            {!analyse.profils_vendeurs_probables?.length && <p className="text-sm text-muted-foreground">Aucun profil détecté.</p>}
          </TabsContent>

          <TabsContent value="sources" className="space-y-1 mt-4">
            {(analyse.sources || []).map((s, i) => (
              <p key={i} className="text-xs text-muted-foreground">• {s}</p>
            ))}
            {analyse.justification_score && (
              <p className="text-xs text-muted-foreground mt-3"><strong>Justification :</strong> {analyse.justification_score}</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

const KPI = ({ label, value, cls, icon }: { label: string; value: string; cls?: string; icon?: React.ReactNode }) => (
  <div className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon} {label}
    </div>
    <p className={`text-lg font-display font-semibold mt-1 ${cls ?? ""}`}>{value}</p>
  </div>
);

const List = ({ title, items, tone }: { title: string; items: string[]; tone: "success" | "warning" }) => (
  <div>
    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">{title}</p>
    <ul className="space-y-1.5">
      {items.map((it, i) => (
        <li key={i} className="flex gap-2 text-sm">
          <span className={tone === "success" ? "text-success" : "text-warning"}>•</span>
          <span>{it}</span>
        </li>
      ))}
    </ul>
  </div>
);
