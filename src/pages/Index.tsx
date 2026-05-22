import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radar, TrendingUp, Bot, FileEdit, LayoutDashboard, Crosshair,
  ArrowRight, ShieldCheck, Sparkles, Star, Check, Zap, Target, Quote, ChevronRight, MapPin, Building2,
} from "lucide-react";
import { BlueprintBuilding } from "@/components/landing/BlueprintBuilding";
import { KpiTicker } from "@/components/landing/KpiTicker";
import { CadastralGrid } from "@/components/landing/CadastralGrid";

const modules = [
  { icon: Crosshair, title: "Chasseur de mandats", desc: "Pige IA temps réel : annonces particuliers détectées, scorées et qualifiées. Plan d'attaque commercial pour chaque opportunité.", tag: "Pige + Radar" },
  { icon: Radar, title: "Radar de prospection", desc: "Analyse DVF/INSEE par zone : score d'opportunité, profil vendeur probable, stratégie terrain personnalisée.", tag: "DVF · INSEE" },
  { icon: TrendingUp, title: "Valorisation patrimoniale", desc: "Estimation et expertise basées sur transactions vérifiées. Export PDF/Word client-ready en moins d'une minute.", tag: "DVF · ADEME" },
  { icon: FileEdit, title: "Studio IA", desc: "Mandats, annonces, scripts d'appel et posts marketing générés en 30 secondes, 100 % éditables avant envoi.", tag: "Mandats · Marketing" },
  { icon: Bot, title: "Copilote stratégique", desc: "Directeur commercial IA connecté à toutes vos données. Il priorise vos actions et défend vos prix en négociation.", tag: "Always on" },
  { icon: LayoutDashboard, title: "Dashboard 360°", desc: "KPIs en direct, opportunités du jour, recommandations d'actions priorisées. Vous savez quoi faire en 5 secondes.", tag: "Live data" },
];

const stats = [
  { value: "12h", label: "gagnées par semaine", sub: "estimations · mandats · pige" },
  { value: "+38%", label: "de mandats signés", sub: "sur les bêta-testeurs actifs" },
  { value: "< 60s", label: "pour un dossier d'expertise", sub: "vs 3 à 4h manuellement" },
  { value: "7", label: "modules synchronisés", sub: "une seule plateforme" },
];

const steps = [
  { num: "01", title: "Activez votre périmètre", desc: "Définissez vos zones de chasse en 2 minutes : villes, quartiers, typologie de biens. L'IA cartographie immédiatement le marché." },
  { num: "02", title: "Recevez vos opportunités", desc: "Pige IA et Radar scorent chaque annonce et chaque parcelle. Les vendeurs particuliers chauds remontent en haut, qualifiés." },
  { num: "03", title: "Exécutez avec votre copilote", desc: "Le Copilote propose mandat, script et timing optimal. Vous gardez la main sur chaque message, l'IA fait le brouillon." },
];

const testimonials = [
  { name: "Nicolas R.", role: "Agent indépendant · Lyon", text: "Le Radar m'a identifié 3 quartiers que je ne travaillais pas. J'y ai signé 2 mandats exclusifs en 6 semaines.", rating: 5 },
  { name: "Sofia M.", role: "Mandataire · Bordeaux", text: "Les estimations qu'on sortait en 4h sont prêtes en 15 minutes, dossier client ready. Je passe enfin tout mon temps en RDV.", rating: 5 },
  { name: "Karim B.", role: "Agent commercial · Paris", text: "Le Copilote est devenu mon réflexe avant chaque appel. Il connaît mes piges, mes prix, mes négos. Game changer.", rating: 5 },
  { name: "Élodie V.", role: "Agence indépendante · Annecy", text: "Le Studio IA m'a permis de doubler ma production de mandats sans embaucher. Les textes sont propres, à mon ton.", rating: 5 },
];

