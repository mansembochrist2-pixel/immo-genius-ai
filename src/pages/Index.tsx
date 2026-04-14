import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard, Mail, Calendar, Users, FileText, TrendingUp, Radar, MessageSquare,
  ArrowRight, CheckCircle2, Sparkles, Target, Clock, UserX, ChevronRight
} from "lucide-react";
import dashboardMockup from "@/assets/dashboard-mockup.jpg";
import realEstateBg from "@/assets/real-estate-bg.jpg";

const modules = [
  { icon: LayoutDashboard, title: "Dashboard Business", desc: "Visualisez instantanément votre activité, vos opportunités et vos priorités du jour." },
  { icon: Mail, title: "Inbox Intelligence", desc: "Analyse automatiquement vos messages, détecte les opportunités et vous aide à répondre efficacement." },
  { icon: Calendar, title: "Agenda IA", desc: "Organise vos journées intelligemment et crée des actions pertinentes en fonction de votre activité." },
  { icon: Users, title: "Mémoire Client", desc: "Centralise toutes les informations de vos clients, suit leur évolution et vous aide à ne rien oublier." },
  { icon: FileText, title: "Documents IA", desc: "Générez facilement vos mandats, annonces et supports marketing en quelques secondes." },
  { icon: TrendingUp, title: "Estimation IA", desc: "Estimez vos biens avec précision grâce aux données et aux informations que vous fournissez." },
  { icon: Radar, title: "Radar Prospection", desc: "Identifiez les meilleures zones et opportunités pour développer votre activité." },
  { icon: MessageSquare, title: "Copilote Stratégique", desc: "Un assistant intelligent avec qui vous pouvez discuter pour obtenir des conseils, des analyses et des actions concrètes." },
];

const problems = [
  { icon: Mail, text: "Trop de messages à gérer" },
  { icon: Target, text: "Des opportunités manquées" },
  { icon: Clock, text: "Des tâches répétitives" },
  { icon: UserX, text: "Un manque de suivi client" },
];

const Index = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

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
              <Button onClick={() => navigate("/")} size="sm">
                Mon dashboard <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>Connexion</Button>
                <Button size="sm" onClick={() => navigate("/signup")}>
                  Essai gratuit <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-20 pb-16 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-4 py-1.5 rounded-full mb-6">
          <Sparkles className="h-4 w-4" /> Propulsé par l'intelligence artificielle
        </div>
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold font-display leading-tight mb-6 max-w-3xl mx-auto">
          Le copilote intelligent des agents immobiliers
        </h1>
        <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          Gérez vos clients, automatisez vos tâches et trouvez plus d'opportunités, sans effort.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
          <Button size="lg" className="text-base px-8 py-6" onClick={() => navigate("/signup")}>
            Tester gratuitement pendant 11 jours <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
          <Button variant="outline" size="lg" className="text-base px-8 py-6" onClick={() => document.getElementById("modules")?.scrollIntoView({ behavior: "smooth" })}>
            Voir comment ça marche
          </Button>
        </div>
        <div className="relative max-w-4xl mx-auto">
          <div className="rounded-2xl overflow-hidden shadow-2xl border border-border/50">
            <img src={dashboardMockup} alt="Estate AI Dashboard" width={1920} height={1080} className="w-full" />
          </div>
          <div className="absolute -bottom-4 -left-4 -right-4 h-20 bg-gradient-to-t from-background to-transparent" />
        </div>
      </section>

      {/* Problems */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold font-display text-center mb-12">Vous perdez du temps chaque jour ?</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {problems.map((p, i) => (
            <Card key={i} className="text-center p-6 bg-card/80 backdrop-blur-sm">
              <CardContent className="p-0 flex flex-col items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-destructive/10 flex items-center justify-center">
                  <p.icon className="h-6 w-6 text-destructive" />
                </div>
                <p className="font-medium">{p.text}</p>
              </CardContent>
            </Card>
          ))}
        </div>
        <p className="text-center text-lg text-muted-foreground max-w-2xl mx-auto">
          <span className="font-semibold text-foreground">Estate AI</span> automatise votre quotidien et vous aide à vous concentrer sur l'essentiel : <span className="font-semibold text-primary">vendre.</span>
        </p>
      </section>

      {/* Modules */}
      <section id="modules" className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold font-display text-center mb-4">Tout ce dont vous avez besoin</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">8 modules intelligents pour couvrir l'ensemble de votre activité immobilière.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {modules.map((m, i) => (
            <Card key={i} className="group hover:shadow-lg transition-all duration-300 bg-card/80 backdrop-blur-sm border-border/50 hover:border-primary/20">
              <CardContent className="p-6 flex flex-col gap-4">
                <div className="h-11 w-11 rounded-xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                  <m.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold font-display text-base">{m.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{m.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Visual showcase */}
      <section className="max-w-6xl mx-auto px-6 py-20">
        <h2 className="text-3xl font-bold font-display text-center mb-4">Une interface pensée pour les agents</h2>
        <p className="text-center text-muted-foreground mb-12 max-w-xl mx-auto">Découvrez une plateforme moderne, claire et agréable à utiliser au quotidien.</p>
        <div className="rounded-2xl overflow-hidden shadow-xl border border-border/50">
          <img src={dashboardMockup} alt="Aperçu de la plateforme Estate AI" width={1920} height={1080} loading="lazy" className="w-full" />
        </div>
      </section>

      {/* Credibility */}
      <section className="max-w-6xl mx-auto px-6 py-16 text-center">
        <div className="bg-card/80 backdrop-blur-sm rounded-2xl border border-border/50 p-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <span className="text-sm font-medium text-success">En phase de test</span>
          </div>
          <h2 className="text-2xl font-bold font-display mb-3">Déjà utilisé par des agents immobiliers en phase de test</h2>
          <p className="text-muted-foreground max-w-lg mx-auto">Une solution conçue avec et pour les professionnels de l'immobilier.</p>
        </div>
      </section>

      {/* Final CTA */}
      <section className="max-w-6xl mx-auto px-6 py-20 text-center">
        <h2 className="text-3xl md:text-4xl font-bold font-display mb-4">Essayez gratuitement dès aujourd'hui</h2>
        <p className="text-lg text-muted-foreground mb-8">Testez toutes les fonctionnalités pendant 11 jours.</p>
        <Button size="lg" className="text-base px-10 py-6" onClick={() => navigate("/signup")}>
          Commencer maintenant <ChevronRight className="h-5 w-5 ml-1" />
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
            <button onClick={() => navigate("/pricing")} className="hover:text-foreground transition-colors">Tarifs</button>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
