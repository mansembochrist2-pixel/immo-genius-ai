import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export const HotProspects = () => {
  const navigate = useNavigate();

  const { data: hotProspects = [] } = useQuery({
    queryKey: ["hot-prospects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("id, nom, statut, score_ia, email")
        .not("score_ia", "is", null)
        .order("score_ia", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

  const statutColors: Record<string, string> = {
    nouveau: "secondary",
    contacte: "default",
    visite: "default",
    offre: "destructive",
    signe: "default",
    perdu: "secondary",
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
          <Flame className="h-4 w-4 text-accent" />
          Prospects chauds
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {hotProspects.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun prospect scoré pour le moment</p>
        ) : (
          hotProspects.map((p: any) => (
            <button
              key={p.id}
              onClick={() => navigate("/prospects")}
              className="flex items-center gap-3 py-2 border-b last:border-0 w-full text-left hover:bg-muted/50 rounded px-1 transition-colors"
            >
              <div className="flex items-center justify-center h-7 w-7 rounded-full bg-accent/15 text-accent text-xs font-bold">
                {p.score_ia}
              </div>
              <span className="flex-1 text-sm truncate">{p.nom}</span>
              <Badge variant={statutColors[p.statut] as any ?? "secondary"} className="text-[10px]">
                {p.statut}
              </Badge>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
};
