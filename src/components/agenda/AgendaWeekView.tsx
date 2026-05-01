import { useMemo, useState } from "react";
import { AgendaEventCard, formatDate } from "./AgendaEventCard";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);
const DAY_NAMES_SHORT = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface AgendaWeekViewProps {
  weekDays: Date[];
  events: any[];
  onEventClick: (evt: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export const AgendaWeekView = ({ weekDays, events, onEventClick, onSlotClick }: AgendaWeekViewProps) => {
  const todayStr = formatDate(new Date());
  const queryClient = useQueryClient();
  const [dragOverKey, setDragOverKey] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    weekDays.forEach(d => { map[formatDate(d)] = []; });
    events.forEach(e => {
      const key = formatDate(new Date(e.date_debut));
      if (map[key]) map[key].push(e);
    });
    return map;
  }, [events, weekDays]);

  const handleDragStart = (e: React.DragEvent, evt: any) => {
    e.dataTransfer.setData("text/plain", JSON.stringify({ id: evt.id, date_debut: evt.date_debut, date_fin: evt.date_fin }));
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDrop = async (e: React.DragEvent, day: Date, hour: number) => {
    e.preventDefault();
    setDragOverKey(null);
    try {
      const payload = JSON.parse(e.dataTransfer.getData("text/plain"));
      const oldDebut = new Date(payload.date_debut);
      const newDebut = new Date(day);
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
      {/* Column headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/40 bg-card/80">
        <div className="border-r border-border/20" />
        {weekDays.map((d, i) => {
          const isToday = formatDate(d) === todayStr;
          return (
            <div key={i} className={cn("text-center py-2 border-r border-border/20 last:border-r-0", isToday && "bg-primary/15")}>
              <p className="text-[10px] text-muted-foreground uppercase font-semibold">{DAY_NAMES_SHORT[i]}</p>
              <p className={cn("text-lg font-bold leading-tight", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      {/* Hourly grid */}
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/20 min-h-[52px]">
            <div className="text-[10px] text-muted-foreground py-1 pr-2 text-right border-r border-border/20 font-medium">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((d, i) => {
              const dayStr = formatDate(d);
              const slotKey = `${dayStr}-${hour}`;
              const hourEvents = (eventsByDay[dayStr] || []).filter(
                (e: any) => new Date(e.date_debut).getHours() === hour
              );
              return (
                <div
                  key={i}
                  className={cn(
                    "border-r border-border/20 last:border-r-0 px-0.5 py-0.5 space-y-0.5 cursor-pointer transition-colors",
                    dragOverKey === slotKey ? "bg-primary/15 ring-1 ring-primary/40" : "hover:bg-muted/15"
                  )}
                  onClick={() => onSlotClick(d, hour)}
                  onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setDragOverKey(slotKey); }}
                  onDragLeave={() => setDragOverKey(null)}
                  onDrop={(e) => handleDrop(e, d, hour)}
                >
                  {hourEvents.map((evt: any) => (
                    <AgendaEventCard
                      key={evt.id}
                      event={evt}
                      compact
                      draggable
                      onDragStart={handleDragStart}
                      onClick={() => onEventClick(evt)}
                    />
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};
