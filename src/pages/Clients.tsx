import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, Plus, Brain, TrendingUp, Phone, Mail, Clock, Target, ChevronRight } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";

const statutLabels: Record<string, string> = {
  nouveau: "Nouveau",
  contacte: "Contacté",
  visite: "Visite",
  offre: "Offre",
  signe: "Signé",
  perdu: "Perdu",
};

const statutColors: Record<string, string> = {
  nouveau: "bg-blue-500/20 text-blue-400",
  contacte: "bg-amber-500/20 text-amber-400",
  visite: "bg-purple-500/20 text-purple-400",
  offre: "bg-green-500/20 text-green-400",
  signe: "bg-emerald-500/20 text-emerald-400",
  perdu: "bg-red-500/20 text-red-400",
};

const Clients = () => {
  const [search, setSearch] = useState("");
  const [selectedClient, setSelectedClient] = useState<string | null>(null);

  const { data: clients = [] } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const { data } = await supabase
        .from("prospects")
        .select("*")
        .order("updated_at", { ascending: false });
      return data ?? [];
    },
  });

  const filtered = clients.filter(
    (c: any) =>
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      (c.email && c.email.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = clients.find((c: any) => c.id === selectedClient);

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Users className="h-7 w-7 text-primary" />
              Mémoire <span className="gradient-text">Client</span>
            </h1>
            <p className="page-subtitle">Fiches intelligentes auto-évolutives de vos clients</p>
          </div>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" /> Nouveau client
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher un client..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border/50"
            />
          </div>

          <div className="space-y-2">
            {filtered.length === 0 ? (
              <Card className="bg-card/60 border-border/30">
                <CardContent className="p-6 text-center">
                  <Users className="h-10 w-10 text-muted-foreground/30 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">Aucun client trouvé</p>
                </CardContent>
              </Card>
            ) : (
              filtered.map((client: any) => (
                <Card
                  key={client.id}
                  className={`cursor-pointer transition-all hover:border-primary/40 ${
                    selectedClient === client.id ? "border-primary/60 bg-primary/5" : "bg-card/60 border-border/30"
                  }`}
                  onClick={() => setSelectedClient(client.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{client.nom}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{client.email || "Pas d'email"}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`text-[9px] px-1.5 py-0 ${statutColors[client.statut] || ""}`}>
                          {statutLabels[client.statut] || client.statut}
                        </Badge>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                    {client.score_ia && (
                      <div className="flex items-center gap-1 mt-2">
                        <Brain className="h-3 w-3 text-primary" />
                        <span className="text-[10px] text-muted-foreground">Score IA: {client.score_ia}/100</span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>

        {/* Détail client */}
        <div className="lg:col-span-2">
          {selected ? (
            <div className="space-y-4">
              <Card className="bg-card/60 border-border/30">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{(selected as any).nom}</CardTitle>
                      <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                        {(selected as any).email && (
                          <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {(selected as any).email}</span>
                        )}
                        {(selected as any).telephone && (
                          <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {(selected as any).telephone}</span>
                        )}
                      </div>
                    </div>
                    <Badge className={`${statutColors[(selected as any).statut] || ""}`}>
                      {statutLabels[(selected as any).statut] || (selected as any).statut}
                    </Badge>
                  </div>
                </CardHeader>
              </Card>

              <div className="grid grid-cols-2 gap-4">
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Budget</p>
                    <p className="text-lg font-bold mt-1">
                      {(selected as any).budget_min || (selected as any).budget_max
                        ? `${(selected as any).budget_min ?? "—"}€ - ${(selected as any).budget_max ?? "—"}€`
                        : "Non renseigné"}
                    </p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score IA</p>
                    <p className="text-lg font-bold mt-1">{(selected as any).score_ia ?? "—"}/100</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Motivation</p>
                    <p className="text-sm mt-1">{(selected as any).motivation || "À déterminer par l'IA"}</p>
                  </CardContent>
                </Card>
                <Card className="bg-card/60 border-border/30">
                  <CardContent className="p-4">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Freins</p>
                    <p className="text-sm mt-1">{(selected as any).freins || "À déterminer par l'IA"}</p>
                  </CardContent>
                </Card>
              </div>

              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Brain className="h-4 w-4 text-primary" /> Résumé IA
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {(selected as any).resume_ia || "L'IA analysera automatiquement les interactions avec ce client pour générer un résumé stratégique."}
                  </p>
                </CardContent>
              </Card>

              <Card className="bg-card/60 border-border/30">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Target className="h-4 w-4 text-primary" /> Stratégie adaptée
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {(selected as any).strategie_adaptee || "Connectez l'Inbox et le Copilote pour activer les recommandations stratégiques."}
                  </p>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card className="bg-card/60 border-border/30 flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <Users className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">Sélectionnez un client pour voir sa fiche intelligente</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Clients;
