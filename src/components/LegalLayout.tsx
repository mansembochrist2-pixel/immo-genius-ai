import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export const LegalLayout = ({ children, title }: { children: ReactNode; title: string }) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  // Si l'utilisateur est connecté → retour vers /dashboard ou page précédente.
  // Sinon → retour vers la landing.
  const handleBack = () => {
    if (isAuthenticated) {
      // Tente l'historique d'abord pour revenir au module précédent
      if (window.history.length > 1) {
        navigate(-1);
      } else {
        navigate("/dashboard");
      }
    } else {
      navigate("/");
    }
  };

  const handleHome = () => {
    navigate(isAuthenticated ? "/dashboard" : "/");
  };

  return (
    <div className="min-h-screen bg-background relative">
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[400px] h-[400px] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-info/5 blur-[120px]" />
      </div>
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-xl border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <button onClick={handleHome} className="text-xl font-bold font-display gradient-text">Estate AI</button>
          <Button variant="ghost" size="sm" onClick={handleBack}><ArrowLeft className="h-4 w-4 mr-1" /> Retour</Button>
        </div>
      </nav>
      <main className="max-w-3xl mx-auto px-6 py-12">
        <h1 className="text-3xl md:text-4xl font-bold font-display mb-8">{title}</h1>
        <div className="prose prose-sm max-w-none space-y-4 [&_h3]:font-display [&_h3]:font-semibold [&_h3]:text-lg [&_h3]:mt-6 [&_h3]:mb-2 [&_p]:text-muted-foreground [&_li]:text-muted-foreground [&_a]:text-primary [&_a]:underline">
          {children}
        </div>
      </main>
      <footer className="border-t border-border mt-16 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Estate AI · <button onClick={handleHome} className="hover:text-foreground transition-colors">{isAuthenticated ? "Retour au dashboard" : "Retour à l'accueil"}</button>
      </footer>
    </div>
  );
};
