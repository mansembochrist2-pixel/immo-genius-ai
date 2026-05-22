import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  Sparkles, Loader2, Download, Save, FileText, Info,
  TrendingUp, Calculator, FileDown,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  computeExpertise,
  DEFAULT_INPUTS,
  ExpertiseInputs,
  ExpertiseResults,
} from "@/lib/expertise-calc";
import { exportExpertisePDF, exportExpertiseDocx, NarrativeReport } from "@/lib/expertise-export";
import { ValorisationTabs } from "@/components/valorisation/ValorisationTabs";
import { SourceHint, DISCLAIMER_TEXT } from "@/components/valorisation/SourceHint";
import { ExpertiseCharts } from "@/components/valorisation/ExpertiseCharts";

import { PremiumKpis } from "@/components/valorisation/PremiumKpis";
import { ConseilStrategique } from "@/components/valorisation/ConseilStrategique";
import { StrategeIA } from "@/components/valorisation/StrategeIA";
import { AnalysisLoader } from "@/components/AnalysisLoader";

const fmtEur = (n?: number) =>
  n == null || isNaN(n) ? "—" : `${Math.round(n).toLocaleString("fr-FR")} €`;
const fmtPct = (n?: number) =>
  n == null || isNaN(n) ? "—" : `${n.toFixed(2).replace(".", ",")} %`;

const STORAGE_KEY = "expertise_prefill";

