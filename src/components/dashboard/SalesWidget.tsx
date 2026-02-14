import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BadgeEuro, Plus, Undo2, Loader2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const SalesWidget = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: sales = [] } = useQuery({
    queryKey: ["sales"],
    queryFn: async () => {
      const { data } = await supabase
        .from("sales")
        .select("*")
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const addSale = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("sales").insert({
        user_id: user!.id,
        montant: 0,
        description: "Vente enregistrée",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-chart"] });
      toast.success("Vente ajoutée !");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const undoSale = useMutation({
    mutationFn: async () => {
      if (sales.length === 0) return;
      const { error } = await supabase.from("sales").delete().eq("id", sales[0].id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sales"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-chart"] });
      toast.success("Dernière vente annulée");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
          <BadgeEuro className="h-4 w-4 text-success" />
          Ventes
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-3xl font-bold text-center">{sales.length}</p>
        <p className="text-xs text-muted-foreground text-center">ventes enregistrées</p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => addSale.mutate()}
            disabled={addSale.isPending}
          >
            {addSale.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5 mr-1" />}
            Ajouter
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => undoSale.mutate()}
            disabled={undoSale.isPending || sales.length === 0}
          >
            {undoSale.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Undo2 className="h-3.5 w-3.5 mr-1" />}
            Annuler
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
