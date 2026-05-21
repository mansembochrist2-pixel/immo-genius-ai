import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Radar, TrendingUp, Bot, FileEdit, LayoutDashboard, Crosshair,
  ArrowRight, Lock, ShieldCheck, Sparkles, Star, Check, Zap, Clock, Target, Brain,
  ChevronRight, Quote,
} from "lucide-react";
import dashboardMockup from "@/assets/dashboard-preview.jpeg";
import heroBuilding3d from "@/assets/landing-hero-3d.jpg";

const modules = [
  { icon: LayoutDashboard, title: "Dashboard IA", desc: "Vue 360° de votre activité de conquête : KPIs, opportunités du jour et actions priorisées par l'IA." },
  { icon: Crosshair, title: "Chasseur de mandats", desc: "Radar de prospection + Pige IA : détection des vendeurs particuliers et zones porteuses avec plan d'attaque commercial." },
  { icon: TrendingUp, title: "Valorisation IA", desc: "Estimation et expertise patrimoniale : dossiers basés sur DVF, INSEE, ADEME. Export PDF et Word professionnels." },
  { icon: FileEdit, title: "Studio IA", desc: "Mandats, annonces, marketing et audit réseaux sociaux générés en 30 secondes, 100% modifiables." },
  { icon: Radar, title: "Radar prospection", desc: "Analyse de zone DVF avec score d'opportunité, profils vendeurs probables et stratégie d'approche." },
  { icon: Bot, title: "Copilote stratégique", desc: "Votre directeur commercial IA : il connaît vos analyses, vos pige et vous suggère la meilleure action, 24/7." },
];

const benefits = [
  { icon: Clock, title: "Gagnez 12h par semaine", desc: "Estimations, mandats, audits : ce qui prenait des heures se fait en minutes." },
  { icon: Target, title: "+38% de mandats signés", desc: "L'IA priorise les bonnes zones et propose la bonne approche au bon moment." },
  { icon: Brain, title: "Aucune opportunité manquée", desc: "Chaque zone scorée, chaque vendeur potentiel détecté, chaque action recommandée." },
];

const steps = [
  { num: "01", title: "Créez votre compte", desc: "Onboarding guidé en 2 minutes : profil agent, secteur, zones de chasse." },
  { num: "02", title: "L'IA cartographie votre marché", desc: "Lancez votre première analyse Radar : zones porteuses, prix, signaux vendeurs." },
  { num: "03", title: "Vous exécutez, l'IA optimise", desc: "Chaque jour, votre copilote vous propose les actions à plus fort impact business." },
];

const testimonials = [
  { name: "Nicolas R.", role: "Agent immobilier indépendant", text: "Le Radar m'a fait identifier 3 quartiers que je ne travaillais pas. J'ai signé 2 mandats en 6 semaines." },
  { name: "Sofia M.", role: "Agente commerciale en immobilier", text: "Les estimations qu'on sortait en 4h sont prêtes en 15 minutes. Je passe enfin du temps en RDV." },
  { name: "Karim B.", role: "Mandataire immobilier", text: "Le copilote est devenu mon réflexe stratégique. Je ne lance plus une action sans lui demander son avis." },
];

