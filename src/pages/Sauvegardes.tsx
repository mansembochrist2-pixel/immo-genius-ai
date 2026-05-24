import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, TrendingUp, Trash2, Eye, Download, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { exportTextToDocx } from "@/lib/docx-export";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { GridSkeleton } from "@/components/ui/list-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { useNavigate } from "react-router-dom";

const Sauvegardes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [preview, setPreview] = useState<{ title: string; content: string } | null>(null);

  const { data: annonces = [], isLoading: loadingAnnonces } = useQuery({
    queryKey: ["saved-annonces"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annonces")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const { data: estimations = [], isLoading: loadingEstim } = useQuery({
    queryKey: ["saved-estimations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("analyses_zone")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });


  const deleteAnnonceMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("annonces").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-annonces"] });
      toast.success("Annonce supprimée");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur de suppression"),
  });

  const deleteEstimMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("analyses_zone").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["saved-estimations"] });
      toast.success("Estimation supprimée");
    },
    onError: (e: any) => toast.error(e?.message || "Erreur de suppression"),
  });

  const filterFn = (item: any) => {
    if (!search) return true;
    const s = search.toLowerCase();
    return (
      item.adresse?.toLowerCase().includes(s) ||
      item.description?.toLowerCase().includes(s) ||
      item.secteur?.toLowerCase().includes(s)
    );
  };

  const filteredAnnonces = annonces.filter(filterFn);
  const filteredEstim = estimations.filter(filterFn);

  const downloadAnnonce = async (a: any) => {
    const cg = a.contenu_genere || {};
    // Respecter le format choisi par l'utilisateur lors de la sauvegarde
    const format = cg.format_principal as ("courte" | "longue" | "premium") | undefined;
    const text = (format && cg[`version_${format}`]) || cg.contenu_principal || cg.version_premium || cg.version_longue || cg.version_courte || a.description || "";
    if (!text) { toast.error("Contenu vide"); return; }
    await exportTextToDocx(
      text,
      `Annonce_${format || "doc"}_${(a.adresse || "bien").replace(/[^a-zA-Z0-9]/g, "_").slice(0, 30)}.docx`,
      { title: cg.titre_accrocheur || "Annonce immobilière", subtitle: `${a.adresse}${format ? " · format " + format : ""}` }
    );
    toast.success("Annonce téléchargée");
  };

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Save className="h-7 w-7 text-primary" />
              Mes <span className="gradient-text">sauvegardes</span>
            </h1>
            <p className="page-subtitle">
              Retrouvez tous vos documents, estimations et annonces archivés.
            </p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher une sauvegarde…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border/40"
            />
          </div>
        </div>
      </div>

      <Tabs defaultValue="annonces" className="space-y-4">
        <TabsList className="bg-card/60">
          <TabsTrigger value="annonces" className="gap-2">
            <FileText className="h-3.5 w-3.5" /> Annonces ({annonces.length})
          </TabsTrigger>
          <TabsTrigger value="estimations" className="gap-2">
            <TrendingUp className="h-3.5 w-3.5" /> Estimations ({estimations.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="annonces">
          {loadingAnnonces ? (
            <GridSkeleton count={4} />
          ) : filteredAnnonces.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="Aucune annonce sauvegardée"
              description="Générez une annonce premium dans Documents IA, puis cliquez sur « Sauvegarder » pour la retrouver ici."
              actionLabel="Créer une annonce"
              onAction={() => navigate("/documents")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredAnnonces.map((a: any) => {
                const cg = a.contenu_genere || {};
                const format = cg.format_principal as ("courte" | "longue" | "premium") | undefined;
                const txt = (format && cg[`version_${format}`]) || cg.contenu_principal || cg.version_longue || cg.version_courte || a.description || "";
                return (
                  <Card key={a.id} className="bg-card/60 border-border/30 hover:border-primary/30 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">
                            {cg.titre_accrocheur || a.adresse || "Annonce"}
                          </CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {a.adresse}{a.surface ? ` · ${a.surface} m²` : ""}{a.prix ? ` · ${Number(a.prix).toLocaleString("fr-FR")} €` : ""}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <Badge variant="outline" className="text-[9px]">
                            {new Date(a.created_at).toLocaleDateString("fr-FR")}
                          </Badge>
                          {format && <Badge variant="secondary" className="text-[9px] capitalize">{format}</Badge>}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{txt}</p>
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7"
                          onClick={() => setPreview({ title: cg.titre_accrocheur || a.adresse, content: txt })}>
                          <Eye className="h-3 w-3" /> Aperçu
                        </Button>
                        <Button size="sm" variant="outline" className="text-xs gap-1 h-7" onClick={() => downloadAnnonce(a)}>
                          <Download className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive"
                          onClick={() => deleteAnnonceMutation.mutate(a.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="estimations">
          {loadingEstim ? (
            <GridSkeleton count={4} />
          ) : filteredEstim.length === 0 ? (
            <EmptyState
              icon={TrendingUp}
              title="Aucune estimation sauvegardée"
              description="Lancez une analyse de bien dans Estimation IA pour obtenir un rapport DVF complet et le sauvegarder."
              actionLabel="Estimer un bien"
              onAction={() => navigate("/estimation")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredEstim.map((e: any) => {
                const r = e.resultat || {};
                return (
                  <Card key={e.id} className="bg-card/60 border-border/30 hover:border-primary/30 transition-all">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm truncate">{e.adresse}</CardTitle>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                            {e.secteur || "Estimation IA"}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-[9px] shrink-0">
                          {new Date(e.created_at).toLocaleDateString("fr-FR")}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      {r.prix_moyen != null && (
                        <div className="bg-primary/5 rounded p-2 mb-3 text-center">
                          <p className="text-[9px] text-muted-foreground uppercase">Prix estimé</p>
                          <p className="text-sm font-bold text-primary">
                            {Number(r.prix_moyen).toLocaleString("fr-FR")} €
                          </p>
                        </div>
                      )}
                      <div className="flex gap-1.5">
                        <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7"
                          onClick={() => setPreview({ title: e.adresse, content: JSON.stringify(r, null, 2) })}>
                          <Eye className="h-3 w-3" /> Aperçu
                        </Button>
                        <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive"
                          onClick={() => deleteEstimMutation.mutate(e.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="emails">
          {loadingArchived ? (
            <GridSkeleton count={4} />
          ) : archivedMessages.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="Aucun email archivé"
              description="Vos messages archivés depuis l'Inbox apparaîtront ici. Vous pourrez les restaurer ou les supprimer définitivement."
              actionLabel="Aller à l'Inbox"
              onAction={() => navigate("/inbox")}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {archivedMessages.filter(filterFn).filter((m: any) => !search || m.contenu?.toLowerCase().includes(search.toLowerCase()) || m.sujet?.toLowerCase().includes(search.toLowerCase())).map((m: any) => (
                <Card key={m.id} className="bg-card/60 border-border/30 hover:border-primary/30 transition-all">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-sm truncate">{m.sujet || `Message ${m.canal}`}</CardTitle>
                        <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                          {m.canal} · {m.direction === "entrant" ? "Reçu" : "Envoyé"}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-[9px] shrink-0">
                        {new Date(m.archived_at).toLocaleDateString("fr-FR")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{m.contenu}</p>
                    <div className="flex gap-1.5">
                      <Button size="sm" variant="outline" className="flex-1 text-xs gap-1 h-7"
                        onClick={() => setPreview({ title: m.sujet || `Message ${m.canal}`, content: m.contenu })}>
                        <Eye className="h-3 w-3" /> Aperçu
                      </Button>
                      <Button size="sm" variant="outline" className="text-xs gap-1 h-7"
                        onClick={() => restoreMessageMutation.mutate(m.id)}>
                        <ArchiveRestore className="h-3 w-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="text-xs h-7 text-destructive hover:text-destructive"
                        onClick={() => deleteMessageMutation.mutate(m.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={!!preview} onOpenChange={(o) => !o && setPreview(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-base">{preview?.title}</DialogTitle>
          </DialogHeader>
          <div className="prose prose-sm max-w-none whitespace-pre-wrap text-sm text-muted-foreground">
            {preview?.content}
          </div>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Sauvegardes;
