import { Bell, X, Users, CalendarDays, Zap, Clock, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

interface Alert {
  id: string;
  text: string;
  type: "warning" | "destructive" | "info";
  route: string;
  icon: typeof Bell;
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  const { data: alerts = [] } = useQuery({
    queryKey: ["notifications-bell"],
    queryFn: async () => {
      const results: Alert[] = [];

      // 1. Clients not contacted in 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: inactive } = await supabase
        .from("prospects")
        .select("id, nom")
        .in("statut", ["nouveau", "contacte", "visite"])
        .lt("updated_at", sevenDaysAgo)
        .limit(5);
      (inactive || []).forEach(c => {
        results.push({ id: `inactive-${c.id}`, text: `Relancer ${c.nom} — inactif depuis 7 jours`, type: "warning", route: "/clients", icon: Users });
      });

      // 2. Overdue client reminders (prochain_rappel)
      const now = new Date().toISOString();
      const { data: overdueReminders } = await supabase
        .from("prospects")
        .select("id, nom, prochain_rappel_note")
        .lt("prochain_rappel", now)
        .not("prochain_rappel", "is", null)
        .limit(5);
      (overdueReminders || []).forEach(c => {
        results.push({
          id: `reminder-${c.id}`,
          text: `Rappel en retard : ${c.nom}${c.prochain_rappel_note ? ` — ${c.prochain_rappel_note}` : ""}`,
          type: "destructive", route: "/clients", icon: AlertTriangle,
        });
      });

      // 3. Events in next hour (RDV dans 1h)
      const inOneHour = new Date(Date.now() + 3600000).toISOString();
      const { data: soonEvents } = await supabase
        .from("events")
        .select("id, titre, type, date_debut")
        .gte("date_debut", now)
        .lte("date_debut", inOneHour)
        .limit(3);
      (soonEvents || []).forEach(e => {
        const time = new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        results.push({ id: `event-${e.id}`, text: `RDV à ${time} : ${e.titre}`, type: "info", route: "/agenda", icon: CalendarDays });
      });

      // 4. Events in next 24h (RDV demain)
      const in24h = new Date(Date.now() + 86400000).toISOString();
      const { data: tomorrowEvents } = await supabase
        .from("events")
        .select("id, titre, date_debut")
        .gt("date_debut", inOneHour)
        .lte("date_debut", in24h)
        .limit(3);
      (tomorrowEvents || []).forEach(e => {
        const time = new Date(e.date_debut).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
        results.push({ id: `event24-${e.id}`, text: `RDV dans 24h : ${e.titre} à ${time}`, type: "info", route: "/agenda", icon: Clock });
      });

      // 5. New opportunities
      const { data: newOpps } = await supabase
        .from("opportunites")
        .select("id, titre")
        .eq("statut", "nouvelle")
        .limit(3);
      (newOpps || []).forEach(o => {
        results.push({ id: `opp-${o.id}`, text: `Nouvelle opportunité : ${o.titre}`, type: "info", route: "/radar", icon: Zap });
      });

      // 6. Pending recommended actions (critical priority)
      const { data: critActions } = await supabase
        .from("actions_recommandees")
        .select("id, titre")
        .eq("statut", "en_attente")
        .eq("priorite", "critique")
        .limit(3);
      (critActions || []).forEach(a => {
        results.push({ id: `action-${a.id}`, text: `Action critique : ${a.titre}`, type: "destructive", route: "/dashboard", icon: AlertTriangle });
      });

      return results;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  const count = visibleAlerts.length;

  const dismissAlert = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDismissed(prev => new Set(prev).add(id));
  };

  const typeStyles = {
    destructive: "bg-destructive/10 hover:bg-destructive/20 border-l-2 border-l-destructive",
    warning: "bg-warning/10 hover:bg-warning/20 border-l-2 border-l-warning",
    info: "bg-info/10 hover:bg-info/20 border-l-2 border-l-info",
  };

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 min-w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1 animate-pulse">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-full mt-2 w-[340px] z-50 bg-card border-border/50 shadow-2xl">
            <CardHeader className="pb-2 pt-3 px-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <Bell className="h-3.5 w-3.5 text-primary" />
                Alertes
                {count > 0 && <span className="text-[10px] text-muted-foreground">({count})</span>}
              </CardTitle>
              {visibleAlerts.length > 0 && (
                <Button variant="ghost" size="sm" className="h-6 text-[10px] text-muted-foreground" onClick={() => setDismissed(new Set(alerts.map(a => a.id)))}>
                  Tout effacer
                </Button>
              )}
            </CardHeader>
            <CardContent className="px-3 pb-3 max-h-96 overflow-y-auto">
              {visibleAlerts.length === 0 ? (
                <div className="text-center py-6">
                  <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Aucune alerte en cours</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-0.5">Tout est sous contrôle</p>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {visibleAlerts.map(a => {
                    const Icon = a.icon;
                    return (
                      <div
                        key={a.id}
                        className={cn("p-2.5 rounded-lg cursor-pointer text-xs transition-colors flex items-start gap-2 group", typeStyles[a.type])}
                        onClick={() => { navigate(a.route); setOpen(false); }}
                      >
                        <Icon className={cn("h-3.5 w-3.5 shrink-0 mt-0.5",
                          a.type === "destructive" ? "text-destructive" : a.type === "warning" ? "text-warning" : "text-info"
                        )} />
                        <span className="flex-1 leading-relaxed">{a.text}</span>
                        <button
                          className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0 mt-0.5"
                          onClick={(e) => dismissAlert(e, a.id)}
                        >
                          <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
