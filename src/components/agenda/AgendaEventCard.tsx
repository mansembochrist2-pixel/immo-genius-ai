import { Home, Phone, Pen, FileSignature, Bell, Users, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";

export const EVENT_TYPES = [
  { value: "visite", label: "Visite", icon: Home, color: "bg-blue-500", text: "text-blue-500", light: "bg-blue-500/15 border-blue-500/30 text-blue-200" },
  { value: "appel", label: "Appel", icon: Phone, color: "bg-orange-500", text: "text-orange-500", light: "bg-orange-500/15 border-orange-500/30 text-orange-200" },
  { value: "estimation", label: "Estimation", icon: Pen, color: "bg-violet-500", text: "text-violet-500", light: "bg-violet-500/15 border-violet-500/30 text-violet-200" },
  { value: "signature", label: "Signature", icon: FileSignature, color: "bg-emerald-500", text: "text-emerald-500", light: "bg-emerald-500/15 border-emerald-500/30 text-emerald-200" },
  { value: "relance", label: "Relance", icon: Bell, color: "bg-red-500", text: "text-red-500", light: "bg-red-500/15 border-red-500/30 text-red-200" },
  { value: "rdv_vendeur", label: "RDV Vendeur", icon: Users, color: "bg-amber-500", text: "text-amber-500", light: "bg-amber-500/15 border-amber-500/30 text-amber-200" },
  { value: "rdv_notaire", label: "RDV Notaire", icon: FileSignature, color: "bg-slate-400", text: "text-slate-400", light: "bg-slate-400/15 border-slate-400/30 text-slate-300" },
] as const;

export const typeMap = Object.fromEntries(EVENT_TYPES.map(t => [t.value, t]));

export const formatHeure = (iso: string) =>
  new Date(iso).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });

export const formatDate = (d: Date) => d.toISOString().split("T")[0];

interface AgendaEventCardProps {
  event: any;
  compact?: boolean;
  onClick?: () => void;
}

export const AgendaEventCard = ({ event, compact, onClick }: AgendaEventCardProps) => {
  const t = typeMap[event.type] || typeMap.visite;
  const Icon = t?.icon || CalendarDays;

  if (compact) {
    return (
      <button
        onClick={onClick}
        className={cn(
          "w-full text-left px-1.5 py-0.5 rounded text-[10px] font-medium truncate border cursor-pointer transition-opacity hover:opacity-80",
          t?.light
        )}
      >
        {formatHeure(event.date_debut)} {event.titre}
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full text-left px-2 py-1.5 rounded-md border cursor-pointer transition-all hover:scale-[1.02]",
        t?.light
      )}
    >
      <div className="flex items-center gap-1.5">
        <div className={cn("w-2 h-2 rounded-full shrink-0", t?.color)} />
        <span className="text-xs font-semibold truncate">{event.titre}</span>
      </div>
      <div className="text-[10px] opacity-70 mt-0.5 pl-3.5">
        {formatHeure(event.date_debut)}
        {event.date_fin ? ` – ${formatHeure(event.date_fin)}` : ""}
        {event.lieu ? ` · ${event.lieu}` : ""}
      </div>
    </button>
  );
};
