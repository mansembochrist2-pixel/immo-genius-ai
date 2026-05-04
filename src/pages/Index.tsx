import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  Mail, Radar, TrendingUp, MessageSquare,
  ArrowRight, Lock, ShieldCheck, ChevronRight, Sparkles,
} from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import realEstateBg from "@/assets/real-estate-bg.jpg";

const modules = [
  { icon: Mail, title: "Inbox IA", desc: "Réponses automatiques et détection d'opportunités dans vos emails." },
  { icon: Radar, title: "Radar Prospection", desc: "Détection de vendeurs potentiels sur votre secteur." },
  { icon: TrendingUp, title: "Estimation IA", desc: "Dossiers d'estimation ultra-précis générés en 5 minutes." },
  { icon: MessageSquare, title: "Copilote Stratégique", desc: "Votre assistant business disponible 24/7." },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  const goSignup = () => navigate("/signup");

  return (
    <div className="min-h-screen bg-background relative">
      {/* Background */}
      <div className="fixed inset-0 -z-10">
        <img src={realEstateBg} alt="" className="w-full h-full object-cover blur-[8px] opacity-[0.07]" />
        <div className="absolute inset-0 bg-gradient-to-b from-background/92 to-background/96" />
      </div>

      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold font-display gradient-text">Estate AI</span>
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <Button onClick={() => navigate("/dashboard")} size="sm">
                Mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Connexion</Button>
                <Button
                  size="sm"
                  onClick={goSignup}
                  className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-md hover:shadow-lg transition-all"
                >
                  Accéder à la Bêta Privée <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-12 text-center">
        <div className="inline-flex items-center gap-2 bg-accent/10 text-accent text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="h-4 w-4" /> Bêta Privée — Places limitées
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-[1.1] tracking-tight mb-6 max-w-3xl mx-auto">
          Générez plus de mandats grâce à l'IA.
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed">
          Centralisez vos emails, automatisez vos réponses et détectez des opportunités en quelques clics.
          L'assistant exécutif des agents immobiliers performants.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
          <Button
            size="lg"
            onClick={goSignup}
            className="text-base px-8 py-6 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300"
          >
            Accéder à la Bêta Privée <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 py-6" onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}>
            Voir comment ça marche
          </Button>
        </div>

        {/* Hero visual */}
        <div className="relative max-w-4xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50 ring-1 ring-black/5">
            <img src={dashboardMockup} alt="Aperçu du dashboard Estate AI" width={1920} height={1080} className="w-full" />
          </div>
          <div className="absolute -bottom-4 -left-4 -right-4 h-20 bg-gradient-to-t from-background to-transparent" />
        </div>
      </section>

      {/* Trust band */}
      <section className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-8 bg-card/70 backdrop-blur-sm border border-border/60 rounded-2xl px-6 py-5 text-center md:text-left">
          <div className="flex items-center gap-2 text-sm">
            <Lock className="h-5 w-5 text-success" />
            <span className="font-medium">Connexion sécurisée via Google &amp; Outlook</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-border" />
          <div className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <span className="font-medium">Données chiffrées et confidentielles</span>
          </div>
          <div className="hidden md:block h-6 w-px bg-border" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="font-semibold tracking-wide">Google</span>
            <span>·</span>
            <span className="font-semibold tracking-wide">Microsoft</span>
          </div>
        </div>
      </section>

      {/* Modules — 4 cards */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl md:text-4xl font-bold font-display text-center mb-4">
          Quatre modules. Une seule mission : vendre.
        </h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">
          Une plateforme conçue pour exécuter, pas pour s'admirer.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m, i) => (
            <Card key={i} className="group hover:shadow-xl transition-all duration-300 bg-card/80 backdrop-blur-sm border-border/50 hover:border-accent/40 hover:-translate-y-1">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="h-12 w-12 rounded-xl bg-accent/10 flex items-center justify-center group-hover:bg-accent/15 transition-colors">
                  <m.icon className="h-5 w-5 text-accent" strokeWidth={1.5} />
                </div>
                <h3 className="font-semibold font-display text-base">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl md:text-5xl font-bold font-display mb-5 leading-tight">
          Prêt à transformer votre agence ?
        </h2>
        <p className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto">
          Rejoignez la première vague d'agents qui exécutent leur business avec l'IA.
        </p>
        <Button
          size="lg"
          onClick={goSignup}
          className="text-base px-10 py-6 bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg hover:shadow-xl transition-all duration-300"
        >
          Devenir Testeur Privé (Places limitées) <ChevronRight className="h-5 w-5 ml-1" />
        </Button>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <span className="font-display font-bold gradient-text">Estate AI</span>
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
