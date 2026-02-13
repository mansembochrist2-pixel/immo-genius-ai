import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckSquare, Bell, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { HotProspects } from "@/components/dashboard/HotProspects";
import { QuickActions } from "@/components/dashboard/QuickActions";

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

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">Bonjour, {displayName} 👋</h1>
        <p className="page-subtitle">Voici un résumé de votre activité</p>
      </div>

      <StatsCards
        prospectCount={prospectCount}
        activeTaskCount={tasks.length}
        doneTaskCount={tasksDoneCount}
        rappelCount={0}
      />

      {/* Charts + Hot Prospects row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <PerformanceChart />
        <HotProspects />
      </div>

      {/* Tasks + Quick Actions row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
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

        <QuickActions />
      </div>
    </AppLayout>
  );
};

export default Dashboard;
