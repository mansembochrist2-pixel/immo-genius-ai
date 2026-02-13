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
import { Checkbox } from "@/components/ui/checkbox";
import { Plus, CheckSquare, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const prioriteOptions = ["basse", "moyenne", "haute", "urgente"] as const;

const Taches = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", priorite: "moyenne" as string });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["tasks"],
    queryFn: async () => {
      const { data, error } = await supabase.from("tasks").select("*").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async (t: typeof form) => {
      const { error } = await supabase.from("tasks").insert({ titre: t.titre, priorite: t.priorite as any, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tâche ajoutée"); setOpen(false); setForm({ titre: "", priorite: "moyenne" }); },
    onError: (e: any) => toast.error(e.message),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, done }: { id: string; done: boolean }) => {
      const { error } = await supabase.from("tasks").update({ done }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["tasks"] }); toast.success("Tâche supprimée"); },
  });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre) { toast.error("Veuillez entrer un titre"); return; }
    addMutation.mutate(form);
  };

  const pendingCount = tasks.filter((t: any) => !t.done).length;

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><CheckSquare className="h-6 w-6 text-accent" /> Tâches</h1>
          <p className="page-subtitle">{pendingCount} tâches en cours</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle className="font-display">Nouvelle tâche</DialogTitle></DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2"><Label>Titre</Label><Input placeholder="Appeler le client..." value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} /></div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={(v) => setForm({ ...form, priorite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{prioriteOptions.map((p) => <SelectItem key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending}>{addMutation.isPending ? "Ajout..." : "Ajouter la tâche"}</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Chargement...</div>
          ) : tasks.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Aucune tâche. Créez votre première tâche !</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead><TableHead>Titre</TableHead><TableHead>Priorité</TableHead><TableHead>Statut</TableHead><TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasks.map((t: any) => (
                  <TableRow key={t.id} className={t.done ? "opacity-50" : ""}>
                    <TableCell><Checkbox checked={t.done} onCheckedChange={() => toggleMutation.mutate({ id: t.id, done: !t.done })} /></TableCell>
                    <TableCell className={`font-medium ${t.done ? "line-through" : ""}`}>{t.titre}</TableCell>
                    <TableCell><Badge variant={t.priorite === "haute" || t.priorite === "urgente" ? "destructive" : t.priorite === "moyenne" ? "default" : "secondary"} className="text-[10px]">{t.priorite}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.done ? "Terminée" : "En cours"}</TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => deleteMutation.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
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

export default Taches;
