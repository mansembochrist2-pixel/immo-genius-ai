import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Megaphone, Copy, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { VoiceButton } from "@/components/VoiceButton";
import { ImageUploadButton, fileToBase64 } from "@/components/ImageUploadButton";

interface AnnonceResult {
  titre_accrocheur: string;
  version_courte: string;
  version_longue: string;
  version_premium: string;
  hashtags: string[];
  phrases_accroche: string[];
}

const Marketing = () => {
  const [form, setForm] = useState({ adresse: "", prix: "", surface: "", description: "", style: "professionnel" });
  const [annonce, setAnnonce] = useState<AnnonceResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const generer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse || !form.prix || !form.surface) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        adresse: form.adresse,
        prix: form.prix,
        surface: form.surface,
        description: form.description,
        style: form.style,
      };
      if (photoPreview) body.imageBase64 = photoPreview;

      const { data, error } = await supabase.functions.invoke("generate-annonce", { body });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setAnnonce(data);
      toast.success("Annonce générée par l'IA !");
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la génération");
    } finally {
      setLoading(false);
    }
  };

  const copier = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copié dans le presse-papier");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Megaphone className="h-6 w-6 text-accent" /> Marketing IA</h1>
        <p className="page-subtitle">Générez des annonces immobilières premium — texte, voix et photos</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-sans font-semibold">Détails du bien</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={generer} className="space-y-4">
              <div className="space-y-2">
                <Label>Adresse *</Label>
                <div className="flex gap-2">
                  <Input placeholder="12 Rue des Lilas, Lyon" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} className="flex-1" />
                  <VoiceButton onTranscript={(text) => setForm({ ...form, adresse: text })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prix (€) *</Label>
                  <Input type="number" placeholder="350000" value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label>Surface (m²) *</Label>
                  <Input type="number" placeholder="85" value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Style d'annonce</Label>
                <Select value={form.style} onValueChange={(v) => setForm({ ...form, style: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professionnel">Professionnel</SelectItem>
                    <SelectItem value="premium">Premium / Luxe</SelectItem>
                    <SelectItem value="dynamique">Dynamique / Jeune</SelectItem>
                    <SelectItem value="classique">Classique / Traditionnel</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Description</Label>
                  <VoiceButton onTranscript={(text) => setForm({ ...form, description: form.description ? `${form.description} ${text}` : text })} size="sm" />
                </div>
                <Textarea placeholder="Bel appartement lumineux avec balcon..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              </div>

              {/* Photo upload */}
              <div className="space-y-2">
                <Label>Photo du bien (optionnel)</Label>
                <div className="flex items-center gap-3">
                  <ImageUploadButton onImageSelected={(base64) => { setPhotoPreview(base64); toast.success("Photo ajoutée"); }} />
                  {photoPreview && (
                    <div className="flex items-center gap-2">
                      <img src={photoPreview} alt="Preview" className="h-12 w-12 rounded object-cover" />
                      <Button type="button" variant="ghost" size="sm" onClick={() => setPhotoPreview(null)}>✕</Button>
                    </div>
                  )}
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Génération en cours...</> : <><Sparkles className="h-4 w-4 mr-2" /> Générer avec l'IA</>}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {annonce ? (
            <Tabs defaultValue="courte">
              <TabsList className="w-full">
                <TabsTrigger value="courte" className="flex-1">Portails</TabsTrigger>
                <TabsTrigger value="longue" className="flex-1">Site web</TabsTrigger>
                <TabsTrigger value="premium" className="flex-1">Premium</TabsTrigger>
                <TabsTrigger value="accroches" className="flex-1">Accroches</TabsTrigger>
              </TabsList>

              <TabsContent value="courte">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-sans font-semibold">📢 {annonce.titre_accrocheur}</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => copier(annonce.version_courte)}><Copy className="h-3 w-3 mr-1" /> Copier</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg leading-relaxed">{annonce.version_courte}</p>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {annonce.hashtags.map((h, i) => (
                        <span key={i} className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">{h}</span>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="longue">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-sans font-semibold">Version site web</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => copier(annonce.version_longue)}><Copy className="h-3 w-3 mr-1" /> Copier</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg leading-relaxed max-h-[400px] overflow-y-auto">{annonce.version_longue}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="premium">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm font-sans font-semibold">Version premium</CardTitle>
                    <Button variant="outline" size="sm" onClick={() => copier(annonce.version_premium)}><Copy className="h-3 w-3 mr-1" /> Copier</Button>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap bg-muted p-4 rounded-lg leading-relaxed max-h-[400px] overflow-y-auto">{annonce.version_premium}</p>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="accroches">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm font-sans font-semibold">Phrases d'accroche</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {annonce.phrases_accroche.map((p, i) => (
                      <div key={i} className="flex items-center justify-between bg-muted p-3 rounded-lg">
                        <p className="text-sm flex-1">{p}</p>
                        <Button variant="ghost" size="sm" onClick={() => copier(p)}><Copy className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <Card>
              <CardContent className="py-12">
                <div className="text-center text-muted-foreground text-sm">
                  <Sparkles className="h-8 w-8 mx-auto mb-3 opacity-50" />
                  Remplissez le formulaire pour générer une annonce avec l'IA
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Marketing;
