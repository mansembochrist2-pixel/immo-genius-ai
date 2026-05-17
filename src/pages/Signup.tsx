import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, Check, Zap } from "lucide-react";
import authBg3d from "@/assets/auth-bg-3d.jpg";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) { toast.error("Veuillez remplir tous les champs"); return; }
    if (password.length < 6) { toast.error("Le mot de passe doit contenir au moins 6 caractères"); return; }
    setIsLoading(true);
    const { error } = await signup(name, email, password);
    setIsLoading(false);
    if (error) toast.error(error);
    else { toast.success("Compte créé"); navigate("/onboarding"); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      <div className="hidden lg:flex relative overflow-hidden bg-gradient-to-br from-secondary/40 via-background to-primary/5">
        <img src={authBg3d} alt="Estate AI" className="absolute inset-0 w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-tr from-background/60 via-transparent to-background/30" />
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="inline-flex items-center gap-2">
            <span className="text-2xl font-bold font-display gradient-text">Estate AI</span>
          </Link>
          <div className="space-y-6 max-w-md">
            <div className="inline-flex items-center gap-2 bg-card/80 backdrop-blur-md border border-border rounded-full px-3 py-1.5 text-xs font-medium">
              <Zap className="h-3.5 w-3.5 text-accent" /><span>Bêta privée · accès immédiat</span>
            </div>
            <h2 className="text-3xl font-display font-bold leading-tight">
              Conquérez vos prochains mandats avec l'IA.
            </h2>
            <p className="text-muted-foreground leading-relaxed">
              Estate IA détecte les annonces à piger, génère vos scripts d'appel et vous accompagne sur chaque pige.
            </p>
            <div className="grid grid-cols-1 gap-2 pt-2">
              {[
                "Zero friction · démarrez en 30 secondes",
                "Pige IA + Radar prospection inclus",
                "Estimation premium pour gagner vos vendeurs",
                "Studio IA : annonces, scripts, posts",
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2 text-sm bg-card/70 backdrop-blur-md border border-border/60 rounded-lg px-3 py-2">
                  <Check className="h-4 w-4 text-success shrink-0" /><span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 relative overflow-hidden">
        <div className="w-full max-w-md animate-fade-in relative z-10">
          <Card className="border-border/60 shadow-xl bg-card/95 backdrop-blur-xl">
            <CardHeader>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-xs font-medium px-3 py-1 rounded-full w-fit mb-2">
                <Sparkles className="h-3 w-3" /> Bêta gratuite
              </div>
              <CardTitle className="font-display text-2xl">Créez votre compte</CardTitle>
              <CardDescription>30 secondes pour démarrer</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Label htmlFor="name">Nom complet</Label>
                  <Input id="name" placeholder="Jean Dupont" value={name} onChange={(e) => setName(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="email">Email professionnel</Label>
                  <Input id="email" type="email" placeholder="agent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
                <div className="space-y-2"><Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" placeholder="6 caractères minimum" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Création..." : "Créer mon compte"}
                </Button>
                <Link to="/login" className="text-sm text-muted-foreground hover:text-primary pt-2">
                  Déjà un compte ? <span className="text-primary font-medium">Se connecter</span>
                </Link>
              </CardFooter>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Signup;
