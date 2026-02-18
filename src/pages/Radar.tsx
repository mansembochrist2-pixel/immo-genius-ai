import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { Radar as RadarIcon, TrendingUp, TrendingDown, MapPin, AlertTriangle, Target, Search, Zap, ExternalLink, Plus, Loader2, Trash2, BarChart3, Clock, Home } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const SECTEURS = ["Résidentiel", "Commercial", "Luxe", "Investissement locatif", "Neuf", "Ancien"];

const DEMO_OPPORTUNITIES = [
  {
    titre: "Quartier en gentrification — Paris 20e",
    zone: "Belleville / Ménilmontant",
    type: "opportunite",
    score: 87,
    description: "Hausse de 12% des prix sur 12 mois, nouvelle ligne de tramway prévue en 2026. Fort potentiel de plus-value à moyen terme.",
    sources: ["DVF Etalab", "Data.gouv", "Observatoire local"],
    donnees: { prix_m2: "6 200 €", tendance: "+12%", delai_vente: "45 jours" },
  },
  {
    titre: "Tension locative forte — Lyon 3e",
    zone: "Part-Dieu / Villette",
    type: "opportunite",
    score: 92,
    description: "Taux de vacance < 2%, demande locative en hausse de 18%. Idéal investissement locatif.",
    sources: ["INSEE", "Notaires de France"],
    donnees: { prix_m2: "4 800 €", tendance: "+8%", delai_vente: "32 jours" },
  },
  {
    titre: "Risque de baisse — Bordeaux Centre",
    zone: "Chartrons / Saint-Michel",
    type: "risque",
    score: 35,
    description: "Suroffre détectée (+25% d'annonces vs N-1), délais de vente en hausse à 95 jours.",
    sources: ["DVF Etalab", "SeLoger Data"],
    donnees: { prix_m2: "4 950 €", tendance: "-3%", delai_vente: "95 jours" },
  },
  {
    titre: "Marché dynamique — Nantes Île de Nantes",
    zone: "Île de Nantes / Beaulieu",
    type: "opportunite",
    score: 78,
    description: "Projets urbains majeurs en cours, prix encore accessibles vs grandes métropoles. Croissance démographique +2.3%.",
    sources: ["DVF Etalab", "INSEE", "Métropole Nantes"],
    donnees: { prix_m2: "3 900 €", tendance: "+6%", delai_vente: "52 jours" },
  },
];

