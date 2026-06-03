import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import {
  MapPin, TrendingUp, AlertTriangle, Sparkles, Target, ArrowRight,
  Radar as RadarIcon, Trash2, Play, Building2, Flame, Info, Mail,
  Printer, Copy, Loader2, CheckCircle2, XCircle,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { RadarHeatmap } from "@/components/chasseur/RadarHeatmap";
import { SourcesFooter } from "@/components/SourcesFooter";

interface Vente {
  date_mutation?: string;
  type_local?: string;
  surface_reelle_bati?: number;
  valeur_fonciere?: number;
  prix_m2?: number;
  adresse_numero?: string | number;
  adresse_nom_voie?: string;
}

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

// === Couleurs binaires : vert (bon) / rouge (mauvais) — pas d'orange ===
// Pour un score "bénéfice" (opportunité, score vendeur) : haut = vert, bas = rouge
const goodScoreColor = (score?: number) => {
  if (score == null) return "text-muted-foreground";
  return score >= 50 ? "text-success" : "text-destructive";
};
// Pour un score "danger" (risque) : haut = rouge, bas = vert
const dangerScoreColor = (score?: number) => {
  if (score == null) return "text-muted-foreground";
  return score >= 50 ? "text-destructive" : "text-success";
};
// Pour liquidité texte
const liquiditeColor = (txt?: string) => {
  if (!txt) return "text-muted-foreground";
  const v = txt.toLowerCase();
  if (v.includes("élev") || v.includes("eleve") || v.includes("fort")) return "text-success";
  if (v.includes("faible") || v.includes("bloq")) return "text-destructive";
  return "text-foreground";
};

// === Glossaire — explication de CHAQUE indicateur pour donner confiance ===
const EXPLAINERS = {
  opportunite:
    "Score 0-100 du potentiel commercial pour décrocher des mandats. Calculé à partir du volume de ventes récentes, de la dynamique des prix, de la cohérence des transactions et de la liquidité observée sur les données DVF (data.gouv.fr / Etalab). ≥50 = zone porteuse, <50 = zone à fort ralentissement.",
  risque:
    "Score 0-100 des risques marché : faible volume de ventes, baisse de prix, zone peu attractive, marché bloqué. Plus c'est haut, plus c'est risqué. Ce score sert à pondérer ton effort commercial.",
  score_vendeur:
    "Probabilité (0-100) qu'il existe des vendeurs potentiels mobilisables dans la zone. Signaux pris en compte : baisse des prix, faible liquidité, délais longs, biens anciens, dispersion des prix, DPE dégradés. ≥50 = bon vivier de mandats, <50 = peu de vendeurs activables.",
  prix_median:
    "Prix médian au m² extrait des transactions DVF récentes (18 derniers mois) sur la parcelle élargie. Source officielle data.gouv.fr / Etalab. Pondéré par la fraîcheur (<3 mois = poids fort).",
  liquidite:
    "Vitesse à laquelle les biens se vendent dans le secteur. Élevée = marché tendu, vendeur en position de force. Faible = marché lent, biens qui restent longtemps en vitrine — opportunité d'aller chercher les propriétaires fatigués.",
  niveau_global:
    "Classement global de la zone : Très forte opportunité / Opportunité / Neutre / Risque / Risque élevé. Calculé déterministiquement par (score opportunité − score risque).",
  plan_action:
    "3 à 5 actions terrain concrètes à mener dès cette semaine. Filtrées selon le profil dominant de la zone (opportunité ou risque).",
  signaux_vendeurs:
    "Signaux marché objectifs qui indiquent la présence probable de vendeurs activables. Aucun nom propre, uniquement des tendances statistiques.",
  micro_secteurs:
    "Rues, résidences ou ilôts précis où concentrer la prospection. Hiérarchisés selon le potentiel mandat.",
  profils_vendeurs:
    "Typologies de propriétaires probablement vendeurs (succession, mutation, investisseur revente…). JAMAIS de noms — uniquement des probabilités de marché.",
  dpe:
    "Biens avec étiquette énergétique F ou G (passoires thermiques) recensés par l'ADEME dans le secteur. La loi Climat & Résilience interdit progressivement leur location (G en 2025, F en 2028) — beaucoup de propriétaires vont vouloir vendre avant.",
};

const InfoBadge = ({ text }: { text: string }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        className="inline-flex items-center justify-center h-4 w-4 rounded-full border border-muted-foreground/40 text-muted-foreground hover:text-primary hover:border-primary/60 transition-colors"
        aria-label="Explication"
      >
        <Info className="h-2.5 w-2.5" />
      </button>
    </TooltipTrigger>
    <TooltipContent side="top" className="max-w-xs text-xs leading-relaxed">
      {text}
    </TooltipContent>
  </Tooltip>
);

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

  const envoyerEnEstimation = (opp: OpportuniteRow) => {
    sessionStorage.setItem(
      "estimation_prefill_from_radar",
      JSON.stringify({ adresse: opp.zone, titre: opp.titre }),
    );
    navigate("/valorisation");
  };

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-6">
        {/* Input bar */}
        <Card className="border-primary/20">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RadarIcon className="h-4 w-4 text-primary" />
              Analyse stratégique d'une zone de prospection
            </div>
            <div className="grid md:grid-cols-[2fr_1fr_auto] gap-3">
              <AddressAutocomplete value={adresse} onChange={setAdresse} placeholder="Adresse, quartier, ville..." />
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

        {analyse && !loading && <AnalyseView analyse={analyse} adresseSource={adresse} />}

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
                          <Badge variant="outline" className={`ml-auto ${goodScoreColor(opp.score)}`}>
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
                      <Button size="sm" variant="ghost" onClick={() => envoyerEnEstimation(opp)} title="Lancer une estimation sur cette zone">
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
    </TooltipProvider>
  );
};

