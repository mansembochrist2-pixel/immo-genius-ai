import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Users, TrendingUp, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";

const mockTasks = [
  { id: 1, title: "Appeler M. Martin pour visite", done: false, priority: "haute" },
  { id: 2, title: "Envoyer compromis Villa Roses", done: false, priority: "haute" },
  { id: 3, title: "Relancer prospect Dupont", done: true, priority: "moyenne" },
  { id: 4, title: "Photographier appartement Rue Pasteur", done: false, priority: "basse" },
];

const mockReminders = [
  { id: 1, text: "Visite 14h — 12 Rue des Lilas", time: "Aujourd'hui" },
  { id: 2, text: "Signature notaire — Dossier Lefebvre", time: "Demain" },
  { id: 3, text: "Renouvellement mandat — Villa Horizon", time: "Vendredi" },
];

const stats = [
  { label: "Prospects actifs", value: "24", icon: Users, color: "text-info" },
  { label: "Tâches du jour", value: "6", icon: CheckSquare, color: "text-accent" },
  { label: "Ventes ce mois", value: "3", icon: TrendingUp, color: "text-success" },
  { label: "Rappels", value: "5", icon: Bell, color: "text-destructive" },
];

const Dashboard = () => {
  const { user } = useAuth();

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Bonjour, {user?.name} 👋</h1>
        <p className="page-subtitle">Voici un résumé de votre activité</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="stat-card flex items-center gap-4">
            <div className={`p-2.5 rounded-lg bg-muted ${s.color}`}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold font-display">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
              <Calendar className="h-4 w-4 text-accent" />
              Tâches du jour
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                <CheckSquare className={`h-4 w-4 ${t.done ? "text-success" : "text-muted-foreground"}`} />
                <span className={`flex-1 text-sm ${t.done ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                <Badge variant={t.priority === "haute" ? "destructive" : t.priority === "moyenne" ? "default" : "secondary"} className="text-[10px]">
                  {t.priority}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" />
              Rappels importants
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {mockReminders.map((r) => (
              <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                <span className="text-sm">{r.text}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">{r.time}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
