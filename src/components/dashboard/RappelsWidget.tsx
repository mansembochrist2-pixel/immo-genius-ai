import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export const RappelsWidget = () => {
  const navigate = useNavigate();

  const { data: urgentTasks = [] } = useQuery({
    queryKey: ["urgent-tasks"],
    queryFn: async () => {
      const { data } = await supabase
        .from("tasks")
        .select("id, titre, due_date, priorite")
        .eq("done", false)
        .eq("priorite", "urgente")
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);
      return data ?? [];
    },
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
          <Bell className="h-4 w-4 text-destructive" />
          Rappels
          {urgentTasks.length > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-1">{urgentTasks.length}</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {urgentTasks.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun rappel urgent</p>
        ) : (
          urgentTasks.map((t: any) => (
            <button
              key={t.id}
              onClick={() => navigate("/taches")}
              className="flex items-center gap-3 py-2 border-b last:border-0 w-full text-left hover:bg-muted/50 rounded px-1 transition-colors"
            >
              <Bell className="h-3.5 w-3.5 text-destructive shrink-0" />
              <span className="flex-1 text-sm truncate">{t.titre}</span>
              {t.due_date && (
                <span className="text-xs text-muted-foreground">
                  {new Date(t.due_date).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                </span>
              )}
            </button>
          ))
        )}
      </CardContent>
    </Card>
  );
};
