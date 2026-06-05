import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radar as RadarIcon, TrendingUp, FileEdit,
  ArrowRight, Sparkles, Check, ChevronRight, MapPin, Building2,
  ShieldCheck, Flame, Database, Clock,
} from "lucide-react";
import { BlueprintBuilding } from "@/components/landing/BlueprintBuilding";
import { CadastralGrid } from "@/components/landing/CadastralGrid";
import { PricingSection } from "@/components/landing/PricingSection";

const modules = [
  {
    icon: RadarIcon,
    title: "Radar de prospection",
    desc: "Analysez n'importe quel secteur à partir des vraies transactions DVF et des diagnostics DPE officiels. Visualisez le marché sur une carte interactive, repérez les biens classés F ou G dont les propriétaires devront bientôt vendre, et suivez l'évolution de votre territoire à chaque visite. Générez un courrier de prospection personnalisé basé sur les vraies ventes du quartier.",
    sources: "DVF Etalab · DPE ADEME · BAN",
  },
  {
    icon: TrendingUp,
    title: "Estimation & Rendement",
    desc: "Deux analyses en une. L'Estimation vendeur calcule une fourchette de prix précise ancrée sur les transactions réelles comparables de la zone, avec un rapport professionnel téléchargeable. L'analyse Rendement permet d'accompagner vos clients investisseurs : cash-flow, TRI sur 10 ans, simulation de rénovation énergétique, comparaison des régimes fiscaux.",
    sources: "DVF Etalab · INSEE · Observatoire des loyers",
  },
  {
    icon: FileEdit,
    title: "Studio IA",
    desc: "Générez vos annonces immobilières et vos mandats en quelques secondes. Importez directement les données de votre estimation pour pré-remplir l'annonce — aucune ressaisie. Vos contenus sont rédigés au ton que vous choisissez et restent 100 % éditables avant publication.",
    sources: "Annonces · Mandats de vente",
  },
];

const steps = [
  { num: "01", title: "Choisissez votre secteur", desc: "Entrez une adresse ou une zone. ImmoGenius AI interroge en direct les bases de données publiques officielles et cartographie le marché local." },
  { num: "02", title: "Découvrez les opportunités", desc: "Transactions récentes, prix réels au m², biens à DPE dégradé, tension du marché. Tout est sourcé, daté et vérifiable." },
  { num: "03", title: "Passez à l'action", desc: "Générez un courrier de prospection, une estimation professionnelle ou une annonce — directement depuis les données analysées." },
];

const advantages = [
  {
    icon: Database,
    title: "Données 100 % officielles",
    desc: "Aucune donnée inventée, aucune hallucination. Chaque chiffre provient d'une source publique vérifiable : DVF (transactions notariées), DPE (ADEME), INSEE, BAN. Sourcé et daté dans chaque rapport.",
  },
  {
    icon: Flame,
    title: "Le signal DPE que personne n'exploite",
    desc: "Les propriétaires de biens classés F ou G font face à une pression réglementaire croissante. ImmoGenius AI les détecte sur votre secteur — des vendeurs motivés que vos concurrents ne voient pas.",
  },
  {
    icon: Clock,
    title: "Du temps gagné, des mandats signés",
    desc: "Une estimation professionnelle en quelques minutes au lieu de plusieurs heures. Arrivez à vos rendez-vous vendeurs préparé, crédible, avec des données que le propriétaire ne peut pas contester.",
  },
];

