import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Palette, FileText, Image, Mail, Layout, Sparkles, Wand2, Copy, Download } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Studio = () => {
  const [annonceForm, setAnnonceForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const genererAnnonce = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annonceForm.adresse) { toast.error("Adresse requise"); return; }
    setLoading(true);
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
      setLoading(false);
    }
  };

  const copier = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié !");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <Palette className="h-7 w-7 text-primary" />
          Studio <span className="gradient-text">Business</span>
        </h1>
        <p className="page-subtitle">Créez du contenu marketing professionnel en un clic</p>
      </div>

      <Tabs defaultValue="annonces" className="space-y-6">
        <TabsList className="bg-card/60">
          <TabsTrigger value="annonces" className="flex items-center gap-2 text-xs">
            <FileText className="h-3.5 w-3.5" /> Annonces
          </TabsTrigger>
          <TabsTrigger value="visuels" className="flex items-center gap-2 text-xs">
            <Image className="h-3.5 w-3.5" /> Visuels IA
          </TabsTrigger>
          <TabsTrigger value="marketing" className="flex items-center gap-2 text-xs">
            <Mail className="h-3.5 w-3.5" /> Marketing
          </TabsTrigger>
          <TabsTrigger value="landing" className="flex items-center gap-2 text-xs">
            <Layout className="h-3.5 w-3.5" /> Landing Pages
          </TabsTrigger>
        </TabsList>

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
                  <Textarea placeholder="Description du bien..." value={annonceForm.description} onChange={(e) => setAnnonceForm({...annonceForm, description: e.target.value})} className="bg-muted/10 border-border/30" />
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? "Génération..." : <><Sparkles className="h-4 w-4 mr-2" /> Générer l'annonce</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {annonce ? (
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <CardTitle className="text-sm">{annonce.titreAccrocheur || annonce.titre_accrocheur || "Annonce générée"}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Tabs defaultValue="courte">
                    <TabsList className="w-full bg-muted/10">
                      <TabsTrigger value="courte" className="flex-1 text-xs">Courte</TabsTrigger>
                      <TabsTrigger value="longue" className="flex-1 text-xs">Longue</TabsTrigger>
                      <TabsTrigger value="premium" className="flex-1 text-xs">Premium</TabsTrigger>
                    </TabsList>
                    <TabsContent value="courte">
                      <div className="relative">
                        <p className="text-sm">{annonce.version_courte}</p>
                        <Button size="icon" variant="ghost" className="absolute top-0 right-0" onClick={() => copier(annonce.version_courte)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="longue">
                      <div className="relative">
                        <p className="text-sm">{annonce.version_longue}</p>
                        <Button size="icon" variant="ghost" className="absolute top-0 right-0" onClick={() => copier(annonce.version_longue)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </TabsContent>
                    <TabsContent value="premium">
                      <div className="relative">
                        <p className="text-sm">{annonce.version_premium}</p>
                        <Button size="icon" variant="ghost" className="absolute top-0 right-0" onClick={() => copier(annonce.version_premium)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    </TabsContent>
                  </Tabs>
                  {annonce.hashtags && (
                    <div className="flex flex-wrap gap-1">
                      {annonce.hashtags.map((h: string) => (
                        <Badge key={h} variant="secondary" className="text-[9px]">{h}</Badge>
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

        <TabsContent value="marketing">
          <Card className="bg-card/60 border-border/30">
            <CardContent className="p-12 text-center">
              <Mail className="h-16 w-16 text-muted-foreground/20 mx-auto mb-4" />
              <h3 className="text-lg font-medium">Marketing Local</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                Flyers, emails, présentations personnalisées.
                Module en cours de développement.
              </p>
              <Badge variant="outline" className="mt-4 text-xs">Prochainement</Badge>
            </CardContent>
          </Card>
        </TabsContent>

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
