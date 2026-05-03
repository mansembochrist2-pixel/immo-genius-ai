import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessStats {
  prospects: { total: number; nouveaux: number; chauds: number; signes: number; actifs: number };
  sales: { total: number; montantTotal: number; ceMois: number };
  tasks: { enCours: number; urgentes: number; enRetard: number };
  inbox: { unread: number; urgent: number };
  opportunites: { total: number; topScore: number };
  events: { aujourdhui: number; semaine: number };
  recentProspects: Array<{ nom: string; statut: string; created_at: string }>;
  recentSales: Array<{ montant: number; date_vente: string; description: string | null }>;
}

interface BusinessContextType {
  stats: BusinessStats;
  loading: boolean;
  refresh: () => Promise<void>;
  getAIContext: () => string;
}

const defaultStats: BusinessStats = {
  prospects: { total: 0, nouveaux: 0, chauds: 0, signes: 0, actifs: 0 },
  sales: { total: 0, montantTotal: 0, ceMois: 0 },
  tasks: { enCours: 0, urgentes: 0, enRetard: 0 },
  inbox: { unread: 0, urgent: 0 },
  opportunites: { total: 0, topScore: 0 },
  events: { aujourdhui: 0, semaine: 0 },
  recentProspects: [],
  recentSales: [],
};

const BusinessContext = createContext<BusinessContextType | null>(null);

export const useBusinessData = () => {
  const ctx = useContext(BusinessContext);
  if (!ctx) throw new Error("useBusinessData must be used within BusinessProvider");
  return ctx;
};

