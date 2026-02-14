import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const Signup = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setIsLoading(true);
    const { error } = await signup(name, email, password);
    setIsLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Vérifiez votre email pour confirmer votre inscription");
      navigate("/login");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-info/10 blur-[120px]" />
      
      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display gradient-text">Estate AI</h1>
          <p className="text-muted-foreground mt-2">Créez votre compte agent</p>
        </div>
        <Card className="glow-border bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="font-display">Inscription</CardTitle>
            <CardDescription>Rejoignez Estate AI en quelques secondes</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nom complet</Label>
                <Input id="name" placeholder="Jean Dupont" value={name} onChange={(e) => setName(e.target.value)} className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="agent@example.com" value={email} onChange={(e) => setEmail(e.target.value)} className="bg-muted/50 border-border/50" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} className="bg-muted/50 border-border/50" />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Création..." : "Créer mon compte"}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
              </div>
              <GoogleSignInButton />
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary transition-colors">
                Déjà un compte ? Se connecter
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Signup;
