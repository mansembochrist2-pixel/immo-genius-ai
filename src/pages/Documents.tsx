import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import {
  Palette, FileText, Sparkles, Wand2, Copy, Loader2, Download, Pencil,
} from "lucide-react";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { exportTextToDocx } from "@/lib/docx-export";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { SavedItemsPanel } from "@/components/SavedItemsPanel";
import { useQueryClient } from "@tanstack/react-query";

const ANNONCE_STYLES = [
  { value: "professionnel", label: "Professionnel", desc: "Ton sobre et structuré" },
  { value: "moderne", label: "Moderne", desc: "Ton dynamique et contemporain" },
  { value: "luxe", label: "Luxe", desc: "Ton haut de gamme et raffiné" },
];

const Studio = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // --- Annonces state ---
  const [annonceForm, setAnnonceForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<any>(null);
  const [loadingAnnonce, setLoadingAnnonce] = useState(false);
  const [editableAnnonce, setEditableAnnonce] = useState<Record<string, string>>({});
  const [editingAnnonceField, setEditingAnnonceField] = useState<string | null>(null);
  const [activeAnnonceFormat, setActiveAnnonceFormat] = useState<"courte" | "longue" | "premium">("longue");

  // Prefill from Estimation
  useEffect(() => {
    const raw = sessionStorage.getItem("annonce_prefill");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setAnnonceForm(prev => ({ ...prev, ...data }));
        toast.success(lang === "fr" ? "Données d'estimation chargées" : "Estimation data loaded");
      } catch {}
      sessionStorage.removeItem("annonce_prefill");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const downloadAnnonceDocx = async (version: "courte" | "longue" | "premium") => {
    const content = editableAnnonce[`version_${version}`] || annonce?.[`version_${version}`];
    if (!content) return;
    try {
      await exportTextToDocx(
        content,
        `Annonce_${version}_${(annonceForm.adresse || "bien").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.docx`,
        {
          title: annonce?.titre_accrocheur || `Annonce immobilière — ${version}`,
          subtitle: `${annonceForm.adresse}${annonceForm.surface ? " · " + annonceForm.surface + " m²" : ""}${annonceForm.prix ? " · " + Number(annonceForm.prix).toLocaleString("fr-FR") + " €" : ""}`,
        }
      );
      toast.success(lang === "fr" ? "Annonce .docx téléchargée" : "Listing .docx downloaded");
    } catch (e: any) {
      toast.error(e.message || "Erreur d'export");
    }
  };

  const openInCanva = (version: "courte" | "longue" | "premium") => {
    const content = editableAnnonce[`version_${version}`] || annonce?.[`version_${version}`];
    if (!content) return;
    const fullText = `${annonce?.titre_accrocheur || ""}\n\n${content}\n\n${annonceForm.adresse}${annonceForm.prix ? "\n" + Number(annonceForm.prix).toLocaleString("fr-FR") + " €" : ""}`;
    navigator.clipboard.writeText(fullText).then(() => {
      toast.success(lang === "fr" ? "Texte copié — Canva s'ouvre, collez avec Cmd/Ctrl+V" : "Text copied — Canva is opening, paste with Cmd/Ctrl+V");
      window.open("https://www.canva.com/", "_blank", "noopener,noreferrer");
    });
  };

  const genererAnnonce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annonceForm.adresse) { toast.error("Adresse requise"); return; }
    setLoadingAnnonce(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-annonce", {
        body: { adresse: annonceForm.adresse, prix: annonceForm.prix ? Number(annonceForm.prix) : undefined, surface: annonceForm.surface ? Number(annonceForm.surface) : undefined, description: annonceForm.description, style: annonceForm.style },
      });
      if (error) throw error;
      setAnnonce(data);
      setEditableAnnonce({
        version_courte: data.version_courte || "",
        version_longue: data.version_longue || "",
        version_premium: data.version_premium || "",
      });
      toast.success("Annonce générée !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setLoadingAnnonce(false);
    }
  };

  const sauvegarderAnnonce = async () => {
    if (!annonce || !user) return;
    try {
      const merged = { ...annonce, ...editableAnnonce };
      const formatChoisi = activeAnnonceFormat;
      const contenuPrincipal = merged[`version_${formatChoisi}`] || "";
      const { error } = await supabase.from("annonces").insert({
        user_id: user.id, adresse: annonceForm.adresse, prix: annonceForm.prix ? Number(annonceForm.prix) : null,
        surface: annonceForm.surface ? Number(annonceForm.surface) : null, description: annonceForm.description,
        titre: annonce?.titre_accrocheur || annonceForm.adresse,
        contenu_genere: { ...merged, format_principal: formatChoisi, contenu_principal: contenuPrincipal, style_ton: annonceForm.style },
      });
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["saved-annonces-panel", user?.id] });
      toast.success(lang === "fr" ? `Annonce sauvegardée (${formatChoisi})` : `Listing saved (${formatChoisi})`, {
        action: { label: lang === "fr" ? "Voir" : "View", onClick: () => navigate("/sauvegardes") },
      });
    } catch (err: any) {
      toast.error(err.message || "Erreur de sauvegarde");
    }
  };

  const loadSavedAnnonce = (row: any) => {
    const cg = row.contenu_genere || {};
    setAnnonceForm({
      adresse: row.adresse || "",
      prix: row.prix != null ? String(row.prix) : "",
      surface: row.surface != null ? String(row.surface) : "",
      description: row.description || "",
      style: cg.style_ton || "professionnel",
    });
    setAnnonce({
      titre_accrocheur: row.titre || cg.titre_accrocheur,
      version_courte: cg.version_courte || "",
      version_longue: cg.version_longue || "",
      version_premium: cg.version_premium || "",
      phrases_accroche: cg.phrases_accroche || [],
      hashtags: cg.hashtags || [],
    });
    setEditableAnnonce({
      version_courte: cg.version_courte || "",
      version_longue: cg.version_longue || "",
      version_premium: cg.version_premium || "",
    });
    if (cg.format_principal) setActiveAnnonceFormat(cg.format_principal);
    toast.success(lang === "fr" ? "Annonce chargée" : "Listing loaded");
  };

  const copier = (text: string) => { navigator.clipboard.writeText(text); toast.success(t("common.copied")); };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Palette className="h-7 w-7 text-primary" />
              {t("docs.title")} <span className="gradient-text">{t("docs.ia")}</span>
            </h1>
            <p className="page-subtitle">{lang === "fr" ? "Générez des annonces immobilières prêtes à publier." : "Generate ready-to-publish property listings."}</p>
          </div>
          <SavedItemsPanel
            title={lang === "fr" ? "Mes annonces" : "My listings"}
            table="annonces"
            queryKey="saved-annonces-panel"
            userId={user?.id}
            defaultTitle={(r: any) => r.contenu_genere?.titre_accrocheur || r.adresse || "Annonce"}
            subtitle={(r: any) => `${r.adresse || ""}${r.surface ? " · " + r.surface + " m²" : ""}`}
            onLoad={loadSavedAnnonce}
            triggerLabel={lang === "fr" ? "Mes annonces" : "Saved"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-card/60 border-border/30">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2"><Wand2 className="h-4 w-4 text-primary" /> {lang === "fr" ? "Générateur d'annonces" : "Listing Generator"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={genererAnnonce} className="space-y-4">
              <Input placeholder={lang === "fr" ? "Adresse du bien *" : "Property address *"} value={annonceForm.adresse} onChange={(e) => setAnnonceForm({...annonceForm, adresse: e.target.value})} className="bg-muted/10 border-border/30" />
              <div className="grid grid-cols-2 gap-3">
                <NumberInput placeholder={lang === "fr" ? "Prix (€)" : "Price (€)"} value={annonceForm.prix} onChange={(v) => setAnnonceForm({...annonceForm, prix: v})} className="bg-muted/10 border-border/30" />
                <NumberInput placeholder="Surface (m²)" value={annonceForm.surface} onChange={(v) => setAnnonceForm({...annonceForm, surface: v})} className="bg-muted/10 border-border/30" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">{lang === "fr" ? "Description du bien" : "Property description"}</p>
                <VoiceTextarea placeholder={lang === "fr" ? "Description du bien (pièces, étage, vue, parking...)" : "Property description..."} value={annonceForm.description} onChange={(e) => setAnnonceForm({...annonceForm, description: e.target.value})} onTranscript={(text) => setAnnonceForm(f => ({ ...f, description: (f.description + " " + text).trim() }))} className="bg-muted/10 border-border/30" rows={3} />
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-2">{lang === "fr" ? "Style de ton" : "Tone style"}</p>
                <div className="grid grid-cols-3 gap-2">
                  {ANNONCE_STYLES.map(s => (
                    <div key={s.value}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all text-center ${annonceForm.style === s.value ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/60"}`}
                      onClick={() => setAnnonceForm({...annonceForm, style: s.value})}>
                      <p className="text-xs font-medium">{s.label}</p>
                      <p className="text-[9px] text-muted-foreground mt-0.5">{s.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loadingAnnonce}>
                {loadingAnnonce ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {lang === "fr" ? "L'IA rédige votre annonce..." : "AI is writing your listing..."}</> : <><Sparkles className="h-4 w-4 mr-2" /> {lang === "fr" ? "Générer l'annonce" : "Generate listing"}</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        {loadingAnnonce && !annonce ? (
          <AnalysisLoader
            module={lang === "fr" ? "Rédaction de l'annonce" : "Drafting listing"}
            context={annonceForm.adresse}
            eta={lang === "fr" ? "20 à 60 secondes" : "20 to 60 seconds"}
            messages={lang === "fr" ? [
              "Analyse du bien et de l'audience cible…",
              "Préparation des 3 versions (courte, longue, premium)…",
              "Rédaction du titre accrocheur…",
              "Construction des phrases d'accroche…",
              "Optimisation pour Leboncoin, SeLoger et réseaux sociaux…",
            ] : [
              "Analyzing the property and target audience…",
              "Preparing 3 versions (short, long, premium)…",
              "Crafting the catchy headline…",
              "Building catchphrases…",
              "Optimizing for listing portals and social media…",
            ]}
          />
        ) : annonce ? (
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">{annonce.titre_accrocheur || (lang === "fr" ? "Annonce générée" : "Generated listing")}</CardTitle>
              <div className="flex gap-1 items-center">
                <Badge variant="outline" className="text-[9px] mr-1">{lang === "fr" ? "Format actif" : "Active"} : {activeAnnonceFormat}</Badge>
                <Button size="sm" variant="outline" onClick={() => copier(editableAnnonce[`version_${activeAnnonceFormat}`] || annonce[`version_${activeAnnonceFormat}`])} className="gap-1 text-xs"><Copy className="h-3 w-3" /> {t("docs.copy")}</Button>
                <Button size="sm" variant="default" onClick={sauvegarderAnnonce} className="gap-1 text-xs"><FileText className="h-3 w-3" /> {lang === "fr" ? "Sauvegarder" : "Save"}</Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs value={activeAnnonceFormat} onValueChange={(v) => setActiveAnnonceFormat(v as any)}>
                <TabsList className="w-full bg-muted/10">
                  <TabsTrigger value="courte" className="flex-1 text-xs">{lang === "fr" ? "Courte" : "Short"}</TabsTrigger>
                  <TabsTrigger value="longue" className="flex-1 text-xs">{lang === "fr" ? "Longue" : "Long"}</TabsTrigger>
                  <TabsTrigger value="premium" className="flex-1 text-xs">Premium</TabsTrigger>
                </TabsList>
                {["courte", "longue", "premium"].map((v) => (
                  <TabsContent key={v} value={v}>
                    <div className="space-y-2">
                      {editingAnnonceField === v ? (
                        <div className="space-y-2">
                          <Textarea
                            value={editableAnnonce[`version_${v}`] || ""}
                            onChange={e => setEditableAnnonce({ ...editableAnnonce, [`version_${v}`]: e.target.value })}
                            className="bg-muted/5 border-border/20 text-sm min-h-[200px]"
                          />
                          <Button size="sm" variant="outline" onClick={() => setEditingAnnonceField(null)} className="text-xs">{lang === "fr" ? "Terminer" : "Done"}</Button>
                        </div>
                      ) : (
                        <div className="relative">
                          <p className="text-sm whitespace-pre-wrap pr-16">{editableAnnonce[`version_${v}`] || annonce[`version_${v}`]}</p>
                          <div className="absolute top-0 right-0 flex gap-1">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditingAnnonceField(v)}><Pencil className="h-3 w-3" /></Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => copier(editableAnnonce[`version_${v}`] || annonce[`version_${v}`])}><Copy className="h-3 w-3" /></Button>
                          </div>
                        </div>
                      )}
                      <div className="flex gap-2 pt-2 border-t border-border/20">
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => downloadAnnonceDocx(v as any)}>
                          <Download className="h-3 w-3" /> {lang === "fr" ? "Word .docx" : "Word .docx"}
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1 gap-1 text-xs" onClick={() => openInCanva(v as any)}>
                          <Palette className="h-3 w-3" /> {lang === "fr" ? "Ouvrir dans Canva" : "Open in Canva"}
                        </Button>
                      </div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              {annonce.phrases_accroche?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-medium text-muted-foreground">{lang === "fr" ? "Phrases d'accroche" : "Catchphrases"}</p>
                  {annonce.phrases_accroche.map((p: string, i: number) => (
                    <div key={i} className="flex items-center justify-between text-xs bg-muted/10 rounded px-2 py-1.5">
                      <span>{p}</span>
                      <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => copier(p)}><Copy className="h-2.5 w-2.5" /></Button>
                    </div>
                  ))}
                </div>
              )}
              {annonce.hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {annonce.hashtags.map((h: string) => (<Badge key={h} variant="secondary" className="text-[9px] cursor-pointer" onClick={() => copier(h)}>{h}</Badge>))}
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[300px]">
            <div className="text-center space-y-2">
              <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
              <p className="text-sm text-muted-foreground">{lang === "fr" ? "Votre annonce apparaîtra ici" : "Your listing will appear here"}</p>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default Studio;
