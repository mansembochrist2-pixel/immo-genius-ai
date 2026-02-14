import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Loader2, TrendingUp, AlertTriangle, Target, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";

interface AnalyseResult {
  prix_m2_moyen: string;
  tendance: string;
  nb_biens_estimes: string;
  delai_vente: string;
  opportunites: string[];
  risques?: string[];
  strategie: string;
  sources: string[];
}

const Prospection = () => {
  const [form, setForm] = useState({ adresse: "", secteur: "" });
  const [analyse, setAnalyse] = useState<AnalyseResult | null>(null);
  const [loading, setLoading] = useState(false);

  const analyser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse || !form.secteur) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-zone", {
        body: { adresse: form.adresse, secteur: form.secteur },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnalyse(data);
      toast.success("Analyse terminée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'analyse");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MapPin className="h-6 w-6 text-accent" /> Prospection IA</h1>
        <p className="page-subtitle">Analysez des zones avec l'intelligence artificielle</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-semibold">Analyse de zone</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={analyser} className="space-y-4">
              <div className="space-y-2">
                <Label>Adresse / Quartier</Label>
                <AddressAutocomplete
                  value={form.adresse}
                  onChange={(val) => setForm({ ...form, adresse: val })}
                  placeholder="6e arrondissement, Lyon"
                />
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité</Label>
                <Input placeholder="Résidentiel, Commercial..." value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Analyse en cours...</> : "Lancer l'analyse IA"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {analyse ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Prix moyen / m²</p>
                  <p className="text-lg font-bold text-primary">{analyse.prix_m2_moyen}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Tendance</p>
                  <p className="text-lg font-bold">{analyse.tendance}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Biens en vente</p>
                  <p className="text-lg font-bold">{analyse.nb_biens_estimes}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <p className="text-xs text-muted-foreground mb-1">Délai de vente</p>
                  <p className="text-lg font-bold">{analyse.delai_vente}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-sans font-semibold flex items-center gap-2"><TrendingUp className="h-4 w-4 text-accent" /> Opportunités</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1.5">
                  {analyse.opportunites.map((o, i) => (
                    <li key={i} className="text-sm flex items-start gap-2"><span className="text-accent mt-0.5">✓</span> {o}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>

            {analyse.risques && analyse.risques.length > 0 && (
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-sans font-semibold flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" /> Risques</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-1.5">
                    {analyse.risques.map((r, i) => (
                      <li key={i} className="text-sm flex items-start gap-2"><span className="text-destructive mt-0.5">⚠</span> {r}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-sans font-semibold flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Stratégie recommandée</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{analyse.strategie}</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-sans font-semibold flex items-center gap-2"><BookOpen className="h-4 w-4" /> Sources</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {analyse.sources.map((s, i) => (
                    <span key={i} className="text-xs bg-muted px-2 py-1 rounded">{s}</span>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12">
              <div className="text-center text-muted-foreground text-sm">
                Entrez une zone pour lancer l'analyse IA
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Prospection;
