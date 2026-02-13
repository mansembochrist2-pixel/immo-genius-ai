import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Megaphone, Copy } from "lucide-react";
import { toast } from "sonner";

const Marketing = () => {
  const [form, setForm] = useState({ adresse: "", prix: "", surface: "", description: "" });
  const [annonce, setAnnonce] = useState("");

  const generer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.adresse || !form.prix || !form.surface) {
      toast.error("Veuillez remplir les champs obligatoires");
      return;
    }
    const text = `🏡 À VENDRE — ${form.adresse}\n\n💰 Prix : ${form.prix} €\n📐 Surface : ${form.surface} m²\n\n${form.description ? form.description + "\n\n" : ""}📞 Contactez-nous dès maintenant pour organiser une visite !\n\n#immobilier #avendre #estateai`;
    setAnnonce(text);
    toast.success("Annonce générée !");
  };

  const copier = () => {
    navigator.clipboard.writeText(annonce);
    toast.success("Annonce copiée dans le presse-papier");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><Megaphone className="h-6 w-6 text-accent" /> Marketing</h1>
        <p className="page-subtitle">Générez des annonces immobilières en un clic</p>
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
                <Input placeholder="12 Rue des Lilas, Lyon" value={form.adresse} onChange={(e) => setForm({ ...form, adresse: e.target.value })} />
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
                <Label>Description</Label>
                <Textarea placeholder="Bel appartement lumineux avec balcon..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} />
              </div>
              <Button type="submit" className="w-full">Générer l'annonce</Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-sans font-semibold">Aperçu de l'annonce</CardTitle>
            {annonce && (
              <Button variant="outline" size="sm" onClick={copier}>
                <Copy className="h-3 w-3 mr-1" /> Copier
              </Button>
            )}
          </CardHeader>
          <CardContent>
            {annonce ? (
              <pre className="whitespace-pre-wrap text-sm bg-muted p-4 rounded-lg font-sans leading-relaxed">{annonce}</pre>
            ) : (
              <div className="text-center text-muted-foreground py-12 text-sm">
                Remplissez le formulaire pour générer votre annonce
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Marketing;
