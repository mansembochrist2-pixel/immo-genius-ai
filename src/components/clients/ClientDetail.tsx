import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Brain, Phone, Mail, Clock, Target, Loader2, Sparkles, Pencil, Trash2,
  MessageSquare, TrendingUp, AlertTriangle, Play, Zap, CalendarDays, FileText,
  MapPin, Home, DollarSign, Timer, User,
} from "lucide-react";
import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const STATUTS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "visite", label: "Visite" },
  { value: "offre", label: "Offre" },
  { value: "signe", label: "Signé" },
  { value: "perdu", label: "Perdu" },
] as const;

const TYPES_PROJET = ["Achat", "Vente", "Location", "Investissement"];
const DELAIS = ["Urgent", "3 mois", "6 mois", "1 an+"];
const SITUATIONS = ["Locataire", "Propriétaire", "En cours de vente"];

const statutLabels: Record<string, string> = Object.fromEntries(STATUTS.map(s => [s.value, s.label]));
const statutColors: Record<string, string> = {
  nouveau: "bg-info/20 text-info", contacte: "bg-warning/20 text-warning",
  visite: "bg-primary/20 text-primary", offre: "bg-success/20 text-success",
  signe: "bg-success/30 text-success", perdu: "bg-destructive/20 text-destructive",
};

interface ClientDetailProps {
  client: any;
  interactions: any[];
  enrichingId: string | null;
  onEnrich: (client: any) => void;
  onDeleted: () => void;
}

