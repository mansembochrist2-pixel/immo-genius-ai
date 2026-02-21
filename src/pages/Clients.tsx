import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users, Search, Plus, Brain, Phone, Mail, Clock, Target,
  ChevronRight, Loader2, Sparkles, Pencil, Trash2,
  MessageSquare, TrendingUp, AlertTriangle, Play, Zap, Shield,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

// ─── Constants ────────────────────────────────────
const STATUTS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "visite", label: "Visite" },
  { value: "offre", label: "Offre" },
  { value: "signe", label: "Signé" },
  { value: "perdu", label: "Perdu" },
] as const;

const statutLabels: Record<string, string> = Object.fromEntries(STATUTS.map((s) => [s.value, s.label]));
const statutColors: Record<string, string> = {
  nouveau: "bg-info/20 text-info",
  contacte: "bg-warning/20 text-warning",
  visite: "bg-primary/20 text-primary",
  offre: "bg-success/20 text-success",
  signe: "bg-success/30 text-success",
  perdu: "bg-destructive/20 text-destructive",
};

const emptyForm = {
  nom: "", email: "", telephone: "", statut: "nouveau" as string,
  budget_min: "", budget_max: "", secteur_recherche: "", type_bien_recherche: "",
  motivation: "", freins: "", notes: "", canal_prefere: "", source: "",
};

