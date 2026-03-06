import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Palette, FileText, Image, Mail, Layout, Sparkles, Wand2, Copy, Save, MessageSquare, Hash, Lightbulb } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

const Studio = () => {
  const { user } = useAuth();

  // --- Annonces state ---
  const [annonceForm, setAnnonceForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<any>(null);
  const [loadingAnnonce, setLoadingAnnonce] = useState(false);

  // --- Marketing state ---
  const [marketingForm, setMarketingForm] = useState({ type: "email", bien: "", cible: "", ton: "professionnel" });
  const [marketing, setMarketing] = useState<any>(null);
  const [loadingMarketing, setLoadingMarketing] = useState(false);

  const genererAnnonce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annonceForm.adresse) { toast.error("Adresse requise"); return; }
    setLoadingAnnonce(true);
    try {
      const { data, error } = await supabase.functions.invoke("generate-annonce", {
        body: {
          adresse: annonceForm.adresse,
          prix: annonceForm.prix ? Number(annonceForm.prix) : undefined,
          surface: annonceForm.surface ? Number(annonceForm.surface) : undefined,
          description: annonceForm.description,
          style: annonceForm.style,
        },
      });
      if (error) throw error;
      setAnnonce(data);
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
        user_id: user.id,
        adresse: annonceForm.adresse,
        prix: annonceForm.prix ? Number(annonceForm.prix) : null,
        surface: annonceForm.surface ? Number(annonceForm.surface) : null,
        description: annonceForm.description,
        contenu_genere: annonce,
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
      const { data, error } = await supabase.functions.invoke("generate-marketing", {
        body: marketingForm,
      });
      if (error) throw error;
      setMarketing(data);
      toast.success("Contenu marketing généré !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setLoadingMarketing(false);
    }
  };

  const copier = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  const typeLabels: Record<string, string> = {
    email: "📧 Email professionnel",
    post_social: "📱 Post réseaux sociaux",
    sms: "💬 SMS / WhatsApp",
    flyer: "📄 Texte flyer",
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Palette className="h-7 w-7 text-primary" />
          Documents <span className="gradient-text">IA</span>
        </h1>
        <p className="page-subtitle">Générez annonces, contenus marketing et documents professionnels</p>
      </div>

      <Tabs defaultValue="annonces" className="space-y-6">
        <TabsList className="bg-card/60">
          <TabsTrigger value="annonces" className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> Annonces
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2 text-xs">
            <Mail className="h-3.5 w-3.5" /> Marketing
          </TabsTrigger>
          <TabsTrigger value="visuels" className="flex items-center gap-2 text-xs">
            <Image className="h-3.5 w-3.5" /> Visuels IA
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2 text-xs">
            <Layout className="h-3.5 w-3.5" /> Landing Pages
          </TabsTrigger>
        </TabsList>

        {/* ===== ANNONCES ===== */}
        <TabsContent value="annonces">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/60 border-border/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Wand2 className="h-4 w-4 text-primary" /> Générateur d'annonces
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={genererAnnonce} className="space-y-4">
                  <Input placeholder="Adresse du bien *" value={annonceForm.adresse} onChange={(e) => setAnnonceForm({...annonceForm, adresse: e.target.value})} className="bg-muted/10 border-border/30" />
                  <div className="grid grid-cols-2 gap-3">
                    <Input placeholder="Prix (€)" type="number" value={annonceForm.prix} onChange={(e) => setAnnonceForm({...annonceForm, prix: e.target.value})} className="bg-muted/10 border-border/30" />
                    <Input placeholder="Surface (m²)" type="number" value={annonceForm.surface} onChange={(e) => setAnnonceForm({...annonceForm, surface: e.target.value})} className="bg-muted/10 border-border/30" />
                  </div>
                  <Textarea placeholder="Description du bien (pièces, étage, vue, parking...)" value={annonceForm.description} onChange={(e) => setAnnonceForm({...annonceForm, description: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
                  <Select value={annonceForm.style} onValueChange={(v) => setAnnonceForm({...annonceForm, style: v})}>
                    <SelectTrigger className="bg-muted/10 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionnel">Professionnel</SelectItem>
                      <SelectItem value="luxe">Luxe / Prestige</SelectItem>
                      <SelectItem value="chaleureux">Chaleureux / Familial</SelectItem>
                      <SelectItem value="jeune">Moderne / Jeune actif</SelectItem>
                      <SelectItem value="investisseur">Investisseur</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" className="w-full" disabled={loadingAnnonce}>
                    {loadingAnnonce ? "Génération en cours..." : <><Sparkles className="h-4 w-4 mr-2" /> Générer l'annonce</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {annonce ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm">{annonce.titre_accrocheur || "Annonce générée"}</CardTitle>
                  <Button size="sm" variant="outline" onClick={sauvegarderAnnonce} className="gap-1">
                    <Save className="h-3 w-3" /> Sauvegarder
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="courte">
                    <TabsList className="w-full bg-muted/10">
                      <TabsTrigger value="courte" className="flex-1 text-xs">Courte</TabsTrigger>
                      <TabsTrigger value="longue" className="flex-1 text-xs">Longue</TabsTrigger>
                      <TabsTrigger value="premium" className="flex-1 text-xs">Premium</TabsTrigger>
                    </TabsList>
                    {["courte", "longue", "premium"].map((v) => (
                      <TabsContent key={v} value={v}>
                        <div className="relative pr-8">
                          <p className="text-sm whitespace-pre-wrap">{annonce[`version_${v === "courte" ? "courte" : v === "longue" ? "longue" : "premium"}`]}</p>
                          <Button size="icon" variant="ghost" className="absolute top-0 right-0 h-7 w-7" onClick={() => copier(annonce[`version_${v}`])}>
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>

                  {annonce.phrases_accroche?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground">Phrases d'accroche alternatives</p>
                      {annonce.phrases_accroche.map((p: string, i: number) => (
                        <div key={i} className="flex items-center justify-between text-xs bg-muted/10 rounded px-2 py-1.5">
                          <span>{p}</span>
                          <Button size="icon" variant="ghost" className="h-5 w-5 shrink-0" onClick={() => copier(p)}>
                            <Copy className="h-2.5 w-2.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {annonce.hashtags?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {annonce.hashtags.map((h: string) => (
                        <Badge key={h} variant="secondary" className="text-[9px] cursor-pointer" onClick={() => copier(h)}>{h}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-2">
                  <FileText className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Votre annonce apparaîtra ici</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== MARKETING ===== */}
        <TabsContent value="marketing">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-card/60 border-border/30">
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Mail className="h-4 w-4 text-primary" /> Générateur Marketing
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={genererMarketing} className="space-y-4">
                  <Select value={marketingForm.type} onValueChange={(v) => setMarketingForm({...marketingForm, type: v})}>
                    <SelectTrigger className="bg-muted/10 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">📧 Email professionnel</SelectItem>
                      <SelectItem value="post_social">📱 Post réseaux sociaux</SelectItem>
                      <SelectItem value="sms">💬 SMS / WhatsApp</SelectItem>
                      <SelectItem value="flyer">📄 Texte flyer</SelectItem>
                    </SelectContent>
                  </Select>
                  <Textarea placeholder="Décrivez le bien ou le sujet du contenu *" value={marketingForm.bien} onChange={(e) => setMarketingForm({...marketingForm, bien: e.target.value})} className="bg-muted/10 border-border/30" rows={3} />
                  <Input placeholder="Cible (ex: primo-accédants, investisseurs...)" value={marketingForm.cible} onChange={(e) => setMarketingForm({...marketingForm, cible: e.target.value})} className="bg-muted/10 border-border/30" />
                  <Select value={marketingForm.ton} onValueChange={(v) => setMarketingForm({...marketingForm, ton: v})}>
                    <SelectTrigger className="bg-muted/10 border-border/30">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professionnel">Professionnel</SelectItem>
                      <SelectItem value="engageant">Engageant / Dynamique</SelectItem>
                      <SelectItem value="luxe">Luxe / Premium</SelectItem>
                      <SelectItem value="decontracte">Décontracté / Accessible</SelectItem>
                      <SelectItem value="urgence">Urgence / Exclusivité</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="submit" className="w-full" disabled={loadingMarketing}>
                    {loadingMarketing ? "Génération en cours..." : <><Sparkles className="h-4 w-4 mr-2" /> Générer le contenu</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {marketing ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm flex items-center gap-2">
                    {typeLabels[marketingForm.type] || "Contenu généré"}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Objet / Titre */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Objet / Titre</p>
                    <div className="flex items-center justify-between bg-muted/10 rounded px-3 py-2">
                      <p className="text-sm font-medium">{marketing.objet}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copier(marketing.objet)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Contenu principal */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Contenu principal</p>
                    <div className="relative pr-8 bg-muted/10 rounded p-3">
                      <p className="text-sm whitespace-pre-wrap">{marketing.contenu_principal}</p>
                      <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-6 w-6" onClick={() => copier(marketing.contenu_principal)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* CTA */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Call to Action</p>
                    <div className="flex items-center justify-between bg-primary/10 rounded px-3 py-2 border border-primary/20">
                      <p className="text-sm font-semibold text-primary">{marketing.call_to_action}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => copier(marketing.call_to_action)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Version courte */}
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground">Version courte (SMS / Story)</p>
                    <div className="flex items-center justify-between bg-muted/10 rounded px-3 py-2">
                      <p className="text-xs">{marketing.variante_courte}</p>
                      <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => copier(marketing.variante_courte)}>
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Hashtags */}
                  {marketing.hashtags?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Hash className="h-3 w-3" /> Hashtags</p>
                      <div className="flex flex-wrap gap-1">
                        {marketing.hashtags.map((h: string) => (
                          <Badge key={h} variant="secondary" className="text-[9px] cursor-pointer" onClick={() => copier(h)}>{h}</Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Conseils */}
                  {marketing.conseils?.length > 0 && (
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Lightbulb className="h-3 w-3" /> Conseils</p>
                      <ul className="space-y-1">
                        {marketing.conseils.map((c: string, i: number) => (
                          <li key={i} className="text-xs text-muted-foreground bg-muted/5 rounded px-2 py-1">💡 {c}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Copier tout */}
                  <Button variant="outline" size="sm" className="w-full" onClick={() => copier(`${marketing.objet}\n\n${marketing.contenu_principal}\n\n${marketing.call_to_action}`)}>
                    <Copy className="h-3 w-3 mr-2" /> Copier tout le contenu
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[300px]">
                <div className="text-center space-y-2">
                  <Mail className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                  <p className="text-sm text-muted-foreground">Votre contenu marketing apparaîtra ici</p>
                </div>
              </Card>
            )}
          </div>
        </TabsContent>

        {/* ===== VISUELS ===== */}
        <TabsContent value="visuels">
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-12 text-center">
              <Image className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Visuels IA</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Home staging virtuel, optimisation lumière, nettoyage photo.
                Module en cours de développement.
              </p>
              <Badge variant="outline" className="mt-4 text-xs">Prochainement</Badge>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== LANDING PAGES ===== */}
        <TabsContent value="landing">
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-12 text-center">
              <Layout className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Landing Pages</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Créez des pages de présentation pour vos biens en un clic.
                Module en cours de développement.
              </p>
              <Badge variant="outline" className="mt-4 text-xs">Prochainement</Badge>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Studio;
