import { useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

interface Prospect {
  id: number;
  nom: string;
  telephone: string;
  email: string;
  statut: string;
}

const statusColors: Record<string, string> = {
  "Nouveau": "default",
  "Contacté": "secondary",
  "En visite": "outline",
  "Offre envoyée": "default",
  "Converti": "default",
};

const Prospects = () => {
  const [prospects, setProspects] = useState<Prospect[]>([
    { id: 1, nom: "Marie Martin", telephone: "06 12 34 56 78", email: "marie@email.com", statut: "Nouveau" },
    { id: 2, nom: "Pierre Dupont", telephone: "06 98 76 54 32", email: "pierre@email.com", statut: "En visite" },
    { id: 3, nom: "Sophie Lefebvre", telephone: "06 55 44 33 22", email: "sophie@email.com", statut: "Converti" },
  ]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nom: "", telephone: "", email: "", statut: "Nouveau" });

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.nom || !form.telephone || !form.email) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setProspects([...prospects, { ...form, id: Date.now() }]);
    setForm({ nom: "", telephone: "", email: "", statut: "Nouveau" });
    setOpen(false);
    toast.success("Prospect ajouté");
  };

  return (
    <AppLayout>
      <div className="page-header flex items-center justify-between">
        <div>
          <h1 className="page-title flex items-center gap-2"><Users className="h-6 w-6 text-accent" /> Prospects</h1>
          <p className="page-subtitle">{prospects.length} prospects dans votre base</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="h-4 w-4 mr-2" /> Ajouter</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-display">Nouveau prospect</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input placeholder="Jean Dupont" value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Téléphone</Label>
                <Input placeholder="06 12 34 56 78" value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" placeholder="email@example.com" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>Statut</Label>
                <Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(statusColors).map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">Ajouter le prospect</Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Téléphone</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Statut</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {prospects.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nom}</TableCell>
                  <TableCell>{p.telephone}</TableCell>
                  <TableCell>{p.email}</TableCell>
                  <TableCell>
                    <Badge variant={p.statut === "Converti" ? "default" : "secondary"}>{p.statut}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </AppLayout>
  );
};

export default Prospects;