const faqs = [
  { q: "Qu'est-ce qu'ImmoGenius AI ?", a: "Une plateforme d'aide à la prospection pour les professionnels de l'immobilier. Elle exploite les données immobilières publiques officielles (DVF, DPE, INSEE) pour révéler les opportunités de mandats, produire des estimations sourcées et analyser la rentabilité des biens. Trois modules : Radar de prospection, Estimation & Rendement, Studio IA." },
  { q: "D'où viennent les données ?", a: "Exclusivement de sources publiques officielles et vérifiables : DVF Etalab (transactions notariées), base DPE de l'ADEME, INSEE, BAN (Base Adresse Nationale). Chaque chiffre est sourcé et daté. Aucune donnée inventée." },
  { q: "À quelle fréquence les données sont-elles mises à jour ?", a: "ImmoGenius AI interroge les bases officielles en direct à chaque analyse. Les données DPE de l'ADEME sont actualisées mensuellement à la source, et les transactions DVF tous les six mois environ. Nous affichons toujours la date de la dernière donnée disponible pour une transparence totale." },
  { q: "Comment fonctionne le système de crédits ?", a: "Chaque génération IA (estimation, analyse de rendement, courrier de prospection, annonce) consomme un crédit. Votre quota mensuel est renouvelé automatiquement le 1er de chaque mois. La consultation du Radar et la lecture des données ne consomment pas de crédit." },
  { q: "ImmoGenius AI remplace-t-il mon CRM ?", a: "Non. C'est un outil de prospection et d'analyse, complémentaire à votre CRM. Il vous aide à trouver et qualifier des opportunités, pas à gérer votre base de contacts." },
  { q: "Les documents générés sont-ils conformes ?", a: "Les annonces et mandats sont conçus pour respecter les bonnes pratiques du secteur et restent 100 % éditables avant toute utilisation. Nous recommandons une vérification par vos soins ou votre service juridique avant signature de tout document contractuel." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui. Hébergement européen, isolation stricte par compte (RLS Postgres), conformité RGPD. Vous pouvez exporter ou supprimer vos données à tout moment depuis votre espace." },
  { q: "Puis-je résilier facilement ?", a: "Oui, sans engagement. Vous gérez votre abonnement et résiliez en un clic depuis vos paramètres." },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const goSignup = () => navigate("/signup");
  const goFounder = () => navigate("/signup?plan=founder");
  const goLogin = () => navigate("/login");

  return (
    <div className="min-h-screen relative overflow-x-hidden bg-background text-foreground">
      <div className="scene-grid" />
      <div className="scene-mesh" />

      {/* Navbar */}
      <nav className="sticky top-0 z-50 border-b border-border/60 bg-background/95">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2.5 group">
            <div className="relative h-8 w-8 rounded-lg border border-primary/40 grid place-items-center bg-primary/10 overflow-hidden">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-base font-display font-semibold tracking-tight">ImmoGenius<span className="text-primary"> AI</span></span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#modules" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Modules</a>
            <a href="#etapes" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Comment ça marche</a>
            <a href="#avantages" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Pourquoi</a>
            <a href="#tarifs" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Tarifs</a>
            <a href="#faq" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">FAQ</a>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm" className="ml-2">
                Mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goLogin}>Connexion</Button>
                <Button size="sm" onClick={goSignup} className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_0_20px_hsl(var(--primary)/0.35)]">
                  Essayer gratuitement <ArrowRight className="h-4 w-4 ml-1" />
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
              Données publiques officielles · DVF · DPE · INSEE
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.95] tracking-[-0.04em] text-balance">
              Trouvez vos prochains mandats <span className="gradient-text">avant vos concurrents</span>.
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-xl text-pretty">
              ImmoGenius AI analyse les données immobilières publiques officielles — <span className="text-foreground">DVF, DPE, INSEE</span> — pour révéler les opportunités de mandats sur votre secteur. Estimations sourcées, signaux vendeurs, analyses de rentabilité. La donnée réelle au service de votre prospection.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={goSignup}
                className="text-base px-7 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)]"
              >
                Essayer gratuitement <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-7 py-6 rounded-xl border-border/80 hover:border-primary/40 hover:bg-primary/5"
                onClick={() => document.getElementById("etapes")?.scrollIntoView({ behavior: "smooth" })}
              >
                Voir comment ça marche
              </Button>
            </div>

            <div className="mt-8 flex items-center gap-x-5 gap-y-2 text-xs text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5 text-success" /> Données 100 % officielles et vérifiables</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Hébergement UE · RGPD</span>
            </div>

            <div className="mt-6 text-[11px] text-muted-foreground text-mono uppercase tracking-wider">
              DVF Etalab · DPE ADEME · INSEE · BAN data.gouv.fr
            </div>
          </div>

          <div className="relative h-[480px] lg:h-[560px] animate-fade-in-up">
            <BlueprintBuilding className="w-full h-full" />
          </div>
        </div>
      </section>

      {/* PROBLEM */}
      <section className="max-w-5xl mx-auto px-6 pt-16 pb-8 text-center">
        <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> Le constat</div>
        <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight text-balance">
          Chaque mandat raté, c'est une commission <span className="gradient-text">partie chez le concurrent</span>.
        </h2>
        <p className="mt-5 text-muted-foreground text-lg leading-relaxed max-w-3xl mx-auto">
          Vous prospectez à l'aveugle. Vous ne savez pas quels propriétaires s'apprêtent à vendre, ni à quel prix le marché part réellement dans votre rue. Pendant ce temps, les biens se vendent — sans vous. ImmoGenius AI transforme les données publiques que personne n'exploite en signaux concrets pour votre prospection.
        </p>
      </section>

      {/* MODULES */}
      <section id="modules" className="max-w-7xl mx-auto px-6 py-24">
        <div className="max-w-3xl mb-14">
          <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> 3 modules · 1 plateforme</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Trois modules connectés. <span className="gradient-text">Une seule donnée.</span>
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
            Du repérage du vendeur à la signature de l'annonce, vos modules partagent la même donnée officielle. Pas de ressaisie, pas de doute, pas d'hallucination.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {modules.map((m, i) => (
            <div key={i} className="group relative rounded-2xl border border-border/70 bg-gradient-to-br from-surface-1 to-surface-2 p-6 hover:border-primary/40 transition-all duration-300 overflow-hidden">
              <div className="relative flex items-start justify-between mb-6">
                <div className="h-11 w-11 rounded-xl border border-primary/30 bg-primary/10 grid place-items-center">
                  <m.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground text-right">0{i + 1}</span>
              </div>
              <h3 className="relative font-display text-lg font-semibold mb-2">{m.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              <p className="relative mt-4 text-[10px] uppercase tracking-wider text-primary/80 font-mono">
                Sources : {m.sources}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* RADAR SPLIT */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> Le signal DPE</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
              Détectez les <span className="gradient-text">passoires thermiques</span> que personne ne voit.
            </h2>
            <p className="mt-5 text-muted-foreground text-lg leading-relaxed">
              ImmoGenius AI surveille la base DPE de l'ADEME sur votre secteur et fait remonter les biens classés F ou G — particulièrement ceux dont le diagnostic vient d'être réalisé. Ce sont les signaux vendeurs les plus chauds, croisés avec les transactions DVF pour estimer la valeur potentielle de chaque bien.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Liste des biens F/G sur la zone (adresse, surface, date du diagnostic)",
                "Détection des nouveaux DPE dégradés depuis votre dernière visite",
                "Estimation de valeur via les prix DVF du quartier",
                "Génération de courrier de prospection ciblé en un clic",
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
                <MapPin className="h-3.5 w-3.5 text-primary" /> Radar · Aperçu zone
              </div>
              <span className="chip border-destructive/30 text-destructive"><Flame className="h-3 w-3" /> Signaux DPE</span>
            </div>
            <CadastralGrid />
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="etapes" className="max-w-7xl mx-auto px-6 py-20">
        <div className="text-center max-w-2xl mx-auto mb-14">
          <div className="eyebrow justify-center mb-4"><span className="h-px w-8 bg-primary/60" /> Comment ça marche</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            De l'adresse à l'action en <span className="gradient-text">3 étapes</span>.
          </h2>
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
            La donnée publique, <span className="gradient-text">enfin exploitable</span>.
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

      {/* PRICING */}
      <PricingSection />

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
            <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] text-balance">
              Vos concurrents prospectent à l'aveugle.<br />
              <span className="gradient-text">Pas vous.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoignez les premiers agents qui transforment la donnée publique en mandats signés.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={goFounder} className="text-base px-8 py-6 rounded-xl bg-accent text-accent-foreground hover:bg-accent/90 shadow-[0_10px_40px_-10px_hsl(var(--accent)/0.7)]">
                Commencer — 29,99 €/mois à vie <ChevronRight className="h-5 w-5 ml-1" />
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
            <span className="text-xs text-muted-foreground">· La donnée publique au service de votre prospection.</span>
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
