import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin } from "lucide-react";
import { toast } from "sonner";

const Prospection = () => {
  const [form, setForm] = useState({ adresse: "", secteur: "" });
  const [analyse, setAnalyse] = useState("");

  const analyser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse || !form.secteur) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    const text = `📍 Analyse de zone — ${form.adresse}\n🏘️ Secteur : ${form.secteur}\n\n📊 Résultats estimés :\n• Prix moyen au m² : ~3 850 €\n• Nombre de biens en vente : 12\n• Délai de vente moyen : 45 jours\n• Tendance du marché : ↗️ Hausse (+2,3%)\n\n💡 Recommandation : Zone à fort potentiel de prospection. Concentrez vos efforts sur les T3/T4 qui se vendent rapidement.`;
    setAnalyse(text);
    toast.success("Analyse terminée");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><MapPin className="h-6 w-6 text-accent" /> Prospection</h1>
        <p className="page-subtitle">Analysez des zones pour identifier les opportunités</p>
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
                <Input placeholder="6e arrondissement, Lyon" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Secteur d'activité</Label>
                <Input placeholder="Résidentiel, Commercial..." value={form.secteur} onChange={(e) => setForm({ ...form, secteur: e.target.value })} />
              </div>
              <Button type="submit" className="w-full">Lancer l'analyse</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-semibold">Résultats</CardTitle>
          </CardHeader>
          <CardContent>
            {analyse ? (
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg font-sans leading-relaxed">{analyse}</pre>
            ) : (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Entrez une zone pour lancer l'analyse
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Prospection;
