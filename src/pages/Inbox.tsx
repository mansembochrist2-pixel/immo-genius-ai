import { AppLayout } from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mail, MessageSquare, Phone, Search, Filter, Zap, Clock, AlertTriangle, CheckCircle, Plus } from "lucide-react";
import { useState } from "react";

const DEMO_MESSAGES = [
  {
    id: "1",
    canal: "email",
    direction: "entrant",
    sujet: "Demande de visite — Appartement T3 Paris 11",
    contenu: "Bonjour, je suis très intéressé par l'appartement T3 que vous proposez rue Oberkampf. Serait-il possible d'organiser une visite cette semaine ?",
    client: "Marie Dupont",
    urgence: 3,
    intention: "Visite",
    lu: false,
    repondu: false,
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
  },
  {
    id: "2",
    canal: "whatsapp",
    direction: "entrant",
    sujet: null,
    contenu: "Bonjour, j'ai vu votre annonce sur SeLoger pour la maison à Vincennes. Le prix est-il négociable ?",
    client: "Thomas Lefèvre",
    urgence: 2,
    intention: "Négociation",
    lu: true,
    repondu: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
  },
  {
    id: "3",
    canal: "email",
    direction: "sortant",
    sujet: "Re: Estimation de votre bien — Confirmation",
    contenu: "Suite à notre échange, je vous confirme que l'estimation sera réalisée jeudi à 14h.",
    client: "Jean-Pierre Martin",
    urgence: 1,
    intention: "Suivi",
    lu: true,
    repondu: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
  },
  {
    id: "4",
    canal: "sms",
    direction: "entrant",
    sujet: null,
    contenu: "Pouvez-vous me rappeler svp ? J'ai une question urgente sur le compromis.",
    client: "Sophie Bernard",
    urgence: 4,
    intention: "Urgence",
    lu: false,
    repondu: false,
    created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
  },
];

const canalIcons: Record<string, typeof Mail> = {
  email: Mail,
  whatsapp: MessageSquare,
  sms: Phone,
};

const urgenceColors: Record<number, string> = {
  1: "text-muted-foreground",
  2: "text-blue-400",
  3: "text-amber-400",
  4: "text-red-400",
};

const timeAgo = (dateStr: string) => {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  return `${Math.floor(hrs / 24)}j`;
};

const Inbox = () => {
  const [search, setSearch] = useState("");
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);

  const filtered = DEMO_MESSAGES.filter(
    (m) =>
      m.client.toLowerCase().includes(search.toLowerCase()) ||
      m.contenu.toLowerCase().includes(search.toLowerCase()) ||
      (m.sujet && m.sujet.toLowerCase().includes(search.toLowerCase()))
  );

  const selected = DEMO_MESSAGES.find((m) => m.id === selectedMessage);

  return (
    <AppLayout>
      <div className="page-header">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="page-title flex items-center gap-3">
              <Mail className="h-7 w-7 text-primary" />
              Inbox <span className="gradient-text">Intelligence</span>
            </h1>
            <p className="page-subtitle">Tous vos messages centralisés et analysés par l'IA</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="border-amber-500/30 text-amber-400">
              <AlertTriangle className="h-3 w-3 mr-1" />
              2 non lus
            </Badge>
            <Badge variant="outline" className="border-muted-foreground/30 text-muted-foreground">
              Sources non connectées
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Liste des messages */}
        <div className="lg:col-span-1 space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 bg-card/60 border-border/50"
            />
          </div>

          <Tabs defaultValue="tous" className="w-full">
            <TabsList className="w-full bg-card/60">
              <TabsTrigger value="tous" className="flex-1 text-xs">Tous</TabsTrigger>
              <TabsTrigger value="non-lus" className="flex-1 text-xs">Non lus</TabsTrigger>
              <TabsTrigger value="urgents" className="flex-1 text-xs">Urgents</TabsTrigger>
            </TabsList>
          </Tabs>

          <div className="space-y-2">
            {filtered.map((msg) => {
              const Icon = canalIcons[msg.canal] || Mail;
              return (
                <Card
                  key={msg.id}
                  className={`cursor-pointer transition-all hover:border-primary/40 ${
                    selectedMessage === msg.id ? "border-primary/60 bg-primary/5" : "bg-card/60 border-border/30"
                  } ${!msg.lu ? "border-l-2 border-l-primary" : ""}`}
                  onClick={() => setSelectedMessage(msg.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className={`h-4 w-4 shrink-0 ${urgenceColors[msg.urgence]}`} />
                        <span className={`text-sm truncate ${!msg.lu ? "font-semibold" : ""}`}>{msg.client}</span>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{timeAgo(msg.created_at)}</span>
                    </div>
                    {msg.sujet && <p className="text-xs text-muted-foreground mt-1 truncate">{msg.sujet}</p>}
                    <p className="text-xs text-muted-foreground/70 mt-1 line-clamp-2">{msg.contenu}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {msg.intention && (
                        <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                          {msg.intention}
                        </Badge>
                      )}
                      {msg.repondu && (
                        <CheckCircle className="h-3 w-3 text-green-400" />
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Détail du message */}
        <div className="lg:col-span-2">
          {selected ? (
            <Card className="bg-card/60 border-border/30 h-full">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{selected.client}</CardTitle>
                    {selected.sujet && <p className="text-sm text-muted-foreground mt-1">{selected.sujet}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs">{selected.canal}</Badge>
                    <Badge variant="outline" className={`text-xs ${urgenceColors[selected.urgence]}`}>
                      Urgence {selected.urgence}/4
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="bg-muted/20 rounded-lg p-4">
                  <p className="text-sm">{selected.contenu}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">
                    <Clock className="h-3 w-3 inline mr-1" />
                    {new Date(selected.created_at).toLocaleString("fr-FR")}
                  </p>
                </div>

                {/* Analyse IA */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                    <Zap className="h-4 w-4 text-primary" /> Analyse IA
                  </h3>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Intention</p>
                      <p className="text-sm font-medium mt-1">{selected.intention}</p>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Urgence</p>
                      <p className={`text-sm font-medium mt-1 ${urgenceColors[selected.urgence]}`}>{selected.urgence}/4</p>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-3 text-center">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Sentiment</p>
                      <p className="text-sm font-medium mt-1">Positif</p>
                    </div>
                  </div>
                </div>

                {/* Réponses suggérées */}
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Réponses suggérées</h3>
                  <div className="space-y-2">
                    {["Professionnelle", "Commerciale", "Empathique"].map((type) => (
                      <Card key={type} className="bg-muted/10 border-border/20">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <Badge variant="secondary" className="text-[9px]">{type}</Badge>
                            <Button size="sm" variant="ghost" className="text-xs h-7">
                              Utiliser
                            </Button>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 italic">
                            Connectez vos sources pour activer les réponses IA automatiques
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-card/60 border-border/30 h-full flex items-center justify-center min-h-[400px]">
              <div className="text-center space-y-3">
                <Mail className="h-12 w-12 text-muted-foreground/30 mx-auto" />
                <p className="text-muted-foreground">Sélectionnez un message pour voir le détail</p>
                <Badge variant="outline" className="text-muted-foreground/60">
                  <Plus className="h-3 w-3 mr-1" /> Connectez Gmail ou Outlook pour synchroniser
                </Badge>
              </div>
            </Card>
          )}
        </div>
      </div>
    </AppLayout>
  );
};

export default Inbox;
