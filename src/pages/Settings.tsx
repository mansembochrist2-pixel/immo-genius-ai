import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings as SettingsIcon, User, CreditCard, Plug, Crown, Calendar, Download, Shield, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone: "", agency_name: "", objectif_ca: "", zone_principale: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [hubspotToken, setHubspotToken] = useState("");
  const [hubspotStatus, setHubspotStatus] = useState<"idle" | "testing" | "connected" | "error">("idle");
  const [hubspotInfo, setHubspotInfo] = useState("");
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
  });

  const { data: subscription } = useQuery({
    queryKey: ["subscription"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("check-subscription");
      if (error) return { subscribed: false };
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
        objectif_ca: profile.objectif_ca?.toString() || "",
        zone_principale: profile.zone_principale || "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        agency_name: profileForm.agency_name,
        objectif_ca: profileForm.objectif_ca ? Number(profileForm.objectif_ca) : 0,
        zone_principale: profileForm.zone_principale || null,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success("Profil mis à jour"); },
    onError: (e: any) => toast.error(e.message),
  });

  const trialEnd = profile?.trial_ends_at ? new Date(profile.trial_ends_at) : null;
  const isTrialActive = trialEnd && trialEnd > new Date();
  const daysLeft = trialEnd ? Math.max(0, Math.ceil((trialEnd.getTime() - Date.now()) / 86400000)) : 0;
  const isSubscribed = subscription?.subscribed === true;

  const handleCheckout = async () => {
    setCheckoutLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de la redirection vers le paiement");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) {
        window.open(data.url, "_blank");
      }
    } catch (err: any) {
      toast.error(err.message || "Erreur lors de l'ouverture du portail");
    } finally {
      setPortalLoading(false);
    }
  };

  const exportData = async () => {
    setExporting(true);
    try {
      const [prospects, tasks, annonces, analyses] = await Promise.all([
        supabase.from("prospects").select("*"),
        supabase.from("tasks").select("*"),
        supabase.from("annonces").select("*"),
        supabase.from("analyses_zone").select("*"),
      ]);

      const exportObj = {
        export_date: new Date().toISOString(),
        profile: profile,
        prospects: prospects.data || [],
        tasks: tasks.data || [],
        annonces: annonces.data || [],
        analyses_zone: analyses.data || [],
      };

      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `estate-ai-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Données exportées avec succès");
    } catch {
      toast.error("Erreur lors de l'export");
    } finally {
      setExporting(false);
    }
  };

  const deleteAccount = async () => {
    try {
      await Promise.all([
        supabase.from("prospects").delete().eq("user_id", user!.id),
        supabase.from("tasks").delete().eq("user_id", user!.id),
        supabase.from("annonces").delete().eq("user_id", user!.id),
        supabase.from("analyses_zone").delete().eq("user_id", user!.id),
        supabase.from("conversations").delete().eq("user_id", user!.id),
        supabase.from("sales").delete().eq("user_id", user!.id),
      ]);
      toast.success("Données supprimées. Déconnexion...");
      setTimeout(() => logout(), 1500);
    } catch {
      toast.error("Erreur lors de la suppression");
    }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-accent" /> Paramètres</h1>
        <p className="page-subtitle">Gérez votre profil, abonnement et données</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> Profil</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> Abonnement</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" /> Intégrations</TabsTrigger>
          <TabsTrigger value="rgpd" className="gap-2"><Shield className="h-4 w-4" /> RGPD</TabsTrigger>
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
                  <Badge variant={isSubscribed ? "default" : "secondary"}>
                    {isSubscribed ? "Actif" : isTrialActive ? "Essai gratuit" : "Inactif"}
                  </Badge>
                  <span className="text-2xl font-bold">79€<span className="text-sm font-normal text-muted-foreground">/mois</span></span>
                </div>
                {isTrialActive && !isSubscribed && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Essai gratuit — {daysLeft} jours restants (fin le {trialEnd?.toLocaleDateString("fr-FR")})</span>
                  </div>
                )}
                {isSubscribed && subscription?.subscription_end && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>Prochain renouvellement : {new Date(subscription.subscription_end).toLocaleDateString("fr-FR")}</span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold">Actions</CardTitle></CardHeader>
              <CardContent className="flex flex-wrap gap-3">
                {!isSubscribed && (
                  <Button onClick={handleCheckout} disabled={checkoutLoading}>
                    {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    Ajouter un moyen de paiement
                  </Button>
                )}
                {isSubscribed && (
                  <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    Gérer mon abonnement
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => { queryClient.invalidateQueries({ queryKey: ["subscription"] }); toast.success("Statut mis à jour"); }}
                >
                  Rafraîchir le statut
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* INTEGRATIONS TAB */}
        <TabsContent value="integrations">
          <div className="space-y-4">
            {[
              { name: "Gmail", desc: "Synchronisez vos emails et leads", icon: "📧" },
              { name: "Outlook", desc: "Importez vos contacts et emails", icon: "📬" },
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
                  <Button variant="outline" size="sm" disabled>
                    <Plug className="h-3.5 w-3.5 mr-1" /> Configurer
                  </Button>
                </CardContent>
              </Card>
            ))}

            {/* HubSpot with token */}
            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔶</span>
                    <div>
                      <p className="font-medium text-sm">HubSpot</p>
                      <p className="text-xs text-muted-foreground">Synchronisation CRM via Private App Token</p>
                    </div>
                  </div>
                  {hubspotStatus === "connected" && (
                    <Badge variant="secondary" className="text-xs">✓ Connecté</Badge>
                  )}
                  {hubspotStatus === "error" && (
                    <Badge variant="destructive" className="text-xs">Erreur</Badge>
                  )}
                </div>
                <div className="flex gap-2">
                  <Input
                    type="password"
                    placeholder="pat-na1-xxxxxxxx..."
                    value={hubspotToken}
                    onChange={(e) => setHubspotToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={!hubspotToken || hubspotStatus === "testing"}
                    onClick={async () => {
                      setHubspotStatus("testing");
                      try {
                        const { data, error } = await supabase.functions.invoke("test-hubspot", {
                          body: { token: hubspotToken },
                        });
                        if (error) throw error;
                        if (data?.success) {
                          setHubspotStatus("connected");
                          setHubspotInfo(`${data.contacts_count} contacts trouvés`);
                          toast.success("HubSpot connecté avec succès !");
                        } else {
                          setHubspotStatus("error");
                          toast.error(data?.error || "Erreur de connexion");
                        }
                      } catch (err: any) {
                        setHubspotStatus("error");
                        toast.error(err.message || "Erreur de connexion");
                      }
                    }}
                  >
                    {hubspotStatus === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1" />}
                    {hubspotStatus === "testing" ? "Test..." : "Tester"}
                  </Button>
                </div>
                {hubspotInfo && <p className="text-xs text-muted-foreground">{hubspotInfo}</p>}
              </CardContent>
            </Card>

            <p className="text-xs text-muted-foreground text-center mt-4">
              Gmail et Outlook nécessitent une configuration OAuth. Contactez le support pour activer ces connecteurs.
            </p>
          </div>
        </TabsContent>

        {/* RGPD TAB */}
        <TabsContent value="rgpd">
          <div className="space-y-4 max-w-lg">
            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2"><Download className="h-5 w-5 text-accent" /> Exporter mes données</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Téléchargez l'ensemble de vos données (prospects, tâches, annonces, analyses) au format JSON.</p>
                <Button onClick={exportData} disabled={exporting}>
                  {exporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Export en cours...</> : <><Download className="h-4 w-4 mr-2" /> Exporter toutes mes données</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> Supprimer mon compte</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">Cette action supprimera définitivement toutes vos données. Cette action est irréversible.</p>
                <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> Supprimer mon compte</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Confirmer la suppression</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Êtes-vous sûr de vouloir supprimer définitivement toutes vos données ? Cette action est irréversible.</p>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)}>Annuler</Button>
                      <Button variant="destructive" className="flex-1" onClick={deleteAccount}>Supprimer définitivement</Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </AppLayout>
  );
};

export default Settings;
