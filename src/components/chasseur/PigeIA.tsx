import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Phone, Plus, Loader2, ExternalLink, Sparkles, Trash2, Target, AlertTriangle, MessageSquare, Lightbulb } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleApiError } from "@/lib/error-handler";

const scoreBadgeColor = (score: number) => {
  if (score >= 75) return "bg-success/15 text-success border-success/30";
  if (score >= 50) return "bg-warning/15 text-warning border-warning/30";
  return "bg-muted text-muted-foreground border-border";
};

export const PigeIA = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ titre: "", url: "", prix: "", surface: "", ville: "", description: "", agence: "" });
  const [analyzing, setAnalyzing] = useState(false);
  const [selected, setSelected] = useState<any>(null);

  const { data: annonces = [], isLoading } = useQuery({
    queryKey: ["annonces-pige"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("annonces_pige").select("*").order("score_pigeabilite", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const deleteM = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("annonces_pige").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["annonces-pige"] }); toast.success("Annonce supprimée"); },
  });

  const addAndAnalyze = async () => {
    if (!form.titre.trim()) { toast.error("Titre requis"); return; }
    if (!user) return;
    setAnalyzing(true);
    try {
      const { data: inserted, error } = await supabase.from("annonces_pige").insert({
        user_id: user.id,
        titre: form.titre,
        url: form.url || null,
        prix: form.prix ? Number(form.prix) : null,
        surface: form.surface ? Number(form.surface) : null,
        ville: form.ville || null,
        description: form.description || null,
        agence: form.agence || null,
        source: form.url ? "url" : "manuel",
        date_publication: new Date().toISOString(),
      }).select().single();
      if (error) throw error;

      const { data: ia, error: iaErr } = await supabase.functions.invoke("analyze-annonce-pige", {
        body: { annonce_id: inserted.id },
      });
      if (iaErr) throw iaErr;
      if ((ia as any)?.error) throw new Error((ia as any).error);

      qc.invalidateQueries({ queryKey: ["annonces-pige"] });
      toast.success("Analyse IA terminée");
      setDialogOpen(false);
      setForm({ titre: "", url: "", prix: "", surface: "", ville: "", description: "", agence: "" });
    } catch (e) {
      handleApiError(e, "Analyse de l'annonce");
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Annonces piégées", value: annonces.length },
          { label: "Score moyen", value: annonces.length ? Math.round(annonces.reduce((s, a: any) => s + (a.score_pigeabilite || 0), 0) / annonces.length) + "/100" : "—" },
          { label: "Pige chaudes (≥75)", value: annonces.filter((a: any) => a.score_pigeabilite >= 75).length },
          { label: "À traiter", value: annonces.filter((a: any) => a.statut === "nouvelle").length },
        ].map((k) => (
          <Card key={k.label} className="bg-card/60 border-border/30 rounded-2xl">
            <CardContent className="p-4">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
              <p className="text-2xl font-bold mt-1.5">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* CTA add */}
      <Card className="bg-card border-border rounded-2xl">
        <CardHeader className="pb-3 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-sm flex items-center gap-2"><Phone className="h-4 w-4 text-primary" /> Pige IA</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">Collez une annonce, l'IA génère votre script de pige.</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-2"><Plus className="h-3.5 w-3.5" /> Nouvelle pige</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader><DialogTitle>Ajouter une annonce à piger</DialogTitle></DialogHeader>
              <div className="space-y-3">
                <div><label className="text-xs">Titre de l'annonce *</label>
                  <Input value={form.titre} onChange={(e) => setForm({ ...form, titre: e.target.value })} placeholder="Appartement T3 lumineux..." /></div>
                <div><label className="text-xs">URL de l'annonce</label>
                  <Input value={form.url} onChange={(e) => setForm({ ...form, url: e.target.value })} placeholder="https://..." /></div>
                <div className="grid grid-cols-3 gap-2">
                  <div><label className="text-xs">Prix (€)</label><Input value={form.prix} onChange={(e) => setForm({ ...form, prix: e.target.value })} type="number" /></div>
                  <div><label className="text-xs">Surface (m²)</label><Input value={form.surface} onChange={(e) => setForm({ ...form, surface: e.target.value })} type="number" /></div>
                  <div><label className="text-xs">Ville</label><Input value={form.ville} onChange={(e) => setForm({ ...form, ville: e.target.value })} /></div>
                </div>
                <div><label className="text-xs">Agence / vendeur</label><Input value={form.agence} onChange={(e) => setForm({ ...form, agence: e.target.value })} placeholder="Particulier / Nom agence" /></div>
                <div><label className="text-xs">Description de l'annonce</label>
                  <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={4} /></div>
                <Button onClick={addAndAnalyze} disabled={analyzing} className="w-full gap-2">
                  {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  Lancer la pige IA
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-8">Chargement...</p>
          ) : annonces.length === 0 ? (
            <div className="text-center py-12">
              <Phone className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm font-medium">Aucune annonce à piger pour l'instant</p>
              <p className="text-xs text-muted-foreground mt-1">Ajoutez votre première annonce pour générer un script de pige IA.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {annonces.map((a: any) => (
                <div key={a.id} className="rounded-xl border border-border bg-secondary/30 p-4 hover:border-primary/30 transition-colors cursor-pointer" onClick={() => setSelected(a)}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <p className="text-sm font-semibold line-clamp-2 flex-1">{a.titre}</p>
                    <Badge className={`text-[10px] shrink-0 ${scoreBadgeColor(a.score_pigeabilite || 0)}`}>
                      {a.score_pigeabilite || 0}/100
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground flex-wrap mb-2">
                    {a.prix && <span>{Number(a.prix).toLocaleString("fr-FR")} €</span>}
                    {a.surface && <span>· {a.surface} m²</span>}
                    {a.ville && <span>· {a.ville}</span>}
                    {a.agence && <span>· {a.agence}</span>}
                  </div>
                  {(a.analyse_ia as any)?.failles?.length > 0 && (
                    <p className="text-[11px] text-warning flex items-start gap-1">
                      <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                      {(a.analyse_ia as any).failles[0]}
                    </p>
                  )}
                  <div className="flex items-center gap-1 mt-2">
                    {a.url && (
                      <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank"); }}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={(e) => { e.stopPropagation(); deleteM.mutate(a.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <span className="flex-1">{selected.titre}</span>
                  <Badge className={scoreBadgeColor(selected.score_pigeabilite || 0)}>
                    Pigeabilité {selected.score_pigeabilite || 0}/100
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {selected.analyse_ia?.accroche && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Phrase d'accroche
                    </p>
                    <p className="text-sm italic">"{selected.analyse_ia.accroche}"</p>
                  </div>
                )}
                {selected.analyse_ia?.script_appel && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> Script d'appel
                    </p>
                    <p className="text-sm whitespace-pre-line">{selected.analyse_ia.script_appel}</p>
                  </div>
                )}
                {selected.analyse_ia?.failles?.length > 0 && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" /> Failles détectées
                    </p>
                    <ul className="space-y-1">
                      {selected.analyse_ia.failles.map((f: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-warning">•</span>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.analyse_ia?.contre_objections?.length > 0 && (
                  <div className="rounded-xl border border-border bg-secondary/30 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2 flex items-center gap-1">
                      <Target className="h-3 w-3" /> Contre-objections
                    </p>
                    <ul className="space-y-2">
                      {selected.analyse_ia.contre_objections.map((c: any, i: number) => (
                        <li key={i} className="text-sm"><strong className="text-foreground">"{c.objection}"</strong><br /><span className="text-muted-foreground">→ {c.reponse}</span></li>
                      ))}
                    </ul>
                  </div>
                )}
                {selected.analyse_ia?.opportunites?.length > 0 && (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-success font-semibold mb-2 flex items-center gap-1">
                      <Lightbulb className="h-3 w-3" /> Opportunités commerciales
                    </p>
                    <ul className="space-y-1">
                      {selected.analyse_ia.opportunites.map((o: string, i: number) => (
                        <li key={i} className="text-sm flex gap-2"><span className="text-success">→</span>{o}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
