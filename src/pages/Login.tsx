import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Check, ArrowRight, Building2 } from "lucide-react";
import { BlueprintBuilding } from "@/components/landing/BlueprintBuilding";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) { toast.error("Veuillez remplir tous les champs"); return; }
    setIsLoading(true);
    const { error } = await login(email, password);
    setIsLoading(false);
    if (error) toast.error(error);
    else { toast.success("Connexion réussie"); navigate("/dashboard"); }
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-[1.05fr_1fr] bg-background relative overflow-hidden">
      <div className="scene-grid" />
      <div className="scene-mesh" />

      {/* Left scene */}
      <div className="hidden lg:flex relative overflow-hidden border-r border-border/60">
        <div className="relative z-10 flex flex-col justify-between p-12 w-full">
          <Link to="/" className="flex items-center gap-2.5 group w-fit">
            <div className="h-9 w-9 rounded-lg border border-primary/40 grid place-items-center bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="text-lg font-display font-semibold tracking-tight">ImmoGenius<span className="text-primary"> AI</span></span>
          </Link>

          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <BlueprintBuilding className="w-[90%] h-[80%] opacity-90" />
          </div>

          <div className="space-y-5 max-w-md relative z-10">
            <blockquote className="text-2xl font-display font-medium leading-snug text-balance">
              « En 3 semaines j'ai décroché 4 mandats grâce à la Pige IA. Aucun outil ne m'avait fait ça. »
            </blockquote>
            <div className="text-sm">
              <p className="font-medium">Nicolas R.</p>
              <p className="text-muted-foreground">Agent immobilier indépendant · Lyon</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex items-center justify-center p-6 sm:p-10 relative z-10">
        <div className="w-full max-w-md animate-fade-in-up">
          <Link to="/" className="flex lg:hidden items-center gap-2.5 mb-8">
            <div className="h-8 w-8 rounded-lg border border-primary/40 grid place-items-center bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-semibold">ImmoGenius<span className="text-primary"> AI</span></span>
          </Link>

          <div className="rounded-2xl border border-border/70 bg-surface-1/80 backdrop-blur-2xl p-8 shadow-[var(--shadow-elevated)]">
            <h1 className="font-display text-3xl font-semibold tracking-tight">Bon retour.</h1>
            <p className="text-sm text-muted-foreground mt-2">Reconnectez-vous à votre copilote stratégique.</p>

            <form onSubmit={handleSubmit} className="mt-7 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="agent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="h-11 bg-surface-2 border-border" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11 bg-surface-2 border-border" />
              </div>

              <Button type="submit" className="w-full h-11 rounded-xl shadow-[0_10px_30px_-10px_hsl(var(--primary)/0.6)]" disabled={isLoading}>
                {isLoading ? "Connexion..." : <>Se connecter <ArrowRight className="h-4 w-4 ml-1" /></>}
              </Button>

              <div className="flex items-center justify-between text-sm pt-1">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-foreground">Mot de passe oublié ?</Link>
                <Link to="/signup" className="text-primary font-medium hover:underline">Créer un compte</Link>
              </div>
            </form>
          </div>

          <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground mt-6">
            <ShieldCheck className="h-3.5 w-3.5 text-success" />
            <span>Connexion chiffrée · Hébergement européen · RGPD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