export const ClientDetail = ({ client, interactions, enrichingId, onEnrich, onDeleted }: ClientDetailProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({});

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { error } = await supabase.from("prospects").update(updates).eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditMode(false);
      toast.success("Client mis à jour");
    },
    onError: () => toast.error("Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("prospects").delete().eq("id", client.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["clients"] }); onDeleted(); toast.success("Client supprimé"); },
  });

  const startEdit = () => {
    setForm({
      nom: client.nom || "", email: client.email || "", telephone: client.telephone || "",
      statut: client.statut || "nouveau",
      budget_min: client.budget_min?.toString() || "", budget_max: client.budget_max?.toString() || "",
      secteur_recherche: client.secteur_recherche || "", type_bien_recherche: client.type_bien_recherche || "",
      type_projet: client.type_projet || "", delai_projet: client.delai_projet || "",
      situation: client.situation || "", motivation: client.motivation || "",
      freins: client.freins || "", notes: client.notes || "",
      canal_prefere: client.canal_prefere || "", source: client.source || "",
      biens_proposes: client.biens_proposes || "",
      prochain_rappel: client.prochain_rappel ? new Date(client.prochain_rappel).toISOString().slice(0, 16) : "",
      prochain_rappel_note: client.prochain_rappel_note || "",
    });
    setEditMode(true);
  };

  const saveEdit = () => {
    updateMutation.mutate({
      nom: form.nom, email: form.email || null, telephone: form.telephone || null,
      statut: form.statut,
      budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      secteur_recherche: form.secteur_recherche || null,
      type_bien_recherche: form.type_bien_recherche || null,
      type_projet: form.type_projet || null,
      delai_projet: form.delai_projet || null,
      situation: form.situation || null,
      motivation: form.motivation || null, freins: form.freins || null,
      notes: form.notes || null, canal_prefere: form.canal_prefere || null,
      source: form.source || null,
      biens_proposes: form.biens_proposes || null,
      prochain_rappel: form.prochain_rappel ? new Date(form.prochain_rappel).toISOString() : null,
      prochain_rappel_note: form.prochain_rappel_note || null,
    });
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}min`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h`;
    return `${Math.floor(hrs / 24)}j`;
  };

  return (
    <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
      {/* Header */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle className="text-lg">{client.nom}</CardTitle>
              <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {client.email}</span>}
                {client.telephone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {client.telephone}</span>}
                {client.type_projet && <span className="flex items-center gap-1"><Home className="h-3 w-3" /> {client.type_projet}</span>}
                {client.secteur_recherche && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {client.secteur_recherche}</span>}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => client.telephone && window.open(`tel:${client.telephone}`)}><Phone className="h-3 w-3" /> Appeler</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => client.email && window.open(`mailto:${client.email}`)}><Mail className="h-3 w-3" /> Email</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={startEdit}><Pencil className="h-3 w-3" /> Modifier</Button>
              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" disabled={enrichingId === client.id} onClick={() => onEnrich(client)}>
                {enrichingId === client.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />} Recalcul IA
              </Button>
              <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive" onClick={() => { if (confirm("Supprimer ?")) deleteMutation.mutate(); }}><Trash2 className="h-3 w-3" /></Button>
              <Badge className={statutColors[client.statut] || ""}>{statutLabels[client.statut] || client.statut}</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* IA Recommendation */}
      <Card className="bg-card/60 border-primary/20 glow-border">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Recommandation IA</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Prochaine action</p>
              <p className="text-xs font-medium mt-1">{client.strategie_adaptee ? client.strategie_adaptee.split(".")[0] + "." : "Lancez le recalcul IA"}</p>
            </div>
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Prob. signature</p>
              <p className={`text-lg font-bold mt-1 ${(client.taux_signature ?? 0) >= 60 ? "text-success" : (client.taux_signature ?? 0) >= 30 ? "text-warning" : "text-destructive"}`}>
                {client.taux_signature != null ? `${client.taux_signature}%` : "—"}
              </p>
            </div>
            <div className="bg-muted/10 rounded-lg p-3 text-center">
              <p className="text-[10px] text-muted-foreground uppercase">Risque perte</p>
              <p className={`text-lg font-bold mt-1 ${(client.score_urgence ?? 0) >= 7 ? "text-destructive" : (client.score_urgence ?? 0) >= 4 ? "text-warning" : "text-success"}`}>
                {client.score_urgence ?? "—"}<span className="text-xs font-normal text-muted-foreground">/10</span>
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" className="flex-1 text-xs gap-1" onClick={() => navigate("/copilote")}><Play className="h-3 w-3" /> Lancer l'action</Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/documents")}><FileText className="h-3 w-3" /> Générer document</Button>
            <Button size="sm" variant="outline" className="text-xs gap-1" onClick={() => navigate("/agenda")}><CalendarDays className="h-3 w-3" /> Agenda</Button>
          </div>
        </CardContent>
      </Card>

      {/* Edit mode */}
      {editMode && (
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Modifier la fiche</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            {/* Identity */}
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Identité</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Statut</Label>
                  <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                    <SelectTrigger className="bg-muted/10 mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>{STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Source / Provenance</Label><Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Canal préféré</Label><Input value={form.canal_prefere} onChange={e => setForm({ ...form, canal_prefere: e.target.value })} className="bg-muted/10 mt-1" placeholder="Email, téléphone, WhatsApp..." /></div>
              </div>
            </div>

            {/* Project info */}
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Informations projet</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Type de projet</Label>
                  <Select value={form.type_projet} onValueChange={v => setForm({ ...form, type_projet: v })}>
                    <SelectTrigger className="bg-muted/10 mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{TYPES_PROJET.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Secteur géographique</Label><Input value={form.secteur_recherche} onChange={e => setForm({ ...form, secteur_recherche: e.target.value })} className="bg-muted/10 mt-1" placeholder="Paris 11, Lyon 6..." /></div>
                <div><Label className="text-xs">Budget min (€)</Label><Input type="number" value={form.budget_min} onChange={e => setForm({ ...form, budget_min: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Budget max (€)</Label><Input type="number" value={form.budget_max} onChange={e => setForm({ ...form, budget_max: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Type de bien</Label><Input value={form.type_bien_recherche} onChange={e => setForm({ ...form, type_bien_recherche: e.target.value })} className="bg-muted/10 mt-1" placeholder="T3, maison, local..." /></div>
                <div><Label className="text-xs">Délai du projet</Label>
                  <Select value={form.delai_projet} onValueChange={v => setForm({ ...form, delai_projet: v })}>
                    <SelectTrigger className="bg-muted/10 mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{DELAIS.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div><Label className="text-xs">Situation actuelle</Label>
                  <Select value={form.situation} onValueChange={v => setForm({ ...form, situation: v })}>
                    <SelectTrigger className="bg-muted/10 mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>{SITUATIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Commercial follow-up */}
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Suivi commercial</p>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2"><Label className="text-xs">Biens proposés</Label><Textarea value={form.biens_proposes} onChange={e => setForm({ ...form, biens_proposes: e.target.value })} className="bg-muted/10 mt-1 min-h-[50px]" placeholder="T3 rue Oberkampf, Maison Montreuil..." /></div>
                <div><Label className="text-xs">Prochain rappel</Label><Input type="datetime-local" value={form.prochain_rappel} onChange={e => setForm({ ...form, prochain_rappel: e.target.value })} className="bg-muted/10 mt-1" /></div>
                <div><Label className="text-xs">Note du rappel</Label><Input value={form.prochain_rappel_note} onChange={e => setForm({ ...form, prochain_rappel_note: e.target.value })} className="bg-muted/10 mt-1" placeholder="Rappeler pour visite..." /></div>
              </div>
            </div>

            {/* Qualitative */}
            <div>
              <p className="text-[10px] uppercase text-muted-foreground font-semibold tracking-wider mb-2">Analyse qualitative</p>
              <div className="grid grid-cols-2 gap-3">
                <div><Label className="text-xs">Motivation</Label><Textarea value={form.motivation} onChange={e => setForm({ ...form, motivation: e.target.value })} className="bg-muted/10 mt-1 min-h-[50px]" /></div>
                <div><Label className="text-xs">Freins</Label><Textarea value={form.freins} onChange={e => setForm({ ...form, freins: e.target.value })} className="bg-muted/10 mt-1 min-h-[50px]" /></div>
              </div>
              <div className="mt-3"><Label className="text-xs">Notes libres</Label><Textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} className="bg-muted/10 mt-1 min-h-[60px]" /></div>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Annuler</Button>
              <Button size="sm" onClick={saveEdit} disabled={!form.nom?.trim() || updateMutation.isPending}>
                {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Info cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="bg-card/60 border-border/30"><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><DollarSign className="h-3 w-3" /> Budget</p>
          <p className="text-sm font-bold mt-1">{client.budget_min || client.budget_max ? `${client.budget_min ? Number(client.budget_min).toLocaleString("fr-FR") : "?"}€ – ${client.budget_max ? Number(client.budget_max).toLocaleString("fr-FR") : "?"}€` : "—"}</p>
        </CardContent></Card>
        <Card className="bg-card/60 border-border/30"><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><Brain className="h-3 w-3" /> Score IA</p>
          <p className="text-sm font-bold mt-1">{client.score_ia ?? "—"}<span className="text-muted-foreground font-normal">/100</span></p>
        </CardContent></Card>
        <Card className="bg-card/60 border-border/30"><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Signature</p>
          <p className="text-sm font-bold mt-1">{client.taux_signature != null ? `${client.taux_signature}%` : "—"}</p>
        </CardContent></Card>
        <Card className="bg-card/60 border-border/30"><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Urgence</p>
          <p className={`text-sm font-bold mt-1 ${(client.score_urgence ?? 0) >= 7 ? "text-warning" : ""}`}>{client.score_urgence ?? "—"}<span className="text-muted-foreground font-normal">/10</span></p>
        </CardContent></Card>
      </div>

      {/* Project info display (when not editing) */}
      {!editMode && (client.type_projet || client.delai_projet || client.situation || client.biens_proposes || client.prochain_rappel) && (
        <Card className="bg-card/60 border-border/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Home className="h-4 w-4 text-primary" /> Projet & Suivi</CardTitle></CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              {client.type_projet && <div><p className="text-[10px] text-muted-foreground uppercase">Type</p><p className="font-medium mt-0.5">{client.type_projet}</p></div>}
              {client.type_bien_recherche && <div><p className="text-[10px] text-muted-foreground uppercase">Bien recherché</p><p className="font-medium mt-0.5">{client.type_bien_recherche}</p></div>}
              {client.delai_projet && <div><p className="text-[10px] text-muted-foreground uppercase">Délai</p><p className="font-medium mt-0.5">{client.delai_projet}</p></div>}
              {client.situation && <div><p className="text-[10px] text-muted-foreground uppercase">Situation</p><p className="font-medium mt-0.5">{client.situation}</p></div>}
              {client.secteur_recherche && <div><p className="text-[10px] text-muted-foreground uppercase">Secteur</p><p className="font-medium mt-0.5">{client.secteur_recherche}</p></div>}
              {client.canal_prefere && <div><p className="text-[10px] text-muted-foreground uppercase">Canal préféré</p><p className="font-medium mt-0.5">{client.canal_prefere}</p></div>}
            </div>
            {client.biens_proposes && (
              <div className="mt-3"><p className="text-[10px] text-muted-foreground uppercase">Biens proposés</p><p className="text-xs mt-0.5">{client.biens_proposes}</p></div>
            )}
            {client.prochain_rappel && (
              <div className="mt-3 bg-warning/10 rounded-lg p-2 flex items-center gap-2">
                <Timer className="h-4 w-4 text-warning shrink-0" />
                <div>
                  <p className="text-xs font-medium">Rappel : {new Date(client.prochain_rappel).toLocaleDateString("fr-FR", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</p>
                  {client.prochain_rappel_note && <p className="text-[10px] text-muted-foreground">{client.prochain_rappel_note}</p>}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Résumé IA</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{client.resume_ia || "Cliquez sur « Recalcul IA » pour générer un résumé stratégique."}</p></CardContent>
      </Card>

      {/* Strategy */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Stratégie adaptée</CardTitle></CardHeader>
        <CardContent><p className="text-sm text-muted-foreground">{client.strategie_adaptee || "Cliquez sur « Recalcul IA » pour des recommandations."}</p></CardContent>
      </Card>

      {/* Interactions */}
      <Card className="bg-card/60 border-border/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-primary" /> Historique interactions
            {interactions.length > 0 && <Badge variant="secondary" className="text-[9px]">{interactions.length}</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {interactions.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Aucune interaction rattachée.</p>
          ) : (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {interactions.map((msg: any) => (
                <div key={msg.id} className="bg-muted/10 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[8px] px-1">{msg.canal}</Badge>
                      <Badge variant="outline" className="text-[8px] px-1">{msg.direction === "entrant" ? "Reçu" : "Envoyé"}</Badge>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(msg.created_at)}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{msg.contenu}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
