import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Sparkles, ShieldCheck, Check } from "lucide-react";
import authBg3d from "@/assets/auth-bg-3d.jpg";

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
              <Sparkles className="h-3.5 w-3.5 text-accent" />
              <span>Le copilote IA de conquête de mandats</span>
            </div>
            <blockquote className="text-2xl font-display font-semibold leading-snug">
              "En 3 semaines j'ai décroché 4 mandats grâce à la Pige IA. Aucun CRM ne m'avait fait ça."
            </blockquote>
            <div className="text-sm text-muted-foreground">
              <p className="font-medium text-foreground">Nicolas R.</p>
              <p>Agent immobilier indépendant</p>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-4">
              {["Zero friction · aucune config", "Pige IA + Radar prospection", "Estimation premium IA"].map((t, i) => (
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
          <div className="text-center mb-8 lg:hidden">
            <h1 className="text-3xl font-bold font-display gradient-text">Estate AI</h1>
          </div>
          <Card className="border-border/60 shadow-xl bg-card/95 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="font-display text-2xl">Bon retour parmi nous</CardTitle>
              <CardDescription>Connectez-vous à votre copilote</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" placeholder="agent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-background border-border" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-background border-border" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? "Connexion..." : "Se connecter"}
                </Button>
                <div className="flex justify-between w-full text-sm pt-2">
                  <Link to="/forgot-password" className="text-muted-foreground hover:text-primary">Mot de passe oublié ?</Link>
                  <Link to="/signup" className="text-primary font-medium">Créer un compte</Link>
                </div>
              </CardFooter>
            </form>
          </Card>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground mt-6">
            <ShieldCheck className="h-3.5 w-3.5" /><span>Connexion chiffrée · RGPD · hébergement EU</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
