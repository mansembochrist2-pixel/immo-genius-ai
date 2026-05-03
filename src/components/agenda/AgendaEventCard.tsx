import { Home, Phone, Pen, FileSignature, Bell, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export const EVENT_TYPES = [
  { value: "visite", label: "Visite", icon: Home, color: "bg-blue-500", text: "text-blue-700", light: "bg-blue-100 border-blue-400 text-blue-900 hover:bg-blue-200" },
  { value: "appel", label: "Appel", icon: Phone, color: "bg-orange-500", text: "text-orange-700", light: "bg-orange-100 border-orange-400 text-orange-900 hover:bg-orange-200" },
  { value: "estimation", label: "Estimation", icon: Pen, color: "bg-violet-500", text: "text-violet-700", light: "bg-violet-100 border-violet-400 text-violet-900 hover:bg-violet-200" },
  { value: "signature", label: "Signature", icon: FileSignature, color: "bg-emerald-500", text: "text-emerald-700", light: "bg-emerald-100 border-emerald-400 text-emerald-900 hover:bg-emerald-200" },
  { value: "relance", label: "Relance", icon: Bell, color: "bg-red-500", text: "text-red-700", light: "bg-red-100 border-red-400 text-red-900 hover:bg-red-200" },
  { value: "rdv_vendeur", label: "RDV Vendeur", icon: Users, color: "bg-amber-500", text: "text-amber-700", light: "bg-amber-100 border-amber-400 text-amber-900 hover:bg-amber-200" },
  { value: "rdv_notaire", label: "RDV Notaire", icon: FileSignature, color: "bg-slate-500", text: "text-slate-700", light: "bg-slate-100 border-slate-400 text-slate-900 hover:bg-slate-200" },
] as const;

export const typeMap = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t]));

export const formatHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDate = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/** Returns true if the event covers any part of the given day (handles multi-day spans). */
export const eventCoversDay = (evt: any, day: Date) => {
  const start = new Date(evt.date_debut);
  const end = evt.date_fin ? new Date(evt.date_fin) : start;
  const dayStart = new Date(day); dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(day); dayEnd.setHours(23, 59, 59, 999);
  return start <= dayEnd && end >= dayStart;
};

export const isMultiDay = (evt: any) => {
  if (!evt.date_fin) return false;
  return formatDate(new Date(evt.date_debut)) !== formatDate(new Date(evt.date_fin));
};

interface AgendaEventCardProps {
  event: any;
  compact?: boolean;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent, evt: any) => void;
}

export const AgendaEventCard = ({ event, compact, onClick, draggable, onDragStart }: AgendaEventCardProps) => {
  const t = typeMap[event.type] || typeMap.visite;
  const Icon = t?.icon || CalendarDays;

  const handleDragStart = (e: React.DragEvent) => {
    if (onDragStart) onDragStart(e, event);
  };

  if (compact) {
    return (
      <div
        draggable={draggable}
        onDragStart={handleDragStart}
        onClick={(e) => { e.stopPropagation(); onClick?.(); }}
        className={cn(
          "w-full text-left px-1.5 py-1 rounded-md text-[11px] font-semibold truncate border-2 cursor-pointer transition-all",
          draggable && "cursor-grab active:cursor-grabbing",
          t?.light
        )}
        title={`${formatHeure(event.date_debut)} ${event.titre}`}
      >
        <span className="font-bold">{formatHeure(event.date_debut)}</span> {event.titre}
      </div>
    );
  }

  return (
    <div
      draggable={draggable}
      onDragStart={handleDragStart}
      onClick={(e) => { e.stopPropagation(); onClick?.(); }}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-md border-2 cursor-pointer transition-all hover:scale-[1.02]",
        draggable && "cursor-grab active:cursor-grabbing",
        t?.light
      )}
    >
      <div className="flex items-center gap-1.5">
        <Icon className="h-3 w-3 shrink-0" />
        <span className="text-xs font-bold truncate">{event.titre}</span>
      </div>
      <div className="text-[10px] opacity-80 mt-0.5 pl-4 font-medium">
        {formatHeure(event.date_debut)}
        {event.date_fin ? ` – ${formatHeure(event.date_fin)}` : ""}
        {event.lieu ? ` · ${event.lieu}` : ""}
      </div>
    </div>
  );
};
