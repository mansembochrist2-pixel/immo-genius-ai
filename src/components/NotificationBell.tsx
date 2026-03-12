import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Alert {
  id: string;
  text: string;
  type: "warning" | "destructive" | "info";
  route: string;
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

      // Clients not contacted in 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: inactive } = await supabase
        .from("prospects")
        .select("id, nom")
        .in("statut", ["nouveau", "contacte", "visite"])
        .lt("updated_at", sevenDaysAgo)
        .limit(5);
      (inactive || []).forEach(c => {
        results.push({ id: `inactive-${c.id}`, text: `Relancer ${c.nom} — inactif depuis 7 jours`, type: "warning", route: "/clients" });
      });

      // Events in next hour
      const now = new Date();
      const inOneHour = new Date(now.getTime() + 3600000);
      const { data: soonEvents } = await supabase
        .from("events")
        .select("id, titre, type, date_debut")
        .gte("date_debut", now.toISOString())
        .lte("date_debut", inOneHour.toISOString())
        .limit(3);
      (soonEvents || []).forEach(e => {
        results.push({ id: `event-${e.id}`, text: `RDV dans 1h : ${e.type} — ${e.titre}`, type: "info", route: "/agenda" });
      });

      // New opportunities
      const { data: newOpps } = await supabase
        .from("opportunites")
        .select("id, titre")
        .eq("statut", "nouvelle")
        .limit(3);
      (newOpps || []).forEach(o => {
        results.push({ id: `opp-${o.id}`, text: `Nouvelle opportunité à traiter`, type: "info", route: "/radar" });
      });

      return results;
    },
    enabled: !!user,
    refetchInterval: 60000,
  });

  const visibleAlerts = alerts.filter(a => !dismissed.has(a.id));
  const count = visibleAlerts.length;

  return (
    <div className="relative">
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={() => setOpen(!open)}>
        <Bell className="h-4 w-4" />
        {count > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </Button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <Card className="absolute right-0 top-full mt-2 w-80 z-50 bg-card border-border/50 shadow-xl">
            <CardHeader className="pb-2 pt-3 px-4">
              <CardTitle className="text-sm">Alertes</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3 max-h-80 overflow-y-auto">
              {visibleAlerts.length === 0 ? (
                <p className="text-xs text-muted-foreground italic py-2">Aucune alerte</p>
              ) : (
                <div className="space-y-2">
                  {visibleAlerts.map(a => (
                    <div
                      key={a.id}
                      className={`p-2.5 rounded-lg cursor-pointer text-xs transition-colors ${
                        a.type === "destructive" ? "bg-destructive/10 hover:bg-destructive/20" :
                        a.type === "warning" ? "bg-warning/10 hover:bg-warning/20" :
                        "bg-info/10 hover:bg-info/20"
                      }`}
                      onClick={() => { navigate(a.route); setOpen(false); }}
                    >
                      {a.text}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
