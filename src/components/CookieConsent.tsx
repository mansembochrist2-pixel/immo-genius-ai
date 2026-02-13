import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Cookie } from "lucide-react";

const CONSENT_KEY = "estate-ai-cookies-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem(CONSENT_KEY);
    if (!consent) setShow(true);
  }, []);

  const accept = () => {
    localStorage.setItem(CONSENT_KEY, "accepted");
    setShow(false);
  };

  const decline = () => {
    localStorage.setItem(CONSENT_KEY, "declined");
    setShow(false);
  };

  if (!show) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 flex justify-center">
      <Card className="max-w-lg w-full shadow-lg border-2">
        <CardContent className="py-4 flex items-start gap-3">
          <Cookie className="h-5 w-5 text-accent shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium mb-1">Cookies</p>
            <p className="text-xs text-muted-foreground mb-3">
              Nous utilisons uniquement des cookies nécessaires au fonctionnement du site. Aucun cookie publicitaire n'est utilisé.
            </p>
            <div className="flex gap-2">
              <Button size="sm" onClick={accept}>Accepter</Button>
              <Button size="sm" variant="outline" onClick={decline}>Refuser</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
