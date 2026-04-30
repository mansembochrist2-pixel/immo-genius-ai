import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  TrendingUp, MapPin, Loader2, Sparkles, Download, Save, Pencil,
  Home, BarChart3, Target, ArrowRight, Wand2,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";

const EstimationIA = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editableResult, setEditableResult] = useState<any>(null);
  const [form, setForm] = useState({
    adresse: "", surface: "", pieces: "", etage: "", etat: "bon",
    dpe: "", annee_construction: "", parking: false, cave: false, balcon: false,
    type_bien: "appartement", ascenseur: false, gardien: false,
    details_supplementaires: "",
  });

  const estimer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse) { toast.error(lang === "fr" ? "Adresse requise" : "Address required"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-estimation", {
        body: {
          ...form,
          surface: form.surface ? Number(form.surface) : undefined,
          pieces: form.pieces ? Number(form.pieces) : undefined,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setResult(data);
      setEditableResult(data);
      toast.success(lang === "fr" ? "Estimation générée" : "Estimation generated");
    } catch (e: any) {
      toast.error(e.message || (lang === "fr" ? "Erreur lors de l'estimation" : "Estimation error"));
    } finally {
      setLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!editableResult) return;
    const content = `RAPPORT D'ESTIMATION IMMOBILIÈRE\n\nBien estimé : ${form.adresse}\nType : ${form.type_bien}\nSurface : ${form.surface || "N/C"} m² | Pièces : ${form.pieces || "N/C"} | DPE : ${form.dpe || "N/C"}\n\n${"═".repeat(40)}\n\nFOURCHETTE DE PRIX\nPrix minimum : ${editableResult.prix_min?.toLocaleString("fr-FR")} €\nPrix moyen estimé : ${editableResult.prix_moyen?.toLocaleString("fr-FR")} €\nPrix maximum : ${editableResult.prix_max?.toLocaleString("fr-FR")} €\nPrix au m² du secteur : ${editableResult.prix_m2_secteur?.toLocaleString("fr-FR")} €/m²\n\n${"═".repeat(40)}\n\nANALYSE DU MARCHÉ LOCAL\n${editableResult.analyse_marche}\n\n${"═".repeat(40)}\n\nCOMPARAISON QUARTIER\n${editableResult.comparaison_quartier}\n\n${"═".repeat(40)}\n\nHISTORIQUE DES VENTES RÉCENTES\n${editableResult.historique_ventes}\n\n${"═".repeat(40)}\n\nTENDANCE DU MARCHÉ (12 MOIS)\n${editableResult.tendance_12_mois}\n\n${"═".repeat(40)}\n\nRECOMMANDATION DE PRIX\nPrix recommandé : ${editableResult.recommandation_prix?.toLocaleString("fr-FR")} €\n${editableResult.argumentaire_prix}\n\n${"═".repeat(40)}\n\nCONCLUSION\n${editableResult.conclusion}\n\n───────────────────────────────────────\nGénéré par Estate AI`;
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `estimation-${form.adresse.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(lang === "fr" ? "Rapport téléchargé" : "Report downloaded");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-primary" />
          Estimation <span className="gradient-text">IA</span>
        </h1>
        <p className="page-subtitle">{lang === "fr" ? "Estimez vos biens avec précision grâce aux données du marché" : "Estimate properties accurately with market data"}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> {lang === "fr" ? "Informations du bien" : "Property Information"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={estimer} className="space-y-4">
              <div>
                <Label className="text-xs">{lang === "fr" ? "Adresse *" : "Address *"}</Label>
                <Input value={form.adresse} onChange={e => setForm({ ...form, adresse: e.target.value })} className="mt-1 bg-muted/10 border-border/30" placeholder="12 rue de Rivoli, 75001 Paris" />
              </div>

              {/* Type de bien */}
              <div>
                <Label className="text-xs">{lang === "fr" ? "Type de bien" : "Property type"}</Label>
                <Select value={form.type_bien} onValueChange={v => setForm({ ...form, type_bien: v })}>
                  <SelectTrigger className="mt-1 bg-muted/10 border-border/30"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="appartement">{lang === "fr" ? "Appartement" : "Apartment"}</SelectItem>
                    <SelectItem value="maison">{lang === "fr" ? "Maison" : "House"}</SelectItem>
                    <SelectItem value="studio">Studio</SelectItem>
                    <SelectItem value="loft">Loft</SelectItem>
                    <SelectItem value="duplex">Duplex</SelectItem>
                    <SelectItem value="terrain">{lang === "fr" ? "Terrain" : "Land"}</SelectItem>
                    <SelectItem value="commercial">{lang === "fr" ? "Local commercial" : "Commercial"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">{lang === "fr" ? "Surface (m²)" : "Area (m²)"}</Label><NumberInput value={form.surface} onChange={v => setForm({ ...form, surface: v })} className="mt-1 bg-muted/10 border-border/30" /></div>
                <div><Label className="text-xs">{lang === "fr" ? "Nombre de pièces" : "Rooms"}</Label><NumberInput value={form.pieces} onChange={v => setForm({ ...form, pieces: v })} className="mt-1 bg-muted/10 border-border/30" /></div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">{lang === "fr" ? "Étage" : "Floor"}</Label><Input value={form.etage} onChange={e => setForm({ ...form, etage: e.target.value })} className="mt-1 bg-muted/10 border-border/30" placeholder="3ème" /></div>
                <div>
                  <Label className="text-xs">{lang === "fr" ? "État général" : "Condition"}</Label>
                  <Select value={form.etat} onValueChange={v => setForm({ ...form, etat: v })}>
                    <SelectTrigger className="mt-1 bg-muted/10 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="neuf">{lang === "fr" ? "Neuf" : "New"}</SelectItem>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="bon">{lang === "fr" ? "Bon" : "Good"}</SelectItem>
                      <SelectItem value="correct">{lang === "fr" ? "Correct" : "Fair"}</SelectItem>
                      <SelectItem value="a_renover">{lang === "fr" ? "À rénover" : "To renovate"}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">DPE</Label>
                  <Select value={form.dpe} onValueChange={v => setForm({ ...form, dpe: v })}>
                    <SelectTrigger className="mt-1 bg-muted/10 border-border/30"><SelectValue placeholder={lang === "fr" ? "Sélectionner" : "Select"} /></SelectTrigger>
                    <SelectContent>{["A", "B", "C", "D", "E", "F", "G"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">{lang === "fr" ? "Année construction" : "Year built"}</Label><NumberInput value={form.annee_construction} onChange={v => setForm({ ...form, annee_construction: v })} format="plain" className="mt-1 bg-muted/10 border-border/30" placeholder="1975" /></div>
              </div>

              {/* Options Oui/Non */}
              <div>
                <Label className="text-xs mb-2 block">{lang === "fr" ? "Équipements" : "Amenities"}</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { key: "parking", label: "Parking" },
                    { key: "cave", label: lang === "fr" ? "Cave" : "Cellar" },
                    { key: "balcon", label: lang === "fr" ? "Balcon/Terrasse" : "Balcony/Terrace" },
                    { key: "ascenseur", label: lang === "fr" ? "Ascenseur" : "Elevator" },
                    { key: "gardien", label: lang === "fr" ? "Gardien" : "Concierge" },
                  ].map(opt => (
                    <div key={opt.key} className="flex items-center gap-2">
                      <Checkbox checked={(form as any)[opt.key]} onCheckedChange={c => setForm({ ...form, [opt.key]: !!c })} />
                      <Label className="text-xs">{opt.label}</Label>
                    </div>
                  ))}
                </div>
              </div>

              {/* Details supplementaires */}
              <div>
                <Label className="text-xs">{lang === "fr" ? "Détails supplémentaires" : "Additional details"}</Label>
                <Textarea
                  value={form.details_supplementaires}
                  onChange={e => setForm({ ...form, details_supplementaires: e.target.value })}
                  className="mt-1 bg-muted/10 border-border/30"
                  rows={3}
                  placeholder={lang === "fr" ? "Vue dégagée, double exposition, travaux récents, proximité métro..." : "Clear view, dual aspect, recent works, near subway..."}
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {lang === "fr" ? "L'IA analyse les prix du quartier..." : "AI is analyzing local prices..."}</> : <><Sparkles className="h-4 w-4 mr-2" /> {lang === "fr" ? "Estimer ce bien" : "Estimate this property"}</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {editableResult ? (
          <div className="space-y-4">
            <Card className="bg-card/60 border-primary/20 glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> {lang === "fr" ? "Fourchette de prix" : "Price Range"}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-3 mb-3">
                  <div className="bg-muted/10 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Minimum</p>
                    <p className="text-sm font-bold mt-1">{editableResult.prix_min?.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-3 text-center border border-primary/20">
                    <p className="text-[10px] text-primary uppercase">{lang === "fr" ? "Estimé" : "Estimated"}</p>
                    <p className="text-lg font-bold mt-1 text-primary">{editableResult.prix_moyen?.toLocaleString("fr-FR")} €</p>
                  </div>
                  <div className="bg-muted/10 rounded-lg p-3 text-center">
                    <p className="text-[10px] text-muted-foreground uppercase">Maximum</p>
                    <p className="text-sm font-bold mt-1">{editableResult.prix_max?.toLocaleString("fr-FR")} €</p>
                  </div>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Prix/m² : {editableResult.prix_m2_secteur?.toLocaleString("fr-FR")} €/m²</span>
                  <span>{lang === "fr" ? "Recommandé" : "Recommended"} : {editableResult.recommandation_prix?.toLocaleString("fr-FR")} €</span>
                </div>
              </CardContent>
            </Card>

            {[
              { key: "analyse_marche", title: lang === "fr" ? "Analyse du marché local" : "Local Market Analysis", icon: BarChart3 },
              { key: "comparaison_quartier", title: lang === "fr" ? "Comparaison quartier" : "Neighborhood Comparison", icon: MapPin },
              { key: "historique_ventes", title: lang === "fr" ? "Ventes récentes similaires" : "Recent Similar Sales", icon: TrendingUp },
              { key: "tendance_12_mois", title: lang === "fr" ? "Tendance 12 mois" : "12-Month Trend", icon: TrendingUp },
              { key: "argumentaire_prix", title: lang === "fr" ? "Argumentaire prix" : "Price Argument", icon: Target },
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
                  <Textarea value={editableResult[section.key] || ""} onChange={e => setEditableResult({ ...editableResult, [section.key]: e.target.value })} className="bg-muted/5 border-border/20 text-sm min-h-[80px]" />
                </CardContent>
              </Card>
            ))}

            <div className="flex gap-2">
              <Button className="flex-1" onClick={downloadPDF}><Download className="h-4 w-4 mr-2" /> {lang === "fr" ? "Télécharger le rapport" : "Download report"}</Button>
              <Button variant="outline" onClick={() => toast.info(lang === "fr" ? "Sauvegarde liée au client à venir" : "Client-linked save coming soon")}><Save className="h-4 w-4 mr-2" /> {lang === "fr" ? "Sauvegarder" : "Save"}</Button>
            </div>
          </div>
        ) : (
          <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[400px]">
            <div className="text-center space-y-2">
              <TrendingUp className="h-12 w-12 text-muted-foreground/20 mx-auto" />
              <p className="text-sm text-muted-foreground">{lang === "fr" ? "Votre estimation apparaîtra ici" : "Your estimation will appear here"}</p>
              <p className="text-xs text-muted-foreground/60">{lang === "fr" ? "Basée sur DVF, INSEE et observatoires locaux" : "Based on DVF, INSEE and local data"}</p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default EstimationIA;
