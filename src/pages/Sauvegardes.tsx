import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Save, FileText, TrendingUp, Loader2, Trash2, Eye, Download, Search, Mail, ArchiveRestore } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { exportTextToDocx } from "@/lib/docx-export";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const Sauvegardes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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

  const { data: archivedMessages = [], isLoading: loadingArchived } = useQuery({
    queryKey: ["archived-messages"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("inbox_messages")
        .select("*")
        .not("archived_at", "is", null)
        .order("archived_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user,
  });

  const restoreMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbox_messages").update({ archived_at: null }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-messages"] });
      queryClient.invalidateQueries({ queryKey: ["inbox-messages"] });
      toast.success("Message restauré dans la boîte de réception");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("inbox_messages").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["archived-messages"] });
      toast.success("Message supprimé définitivement");
    },
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
          <TabsTrigger value="emails" className="gap-2">
            <Mail className="h-3.5 w-3.5" /> Emails archivés ({archivedMessages.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="annonces">
          {loadingAnnonces ? (
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredAnnonces.length === 0 ? (
            <Card className="bg-card/60 border-border/30">
              <CardContent className="py-16 text-center space-y-3">
                <FileText className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune annonce sauvegardée</p>
                <p className="text-xs text-muted-foreground/60">
                  Générez une annonce dans Documents IA et cliquez sur "Sauvegarder"
                </p>
              </CardContent>
            </Card>
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
            <div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : filteredEstim.length === 0 ? (
            <Card className="bg-card/60 border-border/30">
              <CardContent className="py-16 text-center space-y-3">
                <TrendingUp className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-sm text-muted-foreground">Aucune estimation sauvegardée</p>
                <p className="text-xs text-muted-foreground/60">
                  Lancez une estimation dans le module Estimation IA et sauvegardez-la
                </p>
              </CardContent>
            </Card>
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
