import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { AppLayout } from "@/components/AppLayout";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Mail, Bot, Radar, Users, Palette, TrendingUp, Clock, Zap, ArrowRight } from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const { data: clientCount = 0 } = useQuery({
    queryKey: ["client-count"],
    queryFn: async () => {
      const { count } = await supabase.from("prospects").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: salesCount = 0 } = useQuery({
    queryKey: ["sales-count"],
    queryFn: async () => {
      const { count } = await supabase.from("sales").select("*", { count: "exact", head: true });
      return count ?? 0;
    },
  });

  const { data: salesTotal = 0 } = useQuery({
    queryKey: ["sales-total"],
    queryFn: async () => {
      const { data } = await supabase.from("sales").select("montant");
      return data?.reduce((sum: number, s: any) => sum + Number(s.montant), 0) ?? 0;
    },
  });

  const MODULES = [
    {
      title: "Inbox Intelligence",
      description: "Messages centralisés et analysés",
      icon: Mail,
      route: "/inbox",
      stat: "2 non lus",
      statColor: "text-amber-400",
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
      stat: "3 opportunités",
      statColor: "text-primary",
    },
    {
      title: "Mémoire Client",
      description: "Fiches intelligentes",
      icon: Users,
      route: "/clients",
      stat: `${clientCount} clients`,
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

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Clients</p>
                <p className="text-2xl font-bold mt-1">{clientCount}</p>
              </div>
              <Users className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ventes</p>
                <p className="text-2xl font-bold mt-1">{salesCount}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">CA Total</p>
                <p className="text-2xl font-bold mt-1">{salesTotal.toLocaleString("fr-FR")}€</p>
              </div>
              <Zap className="h-8 w-8 text-amber-400/30" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-card/60 border-border/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Inbox</p>
                <p className="text-2xl font-bold mt-1">2</p>
                <p className="text-[10px] text-amber-400">non lus</p>
              </div>
              <Mail className="h-8 w-8 text-primary/30" />
            </div>
          </CardContent>
        </Card>
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
