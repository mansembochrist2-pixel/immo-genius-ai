import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp, MapPin, Loader2, Sparkles, Download, Save, Pencil,
  Home, BarChart3, Target, ArrowRight,
} from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const EstimationIA = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editableResult, setEditableResult] = useState<any>(null);
  const [form, setForm] = useState({
    adresse: "", surface: "", pieces: "", etage: "", etat: "bon",
    dpe: "", annee_construction: "", parking: false, cave: false, balcon: false,
  });

  const estimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse || !form.surface) { toast.error("Adresse et surface requises"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-estimation", {
        body: { ...form, surface: Number(form.surface), pieces: Number(form.pieces) || undefined },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setEditableResult(data);
      toast.success("Estimation générée");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'estimation");
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!editableResult) return;
    // Generate a simple text-based PDF using browser print
    const content = `
RAPPORT D'ESTIMATION IMMOBILIÈRE

Bien estimé : ${form.adresse}
Surface : ${form.surface} m² | Pièces : ${form.pieces || "N/C"} | DPE : ${form.dpe || "N/C"}

═══════════════════════════════════════

FOURCHETTE DE PRIX
Prix minimum : ${editableResult.prix_min?.toLocaleString("fr-FR")} €
Prix moyen estimé : ${editableResult.prix_moyen?.toLocaleString("fr-FR")} €
Prix maximum : ${editableResult.prix_max?.toLocaleString("fr-FR")} €

Prix au m² du secteur : ${editableResult.prix_m2_secteur?.toLocaleString("fr-FR")} €/m²

═══════════════════════════════════════

ANALYSE DU MARCHÉ LOCAL

${editableResult.analyse_marche}

═══════════════════════════════════════

COMPARAISON QUARTIER

${editableResult.comparaison_quartier}

═══════════════════════════════════════

HISTORIQUE DES VENTES RÉCENTES

${editableResult.historique_ventes}

═══════════════════════════════════════

TENDANCE DU MARCHÉ (12 MOIS)

${editableResult.tendance_12_mois}

═══════════════════════════════════════

MÉTHODE D'ESTIMATION

${editableResult.methode_estimation}

═══════════════════════════════════════

RECOMMANDATION DE PRIX DE MISE EN VENTE

Prix recommandé : ${editableResult.recommandation_prix?.toLocaleString("fr-FR")} €

${editableResult.argumentaire_prix}

═══════════════════════════════════════

CONCLUSION

${editableResult.conclusion}

───────────────────────────────────────
Généré par Estate AI
    `.trim();

    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimation-${form.adresse.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Rapport téléchargé");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-primary" />
          Estimation <span className="gradient-text">IA</span>
        </h1>
        <p className="page-subtitle">Estimez vos biens avec précision grâce aux données du marché</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> Informations du bien
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={estimer} className="space-y-4">
              <div>
                <Label className="text-xs">Adresse *</Label>
                <Input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="mt-1 bg-muted/10 border-border/30" placeholder="12 rue de Rivoli, 75001 Paris" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Surface (m²) *</Label><Input type="number" value={form.surface} onChange={e => setForm({ ...form, surface: e.target.value })} className="mt-1 bg-muted/10 border-border/30" /></div>
                <div><Label className="text-xs">Nombre de pièces</Label><Input type="number" value={form.pieces} onChange={e => setForm({ ...form, pieces: e.target.value })} className="mt-1 bg-muted/10 border-border/30" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Étage</Label><Input value={form.etage} onChange={e => setForm({ ...form, etage: e.target.value })} className="mt-1 bg-muted/10 border-border/30" placeholder="3ème" /></div>
                <div>
                  <Label className="text-xs">État général</Label>
                  <Select value={form.etat} onValueChange={v => setForm({ ...form, etat: v })}>
                    <SelectTrigger className="mt-1 bg-muted/10 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neuf">Neuf</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="bon">Bon</SelectItem>
                      <SelectItem value="correct">Correct</SelectItem>
                      <SelectItem value="a_renover">À rénover</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">DPE</Label>
                  <Select value={form.dpe} onValueChange={v => setForm({ ...form, dpe: v })}>
                    <SelectTrigger className="mt-1 bg-muted/10 border-border/30"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      {["A", "B", "C", "D", "E", "F", "G"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Année construction</Label><Input value={form.annee_construction} onChange={e => setForm({ ...form, annee_construction: e.target.value })} className="mt-1 bg-muted/10 border-border/30" placeholder="1975" /></div>
              </div>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2"><Checkbox checked={form.parking} onCheckedChange={c => setForm({ ...form, parking: !!c })} /><Label className="text-xs">Parking</Label></div>
                <div className="flex items-center gap-2"><Checkbox checked={form.cave} onCheckedChange={c => setForm({ ...form, cave: !!c })} /><Label className="text-xs">Cave</Label></div>
                <div className="flex items-center gap-2"><Checkbox checked={form.balcon} onCheckedChange={c => setForm({ ...form, balcon: !!c })} /><Label className="text-xs">Balcon/Terrasse</Label></div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Estimation en cours...</> : <><Sparkles className="h-4 w-4 mr-2" /> Estimer ce bien</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Result */}
        {editableResult ? (
          <div className="space-y-4">
            {/* Price range */}
            <Card className="bg-card/60 border-primary/20 glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Fourchette de prix</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-muted/10 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Minimum</p>
                    <p className="text-sm font-bold mt-1">{editableResult.prix_min?.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                    <p className="text-[10px] text-primary uppercase">Estimé</p>
                    <p className="text-lg font-bold mt-1 text-primary">{editableResult.prix_moyen?.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-muted/10 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Maximum</p>
                    <p className="text-sm font-bold mt-1">{editableResult.prix_max?.toLocaleString("fr-FR")} €</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Prix/m² secteur : {editableResult.prix_m2_secteur?.toLocaleString("fr-FR")} €/m²</span>
                  <span>Recommandé : {editableResult.recommandation_prix?.toLocaleString("fr-FR")} €</span>
                </div>
              </CardContent>
            </Card>

            {/* Editable sections */}
            {[
              { key: "analyse_marche", title: "Analyse du marché local", icon: BarChart3 },
              { key: "comparaison_quartier", title: "Comparaison quartier", icon: MapPin },
              { key: "historique_ventes", title: "Ventes récentes similaires", icon: TrendingUp },
              { key: "tendance_12_mois", title: "Tendance 12 mois", icon: TrendingUp },
              { key: "argumentaire_prix", title: "Argumentaire prix", icon: Target },
              { key: "conclusion", title: "Conclusion", icon: ArrowRight },
            ].map(section => (
              <Card key={section.key} className="bg-card/60 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <section.icon className="h-4 w-4 text-primary" /> {section.title}
                    <Pencil className="h-3 w-3 text-muted-foreground ml-auto" />
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    value={editableResult[section.key] || ""}
                    onChange={e => setEditableResult({ ...editableResult, [section.key]: e.target.value })}
                    className="bg-muted/5 border-border/20 text-sm min-h-[80px]"
                  />
                </CardContent>
              </Card>
            ))}

            {/* Actions */}
            <div className="flex gap-2">
              <Button className="flex-1" onClick={downloadPDF}><Download className="h-4 w-4 mr-2" /> Télécharger le rapport</Button>
              <Button variant="outline" onClick={() => toast.info("Sauvegarde liée au client à venir")}><Save className="h-4 w-4 mr-2" /> Sauvegarder</Button>
            </div>
          </div>
        ) : (
          <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <TrendingUp className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">Votre estimation apparaîtra ici</p>
              <p className="text-xs text-muted-foreground/60">Basée sur DVF, INSEE et observatoires locaux</p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default EstimationIA;
