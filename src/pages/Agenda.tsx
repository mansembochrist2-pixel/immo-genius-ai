import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import {
  CalendarDays, Plus, Clock, MapPin, Users, Phone, Home, Pen, FileSignature,
  Bell, Loader2, Check, X, Bot, ChevronLeft, ChevronRight, Trash2,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const EVENT_TYPES = [
  { value: "visite", label: "Visite", icon: Home, color: "bg-primary/20 text-primary" },
  { value: "appel", label: "Appel", icon: Phone, color: "bg-info/20 text-info" },
  { value: "estimation", label: "Estimation", icon: Pen, color: "bg-warning/20 text-warning" },
  { value: "signature", label: "Signature", icon: FileSignature, color: "bg-success/20 text-success" },
  { value: "relance", label: "Relance", icon: Bell, color: "bg-destructive/20 text-destructive" },
  { value: "rdv_vendeur", label: "RDV Vendeur", icon: Users, color: "bg-accent/20 text-accent" },
  { value: "rdv_notaire", label: "RDV Notaire", icon: FileSignature, color: "bg-muted-foreground/20 text-muted-foreground" },
];

const typeMap = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t]));

const formatDate = (d: Date) => d.toISOString().split("T")[0];
const formatHeure = (iso: string) => new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

const Agenda = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [view, setView] = useState<"jour" | "semaine">("semaine");
  const [form, setForm] = useState({
    titre: "", type: "visite", date_debut: "", heure_debut: "09:00",
    heure_fin: "10:00", description: "", lieu: "",
  });

  // Week calculation
  const weekDays = useMemo(() => {
    const start = new Date(currentDate);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [currentDate]);

  const rangeStart = view === "jour" ? formatDate(currentDate) : formatDate(weekDays[0]);
  const rangeEnd = view === "jour" ? formatDate(currentDate) : formatDate(weekDays[6]);

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["events", rangeStart, rangeEnd],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("events")
        .select("*")
        .gte("date_debut", `${rangeStart}T00:00:00`)
        .lte("date_debut", `${rangeEnd}T23:59:59`)
        .order("date_debut", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: clients = [] } = useQuery({
    queryKey: ["clients-list"],
    queryFn: async () => {
      const { data } = await supabase.from("prospects").select("id, nom").order("nom");
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: suggestedActions = [] } = useQuery({
    queryKey: ["suggested-events"],
    queryFn: async () => {
      const { data } = await supabase
        .from("actions_recommandees")
        .select("id, titre, type, date_suggeree, donnees_contexte, priorite")
        .eq("statut", "en_attente")
        .not("date_suggeree", "is", null)
        .order("date_suggeree", { ascending: true })
        .limit(5);
      return data ?? [];
    },
    enabled: !!user,
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      if (!user || !form.titre || !form.date_debut) throw new Error("Champs requis");
      const dateDebut = `${form.date_debut}T${form.heure_debut}:00`;
      const dateFin = `${form.date_debut}T${form.heure_fin}:00`;
      const { error } = await supabase.from("events").insert({
        user_id: user.id, titre: form.titre, type: form.type,
        date_debut: dateDebut, date_fin: dateFin,
        description: form.description || null, lieu: form.lieu || null,
        statut: "confirme",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      setShowAdd(false);
      setForm({ titre: "", type: "visite", date_debut: "", heure_debut: "09:00", heure_fin: "10:00", description: "", lieu: "" });
      toast.success("Événement ajouté");
    },
    onError: (e: any) => toast.error(e.message || "Erreur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Supprimé");
    },
  });

  const confirmAction = useMutation({
    mutationFn: async (action: any) => {
      if (!user) return;
      const date = action.date_suggeree ? new Date(action.date_suggeree) : new Date();
      await supabase.from("events").insert({
        user_id: user.id, titre: action.titre, type: action.type || "rdv",
        date_debut: date.toISOString(),
        date_fin: new Date(date.getTime() + 3600000).toISOString(),
        statut: "confirme", source_module: "actions_recommandees",
      });
      await supabase.from("actions_recommandees").update({ statut: "lance" }).eq("id", action.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      queryClient.invalidateQueries({ queryKey: ["suggested-events"] });
      toast.success("Événement confirmé et ajouté");
    },
  });

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (view === "jour" ? dir : dir * 7));
    setCurrentDate(d);
  };

  const todayStr = formatDate(new Date());
  const todayEvents = events.filter((e: any) => formatDate(new Date(e.date_debut)) === todayStr);

  const groupByDay = (evts: any[]) => {
    const groups: Record<string, any[]> = {};
    evts.forEach(e => {
      const day = formatDate(new Date(e.date_debut));
      if (!groups[day]) groups[day] = [];
      groups[day].push(e);
    });
    return groups;
  };

  const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
  const monthNames = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <CalendarDays className="h-7 w-7 text-primary" />
              Agenda <span className="gradient-text">IA</span>
            </h1>
            <p className="page-subtitle">Organisation intelligente de vos journées</p>
          </div>
          <div className="flex gap-2">
            <div className="flex bg-card/60 rounded-lg border border-border/30">
              <Button variant={view === "jour" ? "default" : "ghost"} size="sm" className="text-xs h-8" onClick={() => setView("jour")}>Jour</Button>
              <Button variant={view === "semaine" ? "default" : "ghost"} size="sm" className="text-xs h-8" onClick={() => setView("semaine")}>Semaine</Button>
            </div>
            <Button size="sm" onClick={() => { setForm({ ...form, date_debut: formatDate(currentDate) }); setShowAdd(true); }}>
              <Plus className="h-4 w-4 mr-2" /> Ajouter
            </Button>
          </div>
        </div>
      </div>

      {/* Navigation date */}
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-lg font-semibold">
            {view === "jour"
              ? currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
              : `${weekDays[0].getDate()} - ${weekDays[6].getDate()} ${monthNames[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`
            }
          </p>
          <Button variant="link" size="sm" className="text-xs text-primary h-auto p-0" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigateDate(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main calendar area */}
        <div className="lg:col-span-3 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : view === "jour" ? (
            <Card className="bg-card/60 border-border/30">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">{currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}</CardTitle>
              </CardHeader>
              <CardContent>
                {todayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">Aucun événement ce jour</p>
                ) : (
                  <div className="space-y-2">
                    {todayEvents.map((evt: any) => {
                      const t = typeMap[evt.type] || typeMap.visite;
                      const Icon = t?.icon || CalendarDays;
                      return (
                        <div key={evt.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/10 hover:bg-muted/20 transition-colors group">
                          <div className={`p-2 rounded-lg ${t?.color || "bg-primary/20 text-primary"}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{evt.titre}</p>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
                              <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatHeure(evt.date_debut)}{evt.date_fin ? ` - ${formatHeure(evt.date_fin)}` : ""}</span>
                              {evt.lieu && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{evt.lieu}</span>}
                            </div>
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => navigate(`/copilote`)} title="Préparer avec Copilote">
                              <Bot className="h-3 w-3" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(evt.id)}>
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            /* Week view */
            <div className="space-y-3">
              {weekDays.map(day => {
                const dayStr = formatDate(day);
                const isToday = dayStr === todayStr;
                const dayEvents = events.filter((e: any) => formatDate(new Date(e.date_debut)) === dayStr);
                return (
                  <Card key={dayStr} className={`bg-card/60 border-border/30 ${isToday ? "border-l-2 border-l-primary" : ""}`}>
                    <CardHeader className="pb-1 pt-3 px-4">
                      <div className="flex items-center justify-between">
                        <p className={`text-xs font-medium ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                          {dayNames[day.getDay()]} {day.getDate()}/{day.getMonth() + 1}
                          {isToday && <Badge variant="outline" className="ml-2 text-[8px] px-1 py-0 border-primary/30 text-primary">Aujourd'hui</Badge>}
                        </p>
                        <span className="text-[10px] text-muted-foreground">{dayEvents.length} évt{dayEvents.length !== 1 ? "s" : ""}</span>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-3 px-4">
                      {dayEvents.length === 0 ? (
                        <p className="text-xs text-muted-foreground/50 py-1">—</p>
                      ) : (
                        <div className="space-y-1.5">
                          {dayEvents.map((evt: any) => {
                            const t = typeMap[evt.type] || typeMap.visite;
                            const Icon = t?.icon || CalendarDays;
                            return (
                              <div key={evt.id} className="flex items-center gap-2 text-xs group">
                                <Icon className={`h-3 w-3 shrink-0 ${t?.color?.split(" ")[1] || "text-primary"}`} />
                                <span className="font-medium truncate">{evt.titre}</span>
                                <span className="text-muted-foreground shrink-0">{formatHeure(evt.date_debut)}</span>
                                {evt.lieu && <span className="text-muted-foreground/50 truncate hidden sm:inline">{evt.lieu}</span>}
                                <Button size="icon" variant="ghost" className="h-5 w-5 ml-auto opacity-0 group-hover:opacity-100 text-destructive shrink-0" onClick={() => deleteMutation.mutate(evt.id)}>
                                  <X className="h-2.5 w-2.5" />
                                </Button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Sidebar: Today + IA suggestions */}
        <div className="space-y-4">
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" /> Aujourd'hui
              </CardTitle>
            </CardHeader>
            <CardContent>
              {todayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Rien de prévu</p>
              ) : (
                <div className="space-y-2">
                  {todayEvents.slice(0, 5).map((evt: any) => {
                    const t = typeMap[evt.type];
                    return (
                      <div key={evt.id} className="text-xs">
                        <p className="font-medium truncate">{evt.titre}</p>
                        <p className="text-muted-foreground">{formatHeure(evt.date_debut)}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {suggestedActions.length > 0 && (
            <Card className="bg-card/60 border-primary/20 glow-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Bot className="h-4 w-4 text-primary" /> Suggestions IA
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {suggestedActions.map((a: any) => (
                  <div key={a.id} className="bg-muted/10 rounded-lg p-2.5">
                    <p className="text-xs font-medium truncate">{a.titre}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{a.priorite}</Badge>
                      <Button size="sm" variant="ghost" className="h-6 text-[10px] ml-auto gap-1" onClick={() => confirmAction.mutate(a)}>
                        <Check className="h-3 w-3" /> Confirmer
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add event dialog */}
      <Dialog open={showAdd} onOpenChange={setShowAdd}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Nouvel événement</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-xs">Titre *</Label>
              <Input value={form.titre} onChange={e => setForm({ ...form, titre: e.target.value })} className="mt-1 bg-muted/10" placeholder="Ex: Visite T3 rue Oberkampf" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Type</Label>
                <Select value={form.type} onValueChange={v => setForm({ ...form, type: v })}>
                  <SelectTrigger className="mt-1 bg-muted/10"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Date *</Label>
                <Input type="date" value={form.date_debut} onChange={e => setForm({ ...form, date_debut: e.target.value })} className="mt-1 bg-muted/10" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Heure début</Label>
                <Input type="time" value={form.heure_debut} onChange={e => setForm({ ...form, heure_debut: e.target.value })} className="mt-1 bg-muted/10" />
              </div>
              <div>
                <Label className="text-xs">Heure fin</Label>
                <Input type="time" value={form.heure_fin} onChange={e => setForm({ ...form, heure_fin: e.target.value })} className="mt-1 bg-muted/10" />
              </div>
            </div>
            <div>
              <Label className="text-xs">Lieu</Label>
              <Input value={form.lieu} onChange={e => setForm({ ...form, lieu: e.target.value })} className="mt-1 bg-muted/10" placeholder="Adresse ou lieu" />
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="mt-1 bg-muted/10" rows={2} placeholder="Notes complémentaires..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdd(false)}>Annuler</Button>
            <Button onClick={() => addMutation.mutate()} disabled={addMutation.isPending || !form.titre || !form.date_debut}>
              {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Ajouter
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Agenda;
