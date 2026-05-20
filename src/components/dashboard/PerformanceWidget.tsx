import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { BarChart3, Info, TrendingUp, Target, Clock, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { format, subMonths, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

const Tip = ({ children }: { children: React.ReactNode }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="inline-flex items-center justify-center h-4 w-4 text-muted-foreground/60 hover:text-primary transition">
          <Info className="h-3 w-3" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">{children}</TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

const chartConfig = {
  prospects: { label: "Nouveaux prospects", color: "hsl(var(--primary))" },
  signes: { label: "Mandats signés", color: "hsl(var(--success))" },
};

export const PerformanceWidget = () => {
  const { data } = useQuery({
    queryKey: ["dashboard-perf"],
    queryFn: async () => {
      const [prospectsRes, salesRes, tasksRes] = await Promise.all([
        supabase.from("prospects").select("statut, created_at, derniere_interaction"),
        supabase.from("sales").select("date_vente, montant"),
        supabase.from("tasks").select("done, created_at"),
      ]);
      const prospects = prospectsRes.data || [];
      const sales = salesRes.data || [];
      const tasks = tasksRes.data || [];

      const totalProspects = prospects.length;
      const signes = prospects.filter((p: any) => p.statut === "signe").length;
      const tauxSignature = totalProspects ? Math.round((signes / totalProspects) * 100) : 0;
      const ticketMoyen = sales.length ? Math.round(sales.reduce((s: number, x: any) => s + Number(x.montant), 0) / sales.length) : 0;
      const tasksDone = tasks.filter((t: any) => t.done).length;
      const productivite = tasks.length ? Math.round((tasksDone / tasks.length) * 100) : 0;

      // last interaction average lag (days)
      const lags = prospects
        .map((p: any) => p.derniere_interaction ? (Date.now() - new Date(p.derniere_interaction).getTime()) / 86400000 : null)
        .filter((v): v is number => v !== null && v < 90);
      const reactiviteJours = lags.length ? Math.round(lags.reduce((s, v) => s + v, 0) / lags.length) : 0;

      // 6 months chart
      const months = Array.from({ length: 6 }, (_, i) => {
        const d = subMonths(new Date(), 5 - i);
        return { start: startOfMonth(d), label: format(d, "MMM", { locale: fr }) };
      });
      const chart = months.map((m) => {
        const from = m.start.getTime();
        const to = new Date(m.start.getFullYear(), m.start.getMonth() + 1, 1).getTime();
        const newP = prospects.filter((p: any) => {
          const t = new Date(p.created_at).getTime();
          return t >= from && t < to;
        }).length;
        const signesM = sales.filter((s: any) => {
          const t = new Date(s.date_vente).getTime();
          return t >= from && t < to;
        }).length;
        return { month: m.label, prospects: newP, signes: signesM };
      });

      return { tauxSignature, ticketMoyen, productivite, reactiviteJours, chart, signes, totalProspects };
    },
  });

  const kpis = [
    {
      label: "Taux de signature",
      value: `${data?.tauxSignature ?? 0}%`,
      icon: Target,
      sub: `${data?.signes ?? 0}/${data?.totalProspects ?? 0} prospects`,
      tip: "Pourcentage de prospects ayant signé un mandat. Calculé sur la base de votre base prospects totale.",
    },
    {
      label: "Ticket moyen",
      value: `${(data?.ticketMoyen ?? 0).toLocaleString("fr-FR")} €`,
      icon: TrendingUp,
      sub: "Honoraires / vente",
      tip: "Montant moyen des honoraires perçus par vente. Indicateur de la qualité de votre portefeuille.",
    },
    {
      label: "Productivité",
      value: `${data?.productivite ?? 0}%`,
      icon: CheckCircle2,
      sub: "Tâches terminées",
      tip: "Pourcentage de tâches finalisées sur l'ensemble créé. Reflète votre discipline d'exécution.",
    },
    {
      label: "Réactivité",
      value: `${data?.reactiviteJours ?? 0} j`,
      icon: Clock,
      sub: "Délai moyen depuis dernier contact",
      tip: "Délai moyen écoulé depuis la dernière interaction avec vos prospects actifs. Plus bas = meilleur suivi.",
    },
  ];

  return (
    <Card className="bg-card border-border rounded-2xl shadow-sm mb-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" /> Indicateurs de performance
          <Tip>Vue d'ensemble de votre activité commerciale : conversion, valeur, exécution et suivi.</Tip>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <div key={k.label} className="bg-secondary/40 rounded-xl p-3.5">
              <div className="flex items-center justify-between mb-1.5">
                <k.icon className="h-4 w-4 text-primary" />
                <Tip>{k.tip}</Tip>
              </div>
              <p className="text-xl font-bold text-foreground">{k.value}</p>
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{k.label}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{k.sub}</p>
            </div>
          ))}
        </div>

        <div>
          <p className="text-xs font-medium text-muted-foreground mb-2">Évolution sur 6 mois</p>
          <ChartContainer config={chartConfig} className="h-[200px] w-full">
            <BarChart data={data?.chart ?? []} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/30" />
              <XAxis dataKey="month" className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <YAxis allowDecimals={false} className="text-xs" stroke="hsl(var(--muted-foreground))" />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="prospects" fill="var(--color-prospects)" radius={[6, 6, 0, 0]} />
              <Bar dataKey="signes" fill="var(--color-signes)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  );
};
