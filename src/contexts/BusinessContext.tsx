import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessStats {
  prospects: { total: number; nouveaux: number; chauds: number; signes: number };
  sales: { total: number; montantTotal: number; ceMois: number };
  tasks: { enCours: number; urgentes: number; enRetard: number };
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
  prospects: { total: 0, nouveaux: 0, chauds: 0, signes: 0 },
  sales: { total: 0, montantTotal: 0, ceMois: 0 },
  tasks: { enCours: 0, urgentes: 0, enRetard: 0 },
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
      const [prospectsRes, salesRes, tasksRes, recentProspectsRes, recentSalesRes] = await Promise.all([
        supabase.from("prospects").select("statut", { count: "exact" }),
        supabase.from("sales").select("montant, date_vente, description"),
        supabase.from("tasks").select("done, priorite, due_date"),
        supabase.from("prospects").select("nom, statut, created_at").order("created_at", { ascending: false }).limit(5),
        supabase.from("sales").select("montant, date_vente, description").order("date_vente", { ascending: false }).limit(5),
      ]);

      const prospects = prospectsRes.data || [];
      const sales = salesRes.data || [];
      const tasks = tasksRes.data || [];
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];

      setStats({
        prospects: {
          total: prospects.length,
          nouveaux: prospects.filter(p => p.statut === "nouveau").length,
          chauds: prospects.filter(p => ["offre", "visite"].includes(p.statut)).length,
          signes: prospects.filter(p => p.statut === "signe").length,
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
      `📊 CONTEXTE BUSINESS DE L'AGENT :`,
      `- ${s.prospects.total} prospects au total (${s.prospects.nouveaux} nouveaux, ${s.prospects.chauds} chauds, ${s.prospects.signes} signés)`,
      `- ${s.sales.total} ventes réalisées, CA total : ${s.sales.montantTotal.toLocaleString("fr-FR")} €`,
      `- CA ce mois : ${s.sales.ceMois.toLocaleString("fr-FR")} €`,
      `- ${s.tasks.enCours} tâches en cours (${s.tasks.urgentes} urgentes, ${s.tasks.enRetard} en retard)`,
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
