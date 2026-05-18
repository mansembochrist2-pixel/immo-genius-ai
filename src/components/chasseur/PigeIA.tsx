import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search, Loader2, ExternalLink, Sparkles, Trash2, Target, AlertTriangle,
  MessageSquare, Lightbulb, Radar, Zap, TrendingUp, MapPin, Send, Phone, Mail,
  Info, Flame, CheckCircle2, Eye, Camera, Clock, ArrowDown, Bookmark, BookmarkCheck,
  HelpCircle, Briefcase,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { handleApiError } from "@/lib/error-handler";
import { cn } from "@/lib/utils";

const scoreBadgeColor = (score: number) => {
  if (score >= 75) return "bg-destructive/15 text-destructive border-destructive/30";
  if (score >= 50) return "bg-warning/15 text-warning border-warning/30";
  if (score >= 25) return "bg-primary/10 text-primary border-primary/20";
  return "bg-muted text-muted-foreground border-border";
};

const CATEGORIES = [
  { key: "top",        label: "🔥 Top opportunités",  min: 75, color: "text-destructive",       info: "Score ≥ 75/100 : vendeur particulier, signaux faibles côté vendeur, prix accessible. À appeler dans la journée." },
  { key: "moyenne",    label: "⚡ Moyennes",          min: 50, color: "text-warning",           info: "Score 50–74 : potentiel correct, qualification rapide recommandée pour confirmer la mandatabilité." },
  { key: "faible",     label: "💡 Faibles",           min: 25, color: "text-primary",           info: "Score 25–49 : angles limités. À traiter si vous avez de la bande passante." },
  { key: "surveiller", label: "👁 À surveiller",      min: 0,  color: "text-muted-foreground",  info: "Score < 25 : pas d'angle immédiat (vendeur déjà chez un confrère, prix élevé). Surveillez les évolutions." },
] as const;

const WORKFLOW = [
  { key: "a_appeler",     label: "À appeler",     color: "bg-primary/15 text-primary" },
  { key: "contacte",      label: "Contacté",      color: "bg-info/15 text-info" },
  { key: "relance",       label: "Relance",       color: "bg-warning/15 text-warning" },
  { key: "rdv_pris",      label: "RDV pris",      color: "bg-accent/20 text-accent-foreground" },
  { key: "mandat_signe",  label: "✅ Mandat signé", color: "bg-success/15 text-success" },
  { key: "refus",         label: "Refus",         color: "bg-destructive/10 text-destructive" },
  { key: "a_surveiller",  label: "À surveiller",  color: "bg-muted text-muted-foreground" },
];

