import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";

interface BusinessStats {
  opportunites: { total: number; topScore: number };
}

interface BusinessContextType {
  stats: BusinessStats;
  loading: boolean;
  refresh: () => Promise<void>;
  getAIContext: () => string;
}

const defaultStats: BusinessStats = {
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
      const oppsRes = await supabase.from("opportunites").select("score");
      const opps = oppsRes.data || [];
      setStats({
        opportunites: {
          total: opps.length,
          topScore: opps.length ? Math.max(...opps.map((o: any) => Number(o.score) || 0)) : 0,
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
      `- Opportunités Radar : ${s.opportunites.total} analyses sauvegardées (meilleur score ${s.opportunites.topScore}/100)`,
      `- Modules actifs : Radar Prospection, Estimation IA, Studio IA.`,
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