export default function Expertise() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Prefill from Valorisation IA (sessionStorage) — consumed during initial
  // render so even an immediate remount keeps the data. We then clear the key
  // in a useEffect once mounted (so React StrictMode double-invoke is safe).
  const [inputs, setInputs] = useState<ExpertiseInputs>(() => {
    const base: ExpertiseInputs = {
      type_bien: "appartement",
      adresse: "",
      surface: 0,
      pieces: 0,
      annee_construction: undefined,
      etat: "bon",
      dpe: "D",
      prix_acquisition: 0,
      loyer_mensuel: 0,
      ...DEFAULT_INPUTS,
    } as ExpertiseInputs;
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return base;
      const data = JSON.parse(raw);
      return {
        ...base,
        adresse: data.adresse || base.adresse,
        type_bien: data.type_bien || base.type_bien,
        surface: Number(data.surface) || base.surface,
        pieces: Number(data.pieces) || base.pieces,
        annee_construction: data.annee_construction ? Number(data.annee_construction) : base.annee_construction,
        etat: data.etat || base.etat,
        dpe: data.dpe || base.dpe,
        prix_acquisition: Number(data.prix_acquisition) || base.prix_acquisition,
      };
    } catch {
      return base;
    }
  });

  const [loadingPrefill, setLoadingPrefill] = useState(false);
  const [loadingNarrative, setLoadingNarrative] = useState(false);
  const [saving, setSaving] = useState(false);
  const [narrative, setNarrative] = useState<NarrativeReport | null>(null);
  const [prefillNote, setPrefillNote] = useState<string>("");

  // Auto-import + auto-prefill quand on arrive depuis Valorisation IA.
  useEffect(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) {
      sessionStorage.removeItem(STORAGE_KEY);
      toast.success("Données importées — pré-remplissage IA en cours…");
      // Auto-lance le prefill : pas besoin de cliquer
      setTimeout(() => { lancerPrefillIA(); }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const results: ExpertiseResults = useMemo(() => computeExpertise(inputs), [inputs]);

  const set = <K extends keyof ExpertiseInputs>(key: K, value: ExpertiseInputs[K]) =>
    setInputs((prev) => ({ ...prev, [key]: value }));

  const lancerPrefillIA = async () => {
    if (!inputs.adresse || !inputs.surface) {
      toast.error("Adresse et surface requises pour le pré-remplissage IA.");
      return;
    }
    setLoadingPrefill(true);
    try {
      const { data, error } = await supabase.functions.invoke("expertise-valorisation", {
        body: { mode: "prefill", inputs },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setInputs((prev) => ({
        ...prev,
        loyer_mensuel: data.loyer_mensuel ?? prev.loyer_mensuel,
        loyer_plafond: data.loyer_plafond ?? prev.loyer_plafond,
        encadrement_loyer: !!data.encadrement_loyer,
        charges_copro_annuelles: data.charges_copro_annuelles ?? prev.charges_copro_annuelles,
        taxe_fonciere_annuelle: data.taxe_fonciere_annuelle ?? prev.taxe_fonciere_annuelle,
        cout_travaux: data.cout_travaux ?? prev.cout_travaux,
        aides_renovation: data.aides_renovation ?? prev.aides_renovation,
        gain_loyer_post_travaux: data.gain_loyer_post_travaux ?? prev.gain_loyer_post_travaux,
        economie_charges_post_travaux: data.economie_charges_post_travaux ?? prev.economie_charges_post_travaux,
        frais_notaire_pct: data.frais_notaire_pct ?? prev.frais_notaire_pct,
      }));
      setPrefillNote(data.commentaire_sources || "Pré-remplissage basé sur DVF, ADEME et observatoires locaux.");
      toast.success("Données pré-remplies par l'IA. Vous pouvez tout modifier.");
    } catch (e: any) {
      toast.error(e.message || "Erreur lors du pré-remplissage IA");
    } finally {
      setLoadingPrefill(false);
    }
  };

  const genererRapport = async () => {
    if (!inputs.adresse || !inputs.prix_acquisition || !inputs.loyer_mensuel) {
      toast.error("Adresse, prix d'acquisition et loyer mensuel sont nécessaires.");
      return;
    }
    setLoadingNarrative(true);
    try {
      const { data, error } = await supabase.functions.invoke("expertise-valorisation", {
        body: { mode: "narrative", inputs, results },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setNarrative(data);
      toast.success("Rapport d'expertise généré.");
    } catch (e: any) {
      toast.error(e.message || "Erreur de génération du rapport");
    } finally {
      setLoadingNarrative(false);
    }
  };

  const sauvegarder = async () => {
    if (!user || !narrative) return;
    setSaving(true);
    try {
      const { error } = await supabase.from("expertise_reports").insert({
        user_id: user.id,
        adresse: inputs.adresse,
        type_bien: inputs.type_bien,
        inputs: inputs as any,
        results: results as any,
        narrative: narrative as any,
      });
      if (error) throw error;
      toast.success("Dossier sauvegardé.");
    } catch (e: any) {
      toast.error(e.message || "Erreur de sauvegarde");
    } finally {
      setSaving(false);
    }
  };

  const downloadPDF = () => {
    if (!narrative) return;
    exportExpertisePDF(inputs, results, narrative, {
      nom: user?.user_metadata?.full_name,
      agence: user?.user_metadata?.agency_name,
    });
  };
  const downloadDocx = async () => {
    if (!narrative) return;
    await exportExpertiseDocx(inputs, results, narrative, {
      nom: user?.user_metadata?.full_name,
      agence: user?.user_metadata?.agency_name,
    });
  };

  const NarrativeBlock = ({
    label, value, onChange,
  }: { label: string; value: string; onChange: (v: string) => void }) => (
    <div>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <Textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 bg-muted/5 border-border/20 min-h-[110px]"
      />
    </div>
  );

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <TrendingUp className="h-7 w-7 text-primary" />
          <span className="gradient-text">Valorisation</span>
        </h1>
        <p className="page-subtitle">
          Analyse financière complète : rentabilité, simulation post-rénovation, plus-value, cash-flow.
        </p>
      </div>

      <ValorisationTabs current="expertise" />

      <TooltipProvider delayDuration={200}>
        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* === INPUTS === */}
          <Card className="xl:col-span-2 bg-card/60 border-border/30 xl:sticky xl:top-20 xl:self-start">

            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                Paramètres de l'expertise
                {loadingPrefill && <Loader2 className="h-3.5 w-3.5 ml-auto animate-spin text-primary" />}
              </CardTitle>
              {prefillNote && (
                <p className="text-[10px] text-muted-foreground italic flex items-start gap-1">
                  <Info className="h-3 w-3 mt-0.5 shrink-0" /> {prefillNote}
                </p>
              )}
            </CardHeader>
            <CardContent className="space-y-5 xl:max-h-[calc(100vh-260px)] xl:overflow-y-auto xl:pr-2">
              {/* Bien */}
              <section className="space-y-3">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Le bien</p>
                <div>
                  <Label className="text-xs">Adresse *</Label>
                  <Input value={inputs.adresse} onChange={(e) => set("adresse", e.target.value)} className="mt-1 h-9" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Type</Label>
                    <Select value={inputs.type_bien} onValueChange={(v) => set("type_bien", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="appartement">Appartement</SelectItem>
                        <SelectItem value="maison">Maison</SelectItem>
                        <SelectItem value="immeuble">Immeuble de rapport</SelectItem>
                        <SelectItem value="commercial">Local commercial</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">État</Label>
                    <Select value={inputs.etat} onValueChange={(v) => set("etat", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["neuf", "tres_bon", "bon", "rafraichissement", "renovation_legere", "renovation_lourde"].map(v => (
                          <SelectItem key={v} value={v}>{v.replace("_", " ")}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  <div><Label className="text-xs">Surface m²</Label><NumberInput value={String(inputs.surface)} onChange={v => set("surface", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Pièces</Label><NumberInput value={String(inputs.pieces)} onChange={v => set("pieces", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Année</Label><NumberInput value={String(inputs.annee_construction ?? "")} onChange={v => set("annee_construction", Number(v) || undefined)} format="plain" className="mt-1 h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">DPE actuel</Label>
                    <Select value={inputs.dpe} onValueChange={(v) => set("dpe", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{["A","B","C","D","E","F","G"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-xs">DPE cible</Label>
                    <Select value={inputs.dpe_cible} onValueChange={(v) => set("dpe_cible", v)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{["A","B","C","D","E"].map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Prix d'acquisition (€)</Label>
                  <NumberInput value={String(inputs.prix_acquisition)} onChange={v => set("prix_acquisition", Number(v) || 0)} className="mt-1 h-9" />
                </div>
              </section>

              {/* Locatif */}
              <section className="space-y-3 pt-2 border-t border-border/20">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Investissement locatif</p>
                <div>
                  <Label className="text-xs">Type de location</Label>
                  <Select value={inputs.type_location} onValueChange={(v) => set("type_location", v as any)}>
                    <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nue">Nue</SelectItem>
                      <SelectItem value="meublee_lmnp">Meublée (LMNP)</SelectItem>
                      <SelectItem value="courte_duree">Courte durée (Airbnb)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Loyer mensuel (€) {prefillNote && <SourceHint source="Observatoires locaux des loyers, DVF, estimation IA" />}
                    </Label>
                    <NumberInput value={String(inputs.loyer_mensuel)} onChange={v => set("loyer_mensuel", Number(v) || 0)} className="mt-1 h-9" />
                  </div>
                  <div><Label className="text-xs">Vacance (%)</Label><NumberInput value={String(inputs.vacance_locative_pct)} onChange={v => set("vacance_locative_pct", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox checked={inputs.encadrement_loyer} onCheckedChange={(c) => set("encadrement_loyer", !!c)} />
                  <Label className="text-xs">Zone d'encadrement des loyers</Label>
                </div>
                {inputs.encadrement_loyer && (
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Loyer plafond (€) {prefillNote && <SourceHint source="Décrets préfectoraux d'encadrement (Paris, Lille, Lyon, Bordeaux, Montpellier...)" />}
                    </Label>
                    <NumberInput value={String(inputs.loyer_plafond ?? "")} onChange={v => set("loyer_plafond", Number(v) || undefined)} className="mt-1 h-9" />
                  </div>
                )}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Charges copro/an {prefillNote && <SourceHint source="Moyennes ANIL/INSEE pour le type de bien et la zone" />}
                    </Label>
                    <NumberInput value={String(inputs.charges_copro_annuelles)} onChange={v => set("charges_copro_annuelles", Number(v) || 0)} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Taxe foncière/an {prefillNote && <SourceHint source="Données DGFiP / collectivités locales pour la commune" />}
                    </Label>
                    <NumberInput value={String(inputs.taxe_fonciere_annuelle)} onChange={v => set("taxe_fonciere_annuelle", Number(v) || 0)} className="mt-1 h-9" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">GLI annuelle (€)</Label><NumberInput value={String(inputs.assurance_gli)} onChange={v => set("assurance_gli", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">PNO annuelle (€)</Label><NumberInput value={String(inputs.assurance_pno)} onChange={v => set("assurance_pno", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Gestion (% loyers)</Label><NumberInput value={String(inputs.frais_gestion_pct)} onChange={v => set("frais_gestion_pct", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Entretien (% prix)</Label><NumberInput value={String(inputs.entretien_pct)} onChange={v => set("entretien_pct", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
              </section>

              {/* Rénovation */}
              <section className="space-y-3 pt-2 border-t border-border/20">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Rénovation énergétique</p>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Coût travaux (€) {prefillNote && <SourceHint source="Barèmes ADEME / Effy pour passage du DPE actuel au DPE cible" />}
                    </Label>
                    <NumberInput value={String(inputs.cout_travaux)} onChange={v => set("cout_travaux", Number(v) || 0)} className="mt-1 h-9" />
                  </div>
                  <div>
                    <Label className="text-xs flex items-center gap-1">
                      Aides (€) {prefillNote && <SourceHint source="MaPrimeRénov' + CEE, barème 2025 (ANAH / France Rénov')" />}
                    </Label>
                    <NumberInput value={String(inputs.aides_renovation)} onChange={v => set("aides_renovation", Number(v) || 0)} className="mt-1 h-9" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Gain loyer/mois</Label><NumberInput value={String(inputs.gain_loyer_post_travaux)} onChange={v => set("gain_loyer_post_travaux", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Économie charges/an</Label><NumberInput value={String(inputs.economie_charges_post_travaux)} onChange={v => set("economie_charges_post_travaux", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
              </section>

              {/* Financement */}
              <section className="space-y-3 pt-2 border-t border-border/20">
                <p className="text-[10px] uppercase font-semibold text-muted-foreground tracking-wider">Financement & Fiscalité</p>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Apport (€)</Label><NumberInput value={String(inputs.apport)} onChange={v => set("apport", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Notaire (%)</Label><NumberInput value={String(inputs.frais_notaire_pct)} onChange={v => set("frais_notaire_pct", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Taux crédit (%)</Label><NumberInput value={String(inputs.taux_credit)} onChange={v => set("taux_credit", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Durée (ans)</Label><NumberInput value={String(inputs.duree_credit_annees)} onChange={v => set("duree_credit_annees", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Régime fiscal</Label>
                    <Select value={inputs.regime_fiscal} onValueChange={(v) => set("regime_fiscal", v as any)}>
                      <SelectTrigger className="mt-1 h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="micro_foncier">Micro-foncier</SelectItem>
                        <SelectItem value="reel_foncier">Réel foncier</SelectItem>
                        <SelectItem value="micro_bic">Micro-BIC (LMNP)</SelectItem>
                        <SelectItem value="reel_bic">Réel BIC (LMNP)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div><Label className="text-xs">TMI (%)</Label><NumberInput value={String(inputs.tmi)} onChange={v => set("tmi", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs">Détention (ans)</Label><NumberInput value={String(inputs.duree_detention_annees)} onChange={v => set("duree_detention_annees", Number(v) || 0)} className="mt-1 h-9" /></div>
                  <div><Label className="text-xs">Revalo/an (%)</Label><NumberInput value={String(inputs.revalorisation_annuelle_pct)} onChange={v => set("revalorisation_annuelle_pct", Number(v) || 0)} className="mt-1 h-9" /></div>
                </div>
              </section>
            </CardContent>
          </Card>

          {/* === RESULTS === */}
          <div className="xl:col-span-3 space-y-4">
            {loadingPrefill && (
              <AnalysisLoader
                module="Pré-remplissage IA"
                context={inputs.adresse || undefined}
                messages={[
                  "Connexion aux bases DVF, ADEME et observatoires locaux…",
                  "Estimation du loyer et du plafond légal éventuel…",
                  "Estimation des charges, taxe foncière et coût des travaux…",
                  "Calcul des aides MaPrimeRénov' & CEE…",
                  "Préparation des champs pré-remplis…",
                ]}
                eta="15 à 40 secondes"
              />
            )}
            {/* KPIs Premium en haut */}
            <PremiumKpis results={results} />

            {/* Conseil IA dynamique (instantané, déterministe) */}
            <ConseilStrategique inputs={inputs} results={results} />

            {/* Graphiques "Effet Wow" */}
            <ExpertiseCharts inputs={inputs} results={results} />

            {/* Stratège IA — cerveau central d'optimisation (déterministe + LLM + Apply temps réel) */}
            <StrategeIA
              inputs={inputs}
              results={results}
              onApply={(patch) => setInputs((prev) => ({ ...prev, ...patch }))}
            />





            {results.warnings.length > 0 && (
              <Card className="bg-amber-50 border-amber-200">
                <CardContent className="py-3 text-xs space-y-1">
                  {results.warnings.map((w, i) => <p key={i} className="text-amber-900">⚠ {w}</p>)}
                </CardContent>
              </Card>
            )}

            {/* Tabs détails */}
            <Tabs defaultValue="detail" className="w-full">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="detail">Détail calculs</TabsTrigger>
                <TabsTrigger value="comparatif">Avant / Après travaux</TabsTrigger>
                <TabsTrigger value="revente">Projection revente</TabsTrigger>
              </TabsList>

              <TabsContent value="detail" className="mt-4">
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="pt-5 space-y-2 text-sm">
                    <Row k="Prix d'acquisition total (avec frais)" v={fmtEur(results.prix_acquisition_total)} />
                    <Row k="Capital emprunté" v={fmtEur(results.capital_emprunte)} />
                    <Row k="Mensualité de crédit" v={fmtEur(results.mensualite_credit)} />
                    <Row k="Coût total du crédit" v={fmtEur(results.cout_total_credit)} />
                    <div className="my-2 border-t border-border/30" />
                    <Row k="Loyers annuels bruts" v={fmtEur(results.loyers_annuels_bruts)} />
                    <Row k="Loyers nets de vacance" v={fmtEur(results.loyers_annuels_nets_vacance)} />
                    <Row k="Charges annuelles totales" v={fmtEur(results.charges_annuelles_totales)} />
                    <Row k="Impôt annuel estimé" v={fmtEur(results.impot_annuel_estime)} />
                    <Row k="Cash-flow annuel" v={fmtEur(results.cash_flow_annuel)} bold />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="comparatif" className="mt-4">
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="pt-5">
                    <table className="w-full text-sm">
                      <thead className="text-xs text-muted-foreground">
                        <tr><th className="text-left pb-2">Indicateur</th><th className="text-right pb-2">Actuel</th><th className="text-right pb-2 text-primary">Optimisé</th></tr>
                      </thead>
                      <tbody className="divide-y divide-border/20">
                        <CompareRow label="Prix total" a={fmtEur(results.prix_acquisition_total)} b={fmtEur(results.post_travaux.prix_acquisition_total)} />
                        <CompareRow label="Loyers/an" a={fmtEur(results.loyers_annuels_bruts)} b={fmtEur(results.post_travaux.loyers_annuels_bruts)} />
                        <CompareRow label="Charges/an" a={fmtEur(results.charges_annuelles_totales)} b={fmtEur(results.post_travaux.charges_annuelles_totales)} />
                        <CompareRow label="Brute" a={fmtPct(results.rentabilite_brute)} b={fmtPct(results.post_travaux.rentabilite_brute)} />
                        <CompareRow label="Nette" a={fmtPct(results.rentabilite_nette)} b={fmtPct(results.post_travaux.rentabilite_nette)} />
                        <CompareRow label="Nette-nette" a={fmtPct(results.rentabilite_nette_nette)} b={fmtPct(results.post_travaux.rentabilite_nette_nette)} />
                        <CompareRow label="Cash-flow/mois" a={fmtEur(results.cash_flow_mensuel)} b={fmtEur(results.post_travaux.cash_flow_mensuel)} />
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="revente" className="mt-4">
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="pt-5 space-y-2 text-sm">
                    <Row k={`Prix de revente estimé à ${inputs.duree_detention_annees} ans`} v={fmtEur(results.prix_revente_estime)} />
                    <Row k="Plus-value brute estimée" v={fmtEur(results.plus_value_estimee_apres_n_ans)} bold />
                    <Row k="TRI simplifié sur la durée" v={fmtPct(results.tri_simplifie)} bold />
                    <p className="text-[11px] text-muted-foreground italic pt-2">
                      Sources : DVF/Etalab, INSEE, BOFIP (régimes LMNP 2025-2026), ADEME. Plus-value calculée avec une revalorisation annuelle de {inputs.revalorisation_annuelle_pct}%.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Génération rapport */}
            <Card className="bg-card/60 border-primary/20">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" /> Rapport client "Effet Wow"
                  {narrative && <Badge variant="outline" className="ml-auto text-[10px]">Éditable</Badge>}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {loadingNarrative && (
                  <AnalysisLoader
                    module="Rédaction du dossier d'expertise"
                    context={inputs.adresse || undefined}
                    messages={[
                      "Analyse des indicateurs de rentabilité…",
                      "Mise en perspective marché local & comparables DVF…",
                      "Rédaction de la synthèse exécutive…",
                      "Construction de la stratégie de valorisation…",
                      "Mise en forme du rapport client…",
                    ]}
                    eta="30 à 60 secondes"
                  />
                )}
                {!narrative ? (
                  !loadingNarrative && (
                    <Button className="w-full" onClick={genererRapport} disabled={loadingNarrative}>
                      <Sparkles className="h-4 w-4 mr-2" /> Générer le dossier d'expertise
                    </Button>
                  )
                ) : (
                  <>

                    <NarrativeBlock label="Synthèse exécutive" value={narrative.synthese_executive || ""} onChange={(v) => setNarrative({ ...narrative, synthese_executive: v })} />
                    <NarrativeBlock label="Analyse du bien & marché" value={narrative.analyse_actuelle || ""} onChange={(v) => setNarrative({ ...narrative, analyse_actuelle: v })} />
                    <NarrativeBlock label="Stratégie de valorisation" value={narrative.analyse_valorisation || ""} onChange={(v) => setNarrative({ ...narrative, analyse_valorisation: v })} />
                    <NarrativeBlock label="Analyse financière" value={narrative.analyse_financiere || ""} onChange={(v) => setNarrative({ ...narrative, analyse_financiere: v })} />
                    <NarrativeBlock label="Projection à la revente" value={narrative.plus_value_revente || ""} onChange={(v) => setNarrative({ ...narrative, plus_value_revente: v })} />
                    <NarrativeBlock label="Recommandation stratégique" value={narrative.recommandation_strategique || ""} onChange={(v) => setNarrative({ ...narrative, recommandation_strategique: v })} />
                    <NarrativeBlock label="Conclusion" value={narrative.conclusion || ""} onChange={(v) => setNarrative({ ...narrative, conclusion: v })} />

                    <div className="flex flex-wrap gap-2 pt-2">
                      <Button onClick={downloadPDF} className="flex-1 min-w-[140px]"><FileDown className="h-4 w-4 mr-2" /> Export PDF</Button>
                      <Button variant="secondary" onClick={downloadDocx} className="flex-1 min-w-[140px]"><Download className="h-4 w-4 mr-2" /> Export Word</Button>
                      <Button variant="outline" onClick={sauvegarder} disabled={saving} className="flex-1 min-w-[140px]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />} Sauvegarder
                      </Button>
                      <Button variant="ghost" onClick={genererRapport} disabled={loadingNarrative}>
                        <Sparkles className="h-4 w-4 mr-2" /> Régénérer
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Disclaimer légal */}
            <Card className="bg-muted/20 border-border/30">
              <CardContent className="py-3">
                <p className="text-[10px] text-muted-foreground leading-relaxed">
                  <span className="font-semibold text-foreground/80">Mentions légales — </span>
                  {DISCLAIMER_TEXT}
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </TooltipProvider>

    </AppLayout>
  );
}

function Kpi({ label, value, highlight, negative }: { label: string; value: string; highlight?: boolean; negative?: boolean }) {
  return (
    <Card className={`bg-card/60 border ${highlight ? "border-primary/30 shadow-sm" : "border-border/30"} ${negative ? "border-destructive/30" : ""}`}>
      <CardContent className="pt-4 pb-3">
        <p className="text-[10px] uppercase text-muted-foreground tracking-wider">{label}</p>
        <p className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""} ${negative ? "text-destructive" : ""}`}>{value}</p>
      </CardContent>
    </Card>
  );
}

function Row({ k, v, bold }: { k: string; v: string; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between py-1">
      <span className="text-muted-foreground">{k}</span>
      <span className={bold ? "font-bold" : "font-medium"}>{v}</span>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td className="py-2 text-muted-foreground">{label}</td>
      <td className="py-2 text-right">{a}</td>
      <td className="py-2 text-right font-bold text-primary">{b}</td>
    </tr>
  );
}
