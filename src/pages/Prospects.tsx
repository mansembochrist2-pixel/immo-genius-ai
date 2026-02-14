import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users, Trash2, Pencil, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ImageUploadButton, fileToBase64 } from "@/components/ImageUploadButton";
import { CameraButton } from "@/components/CameraButton";
import { useNavigate } from "react-router-dom";

const statutOptions = ["nouveau", "contacte", "visite", "offre", "signe", "perdu"] as const;
const statutLabels: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", visite: "En visite", offre: "Offre", signe: "Signé", perdu: "Perdu",
};

const provenanceOptions = ["Manuel", "Recommandation", "Site web", "Publicité", "Instagram", "Facebook", "LinkedIn", "Leboncoin", "SeLoger", "Import CSV", "Autre"];

const COUNTRY_CODES = [
  { code: "+33", label: "🇫🇷 +33", country: "France" },
  { code: "+32", label: "🇧🇪 +32", country: "Belgique" },
  { code: "+41", label: "🇨🇭 +41", country: "Suisse" },
  { code: "+352", label: "🇱🇺 +352", country: "Luxembourg" },
  { code: "+377", label: "🇲🇨 +377", country: "Monaco" },
  { code: "+44", label: "🇬🇧 +44", country: "Royaume-Uni" },
  { code: "+49", label: "🇩🇪 +49", country: "Allemagne" },
  { code: "+34", label: "🇪🇸 +34", country: "Espagne" },
  { code: "+39", label: "🇮🇹 +39", country: "Italie" },
  { code: "+351", label: "🇵🇹 +351", country: "Portugal" },
  { code: "+1", label: "🇺🇸 +1", country: "États-Unis / Canada" },
  { code: "+212", label: "🇲🇦 +212", country: "Maroc" },
  { code: "+216", label: "🇹🇳 +216", country: "Tunisie" },
  { code: "+213", label: "🇩🇿 +213", country: "Algérie" },
  { code: "+221", label: "🇸🇳 +221", country: "Sénégal" },
  { code: "+225", label: "🇨🇮 +225", country: "Côte d'Ivoire" },
  { code: "+237", label: "🇨🇲 +237", country: "Cameroun" },
  { code: "+81", label: "🇯🇵 +81", country: "Japon" },
  { code: "+86", label: "🇨🇳 +86", country: "Chine" },
  { code: "+971", label: "🇦🇪 +971", country: "Émirats arabes unis" },
];

const emptyForm = { nom: "", telephone: "", email: "", statut: "nouveau" as string, provenance: "", countryCode: "+33" };

const Prospects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [ocrLoading, setOcrLoading] = useState(false);

  const { data: prospects = [], isLoading } = useQuery({
    queryKey: ["prospects"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prospects").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (p: typeof form) => {
      const fullPhone = p.telephone ? `${p.countryCode} ${p.telephone}` : null;
      const { error } = await supabase.from("prospects").insert({
        nom: p.nom,
        telephone: fullPhone,
        email: p.email || null,
        statut: p.statut as any,
        provenance: p.provenance || null,
        user_id: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prospects"] }); toast.success("Prospect ajouté"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...p }: typeof form & { id: string }) => {
      const fullPhone = p.telephone ? `${p.countryCode} ${p.telephone}` : null;
      const { error } = await supabase.from("prospects").update({
        nom: p.nom,
        telephone: fullPhone,
        email: p.email || null,
        statut: p.statut as any,
        provenance: p.provenance || null,
      }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prospects"] }); toast.success("Prospect modifié"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prospects"] }); toast.success("Prospect supprimé"); },
  });

  const closeDialog = () => { setOpen(false); setEditId(null); setForm(emptyForm); };

  const openEdit = (p: any) => {
    setEditId(p.id);
    // Parse country code from stored phone
    let countryCode = "+33";
    let phone = p.telephone || "";
    const match = phone.match(/^(\+\d{1,4})\s?(.*)/);
    if (match) {
      countryCode = match[1];
      phone = match[2];
    }
    setForm({
      nom: p.nom,
      telephone: phone,
      email: p.email || "",
      statut: p.statut,
      provenance: (p as any).provenance || "",
      countryCode,
    });
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom) { toast.error("Le nom est requis"); return; }
    if (editId) {
      updateMutation.mutate({ ...form, id: editId });
    } else {
      addMutation.mutate(form);
    }
  };

  const handlePhotoOCR = async (base64: string) => {
    setOcrLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-prospects-from-image", {
        body: { imageBase64: base64 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      const extracted = data?.prospects || [];
      if (extracted.length === 0) {
        toast.info("Aucun prospect détecté dans l'image");
        return;
      }

      const toInsert = extracted.map((p: any) => ({
        nom: p.nom || "Sans nom",
        email: p.email || null,
        telephone: p.telephone || null,
        notes: p.notes || null,
        source: "photo-ocr",
        statut: "nouveau" as any,
        user_id: user!.id,
      }));

      const { error: insertErr } = await supabase.from("prospects").insert(toInsert);
      if (insertErr) throw insertErr;

      queryClient.invalidateQueries({ queryKey: ["prospects"] });
      queryClient.invalidateQueries({ queryKey: ["prospect-count"] });
      toast.success(`${extracted.length} prospect(s) extraits et ajoutés !`);
    } catch (err: any) {
      toast.error(err.message || "Erreur d'analyse de l'image");
    } finally {
      setOcrLoading(false);
    }
  };

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="h-6 w-6 text-accent" /> Prospects</h1>
          <p className="page-subtitle">{prospects.length} prospects dans votre base</p>
        </div>
        <div className="flex items-center gap-2">
          <ImageUploadButton onImageSelected={(base64) => handlePhotoOCR(base64)} disabled={ocrLoading} />
          <CameraButton onPhotoTaken={(base64) => handlePhotoOCR(base64)} disabled={ocrLoading} />
          {ocrLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          <Button variant="outline" onClick={() => navigate("/import")}>Import CSV</Button>
          <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
            <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle className="font-display">{editId ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle></DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                <div className="space-y-2"><Label>Nom</Label><Input placeholder="Jean Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
                <div className="space-y-2">
                  <Label>Téléphone</Label>
                  <div className="flex gap-2">
                    <Select value={form.countryCode} onValueChange={(v) => setForm({ ...form, countryCode: v })}>
                      <SelectTrigger className="w-[130px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {COUNTRY_CODES.map((c) => (
                          <SelectItem key={c.code} value={c.code}>{c.label} {c.country}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input placeholder="06 12 34 56 78" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="flex-1" />
                  </div>
                </div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Statut</Label>
                    <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{statutOptions.map((s) => <SelectItem key={s} value={s}>{statutLabels[s]}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Provenance</Label>
                    <Select value={form.provenance} onValueChange={(v) => setForm({ ...form, provenance: v })}>
                      <SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger>
                      <SelectContent>{provenanceOptions.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "En cours..." : editId ? "Enregistrer" : "Ajouter le prospect"}</Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : prospects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p>Aucun prospect. Ajoutez votre premier prospect !</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead>Email</TableHead><TableHead>Source</TableHead><TableHead>Provenance</TableHead><TableHead>Statut</TableHead><TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.telephone || "—"}</TableCell>
                    <TableCell>{p.email || "—"}</TableCell>
                    <TableCell><Badge variant="outline" className="text-xs">{p.source || "manual"}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.provenance || "—"}</TableCell>
                    <TableCell><Badge variant={p.statut === "signe" ? "default" : "secondary"}>{statutLabels[p.statut] || p.statut}</Badge></TableCell>
                    <TableCell className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Pencil className="h-4 w-4 text-muted-foreground" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Prospects;
