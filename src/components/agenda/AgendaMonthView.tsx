import { useMemo } from "react";
import { AgendaEventCard, formatDate, eventCoversDay } from "./AgendaEventCard";
import { cn } from "@/lib/utils";

const DAY_HEADERS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

interface AgendaMonthViewProps {
  currentDate: Date;
  events: any[];
  onEventClick: (evt: any) => void;
  onDayClick: (date: Date) => void;
}

function getMonthGrid(year: number, month: number): (Date | null)[][] {
  const first = new Date(year, month, 1);
  const last = new Date(year, month + 1, 0);
  const startDay = (first.getDay() + 6) % 7; // Monday=0
  const weeks: (Date | null)[][] = [];
  let week: (Date | null)[] = Array(startDay).fill(null);

  for (let d = 1; d <= last.getDate(); d++) {
    week.push(new Date(year, month, d));
    if (week.length === 7) { weeks.push(week); week = []; }
  }
  if (week.length > 0) {
    while (week.length < 7) week.push(null);
    weeks.push(week);
  }
  return weeks;
}

export const AgendaMonthView = ({ currentDate, events, onEventClick, onDayClick }: AgendaMonthViewProps) => {
  const todayStr = formatDate(new Date());
  const weeks = useMemo(
    () => getMonthGrid(currentDate.getFullYear(), currentDate.getMonth()),
    [currentDate]
  );

  const eventsByDay = useMemo(() => {
    const map: Record<string, any[]> = {};
    events.forEach(e => {
      const key = formatDate(new Date(e.date_debut));
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return map;
  }, [events]);

  return (
    <div className="border border-border/30 rounded-lg overflow-hidden bg-card/40">
      {/* Headers */}
      <div className="grid grid-cols-7 border-b border-border/20 bg-card/60">
        {DAY_HEADERS.map(d => (
          <div key={d} className="text-center py-2 text-[11px] font-medium text-muted-foreground uppercase border-r border-border/10 last:border-r-0">
            {d}
          </div>
        ))}
      </div>
      {/* Weeks */}
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-border/10 last:border-b-0">
          {week.map((day, di) => {
            if (!day) return <div key={di} className="min-h-[90px] bg-muted/5 border-r border-border/10 last:border-r-0" />;
            const dayStr = formatDate(day);
            const isToday = dayStr === todayStr;
            const dayEvts = eventsByDay[dayStr] || [];
            return (
              <div
                key={di}
                className={cn(
                  "min-h-[90px] border-r border-border/10 last:border-r-0 p-1 cursor-pointer hover:bg-muted/5 transition-colors",
                  isToday && "bg-primary/5"
                )}
                onClick={() => onDayClick(day)}
              >
                <div className={cn(
                  "text-xs font-medium mb-1 w-6 h-6 flex items-center justify-center rounded-full",
                  isToday ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                )}>
                  {day.getDate()}
                </div>
                <div className="space-y-0.5">
                  {dayEvts.slice(0, 3).map((evt: any) => (
                    <AgendaEventCard key={evt.id} event={evt} compact onClick={() => onEventClick(evt)} />
                  ))}
                  {dayEvts.length > 3 && (
                    <p className="text-[9px] text-muted-foreground pl-1">+{dayEvts.length - 3} autres</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
};
