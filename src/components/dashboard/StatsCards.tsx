import { CheckSquare, Users, BadgeEuro, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface StatsCardsProps {
  prospectCount: number;
  activeTaskCount: number;
  salesCount: number;
  rappelCount: number;
}

const stats = [
  { key: "prospects", label: "Prospects actifs", icon: Users, color: "text-info", bgGlow: "bg-info/10", href: "/prospects" },
  { key: "active", label: "Tâches en cours", icon: CheckSquare, color: "text-primary", bgGlow: "bg-primary/10", href: "/taches" },
  { key: "sales", label: "Ventes", icon: BadgeEuro, color: "text-success", bgGlow: "bg-success/10", href: "#" },
  { key: "rappels", label: "Rappels urgents", icon: Bell, color: "text-destructive", bgGlow: "bg-destructive/10", href: "/taches" },
];

export const StatsCards = ({ prospectCount, activeTaskCount, salesCount, rappelCount }: StatsCardsProps) => {
  const navigate = useNavigate();
  const values: Record<string, number> = {
    prospects: prospectCount,
    active: activeTaskCount,
    sales: salesCount,
    rappels: rappelCount,
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {stats.map((s) => (
        <button
          key={s.key}
          onClick={() => s.href !== "#" && navigate(s.href)}
          className="stat-card flex items-center gap-4 text-left cursor-pointer hover:scale-[1.02] transition-all duration-300"
        >
          <div className={`p-2.5 rounded-lg ${s.bgGlow} ${s.color}`}>
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