export const BusinessProvider = ({ children }: { children: ReactNode }) => {
  const { user, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [stats, setStats] = useState<BusinessStats>(defaultStats);
  const [loading, setLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    if (!user) return;

    try {
      const todayIso = new Date().toISOString().split("T")[0];
      const weekEnd = new Date(); weekEnd.setDate(weekEnd.getDate() + 7);
      const [prospectsRes, salesRes, tasksRes, recentProspectsRes, recentSalesRes, inboxRes, oppsRes, eventsRes] = await Promise.all([
        supabase.from("prospects").select("statut", { count: "exact" }),
        supabase.from("sales").select("montant, date_vente, description"),
        supabase.from("tasks").select("done, priorite, due_date"),
        supabase.from("prospects").select("nom, statut, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("sales").select("montant, date_vente, description").order("date_vente", { ascending: false }).limit(5),
        supabase.from("inbox_messages").select("lu, urgence, intention, direction"),
        supabase.from("opportunites").select("score"),
        supabase.from("events").select("date_debut").gte("date_debut", `${todayIso}T00:00:00`).lte("date_debut", weekEnd.toISOString()),
      ]);

      const prospects = prospectsRes.data || [];
      const sales = salesRes.data || [];
      const tasks = tasksRes.data || [];
      const inbox = inboxRes.data || [];
      const opps = oppsRes.data || [];
      const events = eventsRes.data || [];
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      setStats({
        prospects: {
          total: prospects.length,
          nouveaux: prospects.filter(p => p.statut === "nouveau").length,
          chauds: prospects.filter(p => ["offre", "visite"].includes(p.statut)).length,
          signes: prospects.filter(p => p.statut === "signe").length,
          actifs: prospects.filter(p => ["contacte", "visite", "offre"].includes(p.statut)).length,
        },
        sales: {
          total: sales.length,
          montantTotal: sales.reduce((sum, s) => sum + Number(s.montant), 0),
          ceMois: sales.filter(s => s.date_vente >= debutMois).reduce((sum, s) => sum + Number(s.montant), 0),
        },
        tasks: {
          enCours: tasks.filter((t: any) => !t.done).length,
          urgentes: tasks.filter((t: any) => !t.done && t.priorite === "urgente").length,
          enRetard: tasks.filter((t: any) => !t.done && t.due_date && new Date(t.due_date) < new Date(now.toDateString())).length,
        },
        inbox: {
          unread: inbox.filter((m: any) => !m.lu && m.direction === "entrant").length,
          urgent: inbox.filter((m: any) => !m.lu && m.direction === "entrant" && ((m.urgence ?? 0) >= 7 || ["chaud", "offre", "urgent"].includes((m.intention ?? "").toLowerCase()))).length,
        },
        opportunites: {
          total: opps.length,
          topScore: opps.length > 0 ? Math.max(...opps.map((o: any) => Number(o.score) || 0)) : 0,
        },
        events: {
          aujourdhui: events.filter((e: any) => e.date_debut.startsWith(todayIso)).length,
          semaine: events.length,
        },
        recentProspects: (recentProspectsRes.data || []).map(p => ({ nom: p.nom, statut: p.statut, created_at: p.created_at })),
        recentSales: (recentSalesRes.data || []).map(s => ({ montant: Number(s.montant), date_vente: s.date_vente, description: s.description })),
      });
    } catch (e) {
      console.error("BusinessProvider fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAIContext = useCallback(() => {
    const s = stats;
    const lines = [
      `📊 CONTEXTE BUSINESS DE L'AGENT (source unique partagée avec le Dashboard) :`,
      `- Clients : ${s.prospects.total} au total — ${s.prospects.actifs} actifs (${s.prospects.chauds} chauds, ${s.prospects.signes} signés)`,
      `- Ventes : ${s.sales.total} ventes | CA total ${s.sales.montantTotal.toLocaleString("fr-FR")} € | CA ce mois ${s.sales.ceMois.toLocaleString("fr-FR")} €`,
      `- Inbox : ${s.inbox.unread} non lus dont ${s.inbox.urgent} urgents`,
      `- Opportunités Radar : ${s.opportunites.total} (meilleur score ${s.opportunites.topScore}/100)`,
      `- Agenda : ${s.events.aujourdhui} RDV aujourd'hui, ${s.events.semaine} cette semaine`,
      `- Tâches : ${s.tasks.enCours} en cours (${s.tasks.urgentes} urgentes, ${s.tasks.enRetard} en retard)`,
    ];
    if (s.recentProspects.length > 0) {
      lines.push(`\nDerniers prospects :`);
      s.recentProspects.forEach(p => lines.push(`  • ${p.nom} (${p.statut})`));
    }
    if (s.recentSales.length > 0) {
      lines.push(`\nDernières ventes :`);
      s.recentSales.forEach(v => lines.push(`  • ${v.montant.toLocaleString("fr-FR")} € — ${v.description || "Sans description"}`));
    }
    return lines.join("\n");
  }, [stats]);

  // Initial fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchStats();
    } else {
      setStats(defaultStats);
      setLoading(false);
    }
  }, [isAuthenticated, fetchStats]);

  // Realtime subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    const channel = supabase
      .channel("business-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "prospects" }, () => {
        fetchStats();
        queryClient.invalidateQueries({ queryKey: ["prospects"] });
        queryClient.invalidateQueries({ queryKey: ["prospect-count"] });
        queryClient.invalidateQueries({ queryKey: ["hot-prospects"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => {
        fetchStats();
        queryClient.invalidateQueries({ queryKey: ["sales"] });
        queryClient.invalidateQueries({ queryKey: ["sales-count"] });
        queryClient.invalidateQueries({ queryKey: ["sales-chart"] });
        queryClient.invalidateQueries({ queryKey: ["sales-widget"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => {
        fetchStats();
        queryClient.invalidateQueries({ queryKey: ["tasks"] });
        queryClient.invalidateQueries({ queryKey: ["dashboard-tasks"] });
        queryClient.invalidateQueries({ queryKey: ["urgent-count"] });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAuthenticated, fetchStats, queryClient]);

  return (
    <BusinessContext.Provider value={{ stats, loading, refresh: fetchStats, getAIContext }}>
      {children}
    </BusinessContext.Provider>
  );
};
