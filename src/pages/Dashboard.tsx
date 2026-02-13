import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Users, TrendingUp, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Dashboard = () => {
  const { user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const { data: prospectCount = 0 } = useQuery({
    queryKey: ["prospect-count"],
    queryFn: async () => {
      const { count } = await supabase.from("prospects").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["dashboard-tasks"],
    queryFn: async () => {
      const { data } = await supabase.from("tasks").select("*").eq("done", false).order("created_at", { ascending: false }).limit(5);
      return data ?? [];
    },
  });

  const { data: tasksDoneCount = 0 } = useQuery({
    queryKey: ["tasks-done-count"],
    queryFn: async () => {
      const { count } = await supabase.from("tasks").select("*", { count: "exact", head: true }).eq("done", true);
      return count ?? 0;
    },
  });

  const stats = [
    { label: "Prospects actifs", value: String(prospectCount), icon: Users, color: "text-info" },
    { label: "Tâches en cours", value: String(tasks.length), icon: CheckSquare, color: "text-accent" },
    { label: "Tâches terminées", value: String(tasksDoneCount), icon: TrendingUp, color: "text-success" },
    { label: "Rappels", value: "0", icon: Bell, color: "text-destructive" },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Bonjour, {displayName} 👋</h1>
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
              <Calendar className="h-4 w-4 text-accent" />Tâches récentes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tasks.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune tâche en cours</p>
            ) : (
              tasks.map((t: any) => (
                <div key={t.id} className="flex items-center gap-3 py-2 border-b last:border-0">
                  <CheckSquare className="h-4 w-4 text-muted-foreground" />
                  <span className="flex-1 text-sm">{t.titre}</span>
                  <Badge variant={t.priorite === "haute" || t.priorite === "urgente" ? "destructive" : t.priorite === "moyenne" ? "default" : "secondary"} className="text-[10px]">
                    {t.priorite}
                  </Badge>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
              <Bell className="h-4 w-4 text-destructive" />Rappels importants
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Les rappels seront disponibles prochainement.</p>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
