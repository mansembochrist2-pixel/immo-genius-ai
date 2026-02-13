import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { BarChart3 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const chartConfig = {
  prospects: { label: "Nouveaux prospects", color: "hsl(210 80% 52%)" },
  tasks: { label: "Tâches terminées", color: "hsl(152 60% 40%)" },
};

export const PerformanceChart = () => {
  const { data: chartData = [] } = useQuery({
    queryKey: ["dashboard-chart"],
    queryFn: async () => {
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { start: startOfMonth(d), label: format(d, "MMM", { locale: fr }) };
      });

      const results = await Promise.all(
        months.map(async (m) => {
          const from = m.start.toISOString();
          const to = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 1).toISOString();

          const [{ count: pCount }, { count: tCount }] = await Promise.all([
            supabase.from("prospects").select("*", { count: "exact", head: true }).gte("created_at", from).lt("created_at", to),
            supabase.from("tasks").select("*", { count: "exact", head: true }).eq("done", true).gte("created_at", from).lt("created_at", to),
          ]);

          return { month: m.label, prospects: pCount ?? 0, tasks: tCount ?? 0 };
        })
      );
      return results;
    },
  });

  return (
    <Card className="col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-info" />
          Performance — 6 derniers mois
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[260px] w-full">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-border/40" />
            <XAxis dataKey="month" className="text-xs" />
            <YAxis allowDecimals={false} className="text-xs" />
            <ChartTooltip content={<ChartTooltipContent />} />
            <Bar dataKey="prospects" fill="var(--color-prospects)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="tasks" fill="var(--color-tasks)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
};
