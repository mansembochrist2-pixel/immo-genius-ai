import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import {
  Radar as RadarIcon, TrendingUp, TrendingDown, MapPin, AlertTriangle, Target, Search,
  Zap, ExternalLink, Plus, Loader2, Trash2, BarChart3, Clock, Home, Crosshair, Bot,
} from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const SECTEURS = ["Résidentiel", "Commercial", "Luxe", "Investissement locatif", "Neuf", "Ancien"];

const Radar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [adresse, setAdresse] = useState("");
  const [secteur, setSecteur] = useState("Résidentiel");
  const [analyseResult, setAnalyseResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState<"all" | "opportunite" | "risque">("all");
  const [planAttaque, setPlanAttaque] = useState<any>(null);
  const [generatingPlan, setGeneratingPlan] = useState<string | null>(null);

  const { data: opportunites = [], isLoading } = useQuery({
    queryKey: ["opportunites"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("opportunites")
        .select("*")
        .order("score", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunites"] });
      toast.success("Supprimée");
    },
  });

  const analyzeZone = async () => {
    if (!adresse.trim()) { toast.error("Entrez une adresse ou un quartier"); return; }
    setIsAnalyzing(true);
    setAnalyseResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-zone", { body: { adresse, secteur } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalyseResult(data);
      if (user) {
        const classification = data.classification || (data.score_opportunite >= data.score_risque ? "opportunite" : "risque");
        const score = classification === "opportunite" ? (data.score_opportunite ?? 60) : (data.score_risque ?? 40);
        await supabase.from("opportunites").insert({
          user_id: user.id,
          titre: `${data.niveau_global || (classification === "opportunite" ? "Opportunité" : "Risque")} — ${adresse}`,
          zone: adresse,
          type: classification,
          score,
          description: data.justification_score || data.strategie?.substring(0, 300) || "Analyse DVF de zone",
          sources: data.sources || ["DVF (data.gouv.fr / Etalab)"],
          donnees: {
            prix_m2: data.prix_m2_moyen, tendance: data.tendance, delai_vente: data.delai_vente,
            nb_biens: data.nb_biens_estimes, volume_ventes: data.volume_ventes, liquidite: data.liquidite,
            score_opportunite: data.score_opportunite, score_risque: data.score_risque,
            score_global: data.score_global, niveau_global: data.niveau_global,
            plan_action: data.plan_action, analyse_strategique: data.analyse_strategique,
            score_vendeur: data.score_vendeur, confiance_vendeur: data.confiance_vendeur,
            signaux_vendeurs: data.signaux_vendeurs, micro_secteurs: data.micro_secteurs,
            profils_vendeurs_probables: data.profils_vendeurs_probables,
            fraicheur_donnees: data.fraicheur_donnees, dvf_raw: data.dvf_raw, secteur,
          },
          statut: "nouvelle",
        });
        // Sauvegarde aussi dans analyses_zone (historique complet)
        await supabase.from("analyses_zone").insert({
          user_id: user.id, adresse, secteur, resultat: data, sources_utilisees: data.sources || [],
        });
        queryClient.invalidateQueries({ queryKey: ["opportunites"] });
      }
      toast.success("Analyse sauvegardée");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generatePlanAttaque = async (opp: any) => {
    setGeneratingPlan(opp.id);
    setPlanAttaque(null);
    try {
      const { data, error } = await supabase.functions.invoke("generate-plan-attaque", {
        body: { opportunite: { titre: opp.titre, zone: opp.zone, score: opp.score, type: opp.type, description: opp.description, donnees: opp.donnees } },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPlanAttaque({ ...data, oppId: opp.id, oppTitre: opp.titre });
      toast.success("Plan d'attaque généré !");
    } catch (e: any) {
      toast.error(e?.message || "Erreur de génération");
    } finally {
      setGeneratingPlan(null);
    }
  };

  const filtered = opportunites.filter((o: any) => filter === "all" || o.type === filter);
  const totalOpps = opportunites.length;
  const avgScore = totalOpps ? Math.round(opportunites.reduce((s: number, o: any) => s + (o.score || 0), 0) / totalOpps) : 0;
  const nbOpportunites = opportunites.filter((o: any) => o.type === "opportunite").length;
  const nbRisques = opportunites.filter((o: any) => o.type === "risque").length;

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <RadarIcon className="h-7 w-7 text-primary" />
              Radar <span className="gradient-text">Prospection</span>
            </h1>
            <p className="page-subtitle">Détectez les opportunités vendeurs • Plans d'attaque commerciaux</p>
          </div>
          {opportunites.length === 0 && (
            <Badge variant="outline" className="text-xs">Aucune analyse — lancez votre première recherche ↓</Badge>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Zones analysées", value: String(totalOpps), icon: MapPin },
          { label: "Score moyen", value: `${avgScore}/100`, icon: Target },
          { label: "Opportunités", value: String(nbOpportunites), icon: TrendingUp, color: "text-success" },
          { label: "Risques", value: String(nbRisques), icon: AlertTriangle, color: "text-destructive" },
        ].map((kpi) => (
          <Card key={kpi.label} className="bg-card/60 border-border/30">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <kpi.icon className={`h-4 w-4 ${kpi.color || "text-primary"}`} />
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Analyse de zone */}
      <Card className="mb-6 bg-card/60 border-border/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Search className="h-4 w-4 text-primary" /> Analyser une zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <AddressAutocomplete value={adresse} onChange={setAdresse} placeholder="Adresse, quartier, ville..." className="bg-background" />
            </div>
            <Select value={secteur} onValueChange={setSecteur}>
              <SelectTrigger className="w-full md:w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>{SECTEURS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={analyzeZone} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser
            </Button>
          </div>

          {analyseResult && (
            <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <h3 className="font-semibold text-sm flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" /> Résultat — {adresse}
                </h3>
                {analyseResult.classification && (
                  <div className="flex items-center gap-2">
                    {analyseResult.niveau_global && (
                      <Badge variant="outline" className="text-[10px] uppercase">{analyseResult.niveau_global}</Badge>
                    )}
                    <Badge variant={analyseResult.classification === "risque" ? "destructive" : "default"} className="text-[10px] uppercase">
                      Opp {analyseResult.score_opportunite ?? "?"} / Risk {analyseResult.score_risque ?? "?"}
                    </Badge>
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {analyseResult.prix_m2_moyen && <div><p className="text-[10px] text-muted-foreground uppercase">Prix/m²</p><p className="font-bold text-sm">{analyseResult.prix_m2_moyen}</p></div>}
                {analyseResult.tendance && <div><p className="text-[10px] text-muted-foreground uppercase">Tendance</p><p className="font-bold text-sm">{analyseResult.tendance}</p></div>}
                {analyseResult.delai_vente && <div><p className="text-[10px] text-muted-foreground uppercase">Délai vente</p><p className="font-bold text-sm">{analyseResult.delai_vente}</p></div>}
                {analyseResult.volume_ventes && <div><p className="text-[10px] text-muted-foreground uppercase">Volume ventes</p><p className="font-bold text-sm">{analyseResult.volume_ventes}</p></div>}
                {analyseResult.liquidite && <div><p className="text-[10px] text-muted-foreground uppercase">Liquidité</p><p className="font-bold text-sm">{analyseResult.liquidite}</p></div>}
                {analyseResult.nb_biens_estimes && <div><p className="text-[10px] text-muted-foreground uppercase">Biens estimés</p><p className="font-bold text-sm">{analyseResult.nb_biens_estimes}</p></div>}
              </div>
              {analyseResult.fraicheur_donnees && (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{analyseResult.fraicheur_donnees}</p>
              )}
              {analyseResult.justification_score && <p className="text-xs text-muted-foreground italic">{analyseResult.justification_score}</p>}
              {analyseResult.analyse_strategique && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-2 border-t border-primary/10">
                  {Object.entries(analyseResult.analyse_strategique).map(([k, v]: any) => (
                    <div key={k} className="bg-muted/10 rounded p-2">
                      <p className="text-[9px] uppercase text-muted-foreground mb-0.5">{k.replace(/_/g, " ")}</p>
                      <p className="text-xs">{v}</p>
                    </div>
                  ))}
                </div>
              )}
              {analyseResult.plan_action && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-primary/10">
                  <div>
                    <p className="text-[10px] text-success uppercase font-semibold mb-1">✓ Si opportunité</p>
                    <ul className="space-y-1">{(analyseResult.plan_action.si_opportunite || []).map((a: string, i: number) => <li key={i} className="text-xs flex gap-1"><span className="text-success">→</span>{a}</li>)}</ul>
                  </div>
                  <div>
                    <p className="text-[10px] text-destructive uppercase font-semibold mb-1">⚠ Si risque</p>
                    <ul className="space-y-1">{(analyseResult.plan_action.si_risque || []).map((a: string, i: number) => <li key={i} className="text-xs flex gap-1"><span className="text-destructive">→</span>{a}</li>)}</ul>
                  </div>
                </div>
              )}
              {(analyseResult.score_vendeur != null || analyseResult.signaux_vendeurs?.length > 0) && (
                <div className="pt-2 border-t border-primary/10 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[10px] uppercase font-semibold text-primary">🎯 Détection vendeurs potentiels</p>
                    {analyseResult.score_vendeur != null && (
                      <Badge className="bg-primary text-primary-foreground text-[10px]">Score vendeur : {analyseResult.score_vendeur}/100</Badge>
                    )}
                    {analyseResult.confiance_vendeur && (
                      <Badge variant="outline" className="text-[10px]">Confiance {analyseResult.confiance_vendeur}</Badge>
                    )}
                  </div>
                  {analyseResult.signaux_vendeurs?.length > 0 && (
                    <ul className="space-y-1">
                      {analyseResult.signaux_vendeurs.map((s: string, i: number) => (
                        <li key={i} className="text-xs flex gap-1"><span className="text-primary">•</span>{s}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {analyseResult.micro_secteurs?.length > 0 && (
                <div className="pt-2 border-t border-primary/10 space-y-2">
                  <p className="text-[10px] uppercase font-semibold">🗺 Micro-secteurs prioritaires</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {analyseResult.micro_secteurs.map((m: any, i: number) => (
                      <div key={i} className="bg-muted/10 rounded p-2">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold">{m.nom}</p>
                          <Badge variant="outline" className="text-[9px]">{m.niveau_opportunite}</Badge>
                        </div>
                        <p className="text-[11px] text-muted-foreground">{m.justification}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analyseResult.profils_vendeurs_probables?.length > 0 && (
                <div className="pt-2 border-t border-primary/10 space-y-2">
                  <p className="text-[10px] uppercase font-semibold">👤 Profils vendeurs probables</p>
                  <div className="space-y-2">
                    {analyseResult.profils_vendeurs_probables.map((p: any, i: number) => (
                      <div key={i} className="bg-muted/10 rounded p-2 space-y-1">
                        <p className="text-xs font-semibold">{p.type_bien}</p>
                        <p className="text-[11px] text-muted-foreground"><span className="font-medium">Situation probable :</span> {p.situation_probable}</p>
                        <p className="text-[11px] text-primary"><span className="font-medium">Approche :</span> {p.argument_approche}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {analyseResult.sources?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {analyseResult.sources.map((s: string) => <Badge key={s} variant="outline" className="text-[9px]">{s}</Badge>)}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan d'attaque result */}
      {planAttaque && (
        <Card className="mb-6 bg-card/60 border-primary/30 glow-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Crosshair className="h-4 w-4 text-primary" /> Plan d'attaque — {planAttaque.oppTitre}
              </CardTitle>
              <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => {
                // Navigate to copilote with the plan data as a query
                const summary = `Voici le plan d'attaque pour "${planAttaque.oppTitre}":\n\nProfil cible: ${planAttaque.profil_cible || "N/C"}\nAngle commercial: ${planAttaque.angle_commercial || "N/C"}\nTiming: ${planAttaque.timing_optimal || "N/C"}\nPotentiel: ${planAttaque.estimation_potentiel || "N/C"}\n\nPriorités: ${planAttaque.priorites?.join(", ") || "N/C"}\nRisques: ${planAttaque.risques?.join(", ") || "N/C"}\n\nAnalyse cette opportunité et propose-moi des actions concrètes.`;
                sessionStorage.setItem("copilote_prefill", summary);
                navigate("/copilote");
              }}>
                <Bot className="h-3 w-3" /> Envoyer au Copilote
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {planAttaque.profil_cible && (
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Profil cible</p>
                  <p className="text-xs">{planAttaque.profil_cible}</p>
                </div>
              )}
              {planAttaque.angle_commercial && (
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Angle commercial</p>
                  <p className="text-xs">{planAttaque.angle_commercial}</p>
                </div>
              )}
              {planAttaque.timing_optimal && (
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Timing optimal</p>
                  <p className="text-xs">{planAttaque.timing_optimal}</p>
                </div>
              )}
              {planAttaque.estimation_potentiel && (
                <div className="bg-muted/10 rounded-lg p-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Potentiel estimé</p>
                  <p className="text-xs font-medium text-primary">{planAttaque.estimation_potentiel}</p>
                </div>
              )}
            </div>
            {planAttaque.priorites?.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Priorités</p>
                <div className="space-y-1">
                  {planAttaque.priorites.map((p: string, i: number) => (
                    <div key={i} className="flex items-start gap-2 text-xs">
                      <Badge variant="outline" className="text-[8px] px-1 py-0 shrink-0">{i + 1}</Badge>
                      <span>{p}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {planAttaque.risques?.length > 0 && (
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">Risques identifiés</p>
                <ul className="space-y-1">{planAttaque.risques.map((r: string, i: number) => <li key={i} className="text-xs flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 text-destructive shrink-0" />{r}</li>)}</ul>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filtres + liste */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Opportunités & Risques
        </h2>
        <div className="flex gap-2">
          {(["all", "opportunite", "risque"] as const).map((f) => (
            <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" className="text-xs h-7" onClick={() => setFilter(f)}>
              {f === "all" ? "Toutes" : f === "opportunite" ? "Opportunités" : "Risques"}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <Card className="bg-card/60 border-border/30">
          <CardContent className="py-12 text-center">
            <RadarIcon className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucune opportunité détectée</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((opp: any) => {
            const donnees = opp.donnees as any;
            const sources = (opp.sources as string[]) || [];
            const isRisque = opp.type === "risque";
            return (
              <Card key={opp.id} className={`bg-card/60 border-border/30 ${isRisque ? "border-l-2 border-l-destructive/60" : "border-l-2 border-l-success/60"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{opp.titre}</CardTitle>
                      {opp.zone && <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1"><MapPin className="h-3 w-3 shrink-0" /> {opp.zone}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <Badge variant={isRisque ? "destructive" : "default"} className="text-[10px]">
                        {isRisque ? "Risque" : `Score ${opp.score}`}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteMutation.mutate(opp.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {donnees && (
                    <div className="flex gap-4 text-xs">
                      {donnees.prix_m2 && <span className="flex items-center gap-1"><Home className="h-3 w-3 text-muted-foreground" />{donnees.prix_m2}/m²</span>}
                      {donnees.tendance && (
                        <span className={`flex items-center gap-1 ${donnees.tendance.includes("+") ? "text-success" : donnees.tendance.includes("-") ? "text-destructive" : ""}`}>
                          {donnees.tendance.includes("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{donnees.tendance}
                        </span>
                      )}
                      {donnees.delai_vente && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{donnees.delai_vente}</span>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      {sources.map((src: string) => (
                        <Badge key={src} variant="outline" className="text-[9px] px-1.5 py-0">
                          <ExternalLink className="h-2.5 w-2.5 mr-1" /> {src}
                        </Badge>
                      ))}
                    </div>
                    {!isRisque && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 gap-1 shrink-0"
                        disabled={generatingPlan === opp.id}
                        onClick={() => generatePlanAttaque(opp)}
                      >
                        {generatingPlan === opp.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <><Crosshair className="h-3 w-3" /> Plan d'attaque</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </AppLayout>
  );
};

export default Radar;
