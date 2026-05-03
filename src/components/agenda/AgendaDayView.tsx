import { useMemo, useState } from "react";
import { AgendaEventCard, formatDate, eventCoversDay, isMultiDay } from "./AgendaEventCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h–21h

interface AgendaDayViewProps {
  date: Date;
  events: any[];
  onEventClick: (evt: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export const AgendaDayView = ({ date, events, onEventClick, onSlotClick }: AgendaDayViewProps) => {
  const dayStr = formatDate(date);
  const queryClient = useQueryClient();
  const [dragOverHour, setDragOverHour] = useState<number | null>(null);

  const dayEvents = useMemo(
    () => events.filter((e: any) => eventCoversDay(e, date)),
    [events, date]
  );

  const allDayEvents = useMemo(() => dayEvents.filter(isMultiDay), [dayEvents]);
  const singleDayEvents = useMemo(() => dayEvents.filter(e => !isMultiDay(e)), [dayEvents]);

  const getEventsForHour = (hour: number) =>
    singleDayEvents.filter((e: any) => new Date(e.date_debut).getHours() === hour);

  const handleDragStart = (e: React.DragEvent, evt: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: evt.id, date_debut: evt.date_debut, date_fin: evt.date_fin }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, hour: number) => {
    e.preventDefault();
    setDragOverHour(null);
    try {
      const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
      const oldDebut = new Date(payload.date_debut);
      const newDebut = new Date(date);
      newDebut.setHours(hour, oldDebut.getMinutes(), 0, 0);
      let newFin: string | null = null;
      if (payload.date_fin) {
        const oldFin = new Date(payload.date_fin);
        const durationMs = oldFin.getTime() - oldDebut.getTime();
        newFin = new Date(newDebut.getTime() + durationMs).toISOString();
      }
      const { error } = await supabase
        .from("events")
        .update({ date_debut: newDebut.toISOString(), date_fin: newFin })
        .eq("id", payload.id);
      if (error) throw error;
      queryClient.invalidateQueries({ queryKey: ["events"] });
      toast.success("Événement déplacé");
    } catch (err: any) {
      toast.error(err.message || "Échec du déplacement");
    }
  };

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-card/40">
      {/* Day header */}
      <div className="px-4 py-2 border-b border-border/40 bg-card/80">
        <p className="text-sm font-semibold capitalize">
          {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      {/* All-day / multi-day events strip */}
      {allDayEvents.length > 0 && (
        <div className="px-2 py-1.5 border-b border-border/30 bg-muted/10 space-y-1">
          <p className="text-[10px] uppercase text-muted-foreground font-semibold mb-1">Toute la journée</p>
          {allDayEvents.map((evt: any) => (
            <AgendaEventCard key={evt.id} event={evt} compact onClick={() => onEventClick(evt)} />
          ))}
        </div>
      )}
      {/* Hourly grid */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {HOURS.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className={cn(
                "flex border-b border-border/20 min-h-[58px] group cursor-pointer transition-colors",
                dragOverHour === hour ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted/15"
              )}
              onClick={() => onSlotClick(date, hour)}
              onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverHour(hour); }}
              onDragLeave={() => setDragOverHour(null)}
              onDrop={(e) => handleDrop(e, hour)}
            >
              <div className="w-16 shrink-0 text-[11px] text-muted-foreground py-2 pr-3 text-right border-r border-border/20 font-medium">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex-1 py-1 px-2 space-y-1">
                {hourEvents.map((evt: any) => (
                  <AgendaEventCard
                    key={evt.id}
                    event={evt}
                    draggable
                    onDragStart={handleDragStart}
                    onClick={() => { onEventClick(evt); }}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
