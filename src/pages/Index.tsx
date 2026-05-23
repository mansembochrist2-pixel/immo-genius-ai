import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radar, TrendingUp, Bot, FileEdit, Crosshair,
  ArrowRight, Sparkles, Star, Check, Zap, Quote, ChevronRight, MapPin, Building2, RefreshCw, Clock, Database,
} from "lucide-react";
import { BlueprintBuilding } from "@/components/landing/BlueprintBuilding";
import { KpiTicker } from "@/components/landing/KpiTicker";
import { CadastralGrid } from "@/components/landing/CadastralGrid";
import { PricingSection } from "@/components/landing/PricingSection";

const modules = [
  {
    icon: Crosshair,
    title: "Chasseur de mandats",
    desc: "Module unifié regroupant Radar de prospection (analyse zones DVF/INSEE/ADEME) et Pige IA (annonces particuliers scorées + scripts d'appel). Détectez et signez avant vos concurrents.",
    tag: "Radar + Pige IA",
    badges: ["Radar de prospection", "Pige IA"],
  },
  {
    icon: TrendingUp,
    title: "Valorisation",
    desc: "Deux sous-modules complémentaires : Estimation (valeur précise sur transactions vérifiées) et Expertise & Rendement (TRI 10 ans, cash-flow, simulation rénovation énergétique). Positionnez-vous en conseiller patrimonial.",
    tag: "Estimation + Expertise",
    badges: ["Estimation", "Expertise & Rendement"],
  },
  {
    icon: FileEdit,
    title: "Studio IA",
    desc: "Votre agence marketing intégrée : mandats conformes Hoguet/ALUR, annonces au ton adapté (luxe, familial, investisseur), posts réseaux sociaux et audit IA de votre Instagram, Facebook, TikTok ou LinkedIn.",
    tag: "Mandats · Marketing · Audit social",
  },
  {
    icon: Bot,
    title: "Copilote stratégique",
    desc: "Le cerveau d'ImmoGenius AI. Connecté à toutes vos données (Pige, Radar, Estimations, Audits), il priorise vos actions, défend vos prix et vous fournit les arguments chocs au bon moment.",
    tag: "Always on",
  },
];

const stats = [
  { value: "12h", label: "gagnées par semaine", sub: "estimations · mandats · pige" },
  { value: "+38%", label: "de mandats signés", sub: "sur les agents actifs" },
  { value: "< 60s", label: "pour un dossier d'expertise", sub: "vs 3 à 4h manuellement" },
  { value: "5", label: "modules synchronisés", sub: "une seule plateforme" },
];

const steps = [
  { num: "01", title: "Activez votre périmètre", desc: "Définissez vos zones de chasse en 2 minutes : villes, quartiers, typologie de biens. L'IA cartographie immédiatement le marché." },
  { num: "02", title: "Recevez vos opportunités", desc: "Pige IA et Radar scorent chaque annonce et chaque parcelle. Les vendeurs particuliers chauds remontent en haut, qualifiés." },
  { num: "03", title: "Exécutez avec votre copilote", desc: "Le Copilote propose mandat, script et timing optimal. Vous gardez la main sur chaque message, l'IA fait le brouillon." },
];

const advantages = [
  {
    icon: RefreshCw,
    title: "Crédits Daily Recharge",
    desc: "Fini la frustration des crédits épuisés. Votre compte se recharge chaque matin. Une nouvelle chance de prospecter, analyser et créer — chaque jour.",
  },
  {
    icon: Clock,
    title: "Gain de temps massif",
    desc: "Automatisez 80 % de vos tâches chronophages. Concentrez-vous sur la relation client et la négociation, ImmoGenius AI s'occupe du reste.",
  },
  {
    icon: Database,
    title: "Décisions basées sur la donnée",
    desc: "Données publiques vérifiées : DVF, INSEE, ADEME, observatoires des loyers. Chaque chiffre est sourcé, daté et auditable.",
  },
];

