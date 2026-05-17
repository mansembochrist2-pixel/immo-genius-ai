import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessStats {
  prospects: { total: number; nouveaux: number; chauds: number; signes: number; actifs: number };
  sales: { total: number; montantTotal: number; ceMois: number };
  tasks: { enCours: number; urgentes: number; enRetard: number };
  pige: { total: number; nouvelles: number; scoreMoyen: number; topScore: number };
  opportunites: { total: number; topScore: number };
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
  pige: { total: 0, nouvelles: 0, scoreMoyen: 0, topScore: 0 },
  opportunites: { total: 0, topScore: 0 },
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
      const [prospectsRes, salesRes, tasksRes, oppsRes, pigeRes] = await Promise.all([
        supabase.from("prospects").select("statut"),
        supabase.from("sales").select("montant, date_vente"),
        supabase.from("tasks").select("done, priorite, due_date"),
        supabase.from("opportunites").select("score"),
        supabase.from("annonces_pige").select("score_pigeabilite, created_at, statut"),
      ]);

      const prospects = prospectsRes.data || [];
      const sales = salesRes.data || [];
      const tasks = tasksRes.data || [];
      const opps = oppsRes.data || [];
      const pige = pigeRes.data || [];
      const now = new Date();
      const debutMois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
      const last24h = new Date(Date.now() - 86400000).toISOString();

      setStats({
        prospects: {
          total: prospects.length,
          nouveaux: prospects.filter((p: any) => p.statut === "nouveau").length,
          chauds: prospects.filter((p: any) => ["offre", "visite"].includes(p.statut)).length,
          signes: prospects.filter((p: any) => p.statut === "signe").length,
          actifs: prospects.filter((p: any) => ["contacte", "visite", "offre"].includes(p.statut)).length,
        },
        sales: {
          total: sales.length,
          montantTotal: sales.reduce((s: number, x: any) => s + Number(x.montant), 0),
          ceMois: sales.filter((x: any) => x.date_vente >= debutMois).reduce((s: number, x: any) => s + Number(x.montant), 0),
        },
        tasks: {
          enCours: tasks.filter((t: any) => !t.done).length,
          urgentes: tasks.filter((t: any) => !t.done && t.priorite === "urgente").length,
          enRetard: tasks.filter((t: any) => !t.done && t.due_date && new Date(t.due_date) < new Date(now.toDateString())).length,
        },
        opportunites: {
          total: opps.length,
          topScore: opps.length ? Math.max(...opps.map((o: any) => Number(o.score) || 0)) : 0,
        },
        pige: {
          total: pige.length,
          nouvelles: pige.filter((p: any) => p.created_at >= last24h).length,
          scoreMoyen: pige.length ? Math.round(pige.reduce((s: number, p: any) => s + (p.score_pigeabilite || 0), 0) / pige.length) : 0,
          topScore: pige.length ? Math.max(...pige.map((p: any) => p.score_pigeabilite || 0)) : 0,
        },
      });
    } catch (e) {
      console.error("BusinessProvider fetch error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const getAIContext = useCallback(() => {
    const s = stats;
    return [
      `📊 CONTEXTE BUSINESS DE L'AGENT :`,
      `- Pige IA : ${s.pige.total} annonces (${s.pige.nouvelles} nouvelles 24h) — score moyen ${s.pige.scoreMoyen}/100, top ${s.pige.topScore}/100`,
      `- Opportunités Radar : ${s.opportunites.total} (meilleur score ${s.opportunites.topScore}/100)`,
      `- Prospects : ${s.prospects.total} (${s.prospects.actifs} actifs, ${s.prospects.chauds} chauds, ${s.prospects.signes} signés)`,
      `- Ventes : ${s.sales.total} | CA total ${s.sales.montantTotal.toLocaleString("fr-FR")} € | ce mois ${s.sales.ceMois.toLocaleString("fr-FR")} €`,
    ].join("\n");
  }, [stats]);

  useEffect(() => {
    if (isAuthenticated) fetchStats();
    else { setStats(defaultStats); setLoading(false); }
  }, [isAuthenticated, fetchStats]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const channel = supabase
      .channel("business-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "prospects" }, () => { fetchStats(); queryClient.invalidateQueries(); })
      .on("postgres_changes", { event: "*", schema: "public", table: "sales" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "tasks" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "opportunites" }, () => fetchStats())
      .on("postgres_changes", { event: "*", schema: "public", table: "annonces_pige" }, () => { fetchStats(); queryClient.invalidateQueries({ queryKey: ["annonces-pige"] }); })
      .on("postgres_changes", { event: "*", schema: "public", table: "actions_recommandees" }, () => queryClient.invalidateQueries({ queryKey: ["dashboard-actions"] }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [isAuthenticated, fetchStats, queryClient]);

  return (
    <BusinessContext.Provider value={{ stats, loading, refresh: fetchStats, getAIContext }}>
      {children}
    </BusinessContext.Provider>
  );
};