const mergeFreshAnnonces = (current: any[] = [], fresh: any[] = []) => {
  const seen = new Set<string>();
  return [...fresh, ...current].filter((a) => {
    const key = a?.id || a?.url;
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ------ ScoreBreakdown popover ------
const ScoreBreakdown = ({ annonce }: { annonce: any }) => {
  const score = annonce.score_pigeabilite || 0;
  const breakdown: any[] = Array.isArray(annonce.score_breakdown) ? annonce.score_breakdown : [];
  const sumWeights = breakdown.reduce((s, c) => s + (Number(c.weight) || 0), 0);
  const base = score - sumWeights;
  const synthese =
    score >= 75 ? "Mandat hautement probable — priorité 1."
    : score >= 50 ? "Cible intéressante — qualification rapide recommandée."
    : score >= 25 ? "Potentiel limité — à approcher si bande passante."
    : "À surveiller — peu d'angles immédiats.";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-mono", scoreBadgeColor(score))}
        >
          {score}/100 <Info className="h-3 w-3 opacity-60" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-border/40 bg-muted/30 px-4 py-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Score de mandatabilité
            </h4>
            <Badge className={cn("font-mono", scoreBadgeColor(score))}>{score}/100</Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">{synthese}</p>
        </div>
        <div className="p-4 space-y-2 max-h-80 overflow-y-auto">
          <div className="flex items-center justify-between bg-secondary/40 rounded-md px-2 py-1.5 text-[11px]">
            <span className="text-muted-foreground">Base de calcul</span>
            <span className="font-mono">{base}</span>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold pt-1">Critères pondérés</p>
          {breakdown.length === 0 && (
            <p className="text-xs text-muted-foreground italic">Aucun détail — score calculé sur données partielles.</p>
          )}
          {breakdown.map((c, i) => (
            <div key={i} className="border border-border/30 rounded-md p-2.5 bg-card/40">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium">{c.label}</p>
                <span className={cn(
                  "text-[10px] font-mono px-1.5 py-0.5 rounded",
                  c.status === "positive" && "bg-success/10 text-success",
                  c.status === "negative" && "bg-destructive/10 text-destructive",
                  c.status === "neutral"  && "bg-muted/40 text-muted-foreground",
                )}>
                  {c.weight > 0 ? `+${c.weight}` : c.weight}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">{c.detail}</p>
            </div>
          ))}
          <div className="flex items-center justify-between border-t border-border/40 pt-2 mt-2 text-xs font-semibold">
            <span>Total = {base} {sumWeights >= 0 ? "+" : ""} {sumWeights}</span>
            <span className="font-mono">{score}/100</span>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

// ------ Workflow status badge with dropdown ------
const WorkflowBadge = ({ annonce, onChange }: { annonce: any; onChange: (s: string) => void }) => {
  const current = WORKFLOW.find(w => w.key === (annonce.workflow_statut || "a_appeler")) || WORKFLOW[0];
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.stopPropagation()}
          className={cn("text-[10px] px-2 py-1 rounded-md font-medium border border-border/40 hover:opacity-80", current.color)}
        >
          {current.label}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-1" align="start" onClick={(e) => e.stopPropagation()}>
        <div className="space-y-0.5">
          {WORKFLOW.map(w => (
            <button
              key={w.key}
              onClick={() => onChange(w.key)}
              className={cn(
                "w-full text-left text-xs px-2 py-1.5 rounded hover:bg-secondary transition-colors",
                w.key === current.key && "bg-secondary font-medium",
              )}
            >
              <span className={cn("inline-block px-1.5 py-0.5 rounded mr-2 text-[10px]", w.color)}>•</span>
              {w.label}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};

export const PigeIA = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [zone, setZone] = useState("");
  const [activeZone, setActiveZone] = useState<string>(""); // zone effectivement recherchée
  const [searching, setSearching] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);
  const [selected, setSelected] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<string>("top");
  const [notesDraft, setNotesDraft] = useState<string>("");

  const sendToCopilote = (a: any) => {
    const ai = a.analyse_ia || {};
    const contact = a.contact_vendeur || {};
    const sig = a.signaux_marche || {};
    const qual = a.qualite_annonce || {};
    const breakdown = Array.isArray(a.score_breakdown) ? a.score_breakdown : [];

    const lines = [
      `### Opportunité de pige à transformer en mandat`,
      `**Bien** : ${a.titre}`,
      `**Localisation** : ${a.ville || "—"}${a.code_postal ? " " + a.code_postal : ""}${a.adresse ? ` · ${a.adresse}` : ""}`,
      `**Caractéristiques** : ${a.type_bien || "—"}${a.surface ? ` · ${a.surface} m²` : ""}${a.pieces ? ` · ${a.pieces}p` : ""}`,
      `**Prix** : ${a.prix ? Number(a.prix).toLocaleString("fr-FR") + " €" : "N/C"}${sig.prix_m2 ? ` (${sig.prix_m2} €/m²)` : ""}`,
      ``,
      `**Vendeur** : ${contact.type || "inconnu"}${contact.agence_nom ? ` (${contact.agence_nom})` : ""}${contact.nom ? ` · ${contact.nom}` : ""}`,
      contact.telephone ? `**Téléphone** : ${contact.telephone}` : "",
      contact.email ? `**Email** : ${contact.email}` : "",
      a.url ? `**Source** : ${a.url}` : "",
      ``,
      `**Score mandatabilité** : ${a.score_pigeabilite}/100 — catégorie "${a.categorie_opportunite || "moyenne"}"`,
      breakdown.length ? `**Critères** : ${breakdown.map((c: any) => `${c.label} (${c.weight > 0 ? "+" : ""}${c.weight})`).join(", ")}` : "",
      ``,
      `**Signaux marché** : ${[
        sig.baisse_prix_detectee && "baisse de prix",
        sig.multi_diffusion && `multi-diffusion (${(sig.sources_detectees || []).join(", ")})`,
        sig.ancienneté_jours && `${sig.ancienneté_jours}j en ligne`,
      ].filter(Boolean).join(" · ") || "RAS"}`,
      `**Qualité annonce** : ${qual.nb_photos ?? "?"} photos (${qual.qualite_photos || "?"}) · description ${qual.longueur_description || 0} car.`,
      ``,
      ai.strategie_approche ? `**Stratégie IA déjà générée** : ${ai.strategie_approche}` : "",
      ai.accroche ? `**Accroche** : "${ai.accroche}"` : "",
      ai.failles?.length ? `**Failles** : ${ai.failles.join(" · ")}` : "",
      a.notes_agent ? `\n**Mes notes** : ${a.notes_agent}` : "",
      ``,
      `---`,
      `Aide-moi à transformer cette opportunité en mandat. Donne-moi :`,
      `1. Le meilleur canal et le bon moment pour le contacter`,
      `2. Une accroche personnalisée à utiliser dans les 30 premières secondes`,
      `3. 2 angles complémentaires à la stratégie déjà générée`,
      `4. Le plan de relance sur 14 jours si pas de retour`,
    ].filter(Boolean).join("\n");

    sessionStorage.setItem("copilote_prefill", lines);
    toast.success("Contexte complet envoyé au Copilote IA");
    navigate("/copilote");
  };

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

  const updateAnnonce = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: any }) => {
      const { error } = await supabase.from("annonces_pige").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["annonces-pige"] }),
  });

  const runSearch = async () => {
    if (!zone.trim()) { toast.error("Entrez une ville, un quartier ou un code postal"); return; }
    setSearching(true);
    setActiveZone(zone.trim());
    setActiveTab("top");
    try {
      const { data, error } = await supabase.functions.invoke("search-pige-zone", { body: { zone: zone.trim(), user_id: user?.id } });
      if (error && !data) { toast.error("Erreur lors de la récupération des annonces."); return; }
      const res = (data || {}) as any;
      const status: string = res.status || (res.error ? "scraping_error" : "success");
      const returnedAnnonces = Array.isArray(res.annonces) ? res.annonces : [];
      if (returnedAnnonces.length > 0) {
        qc.setQueryData(["annonces-pige"], (old: any[] = []) => mergeFreshAnnonces(old, returnedAnnonces));
      }
      switch (status) {
        case "success": {
          const count = returnedAnnonces.length || res.count || 0;
          const rejected = res.rejected_count || 0;
          toast.success(`${count} opportunité${count > 1 ? "s" : ""} détectée${count > 1 ? "s" : ""} sur ${zone.trim()}${rejected ? ` · ${rejected} hors zone/incomplètes` : ""}`);
          await qc.invalidateQueries({ queryKey: ["annonces-pige"] });
          break;
        }
        case "no_results":
          toast.info(res.message || `Aucune annonce trouvée pour "${zone}".`); break;
        case "all_existing":
          toast.info(res.message || "Pige existante mise à jour.");
          await qc.invalidateQueries({ queryKey: ["annonces-pige"] }); break;
        default:
          toast.error(res.error || "Erreur lors de la récupération des annonces.");
      }
    } catch (e) {
      handleApiError(e, "Recherche d'opportunités");
    } finally { setSearching(false); }
  };

  const toggleVivier = (a: any) => {
    const newVal = !a.saved_to_vivier;
    updateAnnonce.mutate({ id: a.id, patch: { saved_to_vivier: newVal } });
    toast.success(newVal ? "✓ Annonce enregistrée" : "Annonce retirée des enregistrés");
    if (selected?.id === a.id) setSelected({ ...selected, saved_to_vivier: newVal });
  };

  const generateStrategy = async (annonce: any) => {
    setGeneratingFor(annonce.id);
    try {
      const { data, error } = await supabase.functions.invoke("analyze-annonce-pige", { body: { annonce_id: annonce.id } });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      toast.success("Stratégie IA générée");
      qc.invalidateQueries({ queryKey: ["annonces-pige"] });
      const { data: fresh } = await supabase.from("annonces_pige").select("*").eq("id", annonce.id).single();
      if (fresh) setSelected(fresh);
    } catch (e) { handleApiError(e, "Génération stratégie IA"); }
    finally { setGeneratingFor(null); }
  };

  // ---- Categorisation (scopée par zone active, sauf Vivier qui reste persistant) ----
  const matchesActiveZone = (a: any) => {
    if (!activeZone) return true;
    const z = activeZone.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const zr = String(a.zone_recherche || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (zr && zr === z) return true;
    const ville = String(a.ville || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const cp = String(a.code_postal || "");
    const cpMatch = z.match(/\b\d{5}\b/)?.[0];
    if (cpMatch && cp === cpMatch) return true;
    const cityTokens = z.replace(/\d+/g, "").split(/[^a-z]+/).filter(t => t.length >= 3);
    return cityTokens.some(t => ville.includes(t));
  };

  const byCategory = useMemo(() => {
    const buckets: Record<string, any[]> = { top: [], moyenne: [], faible: [], surveiller: [] };
    // Tant qu'aucune recherche n'a été lancée dans la session, on n'affiche AUCUNE catégorie.
    if (!activeZone) return buckets;
    for (const a of annonces) {
      if (!matchesActiveZone(a)) continue;
      const cat = (a as any).categorie_opportunite
        || ((a as any).score_pigeabilite >= 75 ? "top"
          : (a as any).score_pigeabilite >= 50 ? "moyenne"
          : (a as any).score_pigeabilite >= 25 ? "faible" : "surveiller");
      (buckets[cat] || buckets.surveiller).push(a);
    }
    return buckets;
  }, [annonces, activeZone]);

  const savedAnnonces = useMemo(
    () => annonces.filter((a: any) => a.saved_to_vivier),
    [annonces]
  );

  const zoneAnnoncesCount = useMemo(
    () => (activeZone ? annonces.filter(matchesActiveZone).length : 0),
    [annonces, activeZone]
  );

  // ---- Insights marché (dérivés des annonces de la zone visible) ----
  const insights = useMemo(() => {
    if (annonces.length < 3) return [];
    const list: string[] = [];
    const particuliers = annonces.filter((a: any) => (a.contact_vendeur?.type || "") === "particulier").length;
    const pctPart = Math.round((particuliers / annonces.length) * 100);
    if (pctPart >= 40) list.push(`👤 ${pctPart}% de vendeurs particuliers — terrain favorable pour la conquête`);
    const baisses = annonces.filter((a: any) => a.signaux_marche?.baisse_prix_detectee).length;
    if (baisses >= 2) list.push(`📉 ${baisses} annonces avec baisse de prix — marché sous tension côté vendeurs`);
    const multi = annonces.filter((a: any) => a.signaux_marche?.multi_diffusion).length;
    if (multi >= 2) list.push(`🌐 ${multi} biens multi-diffusés — mandats simples détectés (cible mandat exclusif)`);
    const topCount = byCategory.top.length;
    if (topCount >= 3) list.push(`🔥 ${topCount} top opportunités — concentrez vos appels aujourd'hui`);
    return list;
  }, [annonces, byCategory.top.length]);

  const kpis = [
    { label: activeZone ? `Opportunités sur ${activeZone}` : "Opportunités (lancez une recherche)", value: zoneAnnoncesCount, icon: Radar },
    { label: "🔥 Top (≥75)", value: byCategory.top.length, icon: Flame },
    { label: "🔖 Enregistrés", value: savedAnnonces.length, icon: BookmarkCheck },
    { label: "Score moyen", value: zoneAnnoncesCount ? Math.round(annonces.filter(matchesActiveZone).reduce((s, a: any) => s + (a.score_pigeabilite || 0), 0) / zoneAnnoncesCount) + "/100" : "—", icon: TrendingUp },
  ];

  const renderCard = (a: any) => {
    const photo = (a.photos as any[])?.[0];
    const daysOnline = a.date_publication ? Math.round((Date.now() - new Date(a.date_publication).getTime()) / 86400000) : null;
    const contact = a.contact_vendeur || {};
    const sig = a.signaux_marche || {};
    return (
      <Card key={a.id} className="rounded-2xl overflow-hidden hover:border-primary/40 transition-all cursor-pointer group" onClick={() => { setSelected(a); setNotesDraft(a.notes_agent || ""); }}>
        {photo ? (
          <div className="h-40 bg-secondary/30 overflow-hidden relative">
            <img src={photo} alt={a.titre} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" onError={(e) => ((e.target as HTMLImageElement).style.display = "none")} />
            <div className="absolute top-2 left-2 flex gap-1">
              {contact.type === "particulier" && <Badge className="bg-success/90 text-white border-0 text-[10px]">Particulier</Badge>}
              {sig.baisse_prix_detectee && <Badge className="bg-warning/90 text-white border-0 text-[10px] gap-1"><ArrowDown className="h-2.5 w-2.5" />Baisse</Badge>}
              {sig.multi_diffusion && <Badge className="bg-primary/90 text-white border-0 text-[10px]">Multi-diff</Badge>}
            </div>
          </div>
        ) : (
          <div className="h-40 bg-gradient-to-br from-secondary/40 to-secondary/10 flex items-center justify-center">
            <Radar className="h-10 w-10 text-muted-foreground/20" />
          </div>
        )}
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <h3 className="text-sm font-semibold line-clamp-2 flex-1">{a.titre}</h3>
            <div onClick={(e) => e.stopPropagation()}><ScoreBreakdown annonce={a} /></div>
          </div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground flex-wrap">
            {a.prix && <span className="font-semibold text-foreground">{Number(a.prix).toLocaleString("fr-FR")} €</span>}
            {a.surface && <span>· {a.surface} m²</span>}
            {a.pieces && <span>· {a.pieces}p</span>}
            {sig.prix_m2 && <span className="text-[10px]">· {sig.prix_m2} €/m²</span>}
          </div>
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            {a.ville && <span className="flex items-center gap-1"><MapPin className="h-2.5 w-2.5" />{a.ville}</span>}
            {daysOnline !== null && <span className="flex items-center gap-1"><Clock className="h-2.5 w-2.5" />{daysOnline}j</span>}
            <span className="flex items-center gap-1"><Camera className="h-2.5 w-2.5" />{a.qualite_annonce?.nb_photos ?? 0}</span>
          </div>
          {(contact.telephone || contact.email) && (
            <div className="flex items-center gap-2 text-[10px] text-success font-medium border-t border-border/30 pt-2">
              {contact.telephone && <span className="flex items-center gap-1"><Phone className="h-2.5 w-2.5" />{contact.telephone}</span>}
              {contact.email && <span className="flex items-center gap-1 truncate"><Mail className="h-2.5 w-2.5" />{contact.email}</span>}
            </div>
          )}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/50">
            <WorkflowBadge annonce={a} onChange={(s) => updateAnnonce.mutate({ id: a.id, patch: { workflow_statut: s } })} />
            <div className="flex items-center gap-1">
              {a.analyse_ia?.generated && <CheckCircle2 className="h-3 w-3 text-success" />}
              <Button
                size="icon"
                variant="ghost"
                className={cn("h-7 w-7 transition-all hover:scale-110", a.saved_to_vivier && "text-accent-foreground")}
                title={a.saved_to_vivier ? "Retirer du Vivier de mandats" : "Enregistrer dans le Vivier de mandats"}
                onClick={(e) => { e.stopPropagation(); toggleVivier(a); }}
              >
                {a.saved_to_vivier ? <BookmarkCheck className="h-4 w-4 fill-current" /> : <Bookmark className="h-4 w-4" />}
              </Button>
              {a.url && (
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); window.open(a.url, "_blank"); }}>
                  <ExternalLink className="h-3 w-3" />
                </Button>
              )}
              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => { e.stopPropagation(); deleteM.mutate(a.id); }}>
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Search hero */}
      <Card className="bg-gradient-to-br from-primary/5 via-card to-accent/5 border-primary/20 rounded-3xl overflow-hidden">
        <CardContent className="p-8">
          <div className="flex items-center gap-2 mb-3">
            <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-semibold">Chasseur de mandats · Détection IA temps réel</p>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Quelle zone souhaitez-vous <span className="gradient-text">piger</span> ?
          </h2>
          <p className="text-sm text-muted-foreground mb-6">L'IA scanne Leboncoin, SeLoger, Bien'ici, PAP… extrait les données vendeur et scorent la mandatabilité.</p>

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

      {/* Insights marché */}
      {insights.length > 0 && (
        <Card className="rounded-2xl border-accent/30 bg-accent/5">
          <CardContent className="p-4">
            <p className="text-[10px] uppercase tracking-wider text-accent-foreground/70 font-semibold mb-2 flex items-center gap-1">
              <Sparkles className="h-3 w-3" /> Insights marché — votre pige
            </p>
            <div className="flex flex-wrap gap-2">
              {insights.map((ins, i) => (
                <Badge key={i} variant="outline" className="bg-background/60 text-xs py-1 px-3">{ins}</Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k, i) => (
          <Card
            key={k.label}
            className="bg-card border-border rounded-2xl transition-all hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5 duration-300"
            style={{ animation: `fadeInUp 0.5s ease-out ${i * 80}ms both` }}
          >
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{k.label}</p>
                <k.icon className="h-3.5 w-3.5 text-primary/60 transition-transform group-hover:scale-110" />
              </div>
              <p className="text-2xl font-bold tabular-nums">{k.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>
      <style>{`@keyframes fadeInUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>

      {/* Results */}
      {/* Section "Enregistrés" — persistante, indépendante des recherches */}
      {savedAnnonces.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BookmarkCheck className="h-4 w-4 text-accent-foreground" />
              <h3 className="text-sm font-semibold">Mes annonces enregistrées</h3>
              <Badge variant="outline" className="text-[10px]">{savedAnnonces.length}</Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">Toujours visibles — survivent aux recherches et rafraîchissements.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {savedAnnonces.map(renderCard)}
          </div>
        </div>
      )}

      {/* Résultats de la recherche en cours */}
      {searching && zoneAnnoncesCount === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-sm font-medium">L'IA scanne les annonces sur {zone}…</p>
            <p className="text-xs text-muted-foreground mt-1">10-30 secondes.</p>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <p className="text-center text-sm text-muted-foreground py-8">Chargement…</p>
      ) : !activeZone ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <Radar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">Lancez une recherche pour détecter des opportunités</p>
            <p className="text-xs text-muted-foreground mt-1">
              Les résultats sont scopés à la zone recherchée. Seules vos annonces enregistrées (🔖) restent visibles entre les sessions.
            </p>
          </CardContent>
        </Card>
      ) : zoneAnnoncesCount === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <Radar className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium">Aucune opportunité détectée sur "{activeZone}"</p>
            <p className="text-xs text-muted-foreground mt-1">Essayez une autre zone ou un code postal plus précis.</p>
          </CardContent>
        </Card>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-2 px-1">
            <p className="text-[11px] text-muted-foreground">
              Résultats pour <span className="font-medium text-foreground">{activeZone}</span> — {zoneAnnoncesCount} annonce{zoneAnnoncesCount > 1 ? "s" : ""}
            </p>
          </div>
          <TabsList className="bg-card border border-border rounded-2xl p-1 h-auto flex flex-wrap">
            {CATEGORIES.map(c => (
              <TabsTrigger key={c.key} value={c.key} className="rounded-xl text-xs gap-2 group">
                <span className={c.color}>{c.label}</span>
                <Badge variant="outline" className="text-[10px] px-1.5 py-0">{byCategory[c.key]?.length || 0}</Badge>
                <Popover>
                  <PopoverTrigger asChild>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => { e.stopPropagation(); e.preventDefault(); }}
                      className="opacity-50 hover:opacity-100 cursor-help"
                    >
                      <HelpCircle className="h-3 w-3" />
                    </span>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 text-xs" align="center" onClick={(e) => e.stopPropagation()}>
                    {c.info}
                  </PopoverContent>
                </Popover>
              </TabsTrigger>
            ))}
          </TabsList>
          {CATEGORIES.map(c => (
            <TabsContent key={c.key} value={c.key} className="mt-4">
              {(byCategory[c.key] || []).length === 0 ? (
                <Card className="rounded-2xl border-dashed">
                  <CardContent className="py-10 text-center text-xs text-muted-foreground">
                    Aucune annonce dans cette catégorie pour "{activeZone}".
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {(byCategory[c.key] || []).map(renderCard)}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      )}

      {/* Detail dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl max-h-[88vh] overflow-y-auto">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3 pr-8">
                  <span className="flex-1">{selected.titre}</span>
                  <ScoreBreakdown annonce={selected} />
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {/* Top row : prix / surface / source */}
                <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                  {selected.prix && <span className="font-semibold text-foreground text-sm">{Number(selected.prix).toLocaleString("fr-FR")} €</span>}
                  {selected.surface && <span>{selected.surface} m²</span>}
                  {selected.pieces && <span>· {selected.pieces}p</span>}
                  {selected.signaux_marche?.prix_m2 && <span>· {selected.signaux_marche.prix_m2} €/m²</span>}
                  {selected.ville && <span>· {selected.ville}</span>}
                  <WorkflowBadge annonce={selected} onChange={(s) => { updateAnnonce.mutate({ id: selected.id, patch: { workflow_statut: s } }); setSelected({ ...selected, workflow_statut: s }); }} />
                  {selected.url && (
                    <a href={selected.url} target="_blank" rel="noreferrer" className="text-primary hover:underline flex items-center gap-1 ml-auto">
                      Voir annonce <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>

                {/* Contact vendeur */}
                {(selected.contact_vendeur?.telephone || selected.contact_vendeur?.email || selected.contact_vendeur?.nom) && (
                  <div className="rounded-xl border border-success/30 bg-success/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-success font-semibold mb-2 flex items-center gap-1">
                      <Phone className="h-3 w-3" /> Contact vendeur ({selected.contact_vendeur?.type || "?"})
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm">
                      {selected.contact_vendeur?.nom && <div><span className="text-muted-foreground text-xs">Nom</span><br />{selected.contact_vendeur.nom}</div>}
                      {selected.contact_vendeur?.telephone && <div><span className="text-muted-foreground text-xs">Téléphone</span><br /><a href={`tel:${selected.contact_vendeur.telephone}`} className="text-primary font-medium">{selected.contact_vendeur.telephone}</a></div>}
                      {selected.contact_vendeur?.email && <div><span className="text-muted-foreground text-xs">Email</span><br /><a href={`mailto:${selected.contact_vendeur.email}`} className="text-primary font-medium break-all">{selected.contact_vendeur.email}</a></div>}
                    </div>
                  </div>
                )}

                {/* Signaux marché */}
                {selected.signaux_marche && (selected.signaux_marche.baisse_prix_detectee || selected.signaux_marche.multi_diffusion || selected.signaux_marche.ancienneté_jours) && (
                  <div className="rounded-xl border border-warning/30 bg-warning/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-warning font-semibold mb-2 flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" /> Signaux marché
                    </p>
                    <div className="flex flex-wrap gap-2 text-xs">
                      {selected.signaux_marche.baisse_prix_detectee && <Badge className="bg-warning/15 text-warning border-warning/30">Baisse de prix détectée</Badge>}
                      {selected.signaux_marche.multi_diffusion && <Badge className="bg-primary/15 text-primary border-primary/30">Multi-diffusion ({(selected.signaux_marche.sources_detectees || []).join(", ")})</Badge>}
                      {selected.signaux_marche.ancienneté_jours && <Badge variant="outline">{selected.signaux_marche.ancienneté_jours}j en ligne</Badge>}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-2">
                  {!selected.analyse_ia?.generated ? (
                    <Button onClick={() => generateStrategy(selected)} disabled={generatingFor === selected.id} className="flex-1 gap-2">
                      {generatingFor === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Générer la stratégie de pige IA
                    </Button>
                  ) : (
                    <Button onClick={() => generateStrategy(selected)} variant="outline" disabled={generatingFor === selected.id} className="flex-1 gap-2">
                      {generatingFor === selected.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                      Régénérer
                    </Button>
                  )}
                  <Button
                    onClick={() => toggleVivier(selected)}
                    variant={selected.saved_to_vivier ? "default" : "outline"}
                    className={cn("gap-2", selected.saved_to_vivier && "bg-accent text-accent-foreground hover:bg-accent/90")}
                  >
                    {selected.saved_to_vivier
                      ? <><BookmarkCheck className="h-4 w-4" /> Dans le Vivier</>
                      : <><Bookmark className="h-4 w-4" /> Enregistrer dans Vivier</>}
                  </Button>
                  <Button onClick={() => sendToCopilote(selected)} variant="secondary" className="flex-1 gap-2">
                    <Send className="h-4 w-4" /> Copilote IA
                  </Button>
                </div>

                {/* Notes agent */}
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Mes notes</p>
                  <Textarea
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    onBlur={() => {
                      if (notesDraft !== (selected.notes_agent || "")) {
                        updateAnnonce.mutate({ id: selected.id, patch: { notes_agent: notesDraft } });
                        setSelected({ ...selected, notes_agent: notesDraft });
                        toast.success("Notes enregistrées");
                      }
                    }}
                    placeholder="Notes terrain, retour d'appel, infos vendeur…"
                    className="text-sm min-h-[80px]"
                  />
                </div>

                {/* IA outputs */}
                {selected.analyse_ia?.accroche && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-primary font-semibold mb-2 flex items-center gap-1">
                      <Sparkles className="h-3 w-3" /> Accroche
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
                {selected.analyse_ia?.estimation_commission && (
                  <div className="rounded-xl border border-accent/40 bg-accent/10 p-4">
                    <p className="text-[10px] uppercase tracking-wider text-accent-foreground font-semibold mb-1">💰 Commission potentielle</p>
                    <p className="text-lg font-bold">{selected.analyse_ia.estimation_commission}</p>
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
