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
import { Plus, CheckSquare } from "lucide-react";
import { toast } from "sonner";

interface Task {
  id: number;
  titre: string;
  priorite: string;
  done: boolean;
}

const Taches = () => {
  const [tasks, setTasks] = useState<Task[]>([
    { id: 1, titre: "Appeler M. Martin pour visite", priorite: "haute", done: false },
    { id: 2, titre: "Envoyer compromis Villa Roses", priorite: "haute", done: false },
    { id: 3, titre: "Relancer prospect Dupont", priorite: "moyenne", done: true },
    { id: 4, titre: "Photographier appartement Rue Pasteur", priorite: "basse", done: false },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", priorite: "moyenne" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.titre) { toast.error("Veuillez entrer un titre"); return; }
    setTasks([...tasks, { ...form, id: Date.now(), done: false }]);
    setForm({ titre: "", priorite: "moyenne" });
    setOpen(false);
    toast.success("Tâche ajoutée");
  };

  const toggleDone = (id: number) => {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><CheckSquare className="h-6 w-6 text-accent" /> Tâches</h1>
          <p className="page-subtitle">{tasks.filter((t) => !t.done).length} tâches en cours</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Nouvelle tâche</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Titre</Label>
                <Input placeholder="Appeler le client..." value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Priorité</Label>
                <Select value={form.priorite} onValueChange={(v) => setForm({ ...form, priorite: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="haute">Haute</SelectItem>
                    <SelectItem value="moyenne">Moyenne</SelectItem>
                    <SelectItem value="basse">Basse</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Ajouter la tâche</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10"></TableHead>
                <TableHead>Titre</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((t) => (
                <TableRow key={t.id} className={t.done ? "opacity-50" : ""}>
                  <TableCell>
                    <Checkbox checked={t.done} onCheckedChange={() => toggleDone(t.id)} />
                  </TableCell>
                  <TableCell className={`font-medium ${t.done ? "line-through" : ""}`}>{t.titre}</TableCell>
                  <TableCell>
                    <Badge variant={t.priorite === "haute" ? "destructive" : t.priorite === "moyenne" ? "default" : "secondary"} className="text-[10px]">
                      {t.priorite}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{t.done ? "Terminée" : "En cours"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Taches;
