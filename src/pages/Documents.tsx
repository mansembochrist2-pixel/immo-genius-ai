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
  Hash, Lightbulb, Loader2, Download, Send, FileSignature, Upload, Pencil,
} from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { toast } from "sonner";
import { streamChat } from "@/lib/ai-stream";
import { VoiceButton } from "@/components/VoiceButton";

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

  // --- Mandats state ---
  const [mandatType, setMandatType] = useState(MANDAT_TYPES[0].value);
  const [mandatInfo, setMandatInfo] = useState("");
  const [voiceInterim, setVoiceInterim] = useState("");
  const [mandatContent, setMandatContent] = useState("");
  const [loadingMandat, setLoadingMandat] = useState(false);
  const mandatRef = useRef<HTMLTextAreaElement>(null);
  const [customTemplates, setCustomTemplates] = useState<{ name: string; file: File }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- Annonces state ---
  const [annonceForm, setAnnonceForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<any>(null);
  const [loadingAnnonce, setLoadingAnnonce] = useState(false);
  const [editableAnnonce, setEditableAnnonce] = useState<Record<string, string>>({});
  const [editingAnnonceField, setEditingAnnonceField] = useState<string | null>(null);

  // --- Marketing state ---
  const [marketingForm, setMarketingForm] = useState({ type: "email", bien: "", cible: "", ton: "professionnel" });
  const [marketing, setMarketing] = useState<any>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  const genererMandat = async () => {
    if (!mandatInfo.trim()) { toast.error("Décrivez les informations du mandat"); return; }
    setLoadingMandat(true);
    setMandatContent("");
    try {
      await streamChat({
        functionName: "generate-mandat",
        messages: [{ role: "user", content: mandatInfo }],
        businessContext: mandatType,
        onDelta: (chunk) => setMandatContent(prev => prev + chunk),
        onDone: () => { setLoadingMandat(false); toast.success("Mandat généré"); },
        onError: (err) => { setLoadingMandat(false); toast.error(err); },
      });
    } catch {
      setLoadingMandat(false);
      toast.error("Erreur de génération");
    }
  };

  const downloadMandatPDF = () => {
    if (!mandatContent) return;
    const blob = new Blob([mandatContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${mandatType.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Document téléchargé");
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
      const { error } = await supabase.from("annonces").insert({
        user_id: user.id, adresse: annonceForm.adresse, prix: annonceForm.prix ? Number(annonceForm.prix) : null,
        surface: annonceForm.surface ? Number(annonceForm.surface) : null, description: annonceForm.description,
        contenu_genere: { ...annonce, ...editableAnnonce },
      });
      if (error) throw error;
      toast.success("Annonce sauvegardée !");
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

  const onFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["pdf", "docx", "doc"].includes(ext || "")) {
      toast.error("Format accepté : PDF ou Word (.docx)");
      return;
    }
    setCustomTemplates(prev => [...prev, { name: file.name, file }]);
    toast.success(`Template "${file.name}" ajouté`);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

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

      <Tabs defaultValue="mandats" className="space-y-6">
        <TabsList className="bg-card/60">
          <TabsTrigger value="mandats" className="flex items-center gap-2 text-xs"><FileSignature className="h-3.5 w-3.5" /> {t("docs.mandats")}</TabsTrigger>
          <TabsTrigger value="annonces" className="flex items-center gap-2 text-xs"><FileText className="h-3.5 w-3.5" /> {t("docs.annonces")}</TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2 text-xs"><Mail className="h-3.5 w-3.5" /> {t("docs.marketing")}</TabsTrigger>
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
                    {/* Custom templates */}
                    {customTemplates.map((ct, i) => (
                      <div key={i} className="p-3 rounded-lg border border-border/30 bg-muted/5">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-xs font-medium">{ct.name}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">{lang === "fr" ? "Template personnalisé" : "Custom template"}</p>
                          </div>
                          <Badge variant="secondary" className="text-[8px] px-1.5">{lang === "fr" ? "Perso" : "Custom"}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs text-muted-foreground">{lang === "fr" ? "Informations du mandat" : "Mandate details"}</p>
                    <VoiceButton
                      onTranscript={(text) => { setMandatInfo(prev => prev + " " + text); setVoiceInterim(""); }}
                      onInterim={(text) => setVoiceInterim(text)}
                    />
                  </div>
                  <Textarea
                    value={mandatInfo + (voiceInterim ? " " + voiceInterim : "")}
                    onChange={e => { setMandatInfo(e.target.value); setVoiceInterim(""); }}
                    className="bg-muted/10 border-border/30 min-h-[140px]"
                    placeholder={"Dictez ou écrivez les informations :\n\nVendeur : Jean Dupont\nAdresse du bien : 12 rue de la Paix, 75002 Paris\nType : Appartement T3\nSurface : 65 m²\nPrix : 450 000 €"}
                  />
                </div>

                <Button className="w-full" onClick={genererMandat} disabled={loadingMandat}>
                  {loadingMandat ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> {t("docs.generating")}</> : <><Sparkles className="h-4 w-4 mr-2" /> {t("docs.generate")} le mandat</>}
                </Button>

                <div className="border-t border-border/20 pt-3">
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx,.doc" onChange={onFileSelected} />
                  <Button variant="outline" size="sm" className="w-full text-xs gap-2" onClick={handleTemplateUpload}>
                    <Upload className="h-3.5 w-3.5" /> {lang === "fr" ? "Ajouter mon template (PDF / Word)" : "Add my template (PDF / Word)"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {mandatContent ? (
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
                  <div className="flex gap-2">
                    <Button size="sm" className="flex-1 gap-1" onClick={downloadMandatPDF}><Download className="h-3.5 w-3.5" /> {t("docs.download_pdf")}</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => copier(mandatContent)}><Copy className="h-3.5 w-3.5" /> {t("docs.copy")}</Button>
                    <Button size="sm" variant="outline" className="gap-1" onClick={() => toast.info(lang === "fr" ? "Envoi par email — connecteur à configurer" : "Email sending — connector to configure")}><Send className="h-3.5 w-3.5" /> {lang === "fr" ? "Envoyer" : "Send"}</Button>
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
                  <Textarea placeholder={lang === "fr" ? "Description du bien (pièces, étage, vue, parking...)" : "Property description..."} value={annonceForm.description} onChange={(e) => setAnnonceForm({...annonceForm, description: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
                  
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
                    {loadingAnnonce ? t("docs.generating") : <><Sparkles className="h-4 w-4 mr-2" /> {lang === "fr" ? "Générer l'annonce" : "Generate listing"}</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {annonce ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">{annonce.titre_accrocheur || (lang === "fr" ? "Annonce générée" : "Generated listing")}</CardTitle>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={() => copier(editableAnnonce.version_longue || annonce.version_longue)} className="gap-1 text-xs"><Copy className="h-3 w-3" /> {t("docs.copy")}</Button>
                    <Button size="sm" variant="outline" onClick={sauvegarderAnnonce} className="gap-1 text-xs"><Save className="h-3 w-3" /> {lang === "fr" ? "Sauvegarder" : "Save"}</Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="courte">
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
                  <Textarea placeholder={lang === "fr" ? "Décrivez le bien ou le sujet *" : "Describe the property or subject *"} value={marketingForm.bien} onChange={(e) => setMarketingForm({...marketingForm, bien: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
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
                    {loadingMarketing ? t("docs.generating") : <><Sparkles className="h-4 w-4 mr-2" /> {lang === "fr" ? "Générer le contenu" : "Generate content"}</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {marketing ? (
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
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copier(`${marketing.objet}\n\n${marketing.contenu_principal}\n\n${marketing.call_to_action}`)}>
                    <Copy className="h-3 w-3 mr-2" /> {lang === "fr" ? "Copier tout" : "Copy all"}
                  </Button>
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
      </Tabs>
    </AppLayout>
  );
};

export default Studio;
