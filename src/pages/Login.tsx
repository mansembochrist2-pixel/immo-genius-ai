import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    setIsLoading(true);
    const { error } = await login(email, password);
    setIsLoading(false);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Connexion réussie");
      navigate("/dashboard");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute top-1/4 -left-32 w-[500px] h-[500px] rounded-full bg-primary/15 blur-[120px] animate-pulse" style={{ animationDuration: "8s" }} />
      <div className="absolute bottom-1/4 -right-32 w-[500px] h-[500px] rounded-full bg-info/15 blur-[120px] animate-pulse" style={{ animationDuration: "11s" }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full bg-primary/5 blur-[140px] animate-pulse" style={{ animationDuration: "13s" }} />
      {/* Subtle grid */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,hsl(var(--border)/0.3)_1px,transparent_1px),linear-gradient(to_bottom,hsl(var(--border)/0.3)_1px,transparent_1px)] bg-[size:60px_60px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display gradient-text">Estate AI</h1>
          <p className="text-muted-foreground mt-2">Votre assistant immobilier intelligent</p>
        </div>
        <Card className="glow-border bg-card/80 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="font-display">Connexion</CardTitle>
            <CardDescription>Accédez à votre espace agent</CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-4">
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
              <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={isLoading}>
                {isLoading ? "Connexion..." : "Se connecter"}
              </Button>
              <div className="relative w-full">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border/50" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-card px-2 text-muted-foreground">ou</span></div>
              </div>
              <GoogleSignInButton />
              <div className="flex justify-between w-full text-sm">
                <Link to="/forgot-password" className="text-muted-foreground hover:text-primary transition-colors">Mot de passe oublié ?</Link>
                <Link to="/signup" className="text-muted-foreground hover:text-primary transition-colors">Créer un compte</Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Login;