const faqs = [
  { q: "Combien de temps pour être opérationnel ?", a: "3 minutes. Vous créez votre compte, vous complétez l'onboarding et vous lancez votre première analyse Radar dans la foulée." },
  { q: "L'IA peut-elle agir à ma place sans validation ?", a: "Jamais. L'IA propose, vous décidez. Toute action (mandat, annonce, contact) est éditable et requiert votre validation explicite." },
  { q: "Quels modules sont inclus dans la bêta ?", a: "Tout : Dashboard, Chasseur de mandats (Radar + Pige), Valorisation IA (Estimation + Expertise), Studio IA et Copilote stratégique. Vous avez accès à la plateforme complète." },
  { q: "Puis-je modifier les contenus générés par l'IA ?", a: "Absolument. Mandats, annonces, dossiers d'estimation, rapports d'expertise : tout est éditable. L'IA est une assistante, vous restez maître de votre business." },
  { q: "Quelles données utilise l'IA pour les estimations ?", a: "L'IA s'appuie sur les données réelles du marché immobilier local : DVF (transactions vérifiées), INSEE, ADEME, observatoires des loyers. Toutes les sources sont affichées dans chaque rapport pour transparence totale." },
  { q: "L'outil fonctionne-t-il pour les agents indépendants comme pour les agences ?", a: "Oui. Chaque compte est isolé : un agent indépendant gère ses analyses, une agence peut équiper plusieurs collaborateurs (chaque agent a son espace privé)." },
  { q: "Que se passe-t-il si je quitte la plateforme ?", a: "Vous exportez toutes vos données (analyses, mandats, estimations, rapports) en JSON ou PDF. Vos données sont supprimées sous 30 jours conformément au RGPD." },
  { q: "Comment l'IA priorise-t-elle mes actions ?", a: "Elle croise plusieurs signaux : score d'opportunité Radar, signaux vendeurs détectés en Pige, fraîcheur des données et potentiel de mandat. Chaque action est expliquée et ajustable." },
  { q: "Combien coûte la plateforme après la bêta ?", a: "Le tarif sera communiqué aux bêta-testeurs en priorité, avec un avantage tarifaire à vie pour ceux qui rejoignent la première vague." },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goSignup = () => navigate("/signup");
  const goLogin = () => navigate("/login");

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-primary/10 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
        <div className="absolute top-[40%] right-[-10%] w-[600px] h-[600px] rounded-full bg-info/10 blur-[140px] animate-pulse" style={{ animationDuration: "11s" }} />
        <div className="absolute bottom-[-10%] left-[30%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] animate-pulse" style={{ animationDuration: "13s" }} />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold font-display gradient-text">Estate AI</span>
          <div className="flex items-center gap-2 sm:gap-3">
            <a href="#modules" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">Modules</a>
            <a href="#temoignages" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">Témoignages</a>
            <a href="#faq" className="hidden md:inline text-sm text-muted-foreground hover:text-foreground transition-colors">FAQ</a>
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={goLogin}>Connexion</Button>
                <Button
                  size="sm"
                  onClick={goSignup}
                  className="bg-primary text-primary-foreground hover:bg-primary/90 shadow-md hover:shadow-lg transition-all"
                >
                  Rejoindre la Bêta <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero — split layout with 3D building */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-20 relative">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Left: copy */}
          <div className="text-center lg:text-left animate-fade-in">
            <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
              <Sparkles className="h-4 w-4" /> Bêta Privée — 100 places limitées
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-[1.05] tracking-tight mb-6">
              L'assistant IA des agents immobiliers qui{" "}
              <span className="gradient-text">signent plus</span>.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-xl lg:max-w-none mx-auto">
              Estate IA analyse vos emails, score vos prospects, rédige vos mandats et vous dit chaque matin quelles actions feront décoller votre CA. Conçu pour vendre, pas administrer.
            </p>
            <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-4 mb-4">
              <Button
                size="lg"
                onClick={goSignup}
                className="text-base px-8 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
              >
                Rejoindre la Bêta gratuite <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
              <Button variant="outline" size="lg" className="text-base px-8 py-6 hover:scale-105 transition-transform" onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}>
                Voir les 8 modules
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">Sans CB · Configuration en 3 minutes · Annulable à tout moment</p>
          </div>

          {/* Right: 3D building */}
          <div className="relative animate-fade-in">
            <div className="absolute -inset-6 bg-gradient-to-br from-primary/15 via-accent/10 to-info/15 rounded-[2.5rem] blur-3xl opacity-70 animate-pulse" style={{ animationDuration: "7s" }} />
            <div className="relative rounded-3xl overflow-hidden ring-1 ring-border/60 shadow-2xl bg-gradient-to-br from-card to-secondary/30">
              <img
                src={heroBuilding3d}
                alt="Illustration 3D d'un immeuble haussmannien premium entouré de cartes IA flottantes Estate AI"
                width={1920}
                height={1280}
                className="w-full h-auto block"
              />
            </div>
            {/* Floating accent badges */}
            <div className="hidden md:flex absolute -bottom-4 -left-4 items-center gap-2 bg-card border border-border shadow-lg rounded-xl px-4 py-2.5 animate-fade-in">
              <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
              <span className="text-xs font-medium">IA active · 8 modules synchronisés</span>
            </div>
            <div className="hidden md:flex absolute -top-4 -right-4 items-center gap-2 bg-card border border-accent/30 shadow-lg rounded-xl px-4 py-2.5">
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span className="text-xs font-medium">+38% mandats signés</span>
            </div>
          </div>
        </div>

        {/* Dashboard preview below */}
        <div className="relative max-w-5xl mx-auto mt-20 animate-fade-in">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/15 via-info/15 to-primary/15 rounded-3xl blur-2xl opacity-60 animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border ring-1 ring-black/5">
            <img src={dashboardMockup} alt="Aperçu du dashboard Estate AI montrant KPIs, prospects chauds et actions du jour" width={1920} height={1080} className="w-full" loading="lazy" />
          </div>
        </div>
      </section>

      {/* Trust band */}
      <section className="max-w-5xl mx-auto px-6 pb-12">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-card/70 backdrop-blur-sm border border-border/60 rounded-2xl px-6 py-5 text-center md:text-left">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-5 w-5 text-success" />
            <span className="font-medium">Connexion Google sécurisée (OAuth officiel)</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-medium">100% conforme RGPD · Données chiffrées</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-5 w-5 text-success" />
            <span className="font-medium">Aucun stockage email</span>
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                  <b.icon className="h-6 w-6 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold font-display text-lg mb-2">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Modules — 9 cards */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">8 modules synchronisés</Badge>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">
            Une plateforme complète. Zéro tâche manuelle inutile.
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Chaque module communique avec les autres : un email entrant met à jour le CRM, qui alimente le copilote, qui priorise vos actions du jour.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((m, i) => (
            <Card key={i} className="group bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/40 hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 group-hover:scale-110 transition-all">
                  <m.icon className="h-5 w-5 text-primary" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold font-display text-base">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Opérationnel en 3 minutes</h2>
          <p className="text-muted-foreground">De la connexion à la première action recommandée.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative">
          {steps.map((s, i) => (
            <div key={i} className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/30 hover:shadow-lg transition-all">
              <div className="text-5xl font-bold font-display gradient-text mb-3">{s.num}</div>
              <h3 className="font-semibold font-display text-lg mb-2">{s.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonials */}
      <section id="temoignages" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-1 mb-3">
            {[...Array(5)].map((_, i) => <Star key={i} className="h-5 w-5 fill-primary text-primary" />)}
          </div>
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Ce qu'en disent les premiers bêta-testeurs</h2>
          <p className="text-muted-foreground">Retours d'agents qui utilisent Estate IA au quotidien.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <Card key={i} className="bg-card/80 backdrop-blur-sm border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/30 mb-3" />
                <p className="text-sm leading-relaxed mb-5">{t.text}</p>
                <div className="border-t border-border pt-4">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Security band */}
      <section className="max-w-6xl mx-auto px-6 py-16">
        <Card className="bg-gradient-to-br from-primary/5 to-info/5 border-primary/20 backdrop-blur-sm">
          <CardContent className="p-8 md:p-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <Badge className="mb-4 bg-primary/10 text-primary border-primary/20">Sécurité &amp; Confidentialité</Badge>
              <h2 className="text-2xl md:text-3xl font-bold font-display mb-3">Vos données ne quittent jamais votre contrôle.</h2>
              <p className="text-muted-foreground leading-relaxed">
                OAuth officiel Google, chiffrement bout-en-bout, isolation stricte de chaque compte agent, conformité RGPD totale, hébergement européen. Vous pouvez exporter ou supprimer vos données à tout moment.
              </p>
            </div>
            <div className="space-y-3">
              {[
                "Connexion Google OAuth officielle",
                "Aucun email stocké sur nos serveurs",
                "Données isolées par agent (RLS)",
                "Conformité RGPD vérifiée",
                "Export &amp; suppression en 1 clic",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="h-6 w-6 rounded-full bg-success/15 flex items-center justify-center shrink-0">
                    <Check className="h-3.5 w-3.5 text-success" />
                  </div>
                  <span className="text-sm" dangerouslySetInnerHTML={{ __html: item }} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold font-display mb-3">Questions fréquentes</h2>
          <p className="text-muted-foreground">Tout ce que vous devez savoir avant de rejoindre la bêta.</p>
        </div>
        <Accordion type="single" collapsible className="space-y-3">
          {faqs.map((f, i) => (
            <AccordionItem key={i} value={`item-${i}`} className="bg-card/80 backdrop-blur-sm border border-border/50 rounded-xl px-5 hover:border-primary/30 transition-colors">
              <AccordionTrigger className="text-left text-sm font-medium hover:no-underline py-4">
                {f.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {f.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Zap className="h-4 w-4" /> Plus que quelques places
        </div>
        <h2 className="text-3xl md:text-5xl font-bold font-display mb-5 leading-tight">
          Prenez 10 minutes aujourd'hui.<br />Gagnez 12 heures cette semaine.
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Rejoignez les agents qui ont arrêté de subir leur boîte mail et qui pilotent enfin leur business avec une vraie intelligence.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Button
            size="lg"
            onClick={goSignup}
            className="text-base px-10 py-6 bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-300"
          >
            Rejoindre la Bêta <ChevronRight className="h-5 w-5 ml-1" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 py-6" onClick={goLogin}>
            J'ai déjà un compte
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-6">Avantage tarifaire à vie pour les bêta-testeurs</p>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left">
            <span className="font-display font-bold gradient-text text-lg">Estate AI</span>
            <p className="text-xs text-muted-foreground mt-1">L'assistant IA des agents immobiliers performants.</p>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <button onClick={() => navigate("/mentions-legales")} className="hover:text-foreground transition-colors">Mentions légales</button>
            <button onClick={() => navigate("/politique-confidentialite")} className="hover:text-foreground transition-colors">Confidentialité</button>
            <button onClick={() => navigate("/cgu")} className="hover:text-foreground transition-colors">CGU</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
