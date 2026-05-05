import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarDays, Plus, ChevronLeft, ChevronRight, Loader2, Check, Bot, Clock } from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { ListSkeleton } from "@/components/ui/list-skeleton";
import { eventSchema, validateOrError } from "@/lib/validators";
import { handleApiError } from "@/lib/error-handler";
import { AgendaDayView } from "@/components/agenda/AgendaDayView";
import { AgendaWeekView } from "@/components/agenda/AgendaWeekView";
import { AgendaMonthView } from "@/components/agenda/AgendaMonthView";
import { AgendaEventDialog, EventFormData } from "@/components/agenda/AgendaEventDialog";
import { formatDate, formatHeure, typeMap } from "@/components/agenda/AgendaEventCard";

type ViewMode = "jour" | "semaine" | "mois";

const MONTH_NAMES = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

const emptyForm: EventFormData = {
  titre: "", type: "visite", date_debut: "", heure_debut: "09:00",
  heure_fin: "10:00", description: "", lieu: "", client_id: "none",
};

const Agenda = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<ViewMode>("semaine");
  const [showDialog, setShowDialog] = useState(false);
  const [editingEvent, setEditingEvent] = useState<any>(null);
  const [form, setForm] = useState<EventFormData>(emptyForm);

  // Week days (Monday start)
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

  // Query range based on view
  const { rangeStart, rangeEnd } = useMemo(() => {
    if (view === "jour") return { rangeStart: formatDate(currentDate), rangeEnd: formatDate(currentDate) };
    if (view === "semaine") return { rangeStart: formatDate(weekDays[0]), rangeEnd: formatDate(weekDays[6]) };
    // Month: get first and last day
    const y = currentDate.getFullYear(), m = currentDate.getMonth();
    const first = new Date(y, m, 1);
    const last = new Date(y, m + 1, 0);
    return { rangeStart: formatDate(first), rangeEnd: formatDate(last) };
  }, [currentDate, view, weekDays]);

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Non authentifié");
      const dateDebut = `${form.date_debut}T${form.heure_debut}:00`;
      const dateFin = `${form.date_debut}T${form.heure_fin}:00`;
      const validationError = validateOrError(eventSchema, {
        titre: form.titre, date_debut: dateDebut, date_fin: dateFin,
        lieu: form.lieu, description: form.description,
      });
      if (validationError) throw new Error(validationError);
      const payload = {
        user_id: user.id, titre: form.titre, type: form.type,
        date_debut: dateDebut, date_fin: dateFin,
        description: form.description || null, lieu: form.lieu || null,
        client_id: form.client_id && form.client_id !== "none" ? form.client_id : null,
        statut: "confirme",
      };
      if (editingEvent) {
        const { error } = await supabase.from("events").update(payload).eq("id", editingEvent.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("events").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      closeDialog();
      toast.success(editingEvent ? "Événement modifié" : "Événement ajouté");
    },
    onError: (e: any) => handleApiError(e, "Enregistrement"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["events"] });
      closeDialog();
      toast.success("Événement supprimé");
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
      toast.success("Événement confirmé");
    },
  });

  const closeDialog = useCallback(() => {
    setShowDialog(false);
    setEditingEvent(null);
    setForm(emptyForm);
  }, []);

  const openNewEvent = useCallback((date?: Date, hour?: number) => {
    const d = date || currentDate;
    const h = hour ?? 9;
    setEditingEvent(null);
    setForm({
      ...emptyForm,
      date_debut: formatDate(d),
      heure_debut: `${String(h).padStart(2, "0")}:00`,
      heure_fin: `${String(h + 1).padStart(2, "0")}:00`,
    });
    setShowDialog(true);
  }, [currentDate]);

  const openEditEvent = useCallback((evt: any) => {
    const d = new Date(evt.date_debut);
    setEditingEvent(evt);
    setForm({
      titre: evt.titre,
      type: evt.type,
      date_debut: formatDate(d),
      heure_debut: d.toTimeString().slice(0, 5),
      heure_fin: evt.date_fin ? new Date(evt.date_fin).toTimeString().slice(0, 5) : d.toTimeString().slice(0, 5),
      description: evt.description || "",
      lieu: evt.lieu || "",
      client_id: evt.client_id || "none",
    });
    setShowDialog(true);
  }, []);

  const navigateDate = (dir: number) => {
    const d = new Date(currentDate);
    if (view === "jour") d.setDate(d.getDate() + dir);
    else if (view === "semaine") d.setDate(d.getDate() + dir * 7);
    else d.setMonth(d.getMonth() + dir);
    setCurrentDate(d);
  };

  const headerLabel = useMemo(() => {
    if (view === "jour") return currentDate.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
    if (view === "semaine") return `${weekDays[0].getDate()} – ${weekDays[6].getDate()} ${MONTH_NAMES[weekDays[6].getMonth()]} ${weekDays[6].getFullYear()}`;
    return `${MONTH_NAMES[currentDate.getMonth()]} ${currentDate.getFullYear()}`;
  }, [currentDate, view, weekDays]);

  const todayStr = formatDate(new Date());
  const todayEvents = events.filter((e: any) => formatDate(new Date(e.date_debut)) === todayStr);

  return (
    <AppLayout>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <CalendarDays className="h-6 w-6 text-primary" />
            Agenda <span className="gradient-text">IA</span>
          </h1>
          <p className="text-xs text-muted-foreground">Organisation intelligente de vos journées</p>
        </div>
        <div className="flex items-center gap-2">
          {/* View switcher */}
          <div className="flex bg-card/60 rounded-lg border border-border/30 p-0.5">
            {(["jour", "semaine", "mois"] as ViewMode[]).map(v => (
              <Button key={v} variant={view === v ? "default" : "ghost"} size="sm" className="text-xs h-7 px-3 capitalize" onClick={() => setView(v)}>
                {v}
              </Button>
            ))}
          </div>
          <Button size="sm" onClick={() => openNewEvent()}>
            <Plus className="h-4 w-4 mr-1" /> Nouveau
          </Button>
        </div>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(-1)}><ChevronLeft className="h-4 w-4" /></Button>
        <div className="text-center">
          <p className="text-sm font-semibold capitalize">{headerLabel}</p>
          <Button variant="link" size="sm" className="text-[10px] text-primary h-auto p-0" onClick={() => setCurrentDate(new Date())}>Aujourd'hui</Button>
        </div>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigateDate(1)}><ChevronRight className="h-4 w-4" /></Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Main calendar */}
        <div>
          {isLoading ? (
            <ListSkeleton rows={5} />
          ) : view === "jour" ? (
            <AgendaDayView date={currentDate} events={events} onEventClick={openEditEvent} onSlotClick={openNewEvent} />
          ) : view === "semaine" ? (
            <AgendaWeekView weekDays={weekDays} events={events} onEventClick={openEditEvent} onSlotClick={openNewEvent} />
          ) : (
            <AgendaMonthView currentDate={currentDate} events={events} onEventClick={openEditEvent} onDayClick={(d) => { setCurrentDate(d); setView("jour"); }} />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Today's events */}
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs flex items-center gap-2">
                <Clock className="h-3.5 w-3.5 text-primary" /> Aujourd'hui · {todayEvents.length} évt{todayEvents.length !== 1 ? "s" : ""}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              {todayEvents.length === 0 ? (
                <p className="text-xs text-muted-foreground italic">Aucun événement aujourd'hui</p>
              ) : (
                <div className="space-y-1.5">
                  {todayEvents.slice(0, 6).map((evt: any) => {
                    const t = typeMap[evt.type];
                    return (
                      <button key={evt.id} onClick={() => openEditEvent(evt)} className="w-full text-left flex items-center gap-2 text-xs hover:bg-muted/10 rounded px-1 py-1 transition-colors">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${t?.color || "bg-primary"}`} />
                        <span className="font-medium truncate flex-1">{evt.titre}</span>
                        <span className="text-muted-foreground text-[10px]">{formatHeure(evt.date_debut)}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI suggestions */}
          {suggestedActions.length > 0 && (
            <Card className="bg-card/60 border-primary/20 glow-border">
              <CardHeader className="pb-2 pt-3 px-4">
                <CardTitle className="text-xs flex items-center gap-2">
                  <Bot className="h-3.5 w-3.5 text-primary" /> Suggestions IA
                </CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-3 space-y-2">
                {suggestedActions.map((a: any) => (
                  <div key={a.id} className="bg-muted/10 rounded-lg p-2">
                    <p className="text-[11px] font-medium truncate">{a.titre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline" className="text-[8px] px-1 py-0">{a.priorite}</Badge>
                      <Button size="sm" variant="ghost" className="h-5 text-[10px] ml-auto gap-1" onClick={() => confirmAction.mutate(a)}>
                        <Check className="h-3 w-3" /> Confirmer
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Legend */}
          <Card className="bg-card/60 border-border/30">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground">Légende</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { label: "Visite", color: "bg-blue-500" },
                  { label: "Appel", color: "bg-orange-500" },
                  { label: "Estimation", color: "bg-violet-500" },
                  { label: "Signature", color: "bg-emerald-500" },
                  { label: "Relance", color: "bg-red-500" },
                  { label: "RDV Vendeur", color: "bg-amber-500" },
                ].map(l => (
                  <div key={l.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                    <div className={`w-2 h-2 rounded-full ${l.color}`} />
                    {l.label}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Event dialog */}
      <AgendaEventDialog
        open={showDialog}
        onOpenChange={(v) => { if (!v) closeDialog(); else setShowDialog(true); }}
        form={form}
        setForm={setForm}
        onSubmit={() => saveMutation.mutate()}
        onDelete={editingEvent ? () => deleteMutation.mutate(editingEvent.id) : undefined}
        onPrepare={editingEvent ? () => {
          const client = clients.find((c: any) => c.id === editingEvent.client_id);
          const dateStr = new Date(editingEvent.start_at).toLocaleString("fr-FR", { dateStyle: "full", timeStyle: "short" });
          const prefill = `Prépare-moi le rendez-vous "${editingEvent.title}" prévu le ${dateStr}${client ? ` avec ${client.nom}${client.prenom ? " " + client.prenom : ""}` : ""}${editingEvent.location ? ` à ${editingEvent.location}` : ""}.\n\nDonne-moi : 1) un brief client (historique, motivations, signaux), 2) les 3 points clés à aborder, 3) les objections probables et leurs réponses, 4) l'objectif de sortie idéal.`;
          sessionStorage.setItem("copilote_prefill", prefill);
          navigate("/copilote");
        } : undefined}
        isPending={saveMutation.isPending}
        isEdit={!!editingEvent}
        clients={clients}
      />
    </AppLayout>
  );
};

export default Agenda;
