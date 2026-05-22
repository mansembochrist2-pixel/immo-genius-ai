import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Sparkles, Check, ArrowRight, Building2, ShieldCheck } from "lucide-react";
import { BlueprintBuilding } from "@/components/landing/BlueprintBuilding";

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
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background relative overflow-hidden">
      <div className="scene-grid" />
      <div className="scene-mesh" />

      <div className="hidden lg:flex relative overflow-hidden border-r border-border/60">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-2.5 w-fit">
            <div className="h-9 w-9 rounded-lg border border-primary/40 grid place-items-center bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-display font-semibold tracking-tight">Estate<span className="text-primary">AI</span></span>
          </Link>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <BlueprintBuilding className="w-[90%] h-[80%] opacity-90" />
          </div>

          <div className="space-y-4 max-w-md relative z-10">
            <div className="chip border-primary/40 text-primary"><Sparkles className="h-3.5 w-3.5" /> Bêta privée</div>
            <h2 className="font-display text-3xl font-semibold leading-tight text-balance">
              Conquérez vos prochains mandats avec votre copilote IA.
            </h2>
            <div className="space-y-2 pt-2">
              {[
                "Pige IA + Radar prospection inclus",
                "Valorisation patrimoniale en moins d'une minute",
                "Studio IA : mandats, annonces, scripts d'appel",
                "Copilote stratégique connecté à toutes vos données",
              ].map((t, i) => (
                <div key={i} className="flex items-center gap-2.5 text-sm bg-surface-1/70 backdrop-blur-md border border-border/60 rounded-lg px-3 py-2">
                  <Check className="h-4 w-4 text-success shrink-0" /><span>{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="h-8 w-8 rounded-lg border border-primary/40 grid place-items-center bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-semibold">Estate<span className="text-primary">AI</span></span>
          </Link>

          <div className="rounded-2xl border border-border/70 bg-surface-1/80 backdrop-blur-2xl p-8 shadow-[var(--shadow-elevated)]">
            <div className="chip border-primary/30 text-primary text-[10px] mb-4"><Sparkles className="h-3 w-3" /> Essai gratuit · 11 jours</div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">Créez votre compte</h1>
            <p className="text-sm text-muted-foreground mt-2">30 secondes pour activer votre copilote.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div className="space-y-1.5"><Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="Jean Dupont" value={name} onChange={(e) => setName(e.target.value)} className="h-11 bg-surface-2 border-border" /></div>
              <div className="space-y-1.5"><Label htmlFor="email">Email professionnel</Label>
                <Input id="email" type="email" placeholder="agent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-surface-2 border-border" /></div>
              <div className="space-y-1.5"><Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="6 caractères minimum" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-surface-2 border-border" /></div>

              <Button type="submit" className="w-full h-11 rounded-xl shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]" disabled={isLoading}>
                {isLoading ? "Création..." : <>Créer mon compte <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>

              <Link to="/login" className="text-sm text-muted-foreground hover:text-foreground pt-2 block text-center">
                Déjà un compte ? <span className="text-primary font-medium">Se connecter</span>
              </Link>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>Données chiffrées · Hébergement européen · RGPD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;
