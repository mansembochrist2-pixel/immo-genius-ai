import { useState, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Search, BookOpen, Shield, Sparkles, FileEdit, TrendingUp, Radar, Bot, LayoutDashboard, Zap } from "lucide-react";

interface FAQItem { q: string; a: string; tags: string[]; }
interface FAQCategory { id: string; label: string; icon: any; items: FAQItem[]; }

const CATEGORIES: FAQCategory[] = [
  {
    id: "premiers-pas",
    label: "Premiers pas",
    icon: Sparkles,
    items: [
      { q: "Comment commencer avec Estate AI ?", a: "Créez votre compte, complétez l'onboarding (5 étapes — 3 minutes), connectez votre Google ou Outlook depuis Paramètres → Intégrations, puis laissez l'IA analyser vos derniers échanges. Votre dashboard est prêt immédiatement.", tags: ["onboarding", "demarrage", "compte"] },
      { q: "Combien de temps pour être opérationnel ?", a: "Moins de 3 minutes : création de compte, connexion email, et l'IA cartographie automatiquement vos prospects, opportunités et urgences. Vous pouvez ensuite explorer les modules un par un.", tags: ["onboarding", "demarrage"] },
      { q: "Faut-il une formation pour utiliser la plateforme ?", a: "Non. L'interface est pensée pour être intuitive. Chaque module dispose de tooltips contextuels et le Copilote stratégique peut vous guider à tout moment. Cette FAQ couvre 100% des fonctionnalités.", tags: ["formation", "aide"] },
      { q: "Puis-je annuler à tout moment ?", a: "Oui, sans engagement. Depuis Paramètres → Abonnement, vous pouvez résilier en un clic. Vos données sont conservées 30 jours puis supprimées conformément au RGPD.", tags: ["abonnement", "annulation"] },
    ],
  },
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    items: [
      { q: "Comment modifier mon objectif de chiffre d'affaires ?", a: "Sur le widget Objectif CA du dashboard, cliquez sur l'icône crayon en haut à droite. Saisissez votre objectif puis validez avec Entrée ou le bouton OK.", tags: ["ca", "objectif", "dashboard"] },
      { q: "Comment ajuster manuellement mon CA réalisé ?", a: "Cliquez sur le montant en gras (CA ce mois) sur le widget Objectif CA, saisissez le nouveau montant et validez. Une vente d'ajustement est créée automatiquement pour refléter la différence.", tags: ["ca", "ventes", "ajustement"] },
      { q: "À quoi sert la barre IA en haut du dashboard ?", a: "Elle vous donne un accès rapide au Copilote stratégique. Tapez votre question ou utilisez les suggestions (Estimer un bien, Rédiger une annonce, Relancer des clients, Analyser opportunités).", tags: ["copilote", "actions-rapides"] },
      { q: "Que signifient les alertes sur le dashboard ?", a: "Trois types : Critique (rouge — action urgente), Avertissement (orange — messages non lus), Info (bleu — opportunités détectées). Cliquez dessus pour aller directement au module concerné.", tags: ["alertes", "notifications"] },
    ],
  },
  {
    id: "documents",
    label: "Documents IA",
    icon: FileEdit,
    items: [
      { q: "Quels documents puis-je générer ?", a: "Mandats (exclusif, simple, semi-exclusif), annonces immobilières, supports marketing (flyers, descriptions). Tout est généré en moins de 30 secondes et entièrement éditable.", tags: ["mandat", "annonce", "marketing"] },
      { q: "Puis-je choisir le ton du document ?", a: "Oui : premium, familial, urbain, classique, dynamique. Le ton ajuste le vocabulaire et la mise en avant des atouts.", tags: ["ton", "personnalisation"] },
      { q: "Quels formats d'export sont disponibles ?", a: "PDF (mise en page professionnelle prête à imprimer) et DOCX (Word — modifiable). Vos documents conservent votre charte graphique d'agence.", tags: ["export", "pdf", "docx"] },
    ],
  },
  {
    id: "estimation",
    label: "Estimation IA",
    icon: TrendingUp,
    items: [
      { q: "Comment fonctionne l'estimation IA ?", a: "Vous renseignez les caractéristiques du bien (adresse, surface, état, équipements). L'IA croise les données du marché local pour produire une fourchette de prix avec analyse détaillée.", tags: ["estimation", "fonctionnement"] },
      { q: "Quelles données utilise l'IA pour estimer ?", a: "Données officielles du marché immobilier, transactions vérifiées du secteur, indicateurs de tension, démographie locale et historique de votre zone. Sources affichées dans chaque rapport pour transparence totale.", tags: ["donnees", "fiabilite"] },
      { q: "Puis-je exporter le rapport d'estimation ?", a: "Oui, en Word (modifiable) ou PDF. Le rapport contient : fourchette de prix, prix recommandé, analyse marché, comparaison quartier, historique ventes, tendances 12 mois.", tags: ["export", "rapport"] },
      { q: "L'estimation est-elle juridiquement contractuelle ?", a: "Non. C'est une aide à la décision basée sur des données réelles. Elle vous donne une fourchette précise mais reste indicative. Le prix final reste votre responsabilité d'expert.", tags: ["legal", "responsabilite"] },
    ],
  },
  {
    id: "radar",
    label: "Radar prospection",
    icon: Radar,
    items: [
      { q: "Comment analyser une zone ?", a: "Saisissez une adresse ou un quartier, choisissez le secteur (résidentiel, commercial, luxe…), cliquez sur Analyser. L'IA identifie les opportunités vendeurs, les risques marché et propose un plan d'action.", tags: ["zone", "analyse"] },
      { q: "Que signifient les scores d'opportunité et de risque ?", a: "Score sur 100 basé sur : prix/m², tension marché, liquidité, tendance 12 mois, volume transactions. Score élevé = forte opportunité commerciale.", tags: ["score", "opportunite", "risque"] },
      { q: "Comment générer un plan d'attaque ?", a: "Sur une analyse sauvegardée, cliquez sur Plan. L'IA génère un plan détaillé : profil cible, angle commercial, timing, priorités. Vous pouvez ensuite l'envoyer au Copilote pour passer à l'action.", tags: ["plan-attaque", "strategie"] },
      { q: "Puis-je supprimer une analyse ?", a: "Oui, icône poubelle sur chaque analyse sauvegardée. Suppression définitive.", tags: ["suppression"] },
    ],
  },
  {
    id: "copilote",
    label: "Copilote stratégique",
    icon: Bot,
    items: [
      { q: "Qu'est-ce que le Copilote stratégique ?", a: "Votre directeur commercial IA. Il a accès en temps réel à vos analyses Radar, vos pige IA, vos estimations et vos audits Studio, et vous suggère la meilleure action au bon moment.", tags: ["copilote", "fonctionnement"] },
      { q: "Comment le Copilote utilise-t-il mes données ?", a: "Lecture seule, dans votre navigateur. Aucune donnée n'est partagée avec d'autres utilisateurs. Le Copilote se base sur : analyses Radar récentes, annonces piges enregistrées, estimations actives, audits réseaux sociaux.", tags: ["confidentialite", "donnees"] },
      { q: "Puis-je sauvegarder mes conversations ?", a: "Oui, automatiquement. Chaque conversation est sauvegardée dans la sidebar gauche, renommable et supprimable. Recherche disponible.", tags: ["sauvegarde", "historique"] },
      { q: "Le Copilote peut-il agir à ma place ?", a: "Non. Il propose, vous décidez. Toute action (email, mandat, RDV) requiert votre validation explicite. Le Copilote est un conseiller, pas un exécutant autonome.", tags: ["autonomie", "validation"] },
    ],
  },
  {
    id: "securite",
    label: "Sécurité & RGPD",
    icon: Shield,
    items: [
      { q: "Mes données sont-elles sécurisées ?", a: "Oui : chiffrement en transit (TLS) et au repos (AES-256), isolation stricte par compte (Row Level Security), hébergement européen (RGPD), authentification OAuth officielle.", tags: ["securite", "chiffrement"] },
      { q: "Qui peut voir mes données ?", a: "Vous seul. Chaque agent a son espace privé totalement isolé. Aucun autre utilisateur, ni notre équipe, n'accède à vos données clients.", tags: ["isolation", "confidentialite"] },
      { q: "Comment exporter toutes mes données ?", a: "Paramètres → RGPD → Exporter mes données. Vous recevez un fichier JSON complet (clients, mandats, estimations, agenda, inbox).", tags: ["export", "rgpd"] },
      { q: "Comment supprimer mon compte ?", a: "Paramètres → RGPD → Supprimer mon compte. Suppression définitive sous 30 jours conformément au RGPD. Vous pouvez exporter vos données avant suppression.", tags: ["suppression", "rgpd"] },
    ],
  },
  {
    id: "facturation",
    label: "Facturation",
    icon: Zap,
    items: [
      { q: "Combien coûte la plateforme ?", a: "79€/mois après une période d'essai gratuite de 11 jours. Sans engagement. Annulable à tout moment.", tags: ["prix", "abonnement"] },
      { q: "Y a-t-il des frais cachés ?", a: "Non. Le tarif inclut tous les modules, les générations IA illimitées, le support, les mises à jour.", tags: ["prix", "transparence"] },
      { q: "Comment gérer mon abonnement ?", a: "Paramètres → Abonnement → Gérer. Vous accédez au portail Stripe pour modifier le moyen de paiement, télécharger vos factures ou résilier.", tags: ["abonnement", "facture", "stripe"] },
      { q: "Puis-je récupérer mon argent si je résilie ?", a: "Pas de remboursement au prorata, mais vous gardez l'accès jusqu'à la fin de la période payée. La période d'essai de 11 jours permet de tester sans engagement.", tags: ["remboursement", "resiliation"] },
    ],
  },
];