// =========================================================================

const AnalyseView = ({ analyse, adresseSource }: { analyse: Analyse; adresseSource: string }) => {
  const opp = analyse.score_opportunite ?? 0;
  const risk = analyse.score_risque ?? 0;
  const isOpportunity = analyse.classification === "opportunite";

  // Courrier dialog state
  const [courrierOpen, setCourrierOpen] = useState(false);
  const [courrierCible, setCourrierCible] = useState<{ adresse: string; profil?: any } | null>(null);

  const openCourrier = (cibleAdresse: string, profil?: any) => {
    setCourrierCible({ adresse: cibleAdresse, profil });
    setCourrierOpen(true);
  };

  // Plan d'action filtré : priorité au profil dominant, pas de duplication
  const actionsPrioritaires = useMemo(() => {
    const primary = isOpportunity
      ? analyse.plan_action?.si_opportunite || []
      : analyse.plan_action?.si_risque || [];
    return primary.slice(0, 5);
  }, [analyse, isOpportunity]);

  return (
    <Card className="border-primary/30">
      <CardHeader>
        <CardTitle className="flex items-center justify-between text-base">
          <span className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            {analyse.niveau_global || "Analyse de zone"}
            <InfoBadge text={EXPLAINERS.niveau_global} />
          </span>
          {analyse.fraicheur_donnees && (
            <Badge variant="outline" className="text-[10px]">{analyse.fraicheur_donnees}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* KPIs avec explication sur chaque */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <KPI
            label="Opportunité"
            value={`${opp}/100`}
            cls={goodScoreColor(opp)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            help={EXPLAINERS.opportunite}
          />
          <KPI
            label="Risque"
            value={`${risk}/100`}
            cls={dangerScoreColor(risk)}
            icon={<AlertTriangle className="h-3.5 w-3.5" />}
            help={EXPLAINERS.risque}
          />
          <KPI
            label="Score vendeur"
            value={analyse.score_vendeur != null ? `${analyse.score_vendeur}/100` : "—"}
            cls={goodScoreColor(analyse.score_vendeur)}
            icon={<Target className="h-3.5 w-3.5" />}
            help={EXPLAINERS.score_vendeur}
          />
          <KPI
            label="Prix médian"
            value={analyse.prix_m2_moyen || "—"}
            icon={<Building2 className="h-3.5 w-3.5" />}
            help={EXPLAINERS.prix_median}
          />
          <KPI
            label="Liquidité"
            value={analyse.liquidite || "—"}
            cls={liquiditeColor(analyse.liquidite)}
            icon={<TrendingUp className="h-3.5 w-3.5" />}
            help={EXPLAINERS.liquidite}
          />
        </div>

        {analyse.strategie && (
          <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
            <p className="text-[10px] uppercase tracking-wider text-primary/70 mb-1">Synthèse stratégique</p>
            <p className="text-sm leading-relaxed">{analyse.strategie}</p>
          </div>
        )}

        {analyse.evolution_depuis_derniere && (
          <div className="p-3 rounded-lg bg-accent/5 border border-accent/20">
            <p className="text-[10px] uppercase tracking-wider text-accent mb-1">Évolution depuis la dernière analyse</p>
            <p className="text-sm leading-relaxed">{analyse.evolution_depuis_derniere}</p>
          </div>
        )}

        {/* Heatmap MapLibre + OSM */}
        {analyse.dvf_raw?.center && (
          <RadarHeatmap
            center={analyse.dvf_raw.center}
            points={analyse.dvf_raw.heatmap_points || []}
            prixMedian={analyse.dvf_raw.prix_m2_median}
          />
        )}

        {/* DPE F/G — pression réglementaire vendeur */}
        {analyse.dpe_degrades && (analyse.dpe_degrades.nb_f > 0 || analyse.dpe_degrades.nb_g > 0) && (
          <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Flame className="h-4 w-4 text-destructive" />
              Signal vendeur fort — Pression DPE F/G (passoires thermiques)
              <InfoBadge text={EXPLAINERS.dpe} />
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              <strong>{analyse.dpe_degrades.nb_f}</strong> biens DPE F · <strong>{analyse.dpe_degrades.nb_g}</strong> biens DPE G recensés (ADEME).
              Ces propriétaires sont sous pression réglementaire — opportunité directe de mandats.
            </p>
            {analyse.dpe_degrades.sample && analyse.dpe_degrades.sample.length > 0 && (
              <div className="mt-2 space-y-1">
                {analyse.dpe_degrades.sample.slice(0, 3).map((adr, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-2 rounded bg-background/60 border border-border/40">
                    <span className="text-xs truncate">{adr}</span>
                    <Button size="sm" variant="ghost" className="h-6 gap-1 text-[11px]" onClick={() => openCourrier(adr)}>
                      <Mail className="h-3 w-3" /> Courrier
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Signaux vendeurs */}
        {analyse.signaux_vendeurs && analyse.signaux_vendeurs.length > 0 && (
          <div className="p-3 rounded-lg border border-primary/20 bg-surface-1/40">
            <p className="text-[10px] uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
              Signaux vendeurs détectés <InfoBadge text={EXPLAINERS.signaux_vendeurs} />
            </p>
            <div className="flex flex-wrap gap-1.5">
              {analyse.signaux_vendeurs.map((s, i) => (
                <Badge key={i} variant="outline" className="text-[10px] border-success/40 text-success">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <Tabs defaultValue="actions">
          <TabsList className="grid grid-cols-5 max-w-2xl">
            <TabsTrigger value="actions">Plan d'action</TabsTrigger>
            <TabsTrigger value="strategie">Analyse 360°</TabsTrigger>
            <TabsTrigger value="zones">Micro-secteurs</TabsTrigger>
            <TabsTrigger value="profils">Profils vendeurs</TabsTrigger>
            <TabsTrigger value="sources">Sources</TabsTrigger>
          </TabsList>

          {/* === PLAN D'ACTION — réorganisé : pas de doublons === */}
          <TabsContent value="actions" className="space-y-4 mt-4">
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {isOpportunity ? "Actions prioritaires — mode offensif" : "Actions prioritaires — mode prudence"}
              </p>
              <InfoBadge text={EXPLAINERS.plan_action} />
            </div>

            {actionsPrioritaires.length > 0 ? (
              <ol className="space-y-2">
                {actionsPrioritaires.map((it, i) => (
                  <li
                    key={i}
                    className="flex gap-3 p-3 rounded-lg border border-border/70 bg-surface-1/40"
                  >
                    <span className={`shrink-0 h-6 w-6 rounded-full flex items-center justify-center text-xs font-semibold ${isOpportunity ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                      {i + 1}
                    </span>
                    <span className="text-sm leading-relaxed">{it}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-muted-foreground">Aucune action générée — relance une analyse.</p>
            )}

            {/* Récap concis opportunités / risques */}
            <div className="grid md:grid-cols-2 gap-3 pt-2">
              {analyse.opportunites && analyse.opportunites.length > 0 && (
                <div className="p-3 rounded-lg border border-success/30 bg-success/5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-success mb-2 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Atouts du secteur
                  </p>
                  <ul className="space-y-1">
                    {analyse.opportunites.slice(0, 4).map((it, i) => (
                      <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                        <span className="text-success">+</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analyse.risques && analyse.risques.length > 0 && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/5">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-destructive mb-2 flex items-center gap-1.5">
                    <XCircle className="h-3.5 w-3.5" /> Points de vigilance
                  </p>
                  <ul className="space-y-1">
                    {analyse.risques.slice(0, 4).map((it, i) => (
                      <li key={i} className="text-xs leading-relaxed flex gap-1.5">
                        <span className="text-destructive">−</span>
                        <span>{it}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="strategie" className="space-y-3 mt-4">
            {analyse.analyse_strategique?.resume_marche && (
              <StrategicBlock title="Résumé marché" content={analyse.analyse_strategique.resume_marche} />
            )}
            {analyse.analyse_strategique?.positionnement && (
              <StrategicBlock title="Positionnement" content={analyse.analyse_strategique.positionnement} />
            )}
            {analyse.analyse_strategique?.concurrence && (
              <StrategicBlock title="Concurrence" content={analyse.analyse_strategique.concurrence} />
            )}
            {analyse.analyse_strategique?.attractivite && (
              <StrategicBlock title="Attractivité" content={analyse.analyse_strategique.attractivite} />
            )}
            {analyse.justification_score && (
              <div className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1.5">
                  Justification scores <InfoBadge text="Détail chiffré des données qui ont permis de calculer les scores opportunité et risque." />
                </p>
                <p className="text-sm leading-relaxed">{analyse.justification_score}</p>
              </div>
            )}
            {!analyse.analyse_strategique && !analyse.justification_score && (
              <p className="text-sm text-muted-foreground">Analyse stratégique non disponible.</p>
            )}
          </TabsContent>

          <TabsContent value="zones" className="space-y-2 mt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Micro-secteurs prioritaires</p>
              <InfoBadge text={EXPLAINERS.micro_secteurs} />
            </div>
            {(analyse.micro_secteurs || []).map((m, i) => {
              const niveau = (m.niveau_opportunite || "").toLowerCase();
              const niveauCls = niveau.includes("élev") || niveau.includes("eleve")
                ? "border-success/50 text-success"
                : niveau.includes("faible")
                  ? "border-destructive/50 text-destructive"
                  : "border-muted-foreground/40 text-muted-foreground";
              return (
                <div key={i} className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium flex-1">{m.nom}</p>
                    <Badge variant="outline" className={`text-[10px] capitalize ${niveauCls}`}>
                      {m.niveau_opportunite}
                    </Badge>
                    <Button size="sm" variant="outline" className="h-7 gap-1.5 text-[11px]" onClick={() => openCourrier(m.nom)}>
                      <Mail className="h-3 w-3" /> Courrier
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{m.justification}</p>
                </div>
              );
            })}
            {!analyse.micro_secteurs?.length && <p className="text-sm text-muted-foreground">Aucun micro-secteur identifié.</p>}
          </TabsContent>

          <TabsContent value="profils" className="space-y-2 mt-4">
            <div className="flex items-center gap-1.5 mb-1">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Profils vendeurs probables</p>
              <InfoBadge text={EXPLAINERS.profils_vendeurs} />
            </div>
            {(analyse.profils_vendeurs_probables || []).map((p, i) => (
              <div key={i} className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p className="text-sm font-medium">{p.type_bien}</p>
                    <p className="text-xs text-muted-foreground mt-1"><strong>Situation :</strong> {p.situation_probable}</p>
                    <p className="text-xs text-muted-foreground"><strong>Approche :</strong> {p.argument_approche}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 gap-1.5 text-[11px] shrink-0"
                    onClick={() => openCourrier(adresseSource, p)}
                  >
                    <Mail className="h-3 w-3" /> Générer courrier
                  </Button>
                </div>
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

        <SourcesFooter compact />
      </CardContent>

      <CourrierDialog
        open={courrierOpen}
        onOpenChange={setCourrierOpen}
        cible={courrierCible}
        analyse={analyse}
      />
    </Card>
  );
};

// =========================================================================
// Dialog : Génération de courrier de prospection avec vraies données DVF
// =========================================================================
const CourrierDialog = ({
  open, onOpenChange, cible, analyse,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  cible: { adresse: string; profil?: any } | null;
  analyse: Analyse;
}) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [objet, setObjet] = useState("");
  const [courrier, setCourrier] = useState("");
  const [ventesCitees, setVentesCitees] = useState<string[]>([]);

  useEffect(() => {
    if (open && cible) {
      void generer();
    } else if (!open) {
      setObjet(""); setCourrier(""); setVentesCitees([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, cible?.adresse]);

  const generer = async () => {
    if (!cible) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-courrier-prospection", {
        body: {
          adresse_cible: cible.adresse,
          type_bien: cible.profil?.type_bien,
          situation_probable: cible.profil?.situation_probable,
          angle_approche: cible.profil?.argument_approche,
          ventes_recentes: analyse.dvf_raw?.ventes || [],
          prix_m2_median: analyse.dvf_raw?.prix_m2_median,
          ville: analyse.dvf_raw?.ville,
          signaux_vendeurs: analyse.signaux_vendeurs || [],
        },
      });
      if (error) throw error;
      setObjet(data.objet || "");
      setCourrier(data.courrier || "");
      setVentesCitees(data.ventes_citees || []);
    } catch (e: any) {
      toast({
        title: "Génération impossible",
        description: e?.message || "Réessaie dans un instant.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const copier = async () => {
    await navigator.clipboard.writeText(`Objet : ${objet}\n\n${courrier}`);
    toast({ title: "Courrier copié", description: "Collé dans le presse-papier." });
  };

  const imprimer = () => {
    const w = window.open("", "_blank", "width=800,height=900");
    if (!w) return;
    w.document.write(`
      <html><head><title>Courrier de prospection</title>
      <style>body{font-family:Georgia,serif;max-width:680px;margin:60px auto;padding:0 40px;line-height:1.6;color:#111}
      h2{font-size:14px;text-transform:uppercase;letter-spacing:0.1em;color:#666;margin-bottom:24px}
      .objet{font-weight:600;margin-bottom:32px;padding-bottom:16px;border-bottom:1px solid #ddd}
      .body{white-space:pre-wrap;font-size:14px}</style>
      </head><body>
      <h2>Courrier de prospection</h2>
      <div class="objet">Objet : ${objet}</div>
      <div class="body">${courrier.replace(/</g, "&lt;")}</div>
      </body></html>
    `);
    w.document.close();
    setTimeout(() => w.print(), 200);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-primary" />
            Courrier de prospection — {cible?.adresse}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="py-12 flex flex-col items-center gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <p className="text-sm">Génération du courrier avec les vraies ventes DVF…</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Objet</label>
              <Input value={objet} onChange={(e) => setObjet(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground">Corps du courrier (modifiable)</label>
              <Textarea
                value={courrier}
                onChange={(e) => setCourrier(e.target.value)}
                rows={16}
                className="mt-1 font-serif text-sm leading-relaxed"
              />
            </div>
            {ventesCitees.length > 0 && (
              <div className="p-3 rounded-lg bg-success/5 border border-success/20">
                <p className="text-[10px] uppercase tracking-wider text-success mb-1">
                  Ventes DVF réelles citées dans le courrier
                </p>
                <ul className="space-y-0.5">
                  {ventesCitees.map((v, i) => (
                    <li key={i} className="text-xs text-muted-foreground">• {v}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={generer} disabled={loading}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Régénérer
          </Button>
          <Button variant="outline" onClick={copier} disabled={loading || !courrier}>
            <Copy className="h-4 w-4 mr-1.5" /> Copier
          </Button>
          <Button onClick={imprimer} disabled={loading || !courrier}>
            <Printer className="h-4 w-4 mr-1.5" /> Imprimer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// =========================================================================

const KPI = ({
  label, value, cls, icon, help,
}: {
  label: string;
  value: string;
  cls?: string;
  icon?: React.ReactNode;
  help?: string;
}) => (
  <div className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-muted-foreground">
      {icon}
      <span>{label}</span>
      {help && <InfoBadge text={help} />}
    </div>
    <p className={`text-lg font-display font-semibold mt-1 ${cls ?? ""}`}>{value}</p>
  </div>
);

const StrategicBlock = ({ title, content }: { title: string; content: string }) => (
  <div className="p-3 rounded-lg border border-border/70 bg-surface-1/40">
    <p className="text-[10px] uppercase tracking-wider text-primary mb-1">{title}</p>
    <p className="text-sm leading-relaxed">{content}</p>
  </div>
);
