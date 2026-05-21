import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Instagram, Facebook, Linkedin, Music2, Info, Sparkles, Loader2, History, Trash2, TrendingUp, ExternalLink } from "lucide-react";
import { AnalysisLoader } from "@/components/AnalysisLoader";
import { toast } from "sonner";
import { LineChart, Line, XAxis, YAxis, Tooltip as RTooltip, ResponsiveContainer, CartesianGrid } from "recharts";

type Plateforme = "instagram" | "facebook" | "tiktok" | "linkedin";

const PLATEFORMES: Array<{ key: Plateforme; label: string; icon: any; placeholder: string; tutoriel: string[] }> = [
  {
    key: "instagram", label: "Instagram", icon: Instagram,
    placeholder: "https://www.instagram.com/votre_compte",
    tutoriel: [
      "Ouvrez l'app Instagram ou instagram.com",
      "Allez sur votre profil",
      "Copiez l'URL : https://www.instagram.com/votre_handle",
      "Le compte doit être public pour permettre l'analyse",
    ],
  },
  {
    key: "facebook", label: "Facebook", icon: Facebook,
    placeholder: "https://www.facebook.com/votre.page",
    tutoriel: [
      "Allez sur votre Page Pro (pas votre profil perso)",
      "Copiez l'URL depuis le navigateur",
      "Format : https://www.facebook.com/nom.page",
      "La page doit être visible publiquement",
    ],
  },
  {
    key: "tiktok", label: "TikTok", icon: Music2,
    placeholder: "https://www.tiktok.com/@votre_compte",
    tutoriel: [
      "Ouvrez votre profil TikTok",
      "Cliquez sur Partager → Copier le lien",
      "Format : https://www.tiktok.com/@votre_handle",
      "Le compte doit être public",
    ],
  },
  {
    key: "linkedin", label: "LinkedIn", icon: Linkedin,
    placeholder: "https://www.linkedin.com/in/votre-nom",
    tutoriel: [
      "Allez sur votre profil LinkedIn",
      "Copiez l'URL depuis la barre du navigateur",
      "Profil : .../in/votre-nom — Page : .../company/nom-agence",
      "Le profil/la page doit être public",
    ],
  },
];

