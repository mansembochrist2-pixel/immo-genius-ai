import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, ListPlus, FileText, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";

export const QuickActions = () => {
  const navigate = useNavigate();

  const actions = [
    { label: "Ajouter un prospect", icon: UserPlus, href: "/prospects" },
    { label: "Créer une tâche", icon: ListPlus, href: "/taches" },
    { label: "Générer une annonce", icon: FileText, href: "/marketing" },
  ];

  return (
    <Card className="bg-card/80 border-border/50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-semibold font-sans flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" />
          Actions rapides
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {actions.map((a) => (
          <Button
            key={a.label}
            variant="outline"
            className="w-full justify-start gap-2 border-border/50 hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-all"
            onClick={() => navigate(a.href)}
          >
            <a.icon className="h-4 w-4" />
            {a.label}
          </Button>
        ))}
      </CardContent>
    </Card>
  );
};
