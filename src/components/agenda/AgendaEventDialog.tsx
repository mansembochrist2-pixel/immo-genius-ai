import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2, Trash2, Bot } from "lucide-react";
import { EVENT_TYPES, typeMap, formatDate } from "./AgendaEventCard";
import { cn } from "@/lib/utils";

export interface EventFormData {
  titre: string;
  type: string;
  date_debut: string;
  heure_debut: string;
  heure_fin: string;
  description: string;
  lieu: string;
  client_id: string;
}

interface AgendaEventDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  form: EventFormData;
  setForm: (form: EventFormData) => void;
  onSubmit: () => void;
  onDelete?: () => void;
  onPrepare?: () => void;
  isPending: boolean;
  isEdit?: boolean;
  clients: { id: string; nom: string }[];
}

export const AgendaEventDialog = ({
  open, onOpenChange, form, setForm, onSubmit, onDelete, onPrepare, isPending, isEdit, clients,
}: AgendaEventDialogProps) => {
  const selectedType = typeMap[form.type];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier l'événement" : "Nouvel événement"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* Title */}
          <div>
            <Label className="text-xs">Titre *</Label>
            <Input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="mt-1 bg-muted/10" placeholder="Ex: Visite T3 rue Oberkampf" />
          </div>

          {/* Type with color preview */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Type de RDV</Label>
              <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                <SelectTrigger className="mt-1 bg-muted/10">
                  <div className="flex items-center gap-2">
                    {selectedType && <div className={cn("w-2.5 h-2.5 rounded-full", selectedType.color)} />}
                    <SelectValue />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>
                      <div className="flex items-center gap-2">
                        <div className={cn("w-2.5 h-2.5 rounded-full", t.color)} />
                        {t.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} className="mt-1 bg-muted/10" />
            </div>
          </div>

          {/* Time */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Début</Label>
              <Input type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} className="mt-1 bg-muted/10" />
            </div>
            <div>
              <Label className="text-xs">Fin</Label>
              <Input type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} className="mt-1 bg-muted/10" />
            </div>
          </div>

          {/* Client */}
          <div>
            <Label className="text-xs">Client lié</Label>
            <Select value={form.client_id} onValueChange={v => setForm({ ...form, client_id: v })}>
              <SelectTrigger className="mt-1 bg-muted/10"><SelectValue placeholder="Aucun client" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucun</SelectItem>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.nom}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Location */}
          <div>
            <Label className="text-xs">Adresse du RDV</Label>
            <Input value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} className="mt-1 bg-muted/10" placeholder="Adresse ou lieu" />
          </div>

          {/* Notes */}
          <div>
            <Label className="text-xs">Note libre</Label>
            <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 bg-muted/10" rows={2} placeholder="Notes complémentaires..." />
          </div>
        </div>
        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2">
            {isEdit && onDelete && (
              <Button variant="destructive" size="sm" onClick={onDelete}>
                <Trash2 className="h-4 w-4 mr-1" /> Supprimer
              </Button>
            )}
            {isEdit && onPrepare && (
              <Button variant="outline" size="sm" onClick={onPrepare}>
                <Bot className="h-4 w-4 mr-1" /> Préparer ce RDV
              </Button>
            )}
          </div>
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
            <Button onClick={onSubmit} disabled={isPending || !form.titre || !form.date_debut}>
              {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              {isEdit ? "Modifier" : "Ajouter"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
