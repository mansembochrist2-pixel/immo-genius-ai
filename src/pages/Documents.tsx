import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Palette, FileText, Mail, Sparkles, Wand2, Copy, Save, MessageSquare,
  Hash, Lightbulb, Loader2, Download, Send, FileSignature, Upload, Pencil, Instagram, Bot,
} from "lucide-react";
import { AuditReseaux } from "@/components/studio/AuditReseaux";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { preloadRoute } from "@/lib/routeLoader";
import { useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { streamChat } from "@/lib/ai-stream";
import { exportTextToDocx } from "@/lib/docx-export";
import { VoiceTextarea } from "@/components/VoiceTextarea";
import { readTemplateFile } from "@/lib/template-reader";

const MANDAT_INFO_EXEMPLE = `══════ INFORMATIONS DU MANDANT (VENDEUR) ══════
Nom et prénom : Jean DUPONT
Date et lieu de naissance : 15/03/1968 à Paris (75)
Nationalité : Française
Profession : Cadre supérieur
Adresse complète : 24 avenue Victor Hugo, 75116 Paris
Téléphone : 06 12 34 56 78
Email : jean.dupont@email.com
Situation maritale : Marié sous le régime de la communauté

══════ INFORMATIONS DU BIEN ══════
Type : Appartement T3
Adresse complète : 12 rue de la Paix, 75002 Paris
Étage : 4ème avec ascenseur
Surface Carrez : 72 m²
Nombre de pièces : 3 (séjour, 2 chambres)
Nombre de salles de bain : 1
Cave : Oui (n° 14 au sous-sol)
Parking : Non
Année de construction : 1925
État général : Bon — rafraîchissement récent (2022)
Syndic : Cabinet Martin & Associés
Charges trimestrielles : 850 €
Taxe foncière : 1 240 €/an
DPE : C (185 kWh/m²/an) — diagnostic du 12/06/2024
Numéro de lot : 42
Origine de propriété : Acquisition par acte du 03/09/2010 chez Maître X

══════ CONDITIONS FINANCIÈRES ══════
Prix de vente net vendeur : 750 000 €
Honoraires d'agence : 5% TTC à la charge de l'acquéreur
Prix de vente affiché (FAI) : 787 500 €

══════ CONDITIONS DU MANDAT ══════
Durée : 3 mois irrévocables, renouvelable tacitement
Date de prise d'effet : 01/06/2025
Numéro du mandat : MV-2025-0142
Type de mandat : Exclusif

══════ DIAGNOSTICS DISPONIBLES ══════
DPE, amiante, plomb, électricité, gaz, ERP, surface Carrez — fournis sous 8 jours

══════ AGENT MANDATAIRE ══════
Nom : [Votre nom complet]
Carte professionnelle n° : CPI 7501 2024 000 123 456
Garantie financière : GALIAN — 120 000 €
RCP : MMA n° 1234567`;


const MANDAT_TYPES = [
  { value: "Mandat de vente exclusif", label: "Mandat de vente exclusif", desc: "Exclusivité confiée à une seule agence" },
  { value: "Mandat de vente simple", label: "Mandat de vente simple", desc: "Confié à plusieurs agences" },
  { value: "Mandat de recherche acquéreur", label: "Mandat de recherche acquéreur", desc: "Recherche d'un bien pour l'acquéreur" },
];

const ANNONCE_STYLES = [
  { value: "professionnel", label: "Professionnel", desc: "Ton sobre et structuré" },
  { value: "moderne", label: "Moderne", desc: "Ton dynamique et contemporain" },
  { value: "luxe", label: "Luxe", desc: "Ton haut de gamme et raffiné" },
];

const Studio = () => {
  const { user } = useAuth();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();

  // Helper to push a Studio output to the Copilote
  const sendToCopilote = (label: string, content: string) => {
    const text = `Voici un ${label} que je viens de générer dans le Studio IA. Aide-moi à le challenger, l'améliorer et préparer la prochaine étape avec le client :\n\n---\n${content}\n---`;
    sessionStorage.setItem("copilote_prefill", text);
    toast.success(lang === "fr" ? "Envoyé au Copilote" : "Sent to Copilot");
    navigate("/copilote");
  };

  // --- Mandats state ---
  const [mandatType, setMandatType] = useState(MANDAT_TYPES[0].value);
  const [mandatInfo, setMandatInfo] = useState("");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [mandatContent, setMandatContent] = useState("");
  const [loadingMandat, setLoadingMandat] = useState(false);
  const mandatRef = useRef<HTMLTextAreaElement>(null);
  const [customTemplates, setCustomTemplates] = useState<{ name: string; content: string }[]>(() => {
    try { return JSON.parse(localStorage.getItem("estate_custom_templates") || "[]"); } catch { return []; }
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Persist custom templates
  useEffect(() => {
    localStorage.setItem("estate_custom_templates", JSON.stringify(customTemplates));
  }, [customTemplates]);

  // Auto-extraction des champs du mandat depuis le texte (dictée ou saisie)
  const extractedFields = (() => {
    const txt = mandatInfo;
    const get = (re: RegExp) => txt.match(re)?.[1]?.trim() || "";
    const prix = get(/(?:prix|montant)[^\d€]*([\d\s.,]+)\s*(?:€|euros?|k€?)?/i);
    const surface = get(/(\d+(?:[.,]\d+)?)\s*m(?:²|2)/i);
    const adresse = get(/(?:adresse|bien (?:situé|à)|sis(?:e)? à?)[^:]*[:\s]+([^\n]{5,120})/i);
    const vendeur = get(/(?:vendeur|mandant|propriétaire)[^:]*[:\s]+([A-ZÀ-Ü][^\n,]{2,60})/i);
    const acquereur = get(/(?:acquéreur|acheteur)[^:]*[:\s]+([A-ZÀ-Ü][^\n,]{2,60})/i);
    const type = get(/(?:type|bien)\s*[:\s]+(appartement|maison|villa|studio|loft|terrain|local|immeuble|t[1-6])/i);
    const duree = get(/(?:durée|pour une durée de)\s*[:\s]*(\d+\s*(?:mois|an(?:née)?s?|jours))/i);
    const honoraires = get(/(?:honoraires|commission|frais)[^\d%]*([\d.,]+)\s*(?:%|€|euros?)/i);
    return { vendeur, acquereur, adresse, type, surface, prix, duree, honoraires };
  })();
  const hasExtracted = Object.values(extractedFields).some(v => v);

  // --- Annonces state ---
  const [annonceForm, setAnnonceForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<any>(null);
  const [loadingAnnonce, setLoadingAnnonce] = useState(false);
  const [editableAnnonce, setEditableAnnonce] = useState<Record<string, string>>({});
  const [editingAnnonceField, setEditingAnnonceField] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("mandats");
  // Format choisi par l'utilisateur (courte | longue | premium) — pilote l'affichage actif et la sauvegarde
  const [activeAnnonceFormat, setActiveAnnonceFormat] = useState<"courte" | "longue" | "premium">("longue");

  // Prefill from Estimation
  useEffect(() => {
    const raw = sessionStorage.getItem("annonce_prefill");
    if (raw) {
      try {
        const data = JSON.parse(raw);
        setAnnonceForm(prev => ({ ...prev, ...data }));
        setActiveTab("annonces");
        toast.success(lang === "fr" ? "Données d'estimation chargées" : "Estimation data loaded");
      } catch {}
      sessionStorage.removeItem("annonce_prefill");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Marketing state ---
  const [marketingForm, setMarketingForm] = useState({ type: "email", bien: "", cible: "", ton: "professionnel" });
  const [marketing, setMarketing] = useState<any>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  const genererMandat = async () => {
    if (!mandatInfo.trim()) { toast.error(lang === "fr" ? "Décrivez les informations du mandat" : "Describe the mandate details"); return; }
    setLoadingMandat(true);
    setMandatContent("");
    try {
      const customTpl = customTemplates.find(c => c.name === mandatType);
      // businessContext est lu côté edge function comme contexte/template prioritaire
      const businessContext = customTpl && customTpl.content
        ? `MANDAT PERSONNALISÉ DE L'AGENT — RESPECTER STRICTEMENT CETTE STRUCTURE\n\nNom du fichier source : ${customTpl.name}\n\n--- TEMPLATE ---\n${customTpl.content}\n--- FIN TEMPLATE ---\n\nINSTRUCTIONS : Reproduis EXACTEMENT la structure, les titres, les articles et la mise en forme de ce template. Remplis chaque champ avec les informations du mandant fournies. N'ajoute pas d'articles, ne réécris pas la structure. Si une info manque, laisse "________________".`
        : `Type officiel : ${mandatType}\n\nUtilise la structure standard conforme à la loi Hoguet et la loi ALUR pour ce type de mandat.`;
      const fieldsBlock = hasExtracted
        ? `\n\n[Champs détectés automatiquement par parsing]\n${Object.entries(extractedFields).filter(([,v]) => v).map(([k,v]) => `- ${k}: ${v}`).join("\n")}\n`
        : "";
      // On envoie 'informations' DIRECTEMENT (le edge function le lit du body)
      // streamChat envoie messages + businessContext, mais l'edge mandat lit body.informations
      // → on construit donc un appel direct fetch ici pour passer 'informations' explicitement
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-mandat`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          type: mandatType,
          informations: mandatInfo + fieldsBlock,
          businessContext,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: "Erreur réseau" }));
        let msg = err.error || `Erreur ${resp.status}`;
        if (resp.status === 402) msg = "💳 Crédits IA bêta épuisés. Contactez l'équipe Estate AI.";
        else if (resp.status === 429) msg = "⏱️ Trop de requêtes — patientez quelques secondes.";
        throw new Error(msg);
      }
      if (!resp.body) throw new Error("Pas de réponse du serveur");
      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";
      let streamDone = false;
      while (!streamDone) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });
        let nl: number;
        while ((nl = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, nl);
          textBuffer = textBuffer.slice(nl + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { streamDone = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) setMandatContent(prev => prev + content);
          } catch { textBuffer = line + "\n" + textBuffer; break; }
        }
      }
      setLoadingMandat(false);
      toast.success(lang === "fr" ? "Mandat généré" : "Mandate generated");
    } catch (e: any) {
      setLoadingMandat(false);
      toast.error(e.message || (lang === "fr" ? "Erreur de génération" : "Generation error"));
    }
  };

  const downloadMandatDocx = async () => {
    if (!mandatContent) return;
    try {
      await exportTextToDocx(
        mandatContent,
        `${mandatType.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.docx`,
        {
          title: mandatType,
          subtitle: `Document généré le ${new Date().toLocaleDateString("fr-FR")} — Estate AI`,
        }
      );
      toast.success(lang === "fr" ? "Mandat .docx téléchargé" : "Mandate .docx downloaded");
    } catch (e: any) {
      toast.error(e.message || "Erreur d'export");
    }
  };

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
      // Le format actuellement affiché est celui que l'utilisateur a choisi → on le persiste comme version principale
      const formatChoisi = activeAnnonceFormat;
      const contenuPrincipal = merged[`version_${formatChoisi}`] || "";
      const { error } = await supabase.from("annonces").insert({
        user_id: user.id, adresse: annonceForm.adresse, prix: annonceForm.prix ? Number(annonceForm.prix) : null,
        surface: annonceForm.surface ? Number(annonceForm.surface) : null, description: annonceForm.description,
        contenu_genere: { ...merged, format_principal: formatChoisi, contenu_principal: contenuPrincipal, style_ton: annonceForm.style },
      });
      if (error) throw error;
      toast.success(lang === "fr" ? `Annonce sauvegardée (${formatChoisi})` : `Listing saved (${formatChoisi})`, {
        action: { label: lang === "fr" ? "Voir" : "View", onClick: () => window.location.assign("/sauvegardes") },
      });
    } catch (err: any) {
      toast.error(err.message || "Erreur de sauvegarde");
    }
  };

  const genererMarketing = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!marketingForm.bien) { toast.error("Décrivez le bien ou le sujet"); return; }
    setLoadingMarketing(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-marketing", { body: marketingForm });
      if (error) throw error;
      setMarketing(data);
      toast.success("Contenu marketing généré !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setLoadingMarketing(false);
    }
  };

  const copier = (text: string) => { navigator.clipboard.writeText(text); toast.success(t("common.copied")); };

  const handleTemplateUpload = () => {
    fileInputRef.current?.click();
  };

  const onFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["txt", "docx", "doc", "pdf"].includes(ext || "")) {
      toast.error(lang === "fr" ? "Format accepté : .txt, .docx, .pdf" : "Accepted: .txt, .docx, .pdf");
      return;
    }
    const loadingToast = toast.loading(lang === "fr" ? `Lecture de « ${file.name} »...` : `Reading "${file.name}"...`);
    try {
      const content = await readTemplateFile(file);
      toast.dismiss(loadingToast);
      if (!content || content.length < 50) {
        toast.warning(lang === "fr" ? "Template ajouté mais peu de texte extrait — vérifiez le résultat" : "Template added but little text extracted");
      } else {
        toast.success(lang === "fr" ? `Template « ${file.name} » lu (${content.length} caractères)` : `Template read (${content.length} chars)`);
      }
      setCustomTemplates(prev => [...prev, { name: file.name, content: content.slice(0, 15000) }]);
      // Auto-select the just-uploaded template
      setMandatType(file.name);
    } catch (err: any) {
      toast.dismiss(loadingToast);
      toast.error(err?.message || (lang === "fr" ? "Erreur de lecture du fichier" : "File read error"));
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeTemplate = (idx: number) => setCustomTemplates(prev => prev.filter((_, i) => i !== idx));

  const typeLabels: Record<string, string> = { email: "📧 Email professionnel", post_social: "📱 Post réseaux sociaux", sms: "💬 SMS / WhatsApp", flyer: "📄 Texte flyer" };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Palette className="h-7 w-7 text-primary" />
          {t("docs.title")} <span className="gradient-text">{t("docs.ia")}</span>
        </h1>
        <p className="page-subtitle">{t("docs.subtitle")}</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="bg-card/60">
          <TabsTrigger value="mandats" className="flex items-center gap-2 text-xs"><FileSignature className="h-3.5 w-3.5" /> {t("docs.mandats")}</TabsTrigger>
          <TabsTrigger value="annonces" className="flex items-center gap-2 text-xs"><FileText className="h-3.5 w-3.5" /> {t("docs.annonces")}</TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2 text-xs"><Mail className="h-3.5 w-3.5" /> {t("docs.marketing")}</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2 text-xs"><Instagram className="h-3.5 w-3.5" /> {t("docs.audit")}</TabsTrigger>
        </TabsList>

        {/* ===== MANDATS ===== */}
        <TabsContent value="mandats">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/60 border-border/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <FileSignature className="h-4 w-4 text-primary" /> {lang === "fr" ? "Générateur de mandats" : "Mandate Generator"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Template selector with visual cards */}
                <div>
                  <p className="text-xs text-muted-foreground mb-3">Template officiel Estate AI</p>
                  <div className="grid grid-cols-1 gap-2">
                    {MANDAT_TYPES.map(mt => (
                      <div
                        key={mt.value}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${mandatType === mt.value ? "border-primary/60 bg-primary/5" : "border-border/30 bg-muted/5 hover:border-border/60"}`}
                        onClick={() => setMandatType(mt.value)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">{mt.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{mt.desc}</p>
                          </div>
                          <Badge variant="outline" className="text-[8px] px-1.5">Estate AI</Badge>
                        </div>
                      </div>
                    ))}
                    {/* Custom templates — sélectionnables */}
                    {customTemplates.map((ct, i) => (
                      <div
                        key={i}
                        className={`p-3 rounded-lg border cursor-pointer transition-all ${mandatType === ct.name ? "border-primary/60 bg-primary/5" : "border-border/30 bg-muted/5 hover:border-border/60"}`}
                        onClick={() => setMandatType(ct.name)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-medium truncate">{ct.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{lang === "fr" ? "Template personnalisé" : "Custom template"}</p>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <Badge variant="secondary" className="text-[8px] px-1.5">{lang === "fr" ? "Perso" : "Custom"}</Badge>
                            <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeTemplate(i); if (mandatType === ct.name) setMandatType(MANDAT_TYPES[0].value); }}>×</Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{lang === "fr" ? "Informations du mandat (dictée vocale ou saisie)" : "Mandate details (voice or text)"}</p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-7 text-[10px] gap-1 text-primary hover:text-primary"
                      onClick={() => setMandatInfo(MANDAT_INFO_EXEMPLE)}
                      title={lang === "fr" ? "Insérer un exemple complet à modifier" : "Insert a complete example"}
                    >
                      <Sparkles className="h-3 w-3" /> {lang === "fr" ? "Charger un exemple" : "Load example"}
                    </Button>
                  </div>
                  <VoiceTextarea
                    value={mandatInfo + (voiceInterim ? " " + voiceInterim : "")}
                    onChange={e => { setMandatInfo(e.target.value); setVoiceInterim(""); }}
                    onTranscript={(text) => { setMandatInfo(prev => (prev + " " + text).trim()); setVoiceInterim(""); }}
                    onInterim={(text) => setVoiceInterim(text)}
                    className="bg-muted/10 border-border/30 min-h-[200px] font-mono text-[11px] leading-relaxed"
                    placeholder={MANDAT_INFO_EXEMPLE}
                  />
                  <p className="text-[10px] text-muted-foreground mt-1.5 italic">
                    {lang === "fr"
                      ? "💡 Plus vos informations sont complètes, plus le mandat généré est prêt à signer. Cliquez sur « Charger un exemple » pour voir tous les champs utiles."
                      : "💡 The more details you provide, the more ready-to-sign your mandate will be."}
                  </p>
                  {hasExtracted && (
                    <div className="mt-2 p-2.5 rounded-lg bg-primary/5 border border-primary/20">
                      <p className="text-[10px] text-primary font-medium uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Sparkles className="h-3 w-3" /> {lang === "fr" ? "Champs détectés automatiquement" : "Auto-detected fields"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {Object.entries(extractedFields).filter(([,v]) => v).map(([k, v]) => (
                          <Badge key={k} variant="outline" className="text-[10px] bg-background/60">
                            <span className="text-muted-foreground mr-1 capitalize">{k}:</span><span className="font-medium">{v}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>


                <Button className="w-full" onClick={genererMandat} disabled={loadingMandat}>
                  {loadingMandat ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("docs.generating")}</> : <><Sparkles className="h-4 w-4 mr-2" /> {t("docs.generate")} le mandat</>}
                </Button>

                <div className="border-t border-border/20 pt-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.doc,.txt" onChange={onFileSelected} />
                  <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={handleTemplateUpload}>
                    <Upload className="h-3.5 w-3.5" /> {lang === "fr" ? "Ajouter mon template (PDF / Word)" : "Add my template (PDF / Word)"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {loadingMandat && !mandatContent ? (
              <AnalysisLoader
                module={lang === "fr" ? "Rédaction du mandat" : "Drafting mandate"}
                context={mandatType}
                eta={lang === "fr" ? "30 à 90 secondes" : "30 to 90 seconds"}
                messages={lang === "fr" ? [
                  "Lecture du template et des informations du mandant…",
                  "Vérification de la conformité loi Hoguet & ALUR…",
                  "Structuration des articles du mandat…",
                  "Rédaction des clauses sur mesure…",
                  "Insertion des données du bien et des honoraires…",
                  "Mise en forme finale prête à signer…",
                ] : [
                  "Reading the template and seller information…",
                  "Checking Hoguet & ALUR compliance…",
                  "Structuring mandate articles…",
                  "Drafting custom clauses…",
                  "Inserting property and fees data…",
                  "Final ready-to-sign formatting…",
                ]}
              />
            ) : mandatContent ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2"><Pencil className="h-4 w-4 text-primary" /> {lang === "fr" ? "Aperçu" : "Preview"} — {mandatType}</CardTitle>
                  <Badge variant="outline" className="text-[9px]">{lang === "fr" ? "Modifiable" : "Editable"}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Textarea
                    ref={mandatRef}
                    value={mandatContent}
                    onChange={e => setMandatContent(e.target.value)}
                    className="bg-muted/5 border-border/20 text-sm min-h-[400px] font-mono leading-relaxed"
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button size="sm" className="flex-1 min-w-[140px] gap-1" onClick={downloadMandatDocx}><Download className="h-3.5 w-3.5" /> {lang === "fr" ? "Télécharger .docx" : "Download .docx"}</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => copier(mandatContent)}><Copy className="h-3.5 w-3.5" /> {t("docs.copy")}</Button>
                    <Button size="sm" variant="outline" className="gap-1 border-primary/30 hover:bg-primary/5 hover:text-primary" onMouseEnter={() => preloadRoute.copilote()} onClick={() => sendToCopilote(lang === "fr" ? "mandat" : "mandate", mandatContent)}>
                      <Bot className="h-3.5 w-3.5" /> {lang === "fr" ? "Envoyer au Copilote" : "Send to Copilot"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[400px]">
                <div className="text-center space-y-2">
                  <FileSignature className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                  <p className="text-sm text-muted-foreground">{lang === "fr" ? "Votre mandat apparaîtra ici" : "Your mandate will appear here"}</p>
                  <p className="text-xs text-muted-foreground/60">{lang === "fr" ? "Conforme loi Hoguet & loi ALUR" : "Compliant with Hoguet & ALUR laws"}</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== ANNONCES ===== */}
        <TabsContent value="annonces">
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
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{lang === "fr" ? "Description du bien" : "Property description"}</p>
                      <VoiceButton onTranscript={(text) => setAnnonceForm(f => ({ ...f, description: (f.description + " " + text).trim() }))} />
                    </div>
                    <Textarea placeholder={lang === "fr" ? "Description du bien (pièces, étage, vue, parking...)" : "Property description..."} value={annonceForm.description} onChange={(e) => setAnnonceForm({...annonceForm, description: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
                  </div>
                  {/* 3 tone styles */}
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">{lang === "fr" ? "Style de ton" : "Tone style"}</p>
                    <div className="grid grid-cols-3 gap-2">
                      {ANNONCE_STYLES.map(s => (
                        <div
                          key={s.value}
                          className={`p-2.5 rounded-lg border cursor-pointer transition-all text-center ${annonceForm.style === s.value ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/60"}`}
                          onClick={() => setAnnonceForm({...annonceForm, style: s.value})}
                        >
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
                  <Button size="sm" variant="outline" className="w-full gap-1 border-primary/30 hover:bg-primary/5 hover:text-primary" onMouseEnter={() => preloadRoute.copilote()} onClick={() => sendToCopilote(lang === "fr" ? "texte d'annonce" : "listing copy", editableAnnonce[`version_${activeAnnonceFormat}`] || annonce[`version_${activeAnnonceFormat}`] || "")}>
                    <Bot className="h-3.5 w-3.5" /> {lang === "fr" ? "Envoyer au Copilote" : "Send to Copilot"}
                  </Button>
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
        </TabsContent>

        {/* ===== MARKETING ===== */}
        <TabsContent value="marketing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/60 border-border/30">
              <CardHeader><CardTitle className="text-sm flex items-center gap-2"><Mail className="h-4 w-4 text-primary" /> {lang === "fr" ? "Générateur Marketing" : "Marketing Generator"}</CardTitle></CardHeader>
              <CardContent>
                <form onSubmit={genererMarketing} className="space-y-4">
                  <Select value={marketingForm.type} onValueChange={(v) => setMarketingForm({...marketingForm, type: v})}>
                    <SelectTrigger className="bg-muted/10 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 Email professionnel</SelectItem>
                      <SelectItem value="post_social">📱 Post réseaux sociaux</SelectItem>
                      <SelectItem value="sms">💬 SMS / WhatsApp</SelectItem>
                      <SelectItem value="flyer">📄 Texte flyer</SelectItem>
                      <SelectItem value="autre">🔧 {lang === "fr" ? "Autre" : "Other"}</SelectItem>
                    </SelectContent>
                  </Select>
                  {marketingForm.type === "autre" && (
                    <Input placeholder={lang === "fr" ? "Décrivez le type de contenu souhaité..." : "Describe desired content type..."} value={(marketingForm as any).type_custom || ""} onChange={(e) => setMarketingForm({...marketingForm, type_custom: e.target.value} as any)} className="bg-muted/10 border-border/30" />
                  )}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-xs text-muted-foreground">{lang === "fr" ? "Bien ou sujet *" : "Property or subject *"}</p>
                      <VoiceButton onTranscript={(text) => setMarketingForm(f => ({ ...f, bien: (f.bien + " " + text).trim() }))} />
                    </div>
                    <Textarea placeholder={lang === "fr" ? "Décrivez le bien ou le sujet *" : "Describe the property or subject *"} value={marketingForm.bien} onChange={(e) => setMarketingForm({...marketingForm, bien: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
                  </div>
                  <Input placeholder={lang === "fr" ? "Cible (ex: primo-accédants...)" : "Target audience..."} value={marketingForm.cible} onChange={(e) => setMarketingForm({...marketingForm, cible: e.target.value})} className="bg-muted/10 border-border/30" />
                  <Select value={marketingForm.ton} onValueChange={(v) => setMarketingForm({...marketingForm, ton: v})}>
                    <SelectTrigger className="bg-muted/10 border-border/30"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionnel">Professionnel</SelectItem>
                      <SelectItem value="engageant">Engageant</SelectItem>
                      <SelectItem value="luxe">Luxe</SelectItem>
                      <SelectItem value="decontracte">Décontracté</SelectItem>
                      <SelectItem value="urgence">Urgence</SelectItem>
                      <SelectItem value="autre">{lang === "fr" ? "Autre (personnalisé)" : "Other (custom)"}</SelectItem>
                    </SelectContent>
                  </Select>
                  {marketingForm.ton === "autre" && (
                    <Input placeholder={lang === "fr" ? "Décrivez votre style souhaité..." : "Describe your desired style..."} value={(marketingForm as any).ton_custom || ""} onChange={(e) => setMarketingForm({...marketingForm, ton_custom: e.target.value} as any)} className="bg-muted/10 border-border/30" />
                  )}
                  <Button type="submit" className="w-full" disabled={loadingMarketing}>
                    {loadingMarketing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {lang === "fr" ? "Création du contenu marketing..." : "Crafting marketing content..."}</> : <><Sparkles className="h-4 w-4 mr-2" /> {lang === "fr" ? "Générer le contenu" : "Generate content"}</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loadingMarketing && !marketing ? (
              <AnalysisLoader
                module={lang === "fr" ? "Création du contenu marketing" : "Crafting marketing content"}
                context={marketingForm.type}
                eta={lang === "fr" ? "15 à 40 secondes" : "15 to 40 seconds"}
                messages={lang === "fr" ? [
                  "Analyse de la cible et du ton souhaité…",
                  "Recherche d'angles d'accroche pertinents…",
                  "Rédaction de l'objet et du corps du message…",
                  "Optimisation du call-to-action…",
                  "Préparation des variantes et hashtags…",
                ] : [
                  "Analyzing target audience and tone…",
                  "Finding relevant hooks…",
                  "Drafting subject and body…",
                  "Optimizing the call-to-action…",
                  "Preparing variants and hashtags…",
                ]}
              />
            ) : marketing ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader><CardTitle className="text-sm flex items-center gap-2">{typeLabels[marketingForm.type] || "Contenu généré"}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> {lang === "fr" ? "Objet / Titre" : "Subject / Title"}</p>
                    <div className="flex items-center justify-between bg-muted/10 rounded px-3 py-2">
                      <p className="text-sm font-medium">{marketing.objet}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copier(marketing.objet)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">{lang === "fr" ? "Contenu principal" : "Main content"}</p>
                    <div className="relative pr-8 bg-muted/10 rounded p-3">
                      <p className="text-sm whitespace-pre-wrap">{marketing.contenu_principal}</p>
                      <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6" onClick={() => copier(marketing.contenu_principal)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Call to Action</p>
                    <div className="flex items-center justify-between bg-primary/10 rounded px-3 py-2 border border-primary/20">
                      <p className="text-sm font-semibold text-primary">{marketing.call_to_action}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copier(marketing.call_to_action)}><Copy className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  {marketing.variante_courte && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">{lang === "fr" ? "Version courte" : "Short version"}</p>
                      <div className="flex items-center justify-between bg-muted/10 rounded px-3 py-2">
                        <p className="text-xs">{marketing.variante_courte}</p>
                        <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copier(marketing.variante_courte)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </div>
                  )}
                  {marketing.hashtags?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {marketing.hashtags.map((h: string) => (<Badge key={h} variant="secondary" className="text-[9px] cursor-pointer" onClick={() => copier(h)}>{h}</Badge>))}
                      </div>
                    </div>
                  )}
                  {marketing.conseils?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" /> {lang === "fr" ? "Conseils" : "Tips"}</p>
                      <ul className="space-y-1">
                        {marketing.conseils.map((c: string, i: number) => (<li key={i} className="text-xs text-muted-foreground bg-muted/5 rounded px-2 py-1">💡 {c}</li>))}
                      </ul>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => copier(`${marketing.objet}\n\n${marketing.contenu_principal}\n\n${marketing.call_to_action}`)}>
                      <Copy className="h-3 w-3 mr-2" /> {lang === "fr" ? "Copier tout" : "Copy all"}
                    </Button>
                    <Button variant="outline" size="sm" className="flex-1 border-primary/30 hover:bg-primary/5 hover:text-primary" onMouseEnter={() => preloadRoute.copilote()} onClick={() => sendToCopilote(lang === "fr" ? "contenu marketing" : "marketing content", `${marketing.objet}\n\n${marketing.contenu_principal}\n\n${marketing.call_to_action}`)}>
                      <Bot className="h-3 w-3 mr-2" /> {lang === "fr" ? "Envoyer au Copilote" : "Send to Copilot"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-2">
                  <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">{lang === "fr" ? "Votre contenu marketing apparaîtra ici" : "Your marketing content will appear here"}</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== AUDIT RÉSEAUX SOCIAUX ===== */}
        <TabsContent value="audit">
          <AuditReseaux />
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Studio;