const faqs = [
  { q: "Combien de temps pour être opérationnel ?", a: "3 minutes. Vous créez votre compte, vous définissez vos zones de chasse pendant l'onboarding et vous lancez votre première analyse Radar immédiatement après." },
  { q: "Quelles données utilise l'IA ?", a: "Uniquement des données publiques vérifiées : DVF (transactions notariées), INSEE, ADEME, observatoires des loyers, sources Pige immobilière. Chaque chiffre est sourcé et daté dans vos rapports." },
  { q: "L'IA peut-elle agir sans validation ?", a: "Jamais. L'IA propose, vous décidez. Aucun mandat n'est signé, aucun message n'est envoyé sans votre validation explicite. Tout est éditable avant publication." },
  { q: "Mes données sont-elles sécurisées ?", a: "Oui. Hébergement européen, chiffrement bout-en-bout, isolation stricte par compte agent (RLS Postgres), conformité RGPD totale. Export ou suppression de vos données en 1 clic." },
  { q: "Pour agents indépendants ou agences ?", a: "Les deux. Chaque compte est isolé : un indépendant gère ses analyses, une agence peut équiper plusieurs collaborateurs (chaque agent garde son espace privé)." },
  { q: "Que se passe-t-il si je quitte la plateforme ?", a: "Vous exportez toutes vos données (analyses, mandats, estimations) en PDF ou JSON. Suppression définitive sous 30 jours conformément au RGPD." },
  { q: "Combien ça coûte ?", a: "79 € / mois après 11 jours d'essai gratuit. Pas d'engagement, pas de frais cachés. Avantage tarifaire à vie pour les bêta-testeurs de la première vague." },
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
            <span className="text-base font-display font-semibold tracking-tight">Estate<span className="text-primary">AI</span></span>
          </a>
          <div className="flex items-center gap-1 sm:gap-2">
            <a href="#modules" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Modules</a>
            <a href="#preuve" className="hidden md:inline px-3 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors rounded-lg">Preuve</a>
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
                  Essai gratuit <ArrowRight className="h-4 w-4 ml-1" />
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
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inset-0 rounded-full bg-primary animate-ping opacity-75" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-primary" />
              </span>
              Bêta privée · 100 places limitées
            </div>
            <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-semibold leading-[0.95] tracking-[-0.04em] text-balance">
              Le copilote IA<br />des agents qui<br />
              <span className="gradient-text">signent plus de mandats.</span>
            </h1>
            <p className="mt-8 text-lg text-muted-foreground leading-relaxed max-w-xl text-pretty">
              EstateAI détecte vos vendeurs particuliers, score chaque opportunité, génère vos mandats et vous dit
              <span className="text-foreground"> quelle action mener maintenant</span> pour signer cette semaine.
              Aucun CRM à remplir. Une plateforme pour conquérir, pas administrer.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-3">
              <Button
                size="lg"
                onClick={goSignup}
                className="text-base px-7 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.6)] hover:shadow-[0_15px_50px_-10px_hsl(var(--primary)/0.8)] transition-all"
              >
                Activer mon copilote <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button
                variant="outline"
                size="lg"
                className="text-base px-7 py-6 rounded-xl border-border/80 hover:border-primary/40 hover:bg-primary/5"
                onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}
              >
                Découvrir les modules
              </Button>
            </div>

            <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> 11 jours gratuits</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Sans CB</span>
              <span className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Données hébergées en UE</span>
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

      {/* STATS / proof bar */}
      <section id="preuve" className="max-w-7xl mx-auto px-6 py-20">
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
          <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> 6 modules · 1 plateforme</div>
          <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
            Conçu pour <span className="gradient-text">conquérir des mandats</span>, pas pour saisir des fiches.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl">
            Chaque module est connecté au Copilote. Une opportunité Radar alimente votre Pige, qui priorise vos appels, qui déclenche le bon script. L'agent décide, l'IA exécute le travail ingrat.
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
                <span className="text-mono text-[10px] uppercase tracking-widest text-muted-foreground">{m.tag}</span>
              </div>
              <h3 className="relative font-display text-lg font-semibold mb-2">{m.title}</h3>
              <p className="relative text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CADASTRAL VIEW with split copy */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> Radar de prospection</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight text-balance">
              Voyez le marché<br />
              <span className="gradient-text">parcelle par parcelle.</span>
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
              Tester le Radar gratuitement <ArrowRight className="h-4 w-4 ml-2" />
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
      <section className="max-w-7xl mx-auto px-6 py-24">
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

      {/* TESTIMONIALS */}
      <section id="temoignages" className="max-w-7xl mx-auto px-6 py-24">
        <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
          <div>
            <div className="eyebrow mb-4"><span className="h-px w-8 bg-primary/60" /> Voix des bêta-testeurs</div>
            <h2 className="font-display text-4xl md:text-5xl font-semibold tracking-tight max-w-xl text-balance">
              Ils ont arrêté de subir leur métier.
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-accent text-accent" />)}
            <span className="text-sm text-muted-foreground ml-2">4,9/5 · 38 bêta-testeurs actifs</span>
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

      {/* SECURITY */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="rounded-3xl border border-primary/20 bg-gradient-to-br from-surface-1 via-surface-2 to-surface-1 p-10 lg:p-14 relative overflow-hidden">
          <div className="absolute -top-32 -right-32 h-64 w-64 rounded-full bg-primary/20 blur-3xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center relative">
            <div>
              <div className="eyebrow mb-4"><ShieldCheck className="h-4 w-4 text-success" /> Sécurité & RGPD</div>
              <h2 className="font-display text-3xl md:text-4xl font-semibold tracking-tight mb-4 text-balance">
                Vos données sont à vous. Point.
              </h2>
              <p className="text-muted-foreground leading-relaxed text-lg">
                Hébergement européen, chiffrement bout-en-bout, isolation stricte par compte agent, conformité RGPD totale.
                Vous exportez ou supprimez vos données en 1 clic, à tout moment.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Hébergement européen (Supabase EU)",
                "Chiffrement bout-en-bout des données sensibles",
                "Isolation par agent (Row Level Security Postgres)",
                "Conformité RGPD vérifiée · DPO disponible",
                "Export & suppression de vos données en 1 clic",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-border/60 bg-surface-1/60 px-4 py-3">
                  <div className="h-6 w-6 rounded-full bg-success/15 grid place-items-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="text-sm">{item}</span>
                </div>
              ))}
            </div>
          </div>
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
              <Zap className="h-3.5 w-3.5" /> Plus que quelques places en bêta
            </div>
            <h2 className="font-display text-4xl md:text-6xl font-semibold tracking-[-0.04em] leading-[1.05] text-balance">
              Prenez 10 minutes aujourd'hui.<br />
              <span className="gradient-text">Gagnez 12 heures cette semaine.</span>
            </h2>
            <p className="mt-6 text-lg text-muted-foreground max-w-xl mx-auto">
              Rejoignez les agents qui pilotent enfin leur conquête de mandats avec une intelligence réelle.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" onClick={goSignup} className="text-base px-8 py-6 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 shadow-[0_10px_40px_-10px_hsl(var(--primary)/0.7)]">
                Démarrer mon essai gratuit <ChevronRight className="h-5 w-5 ml-1" />
              </Button>
              <Button variant="outline" size="lg" className="text-base px-7 py-6 rounded-xl border-border/80" onClick={goLogin}>
                J'ai déjà un compte
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-6">11 jours gratuits · Sans CB · Avantage tarifaire à vie pour les bêta-testeurs</p>
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
            <span className="font-display font-semibold text-base">Estate<span className="text-primary">AI</span></span>
            <span className="text-xs text-muted-foreground">· Le copilote des agents qui signent.</span>
          </div>
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <button onClick={() => navigate("/mentions-legales")} className="hover:text-foreground transition-colors">Mentions légales</button>
            <button onClick={() => navigate("/politique-confidentialite")} className="hover:text-foreground transition-colors">Confidentialité</button>
            <button onClick={() => navigate("/cgu")} className="hover:text-foreground transition-colors">CGU</button>
            <button onClick={() => navigate("/faq")} className="hover:text-foreground transition-colors">FAQ</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
