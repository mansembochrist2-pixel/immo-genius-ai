import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ShieldCheck, KeyRound } from "lucide-react";

/**
 * /reset-password
 * Public route hit from the password-recovery email link.
 * Supabase places a recovery session in the URL hash; on PASSWORD_RECOVERY
 * we let the user pick a new password, then call updateUser.
 */
const ResetPassword = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Supabase fires PASSWORD_RECOVERY uniquement depuis le lien email de récupération.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });
    // Vérifie aussi le hash URL au cas où l'event arrive avant l'écoute.
    const hash = window.location.hash;
    if (hash.includes("type=recovery") && hash.includes("access_token=")) {
      setReady(true);
    }
    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) { toast.error("8 caractères minimum, dont chiffres et symboles recommandés."); return; }
    if (password !== confirm) { toast.error("Les deux mots de passe ne correspondent pas."); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Mot de passe mis à jour. Vous êtes connecté.");
    navigate("/dashboard", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/10 blur-[120px]" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-info/10 blur-[120px]" />

      <div className="w-full max-w-md animate-fade-in relative z-10">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold font-display gradient-text">ImmoGenius AI</h1>
          <p className="text-muted-foreground mt-2">Définissez un nouveau mot de passe</p>
        </div>
        <Card className="bg-card/80 backdrop-blur-xl border-border/70">
          <CardHeader>
            <CardTitle className="font-display flex items-center gap-2"><KeyRound className="h-5 w-5 text-primary" /> Nouveau mot de passe</CardTitle>
            <CardDescription>
              {ready ? "Choisissez un mot de passe robuste. Vous serez connecté automatiquement." : "Vérification du lien de récupération…"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {ready ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="password">Mot de passe</Label>
                  <Input id="password" type="password" autoComplete="new-password" placeholder="8 caractères minimum" value={password} onChange={(e) => setPassword(e.target.value)} className="h-11" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="confirm">Confirmation</Label>
                  <Input id="confirm" type="password" autoComplete="new-password" placeholder="Retapez votre mot de passe" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-11" />
                </div>
                <Button type="submit" className="w-full h-11 rounded-xl" disabled={loading}>
                  {loading ? "Mise à jour…" : "Mettre à jour le mot de passe"}
                </Button>
                <div className="flex items-center justify-center gap-2 text-[11px] text-muted-foreground pt-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-success" />
                  <span>Connexion chiffrée · vérification anti-fuites HIBP · RGPD</span>
                </div>
              </form>
            ) : (
              <p className="text-sm text-muted-foreground">
                Si vous arrivez ici sans avoir cliqué sur le lien envoyé par email, retournez sur{" "}
                <button onClick={() => navigate("/forgot-password")} className="text-primary underline">mot de passe oublié</button>.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;
