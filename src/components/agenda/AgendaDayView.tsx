import { useMemo } from "react";
import { AgendaEventCard, formatDate } from "./AgendaEventCard";

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7); // 7h–21h

interface AgendaDayViewProps {
  date: Date;
  events: any[];
  onEventClick: (evt: any) => void;
  onSlotClick: (date: Date, hour: number) => void;
}

export const AgendaDayView = ({ date, events, onEventClick, onSlotClick }: AgendaDayViewProps) => {
  const dayStr = formatDate(date);
  const dayEvents = useMemo(
    () => events.filter((e: any) => formatDate(new Date(e.date_debut)) === dayStr),
    [events, dayStr]
  );

  const getEventsForHour = (hour: number) =>
    dayEvents.filter((e: any) => new Date(e.date_debut).getHours() === hour);

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-card/40">
      {/* Day header */}
      <div className="px-4 py-2 border-b border-border/20 bg-card/60">
        <p className="text-sm font-semibold">
          {date.toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" })}
        </p>
      </div>
      {/* Hourly grid */}
      <div className="max-h-[calc(100vh-320px)] overflow-y-auto">
        {HOURS.map(hour => {
          const hourEvents = getEventsForHour(hour);
          return (
            <div
              key={hour}
              className="flex border-b border-border/10 min-h-[56px] group cursor-pointer hover:bg-muted/5 transition-colors"
              onClick={() => onSlotClick(date, hour)}
            >
              <div className="w-16 shrink-0 text-[11px] text-muted-foreground py-2 pr-3 text-right border-r border-border/10">
                {String(hour).padStart(2, "0")}:00
              </div>
              <div className="flex-1 py-1 px-2 space-y-1">
                {hourEvents.map((evt: any) => (
                  <AgendaEventCard
                    key={evt.id}
                    event={evt}
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