const testimonials = [
  { name: "Nicolas R.", role: "Agent indépendant · Lyon", text: "Le Radar m'a identifié 3 quartiers que je ne travaillais pas. J'y ai signé 2 mandats exclusifs en 6 semaines.", rating: 5 },
  { name: "Sofia M.", role: "Mandataire · Bordeaux", text: "Les estimations qu'on sortait en 4h sont prêtes en 15 minutes, dossier client ready. Je passe enfin tout mon temps en RDV.", rating: 5 },
  { name: "Karim B.", role: "Agent commercial · Paris", text: "Le Copilote est devenu mon réflexe avant chaque appel. Il connaît mes piges, mes prix, mes négos. Game changer.", rating: 5 },
  { name: "Élodie V.", role: "Agence indépendante · Annecy", text: "Le Studio IA m'a permis de doubler ma production de mandats sans embaucher. Les textes sont propres, à mon ton.", rating: 5 },
];

const faqs = [
  { q: "Qu'est-ce qu'ImmoGenius AI ?", a: "Une plateforme d'intelligence artificielle conçue pour les professionnels de l'immobilier. Elle intègre Chasseur de mandats (Radar + Pige IA), Valorisation (Estimation + Expertise & Rendement), Studio IA (mandats, annonces, audits réseaux sociaux) et un Copilote stratégique pour orchestrer toute votre activité." },
  { q: "Comment fonctionne le système de crédits ?", a: "Chaque action (analyse Radar, génération de fiche Pige, estimation, audit réseau, etc.) consomme des crédits. Votre compte est automatiquement rechargé chaque matin avec un nouveau quota : c'est le Daily Recharge. Vous gardez toujours de la marge pour prospecter et créer." },
  { q: "ImmoGenius AI remplace-t-il mon CRM ?", a: "Non, c'est un complément puissant. ImmoGenius AI génère vos leads qualifiés, prépare vos rendez-vous et crée vos contenus, mais ne gère pas votre base contacts existante. Les deux outils cohabitent parfaitement." },
  { q: "La plateforme est-elle conforme aux réglementations immobilières ?", a: "Oui. Tous les outils de génération de documents (mandats, annonces) sont conçus pour respecter les lois en vigueur (Hoguet, ALUR) et les bonnes pratiques du secteur. Chaque document reste 100 % éditable avant signature." },
  { q: "Comment ImmoGenius AI m'aide-t-il à trouver des mandats ?", a: "Le Radar de prospection identifie les zones à fort potentiel à partir des données DVF, INSEE et ADEME. La Pige IA détecte les annonces de particuliers, analyse leurs failles (photos, description, prix) et génère des scripts d'appel personnalisés avec contre-objections." },
  { q: "Quelles données utilise l'IA ?", a: "Uniquement des données publiques vérifiées : DVF (transactions notariées), INSEE, ADEME, observatoires des loyers, sources Pige immobilière. Chaque chiffre est sourcé et daté dans vos rapports — aucune hallucination." },
  { q: "L'IA peut-elle agir sans validation ?", a: "Jamais. L'IA propose, vous décidez. Aucun mandat n'est signé, aucun message n'est envoyé sans votre validation explicite. Tout est éditable avant publication." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui. Hébergement européen, chiffrement bout-en-bout, isolation stricte par compte agent (RLS Postgres), conformité RGPD totale. Export ou suppression de vos données en 1 clic depuis la page Légal." },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const goSignup = () => navigate("/signup");
  const goLogin = () => navigate("/login");

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background text-foreground">
      {/* Background scene */}
      <div className="scene-grid" />
      <div className="scene-mesh" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-2xl border-b border-border/60 bg-background/60">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 rounded-lg border border-primary/40 grid place-items-center bg-primary/10 overflow-hidden">
              <Building2 className="h-4 w-4 text-primary" />
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-transparent opacity-0 group-hover:opacity-100 transition" />
            </div>
            <span className="text-base font-display font-semibold tracking-tight">ImmoGenius<span className="text-primary"> AI</span></span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#modules" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Modules</a>
            <a href="#avantages" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Avantages</a>
            <a href="#tarifs" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Tarifs</a>
            <a href="#temoignages" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Témoignages</a>
            <a href="#faq" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">FAQ</a>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm" className="ml-2">
                Mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goLogin}>Connexion</Button>
                <Button size="sm" onClick={goSignup} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.35)]">
                  Découvrir <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative max-w-7xl mx-auto px-6 pt-20 pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-[1.1fr_1fr] gap-12 lg:gap-16 items-center">
          <div className="animate-fade-in-up">
            <div className="chip text-primary border-primary/30 mb-6">
              <Sparkles className="h-3 w-3" />
              Avantage tarifaire pour les beta testeurs
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.95] tracking-[-0.04em] text-balance">
              ImmoGenius AI :<br />
              <span className="gradient-text">votre copilote stratégique</span><br />
              pour dominer le marché.
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-xl text-pretty">
              Décrochez plus de mandats, valorisez vos biens et optimisez votre stratégie grâce à l'intelligence artificielle
              <span className="text-foreground"> la plus avancée du secteur immobilier</span>.
              Une plateforme pour conquérir, pas administrer.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={goSignup}
                className="text-base px-7 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_15px_50px_-10px_hsl(var(--primary)/0.8)] transition-all"
              >
                Découvrir ImmoGenius AI <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-7 py-6 rounded-xl border-border/80 hover:border-primary/40 hover:bg-primary/5"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir les modules
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Données hébergées en UE</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Conformité RGPD</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Daily Recharge crédits</span>
            </div>
          </div>

          {/* 3D Blueprint */}
          <div className="relative h-[480px] lg:h-[560px] animate-fade-in-up">
            <BlueprintBuilding className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* Live ticker */}
      <KpiTicker />

      {/* PROMESSE */}
      <section className="max-w-5xl mx-auto px-6 pt-20 pb-8 text-center">
        <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> La promesse ImmoGenius AI</div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          L'intelligence artificielle <span className="gradient-text">au service de votre performance</span>.
        </h2>
        <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
          ImmoGenius AI orchestre l'ensemble de votre activité immobilière. De la détection des opportunités à la signature du mandat,
          en passant par l'analyse financière et la création de contenu marketing, notre IA vous offre une longueur d'avance.
          Concentrez-vous sur l'humain — ImmoGenius AI s'occupe du reste.
        </p>
      </section>

      {/* STATS / proof bar */}
      <section className="max-w-7xl mx-auto px-6 py-16">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((s, i) => (
            <div key={i} className="kpi group">
              <div className="text-mono text-[10px] uppercase tracking-[0.2em] text-muted-foreground">0{i + 1}</div>
              <div className="mt-2 font-display text-4xl md:text-5xl font-semibold tracking-tight gradient-text">
                {s.value}
              </div>
              <div className="mt-1 text-sm font-medium text-foreground">{s.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </section>

      {/* MODULES — bento grid */}
      <section id="modules" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl mb-14">
          <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> 5 modules · 1 plateforme</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            5 modules synchronisés. <span className="gradient-text">Des résultats concrets.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
            Chaque module est connecté au Copilote. Une opportunité Radar alimente votre Pige, qui priorise vos appels, qui déclenche le bon script.
            L'agent décide, l'IA exécute le travail ingrat.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <div
              key={i}
              className="group relative rounded-2xl border border-border/70 bg-gradient-to-br from-surface-1 to-surface-2 p-6 hover:border-primary/40 transition-all duration-300 overflow-hidden"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" style={{ background: "radial-gradient(circle at 30% 0%, hsl(var(--primary) / 0.12), transparent 60%)" }} />
              <div className="relative flex items-start justify-between mb-6">
                <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/10 grid place-items-center group-hover:bg-primary/20 transition-colors">
                  <m.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">{m.tag}</span>
              </div>
              <h3 className="relative font-display text-lg font-semibold mb-2">{m.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              {m.badges && (
                <div className="relative mt-4 flex flex-wrap gap-1.5">
                  {m.badges.map((b) => (
                    <span key={b} className="text-[10px] px-2 py-0.5 rounded-md border border-primary/30 bg-primary/5 text-primary font-mono uppercase tracking-wider">
                      {b}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CADASTRAL VIEW with split copy */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> Radar de prospection</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
              Identifiez les opportunités cachées,<br />
              <span className="gradient-text">quartier par quartier.</span>
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              Le Radar croise DVF, INSEE, signaux marché et données ADEME pour scorer chaque zone et chaque parcelle.
              Vous identifiez les vendeurs probables avant qu'ils mettent leur bien en vente — et vous frappez en premier.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Score d'opportunité par parcelle (0-100)",
                "Profil vendeur probable + déclencheur estimé",
                "Plan d'attaque commercial personnalisé",
                "Suivi des zones en temps réel",
              ].map((p, i) => (
                <li key={i} className="flex items-center gap-3">
                  <div className="h-5 w-5 rounded-full border border-primary/40 bg-primary/10 grid place-items-center shrink-0">
                    <Check className="h-3 w-3 text-primary" />
                  </div>
                  <span>{p}</span>
                </li>
              ))}
            </ul>
            <Button onClick={goSignup} className="mt-8 rounded-xl">
              Tester le Radar <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
          <div className="rounded-3xl border border-border/70 bg-surface-1/70 backdrop-blur-sm p-6 relative overflow-hidden">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground text-mono uppercase tracking-widest">
                <MapPin className="h-3.5 w-3.5 text-primary" /> Radar · Lyon 6
              </div>
              <span className="chip border-success/30 text-success">12 opportunités</span>
            </div>
            <CadastralGrid />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> 3 étapes</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Opérationnel en <span className="gradient-text">3 minutes</span>.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">De l'inscription à votre première action recommandée par l'IA.</p>
        </div>
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="hidden md:block absolute top-12 left-[16%] right-[16%] h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          {steps.map((s) => (
            <div key={s.num} className="relative rounded-2xl border border-border/70 bg-surface-1 p-7 hover:border-primary/40 transition-colors">
              <div className="h-12 w-12 rounded-xl border border-primary/40 bg-background grid place-items-center mb-5 relative z-10">
                <span className="text-mono text-sm text-primary">{s.num}</span>
              </div>
              <h3 className="font-display text-xl font-semibold mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ADVANTAGES */}
      <section id="avantages" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> Pourquoi ImmoGenius AI</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Conçue pour votre <span className="gradient-text">succès quotidien</span>.
          </h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {advantages.map((a, i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-gradient-to-br from-surface-1 to-surface-2 p-7 hover:border-primary/40 transition-colors">
              <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/10 grid place-items-center mb-5">
                <a.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
              </div>
              <h3 className="font-display text-lg font-semibold mb-2">{a.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{a.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section id="temoignages" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> Témoignages</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-xl text-balance">
              Ils ont arrêté de subir leur métier.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}
            <span className="text-sm text-muted-foreground ml-2">4,9/5 · agents actifs</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="rounded-2xl border border-border/70 bg-gradient-to-br from-surface-1 to-surface-2 p-7 hover:border-primary/30 transition-colors">
              <Quote className="h-7 w-7 text-primary/40 mb-4" />
              <p className="text-foreground/95 leading-relaxed text-[15px]">{t.text}</p>
              <div className="mt-6 pt-5 border-t border-border/50 flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
                <div className="flex gap-0.5">
                  {[...Array(t.rating)].map((_, j) => <Star key={j} className="h-3.5 w-3.5 fill-accent text-accent" />)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-24">
        <div className="text-center mb-12">
          <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> FAQ</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">Vos questions, nos réponses.</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem
              key={i}
              value={`item-${i}`}
              className="bg-surface-1 border border-border/70 rounded-xl px-5 hover:border-primary/30 transition-colors data-[state=open]:border-primary/40"
            >
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-5">{f.q}</AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">{f.a}</AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* FINAL CTA */}
      <section className="max-w-5xl mx-auto px-6 py-24">
        <div className="relative rounded-[2rem] border border-primary/30 bg-gradient-to-br from-primary/10 via-surface-1 to-surface-2 p-12 lg:p-16 text-center overflow-hidden">
          <div className="absolute inset-0 opacity-40" style={{ background: "var(--gradient-radial-glow)" }} />
          <div className="relative">
            <div className="chip border-primary/40 text-primary mx-auto mb-6">
              <Zap className="h-3.5 w-3.5" /> Avantage tarifaire pour les beta testeurs
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] text-balance">
              Prêt à révolutionner<br />
              <span className="gradient-text">votre agence ?</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoignez les agents immobiliers qui transforment leur quotidien avec ImmoGenius AI.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={goSignup} className="text-base px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)]">
                Commencer mon essai gratuit <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
              <Button variant="outline" size="lg" className="text-base px-7 py-6 rounded-xl border-border/80" onClick={goLogin}>
                J'ai déjà un compte
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-border/70 bg-surface-1/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-10 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="h-7 w-7 rounded-lg border border-primary/40 grid place-items-center bg-primary/10">
              <Building2 className="h-3.5 w-3.5 text-primary" />
            </div>
            <span className="font-display font-semibold text-base">ImmoGenius<span className="text-primary"> AI</span></span>
            <span className="text-xs text-muted-foreground">· Le copilote des agents qui signent.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={() => navigate("/legal")} className="hover:text-foreground transition-colors">Légal & RGPD</button>
            <button onClick={() => navigate("/faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
