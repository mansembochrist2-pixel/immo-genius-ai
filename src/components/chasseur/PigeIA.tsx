import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Search, Loader2, ExternalLink, Sparkles, Trash2, Target, AlertTriangle, MessageSquare, Lightbulb, Radar, Zap, TrendingUp, MapPin } from "lucide-react";
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

const opportunityLabel = (score: number) => {
  if (score >= 85) return { label: "🔥 Opportunité chaude", color: "text-destructive" };
  if (score >= 70) return { label: "⚡ Forte opportunité", color: "text-warning" };
  if (score >= 50) return { label: "💡 Opportunité moyenne", color: "text-primary" };
  return { label: "À surveiller", color: "text-muted-foreground" };
};

export const PigeIA = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [zone, setZone] = useState("");
  const [searching, setSearching] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
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

  const runSearch = async () => {
    if (!zone.trim()) { toast.error("Entrez une ville, un quartier ou un code postal"); return; }
    setSearching(true);
    try {
      const { data, error } = await supabase.functions.invoke("search-pige-zone", { body: { zone: zone.trim() } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const count = (data as any)?.count || 0;
      if (count === 0) toast.info("Aucune opportunité trouvée sur cette zone. Essayez une zone plus large.");
      else toast.success(`${count} opportunité${count > 1 ? "s" : ""} détectée${count > 1 ? "s" : ""} sur ${zone}`);
      qc.invalidateQueries({ queryKey: ["annonces-pige"] });
    } catch (e) {
      handleApiError(e, "Recherche d'opportunités");
    } finally {
      setSearching(false);
    }
  };

  const generateStrategy = async (annonce: any) => {
    setGeneratingFor(annonce.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-annonce-pige", { body: { annonce_id: annonce.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Stratégie IA générée");
      qc.invalidateQueries({ queryKey: ["annonces-pige"] });
      // Reopen the dialog with fresh data
      const { data: fresh } = await supabase.from("annonces_pige").select("*").eq("id", annonce.id).single();
      if (fresh) setSelected(fresh);
    } catch (e) {
      handleApiError(e, "Génération stratégie IA");
    } finally {
      setGeneratingFor(null);
    }
  };

  const kpis = [
    { label: "Opportunités détectées", value: annonces.length, icon: Radar },
    { label: "Score moyen", value: annonces.length ? Math.round(annonces.reduce((s, a: any) => s + (a.score_pigeabilite || 0), 0) / annonces.length) + "/100" : "—", icon: TrendingUp },
    { label: "🔥 Pige chaudes (≥75)", value: annonces.filter((a: any) => a.score_pigeabilite >= 75).length, icon: Zap },
    { label: "Particuliers", value: annonces.filter((a: any) => (a.tags || []).includes("particulier")).length, icon: Target },
  ];

  return (
    <div className="space-y-6">
      {/* Search hero */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20 rounded-3xl overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Moteur de pige IA · Détection automatique</p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Quelle zone souhaitez-vous <span className="gradient-text">piger</span> ?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">L'IA scanne Leboncoin, SeLoger, Bien'ici… et détecte automatiquement les meilleures opportunités de mandats.</p>

          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !searching && runSearch()}
                placeholder="Paris 16, Lyon 6ème, Nice Centre, 13008 Marseille…"
                className="pl-10 h-12 text-base rounded-2xl bg-background/80"
                disabled={searching}
              />
            </div>
            <Button onClick={runSearch} disabled={searching} size="lg" className="h-12 px-6 rounded-2xl gap-2 font-semibold">
              {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
              {searching ? "Analyse en cours…" : "Détecter les opportunités"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            {["Paris 16", "Lyon 6", "Marseille 8", "Nice", "Bordeaux", "Cannes"].map((s) => (
              <button key={s} onClick={() => setZone(s)} className="text-[11px] px-3 py-1 rounded-full border border-border bg-card hover:border-primary/40 transition-colors">
                {s}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="bg-card border-border rounded-2xl">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                <k.icon className="h-3.5 w-3.5 text-primary/60" />
              </div>
              <p className="text-2xl font-bold">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Results grid */}
      {searching && annonces.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">L'IA scanne les annonces sur {zone}…</p>
            <p className="text-xs text-muted-foreground mt-1">Cela prend généralement 10-30 secondes.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
      ) : annonces.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <Radar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">Lancez votre première recherche d'opportunités</p>
            <p className="text-xs text-muted-foreground mt-1">Entrez une zone ci-dessus pour que l'IA détecte les annonces piégeables.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {annonces.map((a: any) => {
            const opp = opportunityLabel(a.score_pigeabilite || 0);
            const photo = (a.photos as any[])?.[0];
            const daysOnline = a.date_publication ? Math.round((Date.now() - new Date(a.date_publication).getTime()) / 86400000) : null;
            return (
              <Card key={a.id} className="rounded-2xl overflow-hidden hover:border-primary/40 transition-all cursor-pointer group" onClick={() => setSelected(a)}>
                {photo ? (
                  <div className="h-40 bg-secondary/30 overflow-hidden">
                    <img src={photo} alt={a.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
                  </div>
                ) : (
                  <div className="h-40 bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center">
                    <Radar className="h-10 w-10 text-muted-foreground/20" />
                  </div>
                )}
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-sm font-semibold line-clamp-2 flex-1">{a.titre}</h3>
                    <Badge className={`text-[10px] shrink-0 ${scoreBadgeColor(a.score_pigeabilite || 0)}`}>
                      {a.score_pigeabilite || 0}
                    </Badge>
                  </div>
                  <p className={`text-[11px] font-semibold ${opp.color}`}>{opp.label}</p>
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
                    {a.prix && <span className="font-semibold text-foreground">{Number(a.prix).toLocaleString("fr-FR")} €</span>}
                    {a.surface && <span>· {a.surface} m²</span>}
                    {a.pieces && <span>· {a.pieces}p</span>}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    {a.ville && <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{a.ville}</span>}
                    {a.agence && <span>· {a.agence}</span>}
                    {daysOnline !== null && <span>· {daysOnline}j en ligne</span>}
                  </div>
                  <div className="flex items-center gap-1 pt-2 border-t border-border/50">
                    <Button
                      size="sm"
                      variant={a.analyse_ia?.generated ? "outline" : "default"}
                      className="flex-1 h-8 text-xs gap-1"
                      disabled={generatingFor === a.id}
                      onClick={(e) => { e.stopPropagation(); generateStrategy(a); }}
                    >
                      {generatingFor === a.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
                      {a.analyse_ia?.generated ? "Voir stratégie" : "Générer stratégie IA"}
                    </Button>
                    {a.url && (
                      <Button size="icon" variant="ghost" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank"); }}>
                        <ExternalLink className="h-3 w-3" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); deleteM.mutate(a.id); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 pr-8">
                  <span className="flex-1">{selected.titre}</span>
                  <Badge className={scoreBadgeColor(selected.score_pigeabilite || 0)}>
                    {selected.score_pigeabilite || 0}/100
                  </Badge>
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {selected.prix && <span className="font-semibold text-foreground">{Number(selected.prix).toLocaleString("fr-FR")} €</span>}
                  {selected.surface && <span>{selected.surface} m²</span>}
                  {selected.ville && <span>· {selected.ville}</span>}
                  {selected.agence && <span>· {selected.agence}</span>}
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1">
                      Voir annonce <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {!selected.analyse_ia?.generated && (
                  <Button onClick={() => generateStrategy(selected)} disabled={generatingFor === selected.id} className="w-full gap-2">
                    {generatingFor === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Générer la stratégie de pige IA
                  </Button>
                )}

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
                {selected.analyse_ia?.strategie_approche && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2">Stratégie d'approche</p>
                    <p className="text-sm">{selected.analyse_ia.strategie_approche}</p>
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
