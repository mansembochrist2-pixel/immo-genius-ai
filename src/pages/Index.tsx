import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail, Radar, TrendingUp, Bot, Users, FileEdit, CalendarDays, LayoutDashboard,
  ArrowRight, Lock, ShieldCheck, Sparkles, Star, Check, Zap, Clock, Target, Brain,
  ChevronRight, Quote,
} from "lucide-react";
import dashboardMockup from "@/assets/dashboard-preview.jpeg";

const modules = [
  { icon: LayoutDashboard, title: "Dashboard IA", desc: "Une vue 360° de votre activité : KPIs, objectif CA, prospects chauds et actions du jour priorisées par l'IA." },
  { icon: Mail, title: "Inbox intelligente", desc: "Vos emails analysés en temps réel : intention détectée, urgence évaluée, réponses pré-rédigées validées en 1 clic." },
  { icon: CalendarDays, title: "Agenda IA", desc: "Calendrier connecté avec brief automatique avant chaque RDV : historique client, points clés, objections probables." },
  { icon: Users, title: "Mémoire client", desc: "Vos clients scorés par l'IA : motivation, freins, taux de signature et prochaine action recommandée." },
  { icon: FileEdit, title: "Documents IA", desc: "Mandats, annonces et marketing générés en 30 secondes, 100% modifiables, ton ajustable (premium, familial, urbain…)." },
  { icon: TrendingUp, title: "Estimation IA", desc: "Dossiers d'estimation précis basés sur DVF, INSEE et données locales. Export PDF professionnel pour vos prospects." },
  { icon: Radar, title: "Radar prospection", desc: "Détection des vendeurs potentiels sur votre secteur, avec plan d'attaque commercial personnalisé." },
  { icon: Bot, title: "Copilote stratégique", desc: "Votre directeur commercial IA : il connaît tous vos dossiers et vous suggère la meilleure action, 24/7." },
];

const benefits = [
  { icon: Clock, title: "Gagnez 12h par semaine", desc: "Réponses, estimations, mandats : ce qui prenait des heures se fait en minutes." },
  { icon: Target, title: "+38% de mandats signés", desc: "L'IA priorise les bons leads et propose la bonne approche au bon moment." },
  { icon: Brain, title: "Aucun lead oublié", desc: "Chaque email analysé, chaque prospect scoré, chaque relance suggérée automatiquement." },
];

const steps = [
  { num: "01", title: "Connectez Google", desc: "Sécurisé, OAuth officiel. Vos emails restent chez vous, l'IA les analyse à la volée." },
  { num: "02", title: "L'IA cartographie votre activité", desc: "En moins de 3 minutes, elle identifie vos prospects chauds, opportunités et urgences." },
  { num: "03", title: "Vous exécutez, l'IA optimise", desc: "Chaque jour, votre copilote vous propose les actions à plus fort impact business." },
];

const testimonials = [
  { name: "Nicolas R.", role: "Agent indépendant — Lyon", text: "Je traite ma boîte mail en 20 minutes le matin au lieu de 2 heures. Et je n'oublie plus une seule relance." },
  { name: "Sophia M.", role: "Directrice d'agence — Bordeaux", text: "Les estimations qu'on sortait en 4h sont prêtes en 15 minutes. Mes agents passent enfin du temps en RDV." },
  { name: "Karim B.", role: "Mandataire — Paris", text: "Le copilote m'a fait signer 2 mandats supplémentaires le mois dernier juste en me disant qui relancer en priorité." },
];

const faqs = [
  { q: "Mes emails sont-ils stockés sur vos serveurs ?", a: "Non. La connexion Google se fait via OAuth officiel : nous lisons vos emails à la volée pour les analyser, mais nous ne les stockons jamais. Vous pouvez révoquer l'accès en 1 clic depuis votre compte Google." },
  { q: "Combien de temps pour être opérationnel ?", a: "3 minutes. Vous créez votre compte, vous connectez Google, l'IA analyse vos 50 derniers échanges et vous présente votre dashboard prêt à l'emploi." },
  { q: "L'IA peut-elle envoyer des emails à ma place sans validation ?", a: "Jamais. L'IA propose, vous décidez. Toute réponse, tout mandat, toute action est éditable et requiert votre validation explicite avant envoi." },
  { q: "Quels modules sont inclus dans la bêta ?", a: "Tout : Dashboard, Inbox IA, Agenda, Mémoire client, Documents IA, Estimation IA, Radar prospection et Copilote stratégique. Vous avez accès à la plateforme complète." },
  { q: "Puis-je modifier les contenus générés par l'IA ?", a: "Absolument. Mandats, annonces, réponses email, dossiers d'estimation : tout est éditable. L'IA est une assistante, vous restez maître de votre business." },
  { q: "Quelles données utilise l'IA pour les estimations ?", a: "Données officielles DVF (transactions immobilières publiques), INSEE (démographie, revenus), données de marché locales et historique de votre zone. Sources affichées dans chaque rapport." },
  { q: "L'outil fonctionne-t-il pour les agents indépendants comme pour les agences ?", a: "Oui. Chaque compte est isolé : un agent indépendant gère ses prospects, une agence peut équiper plusieurs collaborateurs (chaque agent a son espace privé)." },
  { q: "Outlook sera-t-il supporté ?", a: "Oui, le connecteur Outlook arrive très prochainement. La bêta démarre avec Google, Outlook suivra dans les semaines à venir." },
  { q: "Que se passe-t-il si je quitte la plateforme ?", a: "Vous exportez toutes vos données (clients, mandats, estimations) en JSON ou PDF. Vos données sont supprimées sous 30 jours conformément au RGPD." },
  { q: "Est-ce que ça remplace mon CRM actuel ?", a: "Pour la majorité de nos utilisateurs, oui. Estate IA combine CRM + boîte mail intelligente + générateur de documents + copilote stratégique. Mais l'outil cohabite très bien avec un CRM existant." },
  { q: "Comment l'IA priorise-t-elle mes actions ?", a: "Elle croise plusieurs signaux : urgence du message, score du prospect, taux de signature estimé, valeur potentielle du mandat et délai depuis le dernier contact. Chaque action est expliquée et ajustable." },
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

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center relative">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6 animate-fade-in">
          <Sparkles className="h-4 w-4" /> Bêta Privée — 100 places limitées
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-[1.05] tracking-tight mb-6 max-w-4xl mx-auto animate-fade-in">
          Votre assistant IA qui transforme chaque email en{" "}
          <span className="gradient-text">mandat signé</span>.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed animate-fade-in">
          Estate IA analyse vos emails, score vos prospects, rédige vos mandats et vous dit chaque matin quelles actions feront décoller votre chiffre d'affaires. Conçu pour les agents qui veulent vendre, pas administrer.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 animate-fade-in">
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
        <p className="text-xs text-muted-foreground mb-12">Sans CB · Configuration en 3 minutes · Annulable à tout moment</p>

        {/* Hero visual */}
        <div className="relative max-w-5xl mx-auto animate-fade-in">
          <div className="absolute -inset-4 bg-gradient-to-r from-primary/20 via-info/20 to-primary/20 rounded-3xl blur-2xl opacity-60 animate-pulse" style={{ animationDuration: "6s" }} />
          <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-border ring-1 ring-black/5">
            <img src={dashboardMockup} alt="Aperçu du dashboard Estate AI montrant KPIs, prospects chauds et actions du jour" width={1920} height={1080} className="w-full" />
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
