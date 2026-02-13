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
import { Plus, Users, Trash2, Pencil } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const statutOptions = ["nouveau", "contacte", "visite", "offre", "signe", "perdu"] as const;
const statutLabels: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", visite: "En visite", offre: "Offre", signe: "Signé", perdu: "Perdu",
};

const emptyForm = { nom: "", telephone: "", email: "", statut: "nouveau" as string };

const Prospects = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

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
      const { error } = await supabase.from("prospects").insert({ nom: p.nom, telephone: p.telephone, email: p.email, statut: p.statut as any, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["prospects"] }); toast.success("Prospect ajouté"); closeDialog(); },
    onError: (e: any) => toast.error(e.message),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, ...p }: typeof form & { id: string }) => {
      const { error } = await supabase.from("prospects").update({ nom: p.nom, telephone: p.telephone, email: p.email, statut: p.statut as any }).eq("id", id);
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
    setForm({ nom: p.nom, telephone: p.telephone || "", email: p.email || "", statut: p.statut });
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

  const isPending = addMutation.isPending || updateMutation.isPending;

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="h-6 w-6 text-accent" /> Prospects</h1>
          <p className="page-subtitle">{prospects.length} prospects dans votre base</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) closeDialog(); else setOpen(true); }}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">{editId ? "Modifier le prospect" : "Nouveau prospect"}</DialogTitle></DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Nom</Label><Input placeholder="Jean Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} /></div>
              <div className="space-y-2"><Label>Téléphone</Label><Input placeholder="06 12 34 56 78" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} /></div>
              <div className="space-y-2"><Label>Email</Label><Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{statutOptions.map((s) => <SelectItem key={s} value={s}>{statutLabels[s]}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>{isPending ? "En cours..." : editId ? "Enregistrer" : "Ajouter le prospect"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : prospects.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucun prospect. Ajoutez votre premier prospect !</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead><TableHead>Téléphone</TableHead><TableHead>Email</TableHead><TableHead>Statut</TableHead><TableHead className="w-20"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {prospects.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.nom}</TableCell>
                    <TableCell>{p.telephone || "—"}</TableCell>
                    <TableCell>{p.email || "—"}</TableCell>
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