const Radar = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [adresse, setAdresse] = useState("");
  const [secteur, setSecteur] = useState("Résidentiel");
  const [analyseResult, setAnalyseResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [filter, setFilter] = useState<"all" | "opportunite" | "risque">("all");

  // Fetch opportunities from DB
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

  // Seed demo data
  const seedMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non connecté");
      const rows = DEMO_OPPORTUNITIES.map((o) => ({
        user_id: user.id,
        titre: o.titre,
        zone: o.zone,
        type: o.type,
        score: o.score,
        description: o.description,
        sources: o.sources,
        donnees: o.donnees,
        statut: "nouvelle",
      }));
      const { error } = await supabase.from("opportunites").insert(rows);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunites"] });
      toast.success("Données de démo chargées !");
    },
    onError: () => toast.error("Erreur lors du chargement des données de démo"),
  });

  // Delete opportunity
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("opportunites").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["opportunites"] });
      toast.success("Opportunité supprimée");
    },
  });

  // Analyze zone via edge function
  const analyzeZone = async () => {
    if (!adresse.trim()) {
      toast.error("Entrez une adresse ou un quartier");
      return;
    }
    setIsAnalyzing(true);
    setAnalyseResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-zone", {
        body: { adresse, secteur },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalyseResult(data);

      // Save as opportunity
      if (user) {
        const score = data.tendance?.includes("+") ? 75 : data.tendance?.includes("-") ? 35 : 55;
        await supabase.from("opportunites").insert({
          user_id: user.id,
          titre: `Analyse IA — ${adresse}`,
          zone: adresse,
          type: data.tendance?.includes("-") ? "risque" : "opportunite",
          score,
          description: data.strategie?.substring(0, 300) || "Analyse IA de zone",
          sources: data.sources || ["IA Lovable"],
          donnees: {
            prix_m2: data.prix_m2_moyen,
            tendance: data.tendance,
            delai_vente: data.delai_vente,
            nb_biens: data.nb_biens_estimes,
          },
          statut: "nouvelle",
        });
        queryClient.invalidateQueries({ queryKey: ["opportunites"] });
      }
      toast.success("Analyse terminée et sauvegardée !");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur lors de l'analyse");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const filtered = opportunites.filter((o: any) => filter === "all" || o.type === filter);

  // KPIs from real data
  const totalOpps = opportunites.length;
  const avgScore = totalOpps ? Math.round(opportunites.reduce((s: number, o: any) => s + (o.score || 0), 0) / totalOpps) : 0;
  const nbOpportunites = opportunites.filter((o: any) => o.type === "opportunite").length;
  const nbRisques = opportunites.filter((o: any) => o.type === "risque").length;

  const KPIS = [
    { label: "Zones analysées", value: String(totalOpps), icon: MapPin },
    { label: "Score moyen", value: `${avgScore}/100`, icon: Target },
    { label: "Opportunités", value: String(nbOpportunites), icon: TrendingUp, color: "text-green-400" },
    { label: "Risques", value: String(nbRisques), icon: AlertTriangle, color: "text-red-400" },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <RadarIcon className="h-7 w-7 text-primary" />
              Radar <span className="gradient-text">Opportunités</span>
            </h1>
            <p className="page-subtitle">Analyse IA des zones et opportunités de marché</p>
          </div>
          {opportunites.length === 0 && (
            <Button variant="outline" size="sm" onClick={() => seedMutation.mutate()} disabled={seedMutation.isPending}>
              {seedMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Charger données démo
            </Button>
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {KPIS.map((kpi) => (
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
            <Search className="h-4 w-4 text-primary" />
            Analyser une nouvelle zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-3">
            <div className="flex-1">
              <AddressAutocomplete
                value={adresse}
                onChange={setAdresse}
                placeholder="Adresse, quartier, ville..."
                className="bg-background"
              />
            </div>
            <Select value={secteur} onValueChange={setSecteur}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SECTEURS.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={analyzeZone} disabled={isAnalyzing}>
              {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Zap className="h-4 w-4 mr-2" />}
              Analyser
            </Button>
          </div>

          {/* Résultat d'analyse */}
          {analyseResult && (
            <div className="mt-4 p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-primary" /> Résultat de l'analyse — {adresse}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {analyseResult.prix_m2_moyen && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Prix/m²</p><p className="font-bold text-sm">{analyseResult.prix_m2_moyen}</p></div>
                )}
                {analyseResult.tendance && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Tendance</p><p className="font-bold text-sm">{analyseResult.tendance}</p></div>
                )}
                {analyseResult.delai_vente && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Délai vente</p><p className="font-bold text-sm">{analyseResult.delai_vente}</p></div>
                )}
                {analyseResult.nb_biens_estimes && (
                  <div><p className="text-[10px] text-muted-foreground uppercase">Biens estimés</p><p className="font-bold text-sm">{analyseResult.nb_biens_estimes}</p></div>
                )}
              </div>
              {analyseResult.opportunites?.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Opportunités</p>
                  <ul className="text-xs space-y-1">{analyseResult.opportunites.map((o: string, i: number) => <li key={i} className="flex items-start gap-1"><Target className="h-3 w-3 mt-0.5 text-green-400 shrink-0" />{o}</li>)}</ul>
                </div>
              )}
              {analyseResult.risques?.length > 0 && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Risques</p>
                  <ul className="text-xs space-y-1">{analyseResult.risques.map((r: string, i: number) => <li key={i} className="flex items-start gap-1"><AlertTriangle className="h-3 w-3 mt-0.5 text-red-400 shrink-0" />{r}</li>)}</ul>
                </div>
              )}
              {analyseResult.strategie && (
                <div>
                  <p className="text-[10px] text-muted-foreground uppercase mb-1">Stratégie recommandée</p>
                  <p className="text-xs text-muted-foreground">{analyseResult.strategie}</p>
                </div>
              )}
              {analyseResult.sources?.length > 0 && (
                <div className="flex gap-2 flex-wrap">
                  {analyseResult.sources.map((s: string) => (
                    <Badge key={s} variant="outline" className="text-[9px]"><ExternalLink className="h-2.5 w-2.5 mr-1" />{s}</Badge>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
            <p className="text-xs text-muted-foreground mt-1">Analysez une zone ou chargez les données de démo</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((opp: any) => {
            const donnees = opp.donnees as any;
            const sources = (opp.sources as string[]) || [];
            const isRisque = opp.type === "risque";
            return (
              <Card key={opp.id} className={`bg-card/60 border-border/30 ${isRisque ? "border-l-2 border-l-red-400/60" : "border-l-2 border-l-green-400/60"}`}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-sm truncate">{opp.titre}</CardTitle>
                      {opp.zone && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                          <MapPin className="h-3 w-3 shrink-0" /> {opp.zone}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Badge variant={isRisque ? "destructive" : "default"} className="text-[10px]">
                        {isRisque ? <><AlertTriangle className="h-3 w-3 mr-1" /> Risque</> : <><Target className="h-3 w-3 mr-1" /> Score {opp.score}</>}
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
                        <span className={`flex items-center gap-1 ${donnees.tendance.includes("+") ? "text-green-400" : donnees.tendance.includes("-") ? "text-red-400" : ""}`}>
                          {donnees.tendance.includes("+") ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}{donnees.tendance}
                        </span>
                      )}
                      {donnees.delai_vente && <span className="flex items-center gap-1"><Clock className="h-3 w-3 text-muted-foreground" />{donnees.delai_vente}</span>}
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground line-clamp-2">{opp.description}</p>
                  {sources.length > 0 && (
                    <div className="flex items-center gap-2 flex-wrap">
                      {sources.map((src: string) => (
                        <Badge key={src} variant="outline" className="text-[9px] px-1.5 py-0">
                          <ExternalLink className="h-2.5 w-2.5 mr-1" /> {src}
                        </Badge>
                      ))}
                    </div>
                  )}
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
