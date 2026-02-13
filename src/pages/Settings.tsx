import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, User, CreditCard, Plug, Crown, Calendar, Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone: "", agency_name: "" });

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (profile) {
      setProfileForm({
        full_name: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        agency_name: profile.agency_name || "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update(profileForm).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profil mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });

  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnd && trialEnd > new Date();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;

  const planLabels: Record<string, string> = { trial: "Essai gratuit", active: "Actif", suspended: "Suspendu", cancelled: "Résilié" };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-accent" /> Paramètres</h1>
        <p className="page-subtitle">Gérez votre profil, abonnement et intégrations</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profil</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Abonnement</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" /> Intégrations</TabsTrigger>
        </TabsList>

        {/* PROFILE TAB */}
        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base font-sans font-semibold">Informations personnelles</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-4 max-w-lg">
                <div className="space-y-2"><Label>Nom complet</Label><Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>Téléphone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>Agence</Label><Input value={profileForm.agency_name} onChange={(e) => setProfileForm({ ...profileForm, agency_name: e.target.value })} /></div>
                <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? "Enregistrement..." : "Enregistrer"}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* BILLING TAB */}
        <TabsContent value="billing">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2"><Crown className="h-5 w-5 text-accent" /> Votre abonnement</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant={isTrialActive ? "secondary" : "default"}>{planLabels[profile?.plan || "trial"]}</Badge>
                  <span className="text-2xl font-bold">79€<span className="text-sm font-normal text-muted-foreground">/mois</span></span>
                </div>
                {isTrialActive && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Essai gratuit — {daysLeft} jours restants (fin le {trialEnd?.toLocaleDateString("fr-FR")})</span>
                  </div>
                )}
                <div className="border-t pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Prochaine facturation</span>
                    <span>{isTrialActive ? trialEnd?.toLocaleDateString("fr-FR") : "—"}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Moyen de paiement</span>
                    <span className="text-muted-foreground italic">Non configuré</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold">Historique de facturation</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Aucune facture pour le moment.</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold">Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                <Button variant="outline" disabled><CreditCard className="h-4 w-4 mr-2" /> Ajouter un moyen de paiement</Button>
                <Button variant="outline" disabled><Download className="h-4 w-4 mr-2" /> Télécharger une facture</Button>
                <Button variant="destructive" disabled>Résilier l'abonnement</Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            {[
              { name: "Gmail", desc: "Synchronisez vos emails et leads", icon: "📧", status: "soon" },
              { name: "Outlook", desc: "Importez vos contacts et emails", icon: "📬", status: "soon" },
              { name: "HubSpot", desc: "Synchronisation CRM bidirectionnelle", icon: "🔶", status: "soon" },
            ].map((integ) => (
              <Card key={integ.name}>
                <CardContent className="py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{integ.icon}</span>
                    <div>
                      <p className="font-medium text-sm">{integ.name}</p>
                      <p className="text-xs text-muted-foreground">{integ.desc}</p>
                    </div>
                  </div>
                  <Badge variant="secondary">Bientôt</Badge>
                </CardContent>
              </Card>
            ))}
            <p className="text-xs text-muted-foreground text-center mt-4">
              Les intégrations email seront disponibles dans une prochaine mise à jour. En attendant, utilisez l'import CSV pour synchroniser vos données.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
