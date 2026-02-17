import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Radar as RadarIcon, TrendingUp, TrendingDown, MapPin, AlertTriangle, Target, BarChart3, Search, Zap, ExternalLink } from "lucide-react";
import { useState } from "react";

const DEMO_OPPORTUNITIES = [
  {
    id: "1", titre: "Quartier en gentrification — Paris 20e",
    zone: "Belleville / Ménilmontant", score: 87,
    description: "Hausse de 12% des prix sur 12 mois, nouvelle ligne de tramway prévue en 2026.",
    sources: ["DVF Etalab", "Data.gouv", "Observatoire local"],
    type: "opportunite",
  },
  {
    id: "2", titre: "Tension locative forte — Lyon 3e",
    zone: "Part-Dieu / Villette", score: 92,
    description: "Taux de vacance < 2%, demande locative en hausse de 18%. Idéal investissement locatif.",
    sources: ["INSEE", "Notaires de France"],
    type: "opportunite",
  },
  {
    id: "3", titre: "Risque de baisse — Bordeaux Centre",
    zone: "Chartrons / Saint-Michel", score: 45,
    description: "Suroffre détectée (+25% d'annonces vs N-1), délais de vente en hausse à 95 jours.",
    sources: ["DVF Etalab", "SeLoger Data"],
    type: "risque",
  },
];

const DEMO_KPIS = [
  { label: "Prix moyen/m²", value: "4 250 €", trend: "+3.2%", up: true },
  { label: "Délai moyen vente", value: "67 jours", trend: "-5j", up: true },
  { label: "Offres actives", value: "1 248", trend: "+12%", up: false },
  { label: "Tension marché", value: "Forte", trend: "Stable", up: true },
];

const Radar = () => {
  const [search, setSearch] = useState("");

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <RadarIcon className="h-7 w-7 text-primary" />
              Radar <span className="gradient-text">Opportunités</span>
            </h1>
            <p className="page-subtitle">Données marché en temps réel et opportunités détectées par l'IA</p>
          </div>
          <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground text-xs">
            Sources API en attente de connexion
          </Badge>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {DEMO_KPIS.map((kpi) => (
          <Card key={kpi.label} className="bg-card/60 border-border/30">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{kpi.label}</p>
              <p className="text-xl font-bold mt-1">{kpi.value}</p>
              <div className={`flex items-center gap-1 mt-1 text-xs ${kpi.up ? "text-green-400" : "text-red-400"}`}>
                {kpi.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                {kpi.trend}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recherche zone */}
      <div className="flex gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher une zone, ville, quartier..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 bg-card/60 border-border/50"
          />
        </div>
        <Button variant="outline">
          <Zap className="h-4 w-4 mr-2" /> Analyser
        </Button>
      </div>

      {/* Opportunités */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" /> Opportunités détectées
          <Badge variant="secondary" className="text-[10px]">Données de démo</Badge>
        </h2>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {DEMO_OPPORTUNITIES.map((opp) => (
            <Card key={opp.id} className={`bg-card/60 border-border/30 ${opp.type === "risque" ? "border-l-2 border-l-red-400/60" : "border-l-2 border-l-green-400/60"}`}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-sm">{opp.titre}</CardTitle>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3" /> {opp.zone}
                    </p>
                  </div>
                  <Badge variant={opp.type === "risque" ? "destructive" : "default"} className="text-[10px]">
                    {opp.type === "risque" ? (
                      <><AlertTriangle className="h-3 w-3 mr-1" /> Risque</>
                    ) : (
                      <><Target className="h-3 w-3 mr-1" /> Score {opp.score}</>
                    )}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{opp.description}</p>
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {opp.sources.map((src) => (
                    <Badge key={src} variant="outline" className="text-[9px] px-1.5 py-0">
                      <ExternalLink className="h-2.5 w-2.5 mr-1" /> {src}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Radar;
