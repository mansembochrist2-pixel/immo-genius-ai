import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Flame } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const statutLabels: Record<string, string> = {
  nouveau: "Nouveau", contacte: "Contacté", visite: "En visite", offre: "Offre", signe: "Signé", perdu: "Perdu",
};

export const HotProspects = () => {
  const navigate = useNavigate();

  const { data: hotProspects = [] } = useQuery({
    queryKey: ["hot-prospects"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("id, nom, statut, email")
        .in("statut", ["offre", "visite"])
        .order("updated_at", { ascending: false })
        .limit(5);
      return data ?? [];
    },
  });

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
          <p className="text-sm text-muted-foreground">Aucun prospect en visite ou offre</p>
        ) : (
          hotProspects.map((p: any) => (
            <button
              key={p.id}
              onClick={() => navigate("/prospects")}
              className="flex items-center gap-3 py-2 border-b last:border-0 w-full text-left hover:bg-muted/50 rounded px-1 transition-colors"
            >
              <Flame className="h-3.5 w-3.5 text-warning shrink-0" />
              <span className="flex-1 text-sm truncate">{p.nom}</span>
              <Badge variant={p.statut === "offre" ? "destructive" : "default"} className="text-[10px]">
                {statutLabels[p.statut] || p.statut}
              </Badge>
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
};
