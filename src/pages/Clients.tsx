import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Users, Search, Plus, Brain, Phone, Mail, Loader2, ChevronRight,
  TrendingUp, AlertTriangle,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useState, useCallback } from "react";
import { toast } from "sonner";
import { ClientDetail } from "@/components/clients/ClientDetail";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { clientSchema, validateOrError } from "@/lib/validators";
import { isCreditsError } from "@/lib/error-handler";

const STATUTS = [
  { value: "nouveau", label: "Nouveau" },
  { value: "contacte", label: "Contacté" },
  { value: "visite", label: "Visite" },
  { value: "offre", label: "Offre" },
  { value: "signe", label: "Signé" },
  { value: "perdu", label: "Perdu" },
] as const;

const TYPES_PROJET = ["Achat", "Vente", "Location", "Investissement"];

const statutLabels: Record<string, string> = Object.fromEntries(STATUTS.map(s => [s.value, s.label]));
const statutColors: Record<string, string> = {
  nouveau: "bg-info/20 text-info", contacte: "bg-warning/20 text-warning",
  visite: "bg-primary/20 text-primary", offre: "bg-success/20 text-success",
  signe: "bg-success/30 text-success", perdu: "bg-destructive/20 text-destructive",
};

const emptyForm = {
  nom: "", email: "", telephone: "", statut: "nouveau",
  budget_min: "", budget_max: "", secteur_recherche: "", type_bien_recherche: "",
  source: "", type_projet: "",
};

const Clients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
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
      const validationError = validateOrError(clientSchema, {
        nom: form.nom, email: form.email, telephone: form.telephone,
        budget_min: form.budget_min, budget_max: form.budget_max,
      });
      if (validationError) throw new Error(validationError);
      const { error } = await supabase.from("prospects").insert({
        user_id: user.id, nom: form.nom.trim(), email: form.email.trim() || null,
        telephone: form.telephone.trim() || null, statut: form.statut as any,
        budget_min: form.budget_min ? Number(form.budget_min) : null,
        budget_max: form.budget_max ? Number(form.budget_max) : null,
        secteur_recherche: form.secteur_recherche || null,
        type_bien_recherche: form.type_bien_recherche || null,
        source: form.source || null,
        type_projet: form.type_projet || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clients"] });
      setShowAddDialog(false); setForm(emptyForm);
      toast.success("Client ajouté");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur lors de l'ajout"),
  });

  const enrichClientWithCredits = useCallback(async (client: any) => {
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
      if (isCreditsError(e)) {
        toast.error("💳 Crédits IA épuisés", {
          description: "Rechargez votre compte dans Réglages → Facturation",
          duration: 6000,
        });
      } else {
        toast.error(e?.message || "Erreur d'enrichissement IA");
      }
    } finally {
      setEnrichingId(null);
    }
  }, [interactions, queryClient]);

  const enrichClient = enrichClientWithCredits;

  const filtered = clients.filter((c: any) =>
    c.nom.toLowerCase().includes(search.toLowerCase()) ||
    (c.email && c.email.toLowerCase().includes(search.toLowerCase())) ||
    (c.telephone && c.telephone.includes(search))
  );

  const selected: any = clients.find((c: any) => c.id === selectedId);

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
            <Input placeholder="Rechercher un client..." value={search} onChange={e => setSearch(e.target.value)} className="pl-10 bg-card/60 border-border/50" />
          </div>
          <div className="space-y-2 overflow-y-auto flex-1 min-h-0 pr-1">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <Card className="bg-card/60 border-border/30"><CardContent className="p-6 text-center"><Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" /><p className="text-sm text-muted-foreground">Aucun client trouvé</p></CardContent></Card>
            ) : (
              filtered.map((client: any) => (
                <Card key={client.id} className={`cursor-pointer transition-all hover:border-primary/40 ${selectedId === client.id ? "border-primary/60 bg-primary/5" : "bg-card/60 border-border/30"}`} onClick={() => setSelectedId(client.id)}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{client.nom}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {client.type_projet ? `${client.type_projet} · ` : ""}{client.email || client.telephone || "Pas de contact"}
                        </p>
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
                      {client.prochain_rappel && new Date(client.prochain_rappel) <= new Date() && <Badge variant="outline" className="text-[8px] px-1 py-0 border-warning/50 text-warning">Rappel</Badge>}
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
            <ClientDetail
              client={selected}
              interactions={interactions}
              enrichingId={enrichingId}
              onEnrich={enrichClient}
              onDeleted={() => setSelectedId(null)}
            />
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
            <div className="col-span-2"><Label className="text-xs">Nom *</Label><Input value={form.nom} onChange={e => setForm({ ...form, nom: e.target.value })} className="mt-1" placeholder="Jean Dupont" /></div>
            <div><Label className="text-xs">Email</Label><Input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Téléphone</Label><Input value={form.telephone} onChange={e => setForm({ ...form, telephone: e.target.value })} className="mt-1" /></div>
            <div><Label className="text-xs">Statut</Label>
              <Select value={form.statut} onValueChange={v => setForm({ ...form, statut: v })}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>{STATUTS.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Type de projet</Label>
              <Select value={form.type_projet} onValueChange={v => setForm({ ...form, type_projet: v })}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                <SelectContent>{TYPES_PROJET.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label className="text-xs">Source</Label><Input value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} className="mt-1" placeholder="SeLoger, bouche-à-oreille..." /></div>
            <div><Label className="text-xs">Secteur recherché</Label><Input value={form.secteur_recherche} onChange={e => setForm({ ...form, secteur_recherche: e.target.value })} className="mt-1" placeholder="Paris 11..." /></div>
            <div><Label className="text-xs">Budget min (€)</Label><NumberInput value={form.budget_min} onChange={v => setForm({ ...form, budget_min: v })} className="mt-1" placeholder="100 000" /></div>
            <div><Label className="text-xs">Budget max (€)</Label><NumberInput value={form.budget_max} onChange={v => setForm({ ...form, budget_max: v })} className="mt-1" placeholder="500 000" /></div>
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
