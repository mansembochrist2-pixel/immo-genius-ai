import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useBusinessData } from "@/contexts/BusinessContext";
import { Mail, Bot, Radar, Users, Palette, TrendingUp, Zap, ArrowRight, BadgeEuro, Bell, Flame, BarChart3 } from "lucide-react";
import { StatsCards } from "@/components/dashboard/StatsCards";
import { HotProspects } from "@/components/dashboard/HotProspects";
import { RappelsWidget } from "@/components/dashboard/RappelsWidget";
import { PerformanceChart } from "@/components/dashboard/PerformanceChart";
import { SalesWidget } from "@/components/dashboard/SalesWidget";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { stats, loading } = useBusinessData();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const { data: inboxUnread = 0 } = useQuery({
    queryKey: ["inbox-unread-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("inbox_messages")
        .select("*", { count: "exact", head: true })
        .eq("lu", false)
        .eq("direction", "entrant");
      return count ?? 0;
    },
  });

  const { data: opportunityCount = 0 } = useQuery({
    queryKey: ["opportunity-count"],
    queryFn: async () => {
      const { count } = await supabase
        .from("opportunites")
        .select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const MODULES = [
    {
      title: "Inbox Intelligence",
      description: "Messages centralisés et analysés",
      icon: Mail,
      route: "/inbox",
      stat: inboxUnread > 0 ? `${inboxUnread} non lu${inboxUnread > 1 ? "s" : ""}` : "À jour",
      statColor: inboxUnread > 0 ? "text-amber-400" : "text-green-400",
    },
    {
      title: "Copilote IA",
      description: "Votre assistant stratégique",
      icon: Bot,
      route: "/copilote",
      stat: "Actif",
      statColor: "text-green-400",
    },
    {
      title: "Radar Opportunités",
      description: "Données marché en temps réel",
      icon: Radar,
      route: "/radar",
      stat: `${opportunityCount} opportunité${opportunityCount > 1 ? "s" : ""}`,
      statColor: "text-primary",
    },
    {
      title: "Mémoire Client",
      description: "Fiches intelligentes",
      icon: Users,
      route: "/clients",
      stat: `${stats.prospects.total} clients`,
      statColor: "text-muted-foreground",
    },
    {
      title: "Studio Business",
      description: "Contenu marketing IA",
      icon: Palette,
      route: "/studio",
      stat: "Prêt",
      statColor: "text-green-400",
    },
  ];

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title">
          Bonjour, <span className="gradient-text">{displayName}</span> 👋
        </h1>
        <p className="page-subtitle">Votre copilote immobilier est prêt</p>
      </div>

      {/* KPIs live */}
      <StatsCards
        prospectCount={stats.prospects.total}
        activeTaskCount={stats.tasks.enCours}
        salesCount={stats.sales.total}
        rappelCount={stats.tasks.urgentes}
      />

      {/* KPI complémentaires */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/clients")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Prospects chauds</p>
                <p className="text-2xl font-bold mt-1">{stats.prospects.chauds}</p>
              </div>
              <Flame className="h-8 w-8 text-warning/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/inbox")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA Total</p>
                <p className="text-2xl font-bold mt-1">{stats.sales.montantTotal.toLocaleString("fr-FR")}€</p>
              </div>
              <BadgeEuro className="h-8 w-8 text-success/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/inbox")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inbox</p>
                <p className="text-2xl font-bold mt-1">{inboxUnread}</p>
                {inboxUnread > 0 && <p className="text-[10px] text-amber-400">non lus</p>}
              </div>
              <Mail className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all" onClick={() => navigate("/radar")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Opportunités</p>
                <p className="text-2xl font-bold mt-1">{opportunityCount}</p>
              </div>
              <Radar className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Widgets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
        <PerformanceChart />
        <RappelsWidget />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-8">
        <HotProspects />
        <SalesWidget />
      </div>

      {/* Modules */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Vos modules
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MODULES.map((mod) => (
            <Card
              key={mod.title}
              className="bg-card/60 border-border/30 cursor-pointer hover:border-primary/40 transition-all group"
              onClick={() => navigate(mod.route)}
            >
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <mod.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{mod.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{mod.description}</p>
                    </div>
                  </div>
                  <ArrowRight className="h-4 w-4 text-muted-foreground/30 group-hover:text-primary transition-colors" />
                </div>
                <div className="mt-3">
                  <Badge variant="outline" className={`text-[10px] ${mod.statColor}`}>
                    {mod.stat}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