export const AuditReseaux = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [active, setActive] = useState<Plateforme>("instagram");
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [tutoOpen, setTutoOpen] = useState(false);
  const [selectedAudit, setSelectedAudit] = useState<any>(null);

  const plat = PLATEFORMES.find(p => p.key === active)!;

  // All audits (toutes plateformes) — pour afficher le compteur réel par plateforme
  // sans devoir cliquer dessus.
  const { data: allAudits = [] } = useQuery({
    queryKey: ["audits-reseaux-all", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("audits_reseaux" as any)
        .select("id, plateforme")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const countByPlatform = (key: Plateforme) =>
    (allAudits as any[]).filter((a) => a.plateforme === key).length;

  const { data: audits = [] } = useQuery({
    queryKey: ["audits-reseaux", active, user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("audits_reseaux" as any)
        .select("*")
        .eq("user_id", user.id)
        .eq("plateforme", active)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const lancer = async () => {
    if (!url.trim()) { toast.error("URL requise"); return; }
    if (!user) { toast.error("Session requise"); return; }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("audit-reseau-social", {
        body: { url: url.trim(), plateforme: active },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      const { error: insErr } = await supabase.from("audits_reseaux" as any).insert({
        user_id: user.id,
        plateforme: active,
        url: url.trim(),
        handle: (data as any).handle || null,
        profil_data: (data as any).profil_data || {},
        analyse_ia: (data as any).analyse || {},
        metrics: (data as any).metrics || {},
        score_global: (data as any).score_global || 0,
      });
      if (insErr) throw insErr;

      toast.success("Audit terminé et sauvegardé");
      setUrl("");
      qc.invalidateQueries({ queryKey: ["audits-reseaux", active, user.id] });
      qc.invalidateQueries({ queryKey: ["audits-reseaux-all", user.id] });
      const fresh = await supabase.from("audits_reseaux" as any).select("*").eq("user_id", user.id).eq("plateforme", active).order("created_at", { ascending: false }).limit(1).single();
      if (fresh.data) setSelectedAudit(fresh.data);
    } catch (e: any) {
      toast.error(e.message || "Erreur lors de l'audit");
    } finally {
      setLoading(false);
    }
  };

  const supprimer = async (id: string) => {
    if (!confirm("Supprimer cet audit ?")) return;
    const { error } = await supabase.from("audits_reseaux" as any).delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Audit supprimé");
    if (selectedAudit?.id === id) setSelectedAudit(null);
    qc.invalidateQueries({ queryKey: ["audits-reseaux", active, user?.id] });
    qc.invalidateQueries({ queryKey: ["audits-reseaux-all", user?.id] });
  };

  // Evolution chart data
  const evolution = [...audits].reverse().map((a: any, i) => ({
    name: new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" }),
    score: a.score_global || 0,
    idx: i + 1,
  }));

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6">
        {/* Sélecteur plateforme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {PLATEFORMES.map(p => {
            const Icon = p.icon;
            const isActive = active === p.key;
            return (
              <button
                key={p.key}
                onClick={() => { setActive(p.key); setSelectedAudit(null); setUrl(""); }}
                className={`p-4 rounded-2xl border transition-all flex items-center gap-3 ${isActive ? "border-primary/60 bg-primary/5 shadow-sm" : "border-border/40 bg-card hover:border-border hover:bg-muted/30"}`}
              >
                <div className={`h-9 w-9 rounded-xl flex items-center justify-center ${isActive ? "bg-primary/10 text-primary" : "bg-muted/40 text-muted-foreground"}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-medium">{p.label}</p>
                  <p className="text-[10px] text-muted-foreground">{countByPlatform(p.key)} audit{countByPlatform(p.key) > 1 ? "s" : ""}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Lancer un audit */}
        <Card className="rounded-2xl border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Nouvel audit IA — {plat.label}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Input
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder={plat.placeholder}
                  className="pr-10"
                />
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setTutoOpen(true)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full bg-muted/50 hover:bg-primary/10 hover:text-primary flex items-center justify-center"
                      aria-label="Comment trouver mon URL"
                    >
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Comment récupérer mon URL ?</TooltipContent>
                </Tooltip>
              </div>
              <Button onClick={lancer} disabled={loading || !url.trim()} className="gap-2">
                {loading ? <><Loader2 className="h-4 w-4 animate-spin" /> Analyse…</> : <><Sparkles className="h-4 w-4" /> Lancer l'audit</>}
              </Button>
            </div>
            {loading && (
              <AnalysisLoader
                module={`Audit ${plat.label}`}
                context={url.replace(/^https?:\/\//, "").slice(0, 40)}
                eta="30 à 90 secondes selon la disponibilité du profil"
                messages={[
                  `Connexion au profil ${plat.label}…`,
                  "Lecture de la bio et des métadonnées…",
                  "Extraction des publications récentes…",
                  "Analyse du branding visuel et du ton…",
                  "Mesure de l'engagement et de la régularité…",
                  "Croisement avec les bonnes pratiques immo…",
                  "Identification des axes de progrès…",
                  "Construction du plan d'action 30 jours…",
                  "Finalisation du rapport — quasi terminé…",
                ]}
              />
            )}
          </CardContent>
        </Card>

        {/* Evolution + Historique */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Historique */}
          <Card className="rounded-2xl border-border/50 lg:col-span-1">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Audits sauvegardés
              </CardTitle>
            </CardHeader>
            <CardContent>
              {audits.length === 0 ? (
                <p className="text-xs text-muted-foreground italic text-center py-6">Aucun audit pour {plat.label} pour le moment.</p>
              ) : (
                <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
                  {audits.map((a: any) => (
                    <div
                      key={a.id}
                      className={`p-3 rounded-xl border cursor-pointer transition-all ${selectedAudit?.id === a.id ? "border-primary/60 bg-primary/5" : "border-border/30 hover:border-border/60 hover:bg-muted/20"}`}
                      onClick={() => setSelectedAudit(a)}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">{a.handle || a.url.replace(/^https?:\/\//, "").slice(0, 30)}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {new Date(a.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Badge className={`text-[10px] ${a.score_global >= 70 ? "bg-success/15 text-success border-success/30" : a.score_global >= 40 ? "bg-warning/15 text-warning border-warning/30" : "bg-destructive/15 text-destructive border-destructive/30"}`}>
                            {a.score_global || 0}
                          </Badge>
                          <button onClick={(e) => { e.stopPropagation(); supprimer(a.id); }} className="h-6 w-6 rounded-md hover:bg-destructive/10 hover:text-destructive flex items-center justify-center text-muted-foreground">
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Evolution */}
          <Card className="rounded-2xl border-border/50 lg:col-span-2">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-primary" /> Évolution du score
              </CardTitle>
            </CardHeader>
            <CardContent>
              {evolution.length < 2 ? (
                <div className="text-center py-10">
                  <p className="text-xs text-muted-foreground">Effectuez au moins 2 audits pour voir l'évolution dans le temps.</p>
                </div>
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={evolution} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.4} />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                      <RTooltip contentStyle={{ borderRadius: 12, fontSize: 12, border: "1px solid hsl(var(--border))", background: "hsl(var(--card))" }} />
                      <Line type="monotone" dataKey="score" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                    </LineChart>
                  </ResponsiveContainer>
                  <p className="text-[11px] text-muted-foreground mt-3 leading-relaxed">
                    Score global : {evolution[0].score} → {evolution[evolution.length - 1].score} ({evolution[evolution.length - 1].score - evolution[0].score > 0 ? "+" : ""}{evolution[evolution.length - 1].score - evolution[0].score} pts).
                    Chaque audit est sauvegardé : les anciens s'ouvrent instantanément, sans nouvel appel IA.
                  </p>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit sélectionné */}
        {selectedAudit && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <Button size="sm" variant="ghost" className="text-xs h-7 gap-1" onClick={() => setSelectedAudit(null)}>
                Fermer l'audit ✕
              </Button>
            </div>
            <AuditDetails audit={selectedAudit} />
          </div>
        )}

        {/* Tutoriel Dialog */}
        <Dialog open={tutoOpen} onOpenChange={setTutoOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <plat.icon className="h-5 w-5 text-primary" />
                Récupérer l'URL — {plat.label}
              </DialogTitle>
            </DialogHeader>
            <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
              {plat.tutoriel.map((step, i) => (
                <li key={i} className="leading-relaxed">{step}</li>
              ))}
            </ol>
            <div className="rounded-lg bg-muted/40 p-3 text-xs text-muted-foreground">
              💡 Astuce : copiez l'URL exactement depuis la barre d'adresse de votre navigateur (Chrome, Safari…) une fois sur votre page de profil.
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
};

const AuditDetails = ({ audit }: { audit: any }) => {
  const a = audit.analyse_ia || {};
  const breakdown = a.score_breakdown || {};
  const collected = audit.profil_data || {};
  const direct = collected.direct_profile || {};
  const recentPosts = Array.isArray(direct.recent_posts) ? direct.recent_posts.filter((p: any) => p?.caption || p?.likes != null || p?.comments != null) : [];
  return (
    <Card className="rounded-2xl border-border/50">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <CardTitle className="text-base">Audit du {new Date(audit.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })}</CardTitle>
            <a href={audit.url} target="_blank" rel="noreferrer" className="text-xs text-primary hover:underline flex items-center gap-1 mt-1">
              {audit.url} <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="text-right">
            <div className="text-3xl font-bold text-primary">{audit.score_global || 0}<span className="text-sm text-muted-foreground">/100</span></div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Score global</p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Synthèse */}
        {a.synthese && (
          <div className="rounded-xl bg-primary/5 border border-primary/15 p-4">
            <p className="text-xs font-semibold text-primary mb-1.5 uppercase tracking-wider">Synthèse</p>
            <p className="text-sm leading-relaxed">{a.synthese}</p>
          </div>
        )}

        <div className="rounded-xl border border-border/30 p-3 space-y-2">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Données réellement collectées</p>
            <Badge variant="outline" className="text-[10px]">{collected.scrape_status === "ok" ? "Profil lu" : "Lecture partielle"}</Badge>
          </div>
          {direct?.status === "ok" ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div><p className="text-muted-foreground">Abonnés</p><p className="font-medium">{direct.followers?.toLocaleString?.("fr-FR") || "n/d"}</p></div>
                <div><p className="text-muted-foreground">Posts</p><p className="font-medium">{direct.posts_count?.toLocaleString?.("fr-FR") || "n/d"}</p></div>
                <div><p className="text-muted-foreground">Catégorie</p><p className="font-medium truncate">{direct.category_name || "n/d"}</p></div>
                <div><p className="text-muted-foreground">Vérifié</p><p className="font-medium">{direct.is_verified ? "Oui" : "Non"}</p></div>
              </div>
              {direct.biography && <p className="text-xs leading-relaxed"><span className="text-muted-foreground">Bio : </span>{direct.biography}</p>}
              {recentPosts.length > 0 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-medium">Publications récentes détectées</p>
                  {recentPosts.slice(0, 3).map((post: any, i: number) => (
                    <p key={i} className="text-[11px] text-muted-foreground leading-relaxed truncate">• {post.caption || `${post.likes ?? "n/d"} likes · ${post.comments ?? "n/d"} commentaires`}</p>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground leading-relaxed">La plateforme limite l'accès public direct. L'audit utilise alors les métadonnées, Firecrawl et la recherche web complémentaire, sans inventer les métriques absentes.</p>
          )}
        </div>

        {/* Breakdown */}
        {Object.keys(breakdown).length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Détail du score</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {Object.entries(breakdown).map(([k, v]: [string, any]) => (
                <div key={k} className="rounded-xl border border-border/30 p-3">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium capitalize">{k}</p>
                    <Badge variant="outline" className="text-[10px]">{v.note}/100</Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">{v.commentaire}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Ce qui marche / pas */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {a.ce_qui_marche?.length > 0 && (
            <div className="rounded-xl border border-success/20 bg-success/5 p-3">
              <p className="text-xs font-semibold text-success mb-2">✅ Ce qui fonctionne</p>
              <ul className="space-y-1.5">
                {a.ce_qui_marche.map((x: string, i: number) => <li key={i} className="text-xs leading-relaxed">{x}</li>)}
              </ul>
            </div>
          )}
          {a.ce_qui_ne_marche_pas?.length > 0 && (
            <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <p className="text-xs font-semibold text-destructive mb-2">⚠️ Ce qui freine</p>
              <ul className="space-y-1.5">
                {a.ce_qui_ne_marche_pas.map((x: string, i: number) => <li key={i} className="text-xs leading-relaxed">{x}</li>)}
              </ul>
            </div>
          )}
        </div>

        {/* Axes amélioration */}
        {a.axes_amelioration?.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Axes d'amélioration prioritaires</p>
            <ul className="space-y-1.5">
              {a.axes_amelioration.map((x: string, i: number) => (
                <li key={i} className="text-sm flex gap-2"><span className="text-primary font-semibold">{i + 1}.</span><span className="leading-relaxed">{x}</span></li>
              ))}
            </ul>
          </div>
        )}

        {/* Plan 30j */}
        {a.plan_action_30j?.length > 0 && (
          <div>
            <p className="text-xs font-semibold mb-2 uppercase tracking-wider text-muted-foreground">Plan d'action 30 jours</p>
            <div className="space-y-2">
              {a.plan_action_30j.map((s: any, i: number) => (
                <div key={i} className="rounded-xl border border-border/30 p-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Badge className="text-[10px]">Semaine {s.semaine}</Badge>
                    <p className="text-xs font-medium">{s.objectif}</p>
                  </div>
                  <ul className="space-y-1 ml-2">
                    {(s.actions || []).map((act: string, j: number) => <li key={j} className="text-[11px] text-muted-foreground leading-relaxed">• {act}</li>)}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stratégie contenu */}
        {a.strategie_contenu && (
          <div className="rounded-xl border border-border/30 p-3 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Stratégie de contenu recommandée</p>
            {a.strategie_contenu.piliers?.length > 0 && (
              <div><p className="text-[11px] font-medium mb-1">Piliers de contenu</p><div className="flex flex-wrap gap-1">{a.strategie_contenu.piliers.map((p: string, i: number) => <Badge key={i} variant="outline" className="text-[10px]">{p}</Badge>)}</div></div>
            )}
            {a.strategie_contenu.formats_prioritaires?.length > 0 && (
              <div><p className="text-[11px] font-medium mb-1">Formats prioritaires</p><p className="text-[11px] text-muted-foreground">{a.strategie_contenu.formats_prioritaires.join(" · ")}</p></div>
            )}
            {a.strategie_contenu.frequence_recommandee && (
              <div><p className="text-[11px] font-medium mb-1">Fréquence</p><p className="text-[11px] text-muted-foreground">{a.strategie_contenu.frequence_recommandee}</p></div>
            )}
            {a.strategie_contenu.hooks_exemples?.length > 0 && (
              <div><p className="text-[11px] font-medium mb-1">Hooks d'exemples</p><ul className="space-y-0.5">{a.strategie_contenu.hooks_exemples.map((h: string, i: number) => <li key={i} className="text-[11px] text-muted-foreground">• {h}</li>)}</ul></div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