const Clients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [enrichingId, setEnrichingId] = useState<string | null>(null);

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data, error } = await supabase.from("prospects").select("*").order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: interactions = [] } = useQuery({
    queryKey: ["client-interactions", selectedId],
    queryFn: async () => {
      if (!selectedId) return [];
      const { data } = await supabase.from("inbox_messages").select("*").eq("client_id", selectedId).order("created_at", { ascending: false }).limit(20);
      return data ?? [];
    },
    enabled: !!selectedId,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const { error } = await supabase.from("prospects").insert({
        user_id: user.id, nom: form.nom, email: form.email || null,
        telephone: form.telephone || null, statut: form.statut as any,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        secteur_recherche: form.secteur_recherche || null,
        type_bien_recherche: form.type_bien_recherche || null,
        motivation: form.motivation || null, freins: form.freins || null,
        notes: form.notes || null, canal_prefere: form.canal_prefere || null,
        source: form.source || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddDialog(false); setForm(emptyForm);
      toast.success("Client ajouté");
    },
    onError: () => toast.error("Erreur lors de l'ajout"),
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      if (!selectedId) return;
      const { error } = await supabase.from("prospects").update(updates).eq("id", selectedId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setEditMode(false);
      toast.success("Client mis à jour");
    },
    onError: () => toast.error("Erreur lors de la mise à jour"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("prospects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setSelectedId(null);
      toast.success("Client supprimé");
    },
  });

  const enrichClient = useCallback(async (client: any) => {
    setEnrichingId(client.id);
    try {
      const { data, error } = await supabase.functions.invoke("enrich-client", {
        body: { client, interactions },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      await supabase.from("prospects").update({
        score_ia: data.score_ia, score_urgence: data.score_urgence,
        motivation: data.motivation, freins: data.freins,
        resume_ia: data.resume_ia, strategie_adaptee: data.strategie_adaptee,
        taux_signature: data.taux_signature,
      }).eq("id", client.id);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      toast.success("Profil enrichi par l'IA");
    } catch (e: any) {
      toast.error(e?.message || "Erreur d'enrichissement IA");
    } finally {
      setEnrichingId(null);
    }
  }, [interactions, queryClient]);

  const filtered = clients.filter((c: any) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.telephone && c.telephone.includes(search))
  );

  const selected: any = clients.find((c: any) => c.id === selectedId);

  const startEdit = () => {
    if (!selected) return;
    setForm({
      nom: selected.nom || "", email: selected.email || "", telephone: selected.telephone || "",
      statut: selected.statut || "nouveau", budget_min: selected.budget_min?.toString() || "",
      budget_max: selected.budget_max?.toString() || "", secteur_recherche: selected.secteur_recherche || "",
      type_bien_recherche: selected.type_bien_recherche || "", motivation: selected.motivation || "",
      freins: selected.freins || "", notes: selected.notes || "",
      canal_prefere: selected.canal_prefere || "", source: selected.source || "",
    });
    setEditMode(true);
  };

  const saveEdit = () => {
    updateMutation.mutate({
      nom: form.nom, email: form.email || null, telephone: form.telephone || null,
      statut: form.statut, budget_min: form.budget_min ? Number(form.budget_min) : null,
      budget_max: form.budget_max ? Number(form.budget_max) : null,
      secteur_recherche: form.secteur_recherche || null, type_bien_recherche: form.type_bien_recherche || null,
      motivation: form.motivation || null, freins: form.freins || null,
      notes: form.notes || null, canal_prefere: form.canal_prefere || null, source: form.source || null,
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
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              Mémoire <span className="gradient-text">Client</span>
            </h1>
            <p className="page-subtitle">Profils intelligents • Recommandations IA • Suivi automatisé</p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline" className="text-xs text-muted-foreground">{clients.length} client{clients.length !== 1 ? "s" : ""}</Badge>
            <Button size="sm" onClick={() => { setForm(emptyForm); setShowAddDialog(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Nouveau client
            </Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-220px)]">
        {/* List */}
        <div className="flex flex-col gap-3 min-h-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher un client..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/50" />
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card className="bg-card/60 border-border/30"><CardContent className="p-6 text-center"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Aucun client trouvé</p></CardContent></Card>
            ) : (
              filtered.map((client: any) => (
                <Card key={client.id} className={`cursor-pointer transition-all hover:border-primary/40 ${selectedId === client.id ? "border-primary/60 bg-primary/5" : "bg-card/60 border-border/30"}`} onClick={() => { setSelectedId(client.id); setEditMode(false); }}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{client.nom}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">{client.email || client.telephone || "Pas de contact"}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge className={`text-[9px] px-1.5 py-0 ${statutColors[client.statut] || ""}`}>{statutLabels[client.statut] || client.statut}</Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-2">
                      {client.score_ia != null && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><Brain className="h-3 w-3 text-primary" /> {client.score_ia}/100</span>}
                      {client.taux_signature != null && Number(client.taux_signature) > 0 && <span className="text-[10px] text-muted-foreground flex items-center gap-1"><TrendingUp className="h-3 w-3" /> {client.taux_signature}%</span>}
                      {(client.score_urgence ?? 0) >= 7 && <AlertTriangle className="h-3 w-3 text-warning" />}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Detail */}
        <div className="lg:col-span-2 flex flex-col min-h-0">
          {selected ? (
            <div className="space-y-4 overflow-y-auto flex-1 min-h-0 pr-1">
              {/* Header */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{selected.nom}</CardTitle>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {selected.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selected.email}</span>}
                        {selected.telephone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {selected.telephone}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button size="sm" variant="outline" className="h-8 text-xs" onClick={startEdit}><Pencil className="h-3 w-3 mr-1" /> Modifier</Button>
                      <Button size="sm" variant="outline" className="h-8 text-xs" disabled={enrichingId === selected.id} onClick={() => enrichClient(selected)}>
                        {enrichingId === selected.id ? <><Loader2 className="h-3 w-3 mr-1 animate-spin" /> Analyse...</> : <><Sparkles className="h-3 w-3 mr-1" /> Recalcul IA</>}
                      </Button>
                      <Button size="sm" variant="ghost" className="h-8 text-xs text-destructive" onClick={() => { if (confirm("Supprimer ce client ?")) deleteMutation.mutate(selected.id); }}><Trash2 className="h-3 w-3" /></Button>
                      <Badge className={`${statutColors[selected.statut] || ""}`}>{statutLabels[selected.statut] || selected.statut}</Badge>
                    </div>
                  </div>
                </CardHeader>
              </Card>

              {/* IA Recommendation block */}
              <Card className="bg-card/60 border-primary/20 glow-border">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Recommandation IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 mb-3">
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Prochaine action</p>
                      <p className="text-xs font-medium mt-1">{selected.strategie_adaptee ? selected.strategie_adaptee.split(".")[0] + "." : "Lancez le recalcul IA"}</p>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Prob. signature</p>
                      <p className={`text-lg font-bold mt-1 ${(selected.taux_signature ?? 0) >= 60 ? "text-success" : (selected.taux_signature ?? 0) >= 30 ? "text-warning" : "text-destructive"}`}>
                        {selected.taux_signature != null ? `${selected.taux_signature}%` : "—"}
                      </p>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase">Risque perte</p>
                      <p className={`text-lg font-bold mt-1 ${(selected.score_urgence ?? 0) >= 7 ? "text-destructive" : (selected.score_urgence ?? 0) >= 4 ? "text-warning" : "text-success"}`}>
                        {selected.score_urgence ?? "—"}<span className="text-xs font-normal text-muted-foreground">/10</span>
                      </p>
                    </div>
                  </div>
                  <Button size="sm" className="w-full text-xs gap-1" onClick={() => navigate("/actions")}>
                    <Play className="h-3 w-3" /> Lancer l'action recommandée
                  </Button>
                </CardContent>
              </Card>

              {/* Edit mode */}
              {editMode && (
                <Card className="bg-card/60 border-border/30">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Modifier la fiche</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div><Label className="text-xs">Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Statut</Label><Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}><SelectTrigger className="bg-muted/10 mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
                      <div><Label className="text-xs">Budget min (€)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Budget max (€)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Secteur recherché</Label><Input value={form.secteur_recherche} onChange={(e) => setForm({ ...form, secteur_recherche: e.target.value })} className="bg-muted/10 mt-1" /></div>
                      <div><Label className="text-xs">Type de bien</Label><Input value={form.type_bien_recherche} onChange={(e) => setForm({ ...form, type_bien_recherche: e.target.value })} className="bg-muted/10 mt-1" /></div>
                    </div>
                    <div><Label className="text-xs">Notes</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="bg-muted/10 mt-1 min-h-[60px]" /></div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="ghost" size="sm" onClick={() => setEditMode(false)}>Annuler</Button>
                      <Button size="sm" onClick={saveEdit} disabled={!form.nom.trim() || updateMutation.isPending}>
                        {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Enregistrer"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* KPI cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <Card className="bg-card/60 border-border/30"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p><p className="text-sm font-bold mt-1">{selected.budget_min || selected.budget_max ? `${selected.budget_min ? Number(selected.budget_min).toLocaleString("fr-FR") : "?"}€ - ${selected.budget_max ? Number(selected.budget_max).toLocaleString("fr-FR") : "?"}€` : "—"}</p></CardContent></Card>
                <Card className="bg-card/60 border-border/30"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score IA</p><p className="text-sm font-bold mt-1">{selected.score_ia ?? "—"}<span className="text-muted-foreground font-normal">/100</span></p></CardContent></Card>
                <Card className="bg-card/60 border-border/30"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Taux signature</p><p className="text-sm font-bold mt-1">{selected.taux_signature != null ? `${selected.taux_signature}%` : "—"}</p></CardContent></Card>
                <Card className="bg-card/60 border-border/30"><CardContent className="p-3"><p className="text-[10px] text-muted-foreground uppercase tracking-wider">Urgence</p><p className={`text-sm font-bold mt-1 ${(selected.score_urgence ?? 0) >= 7 ? "text-warning" : ""}`}>{selected.score_urgence ?? "—"}<span className="text-muted-foreground font-normal">/10</span></p></CardContent></Card>
              </div>

              {/* AI Summary */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Brain className="h-4 w-4 text-primary" /> Résumé IA</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{selected.resume_ia || "Cliquez sur « Recalcul IA » pour générer un résumé stratégique."}</p></CardContent>
              </Card>

              {/* Strategy */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Target className="h-4 w-4 text-primary" /> Stratégie adaptée</CardTitle></CardHeader>
                <CardContent><p className="text-sm text-muted-foreground">{selected.strategie_adaptee || "Cliquez sur « Recalcul IA » pour des recommandations."}</p></CardContent>
              </Card>

              {/* Interactions */}
              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /> Historique interactions{interactions.length > 0 && <Badge variant="secondary" className="text-[9px]">{interactions.length}</Badge>}</CardTitle></CardHeader>
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
          ) : (
            <Card className="bg-card/60 border-border/30 flex-1 flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">Sélectionnez un client</p>
                <p className="text-xs text-muted-foreground/60">Profils intelligents avec recommandations IA</p>
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Add client dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>Nouveau client</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><Label className="text-xs">Nom *</Label><Input value={form.nom} onChange={(e) => setForm({ ...form, nom: e.target.value })} className="mt-1" placeholder="Jean Dupont" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Téléphone</Label><Input value={form.telephone} onChange={(e) => setForm({ ...form, telephone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Statut</Label><Select value={form.statut} onValueChange={(v) => setForm({ ...form, statut: v })}><SelectTrigger className="mt-1"><SelectValue /></SelectTrigger><SelectContent>{STATUTS.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent></Select></div>
            <div><Label className="text-xs">Source</Label><Input value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Budget min (€)</Label><Input type="number" value={form.budget_min} onChange={(e) => setForm({ ...form, budget_min: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Budget max (€)</Label><Input type="number" value={form.budget_max} onChange={(e) => setForm({ ...form, budget_max: e.target.value })} className="mt-1" /></div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddDialog(false)}>Annuler</Button>
            <Button onClick={() => addMutation.mutate()} disabled={!form.nom.trim() || addMutation.isPending}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Clients;
