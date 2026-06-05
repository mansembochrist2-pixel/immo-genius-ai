import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp, MapPin, Loader2, Sparkles, Download, Save, Pencil,
  Home, BarChart3, Target, ArrowRight, Wand2, Database, ExternalLink, Activity,
} from "lucide-react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { exportTextToDocx } from "@/lib/docx-export";
import { exportEstimationDocx } from "@/lib/estimation-docx";
import { ValorisationTabs } from "@/components/valorisation/ValorisationTabs";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { preloadRoute } from "@/lib/routeLoader";
import { Bot } from "lucide-react";
import { SavedItemsPanel } from "@/components/SavedItemsPanel";
import { useQueryClient } from "@tanstack/react-query";

const EstimationIA = () => {
  const { user } = useAuth();
  const { lang } = useLanguage();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editableResult, setEditableResult] = useState<any>(null);
  const [dvfData, setDvfData] = useState<any>(null);
  const [loadingDvf, setLoadingDvf] = useState(false);
  const [inseeData, setInseeData] = useState<any>(null);
  const [form, setForm] = useState({
    adresse: "", surface: "", pieces: "", etage: "", etat: "bon",
    dpe: "", annee_construction: "", parking: false, cave: false, balcon: false,
    type_bien: "appartement", ascenseur: false, gardien: false,
    details_supplementaires: "",
  });

  const [showValidation, setShowValidation] = useState(false);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse) { toast.error(lang === "fr" ? "Adresse requise" : "Address required"); return; }
    setShowValidation(true);
  };

  const estimer = async () => {
    setShowValidation(false);
    setLoading(true);
    setDvfData(null);
    setInseeData(null);
    setLoadingDvf(true);

    // 1. DVF d'abord (l'IA en a besoin)
    let dvf: any = null;
    try {
      const { data } = await supabase.functions.invoke("dvf-lookup", {
        body: { adresse: form.adresse, surface: form.surface ? Number(form.surface) : undefined, type_bien: form.type_bien },
      });
      dvf = data;
      setDvfData(data);
    } catch (err) {
      console.error("DVF lookup failed", err);
    } finally {
      setLoadingDvf(false);
    }

    // 2. INSEE (parallèle à l'IA — non bloquant pour le prompt si lent, mais on l'attend)
    let insee: any = null;
    try {
      const codeDept = dvf?.code_postal ? String(dvf.code_postal).slice(0, 2) : "";
      const { data } = await supabase.functions.invoke("prix-marche-insee", {
        body: { code_departement: codeDept, commune: dvf?.ville },
      });
      insee = data;
      setInseeData(data);
    } catch (err) {
      console.error("INSEE lookup failed", err);
    }

    // 3. IA avec données réelles injectées
    try {
      const { data, error } = await supabase.functions.invoke("generate-estimation", {
        body: {
          ...form,
          surface: form.surface ? Number(form.surface) : undefined,
          pieces: form.pieces ? Number(form.pieces) : undefined,
          dvf_data: dvf,
          insee_data: insee,
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

  const downloadWord = async () => {
    if (!editableResult) return;
    try {
      await exportEstimationDocx(
        {
          form,
          result: editableResult,
          dvf: dvfData,
          insee: inseeData,
          agent: {
            nom: user?.user_metadata?.full_name,
            agence: user?.user_metadata?.agency_name,
          },
        },
        `Estimation_${form.adresse.replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}.docx`,
      );
      toast.success(lang === "fr" ? "Rapport Word téléchargé" : "Word report downloaded");
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || "Erreur d'export");
    }
  };

  const queryClient = useQueryClient();

  const sauvegarderEstimation = async () => {
    if (!editableResult || !user) return;
    try {
      const { error } = await supabase.from("analyses_zone").insert({
        user_id: user.id,
        adresse: form.adresse,
        secteur: form.adresse,
        titre: form.adresse,
        resultat: { ...editableResult, form, dvfData, inseeData },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["saved-estimations-panel", user.id] });
      toast.success(lang === "fr" ? "Estimation sauvegardée" : "Estimation saved", {
        action: {
          label: lang === "fr" ? "Voir" : "View",
          onClick: () => navigate("/sauvegardes"),
        },
      });
    } catch (e: any) {
      toast.error(e.message || "Erreur de sauvegarde");
    }
  };

  const loadSavedEstimation = (row: any) => {
    const r = row.resultat || {};
    if (r.form) setForm({ ...form, ...r.form });
    if (r.dvfData) setDvfData(r.dvfData);
    if (r.inseeData) setInseeData(r.inseeData);
    const { form: _f, dvfData: _d, inseeData: _i, ...rest } = r;
    setResult(rest);
    setEditableResult(rest);
    toast.success(lang === "fr" ? "Estimation chargée" : "Estimation loaded");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <TrendingUp className="h-7 w-7 text-primary" />
              <span className="gradient-text">Valorisation</span>
            </h1>
            <p className="page-subtitle">{lang === "fr" ? "Estimez la valeur de marché d'un bien, puis basculez en un clic vers l'analyse rentabilité & expertise patrimoniale." : "Estimate market value, then switch to full rentability & expertise analysis."}</p>
          </div>
          <SavedItemsPanel
            title={lang === "fr" ? "Mes estimations" : "My estimations"}
            table="analyses_zone"
            queryKey="saved-estimations-panel"
            userId={user?.id}
            defaultTitle={(r: any) => r.adresse || "Estimation"}
            subtitle={(r: any) => {
              const p = r.resultat?.prix_moyen;
              return p ? `${Number(p).toLocaleString("fr-FR")} € · ${new Date(r.created_at).toLocaleDateString("fr-FR")}` : new Date(r.created_at).toLocaleDateString("fr-FR");
            }}
            onLoad={loadSavedEstimation}
            triggerLabel={lang === "fr" ? "Mes estimations" : "Saved"}
          />
        </div>
      </div>


      <ValorisationTabs current="estimation" />


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Home className="h-4 w-4 text-primary" /> {lang === "fr" ? "Informations du bien" : "Property Information"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={onSubmit} className="space-y-4">
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
                <Label className="text-xs mb-1 block">{lang === "fr" ? "Détails supplémentaires" : "Additional details"}</Label>
                <VoiceTextarea
                  value={form.details_supplementaires}
                  onChange={e => setForm({ ...form, details_supplementaires: e.target.value })}
                  onTranscript={(text) => setForm(f => ({ ...f, details_supplementaires: (f.details_supplementaires + " " + text).trim() }))}
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

        {loading && !editableResult ? (
          <div className="space-y-4">
            <AnalysisLoader
              module={lang === "fr" ? "Estimation IA" : "AI Estimation"}
              context={form.adresse}
              eta={lang === "fr" ? "20 à 60 secondes" : "20 to 60 seconds"}
              messages={lang === "fr" ? [
                "Géolocalisation du bien et analyse de la zone…",
                "Récupération des ventes officielles DVF (data.gouv)…",
                "Croisement avec les biens comparables récents…",
                "Pondération des critères (état, DPE, étage, équipements)…",
                "Analyse de la tension de marché et de la liquidité…",
                "Construction de la fourchette de prix recommandée…",
                "Rédaction de l'argumentaire prix et de la conclusion…",
              ] : [
                "Geolocating the property and analyzing the area…",
                "Fetching official DVF sales (data.gouv)…",
                "Cross-checking against recent comparable sales…",
                "Weighing condition, EPC, floor, amenities…",
                "Analyzing market tension and liquidity…",
                "Building the recommended price range…",
                "Drafting the price argument and conclusion…",
              ]}
            />
          </div>
        ) : editableResult ? (
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

            {/* === SECTION SOURCES & DATA DVF === */}
            <Card className="bg-card/60 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Database className="h-4 w-4 text-primary" /> {lang === "fr" ? "Sources & Données réelles" : "Sources & Real Data"}
                  {dvfData?.source && (
                    <Badge variant="outline" className="text-[9px] ml-auto gap-1">
                      <a href={dvfData.url_source || "https://app.dvf.etalab.gouv.fr/"} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1">
                        DVF data.gouv <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingDvf ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {lang === "fr" ? "Récupération des ventes officielles DVF..." : "Fetching official DVF sales..."}
                  </div>
                ) : dvfData?.ventes && dvfData.ventes.length > 0 ? (
                  <div className="space-y-3">
                    {/* Indicateurs de tension */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-muted/10 rounded p-2 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground">{lang === "fr" ? "Prix m² médian" : "Median €/m²"}</p>
                        <p className="text-sm font-bold mt-0.5">{dvfData.prix_m2_median?.toLocaleString("fr-FR") || "—"} €</p>
                      </div>
                      <div className="bg-muted/10 rounded p-2 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground">{lang === "fr" ? "Tension marché" : "Market tension"}</p>
                        <p className="text-sm font-bold mt-0.5 flex items-center justify-center gap-1">
                          <Activity className="h-3 w-3" />
                          {dvfData.tension_marche || "—"}
                        </p>
                      </div>
                      <div className="bg-muted/10 rounded p-2 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground">{lang === "fr" ? "Ventes 12 mois" : "Sales 12mo"}</p>
                        <p className="text-sm font-bold mt-0.5">{dvfData.volume_12_mois || 0}</p>
                      </div>
                    </div>

                    {/* 3 dernières ventes */}
                    <div>
                      <p className="text-[10px] uppercase text-muted-foreground mb-1.5">
                        {lang === "fr" ? `3 ventes similaires récentes — ${dvfData.ville}` : `3 recent similar sales — ${dvfData.ville}`}
                      </p>
                      <div className="space-y-1.5">
                        {dvfData.ventes.map((v: any, i: number) => (
                          <div key={i} className="flex items-center justify-between bg-muted/5 rounded px-2.5 py-1.5 text-xs">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {[v.adresse_numero, v.adresse_nom_voie].filter(Boolean).join(" ") || v.type_local}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {v.surface_relle_bati} m² · {v.nombre_pieces_principales || "?"} p · {new Date(v.date_mutation).toLocaleDateString("fr-FR", { month: "short", year: "numeric" })}
                              </p>
                            </div>
                            <div className="text-right shrink-0 ml-2">
                              <p className="font-bold">{v.valeur_fonciere?.toLocaleString("fr-FR")} €</p>
                              <p className="text-[10px] text-primary">{v.prix_m2?.toLocaleString("fr-FR")} €/m²</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <p className="text-[10px] text-muted-foreground italic">
                      {lang === "fr" ? "Données officielles publiées par la DGFiP via Etalab. Mise à jour : " : "Official data published by DGFiP via Etalab. Updated: "}
                      {new Date(dvfData.date_extraction).toLocaleDateString("fr-FR")}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground italic py-2">
                    {dvfData?.message || (lang === "fr"
                      ? "Aucune vente DVF correspondante trouvée pour ce secteur — l'estimation reste basée sur l'analyse IA du marché."
                      : "No matching DVF sales found — estimation relies on AI market analysis.")}
                  </div>
                )}
              </CardContent>
            </Card>

            {inseeData?.evolution_3_ans?.length > 0 && (
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {lang === "fr" ? "Tendance Notaires-INSEE" : "Notaires-INSEE Trend"}
                    <Badge variant="outline" className="text-[9px] ml-auto">
                      {inseeData.live ? "Live INSEE" : "Indice publié"}
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className={`text-xl font-bold ${inseeData.variation_3_ans_pct >= 0 ? "text-success" : "text-destructive"}`}>
                      {inseeData.variation_3_ans_pct >= 0 ? "+" : ""}{inseeData.variation_3_ans_pct}%
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {lang === "fr" ? "sur la période" : "over period"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {inseeData.evolution_3_ans.map((e: any) => (
                      <div key={e.annee} className="bg-muted/10 rounded p-2 text-center">
                        <p className="text-[10px] text-muted-foreground">{e.annee}</p>
                        <p className="text-xs font-semibold">{e.indice}</p>
                        <p className={`text-[10px] ${e.variation_pct >= 0 ? "text-success" : "text-destructive"}`}>
                          {e.variation_pct >= 0 ? "+" : ""}{e.variation_pct}%
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[10px] text-muted-foreground italic mt-2">{inseeData.source}</p>
                </CardContent>
              </Card>
            )}


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

            <div className="flex flex-wrap gap-2">
              <Button
                className="flex-1 min-w-[200px] bg-primary text-primary-foreground hover:bg-primary/90"
                onMouseEnter={() => preloadRoute.expertise()}
                onClick={() => {
                  preloadRoute.expertise();
                  sessionStorage.setItem("expertise_prefill", JSON.stringify({
                    adresse: form.adresse,
                    type_bien: form.type_bien,
                    surface: form.surface,
                    pieces: form.pieces,
                    annee_construction: form.annee_construction,
                    etat: form.etat,
                    dpe: form.dpe,
                    prix_acquisition: editableResult.recommandation_prix || editableResult.prix_moyen,
                  }));
                  navigate("/valorisation/expertise");
                }}
              >
                <BarChart3 className="h-4 w-4 mr-2" /> {lang === "fr" ? "Analyser la Rentabilité & Valorisation" : "Analyze Rentability & Valuation"}
              </Button>
              <Button variant="outline" className="flex-1 min-w-[160px]" onClick={downloadWord}><Download className="h-4 w-4 mr-2" /> {lang === "fr" ? "Télécharger en Word" : "Download as Word"}</Button>
              <Button variant="outline" className="flex-1 min-w-[160px]" onClick={sauvegarderEstimation}><Save className="h-4 w-4 mr-2" /> {lang === "fr" ? "Sauvegarder" : "Save"}</Button>
              <Button variant="default" className="flex-1 min-w-[160px] bg-accent text-accent-foreground hover:bg-accent/90" onClick={() => {
                sessionStorage.setItem("annonce_prefill", JSON.stringify({
                  adresse: form.adresse,
                  prix: editableResult.recommandation_prix?.toString() || editableResult.prix_moyen?.toString() || "",
                  surface: form.surface,
                  description: `${form.type_bien} ${form.pieces ? form.pieces + " pièces" : ""}${form.etage ? ", étage " + form.etage : ""}, état ${form.etat}${form.dpe ? ", DPE " + form.dpe : ""}. ${[form.parking && "Parking", form.cave && "Cave", form.balcon && "Balcon/Terrasse", form.ascenseur && "Ascenseur", form.gardien && "Gardien"].filter(Boolean).join(", ")}. ${form.details_supplementaires || ""}`.trim(),
                }));
                toast.success(lang === "fr" ? "Estimation envoyée vers le Studio" : "Estimation sent to Studio");
                navigate("/studio");
              }}><Wand2 className="h-4 w-4 mr-2" /> {lang === "fr" ? "Générer l'annonce" : "Generate listing"}</Button>
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

      {/* Validation dialog before launching estimation */}
      <AlertDialog open={showValidation} onOpenChange={setShowValidation}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {lang === "fr" ? "Vérifiez les informations du bien" : "Please verify property information"}
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                {lang === "fr"
                  ? "Merci de vérifier attentivement les informations renseignées concernant le bien. Toute erreur ou approximation pourrait impacter significativement la précision de l'estimation."
                  : "Please carefully review the property information you entered. Any error or approximation may significantly impact estimation accuracy."}
              </span>
              <span className="block bg-muted/30 rounded p-2 text-xs">
                <strong>{form.adresse}</strong> — {form.type_bien}
                {form.surface ? ` · ${form.surface} m²` : ""}
                {form.pieces ? ` · ${form.pieces} p` : ""}
                {form.dpe ? ` · DPE ${form.dpe}` : ""}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{lang === "fr" ? "Modifier" : "Edit"}</AlertDialogCancel>
            <AlertDialogAction onClick={estimer}>
              {lang === "fr" ? "C'est correct, lancer l'estimation" : "It's correct, launch estimation"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default EstimationIA;
