import { CheckSquare, Users, TrendingUp, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardsProps {
  prospectCount: number;
  activeTaskCount: number;
  doneTaskCount: number;
  rappelCount: number;
}

const stats = [
  { key: "prospects", label: "Prospects actifs", icon: Users, color: "text-info", href: "/prospects" },
  { key: "active", label: "Tâches en cours", icon: CheckSquare, color: "text-accent", href: "/taches" },
  { key: "done", label: "Tâches terminées", icon: TrendingUp, color: "text-success", href: "/taches" },
  { key: "rappels", label: "Rappels", icon: Bell, color: "text-destructive", href: "#" },
];

export const StatsCards = ({ prospectCount, activeTaskCount, doneTaskCount, rappelCount }: StatsCardsProps) => {
  const navigate = useNavigate();
  const values: Record<string, number> = {
    prospects: prospectCount,
    active: activeTaskCount,
    done: doneTaskCount,
    rappels: rappelCount,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <button
          key={s.key}
          onClick={() => s.href !== "#" && navigate(s.href)}
          className="stat-card flex items-center gap-4 text-left cursor-pointer hover:ring-2 hover:ring-primary/20 transition-all"
        >
          <div className={`p-2.5 rounded-lg bg-muted ${s.color}`}>
            <s.icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-2xl font-bold font-display">{values[s.key]}</p>
            <p className="text-xs text-muted-foreground">{s.label}</p>
          </div>
        </button>
      ))}
    </div>
  );
};
