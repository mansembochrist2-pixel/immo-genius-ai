import { useMemo } from "react";
import { AgendaEventCard, formatDate } from "./AgendaEventCard";
import { cn } from "@/lib/utils";

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

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    weekDays.forEach(d => { map[formatDate(d)] = []; });
    events.forEach(e => {
      const key = formatDate(new Date(e.date_debut));
      if (map[key]) map[key].push(e);
    });
    return map;
  }, [events, weekDays]);

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-card/40">
      {/* Column headers */}
      <div className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/20 bg-card/60">
        <div className="border-r border-border/10" />
        {weekDays.map((d, i) => {
          const isToday = formatDate(d) === todayStr;
          return (
            <div key={i} className={cn("text-center py-2 border-r border-border/10 last:border-r-0", isToday && "bg-primary/10")}>
              <p className="text-[10px] text-muted-foreground uppercase">{DAY_NAMES_SHORT[i]}</p>
              <p className={cn("text-lg font-bold leading-tight", isToday ? "text-primary" : "text-foreground")}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>
      {/* Hourly grid */}
      <div className="max-h-[calc(100vh-340px)] overflow-y-auto">
        {HOURS.map(hour => (
          <div key={hour} className="grid grid-cols-[56px_repeat(7,1fr)] border-b border-border/10 min-h-[48px]">
            <div className="text-[10px] text-muted-foreground py-1 pr-2 text-right border-r border-border/10">
              {String(hour).padStart(2, "0")}:00
            </div>
            {weekDays.map((d, i) => {
              const dayStr = formatDate(d);
              const hourEvents = (eventsByDay[dayStr] || []).filter(
                (e: any) => new Date(e.date_debut).getHours() === hour
              );
              return (
                <div
                  key={i}
                  className="border-r border-border/10 last:border-r-0 px-0.5 py-0.5 space-y-0.5 cursor-pointer hover:bg-muted/5 transition-colors"
                  onClick={() => onSlotClick(d, hour)}
                >
                  {hourEvents.map((evt: any) => (
                    <AgendaEventCard
                      key={evt.id}
                      event={evt}
                      compact
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
