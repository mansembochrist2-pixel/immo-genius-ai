import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessStats {
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
      const [oppsRes, pigeRes] = await Promise.all([
        supabase.from("opportunites").select("score"),
        supabase.from("annonces_pige").select("score_pigeabilite, created_at, saved_to_vivier"),
      ]);

      const opps = oppsRes.data || [];
      const pige = (pigeRes.data || []).filter((p: any) => p.saved_to_vivier);
      const last24h = new Date(Date.now() - 86400000).toISOString();

      setStats({
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
      `- Pige IA : ${s.pige.total} annonces enregistrées dans le vivier — score moyen ${s.pige.scoreMoyen}/100, top ${s.pige.topScore}/100`,
      `- Opportunités Radar : ${s.opportunites.total} analyses sauvegardées (meilleur score ${s.opportunites.topScore}/100)`,
      `- Modules actifs : Pige IA, Radar Prospection, Estimation IA, Studio IA et Copilote.`,
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