const FAQPage = () => {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const allItems = useMemo(() => {
    return CATEGORIES.flatMap(cat =>
      cat.items.map(item => ({ ...item, category: cat.id, categoryLabel: cat.label, categoryIcon: cat.icon }))
    );
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allItems.filter(item => {
      const matchCategory = activeCategory === "all" || item.category === activeCategory;
      if (!matchCategory) return false;
      if (!q) return true;
      const haystack = `${item.q} ${item.a} ${item.tags.join(" ")} ${item.categoryLabel}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [search, activeCategory, allItems]);

  const totalCount = allItems.length;

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-3">
          <HelpCircle className="h-7 w-7 text-primary" />
          Centre d'aide & <span className="gradient-text">FAQ</span>
        </h1>
        <p className="page-subtitle">{totalCount} réponses détaillées sur tous les modules de la plateforme</p>
      </div>

      {/* Search bar */}
      <Card className="mb-6 bg-card border-border rounded-2xl shadow-sm">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Rechercher dans la FAQ (ex: comment connecter Google, exporter données, score IA...)"
              className="pl-10 h-11 text-sm"
            />
          </div>
          {search && (
            <p className="text-xs text-muted-foreground mt-2">
              {filtered.length} résultat{filtered.length !== 1 ? "s" : ""} pour « {search} »
            </p>
          )}
        </CardContent>
      </Card>

      {/* Category tabs */}
      <div className="flex gap-2 flex-wrap mb-6">
        <Badge
          onClick={() => setActiveCategory("all")}
          className={`cursor-pointer px-3 py-1.5 ${activeCategory === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
        >
          <BookOpen className="h-3 w-3 mr-1.5" />
          Tout ({totalCount})
        </Badge>
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const count = cat.items.length;
          return (
            <Badge
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`cursor-pointer px-3 py-1.5 ${activeCategory === cat.id ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}
            >
              <Icon className="h-3 w-3 mr-1.5" />
              {cat.label} ({count})
            </Badge>
          );
        })}
      </div>

      {/* FAQ list */}
      {filtered.length === 0 ? (
        <Card className="bg-card border-border rounded-2xl">
          <CardContent className="p-12 text-center">
            <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm font-medium mb-1">Aucune réponse trouvée</p>
            <p className="text-xs text-muted-foreground">Essayez d'autres mots-clés ou contactez le support depuis le Copilote.</p>
          </CardContent>
        </Card>
      ) : (
        <Accordion type="single" collapsible className="space-y-2">
          {filtered.map((item, i) => {
            const Icon = item.categoryIcon;
            return (
              <AccordionItem
                key={`${item.category}-${i}`}
                value={`item-${i}`}
                className="bg-card border border-border rounded-xl px-5 hover:border-primary/30 transition-colors"
              >
                <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                  <div className="flex items-start gap-3 flex-1 pr-2">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.q}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{item.categoryLabel}</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4 pl-11">
                  {item.a}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}
    </AppLayout>
  );
};

export default FAQPage;
