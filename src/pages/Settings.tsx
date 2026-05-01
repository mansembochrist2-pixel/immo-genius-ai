import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings as SettingsIcon, User, CreditCard, Plug, Crown, Calendar, Download, Shield, Trash2, Loader2, Globe } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

const Settings = () => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success(lang === "fr" ? "Profil mis à jour" : "Profile updated"); },
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
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");
      if (error) throw error;
      if (data?.url) window.open(data.url, "_blank");
    } catch (err: any) {
      toast.error(err.message || "Erreur");
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
      const exportObj = { export_date: new Date().toISOString(), profile, prospects: prospects.data || [], tasks: tasks.data || [], annonces: annonces.data || [], analyses_zone: analyses.data || [] };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `estate-ai-export-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success(lang === "fr" ? "Données exportées" : "Data exported");
    } catch { toast.error("Erreur"); } finally { setExporting(false); }
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
      toast.success(lang === "fr" ? "Données supprimées. Déconnexion..." : "Data deleted. Logging out...");
      setTimeout(() => logout(), 1500);
    } catch { toast.error("Erreur"); }
  };

  return (
    <AppLayout>
      <div className="page-header">
        <h1 className="page-title flex items-center gap-2"><SettingsIcon className="h-6 w-6 text-accent" /> {t("settings.title")}</h1>
        <p className="page-subtitle">{t("settings.subtitle")}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2"><User className="h-4 w-4" /> {t("settings.profile")}</TabsTrigger>
          <TabsTrigger value="billing" className="gap-2"><CreditCard className="h-4 w-4" /> {t("settings.billing")}</TabsTrigger>
          <TabsTrigger value="integrations" className="gap-2"><Plug className="h-4 w-4" /> {t("settings.integrations")}</TabsTrigger>
          <TabsTrigger value="rgpd" className="gap-2"><Shield className="h-4 w-4" /> {t("settings.rgpd")}</TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader><CardTitle className="text-base font-sans font-semibold">{t("settings.personal_info")}</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); updateProfile.mutate(); }} className="space-y-4 max-w-lg">
                <div className="space-y-2"><Label>{lang === "fr" ? "Nom complet" : "Full name"}</Label><Input value={profileForm.full_name} onChange={(e) => setProfileForm({ ...profileForm, full_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>Email</Label><Input type="email" value={profileForm.email} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></div>
                <div className="space-y-2"><Label>{lang === "fr" ? "Téléphone" : "Phone"}</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
                <div className="space-y-2"><Label>{lang === "fr" ? "Agence" : "Agency"}</Label><Input value={profileForm.agency_name} onChange={(e) => setProfileForm({ ...profileForm, agency_name: e.target.value })} /></div>
                <div className="space-y-2"><Label>{lang === "fr" ? "Objectif CA mensuel (€)" : "Monthly revenue goal (€)"}</Label><NumberInput value={profileForm.objectif_ca} onChange={(v) => setProfileForm({ ...profileForm, objectif_ca: v })} placeholder="Ex: 50 000" /></div>
                <div className="space-y-2"><Label>{lang === "fr" ? "Zone géographique principale" : "Main geographic zone"}</Label><Input value={profileForm.zone_principale} onChange={(e) => setProfileForm({ ...profileForm, zone_principale: e.target.value })} placeholder="Ex: Paris 11, Lyon..." /></div>
                
                {/* Language selector */}
                <div className="space-y-2 pt-4 border-t border-border/30">
                  <Label className="flex items-center gap-2"><Globe className="h-4 w-4" /> {t("settings.language")}</Label>
                  <Select value={lang} onValueChange={(v) => setLang(v as "fr" | "en")}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="fr">🇫🇷 Français</SelectItem>
                      <SelectItem value="en">🇬🇧 English</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? t("settings.saving") : t("settings.save")}</Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <div className="space-y-4">
            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2"><Crown className="h-5 w-5 text-accent" /> {lang === "fr" ? "Votre abonnement" : "Your subscription"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Badge variant={isSubscribed ? "default" : "secondary"}>
                    {isSubscribed ? (lang === "fr" ? "Actif" : "Active") : isTrialActive ? (lang === "fr" ? "Essai gratuit" : "Free trial") : (lang === "fr" ? "Inactif" : "Inactive")}
                  </Badge>
                  <span className="text-2xl font-bold">79€<span className="text-sm font-normal text-muted-foreground">/mois</span></span>
                </div>
                {isTrialActive && !isSubscribed && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{lang === "fr" ? `Essai gratuit — ${daysLeft} jours restants` : `Free trial — ${daysLeft} days left`}</span>
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
                    {lang === "fr" ? "Ajouter un moyen de paiement" : "Add payment method"}
                  </Button>
                )}
                {isSubscribed && (
                  <Button variant="outline" onClick={handlePortal} disabled={portalLoading}>
                    {portalLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
                    {lang === "fr" ? "Gérer mon abonnement" : "Manage subscription"}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="integrations">
          <div className="space-y-4">
            {(["gmail", "outlook"] as const).map((provider) => {
              const integ = integrations?.find((i) => i.provider === provider);
              const meta = provider === "gmail"
                ? { label: "Gmail", desc: lang === "fr" ? "Synchronisez vos emails entrants" : "Sync incoming emails", icon: "📧" }
                : { label: "Outlook", desc: lang === "fr" ? "Importez vos emails Microsoft" : "Import your Microsoft emails", icon: "📬" };
              return (
                <Card key={provider}>
                  <CardContent className="py-4 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{meta.icon}</span>
                      <div className="min-w-0">
                        <p className="font-medium text-sm flex items-center gap-2">
                          {meta.label}
                          {integ?.status === "connected" && <Badge variant="secondary" className="text-xs">✓ {integ.email || (lang === "fr" ? "Connecté" : "Connected")}</Badge>}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {integ?.last_sync_at
                            ? `${lang === "fr" ? "Dernière sync :" : "Last sync:"} ${new Date(integ.last_sync_at).toLocaleString(lang === "fr" ? "fr-FR" : "en-US")}`
                            : meta.desc}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {integ?.status === "connected" ? (
                        <>
                          <Button variant="outline" size="sm" disabled={syncing === provider} onClick={() => syncProvider(provider)}>
                            {syncing === provider ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1" />}
                            {lang === "fr" ? "Synchroniser" : "Sync"}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => disconnectProvider(provider)}>
                            {lang === "fr" ? "Déconnecter" : "Disconnect"}
                          </Button>
                        </>
                      ) : (
                        <Button variant="outline" size="sm" disabled={connecting === provider} onClick={() => connectProvider(provider)}>
                          {connecting === provider ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Plug className="h-3.5 w-3.5 mr-1" />}
                          {lang === "fr" ? "Connecter" : "Connect"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}

            <Card>
              <CardContent className="py-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🔶</span>
                    <div>
                      <p className="font-medium text-sm">HubSpot</p>
                      <p className="text-xs text-muted-foreground">CRM sync via Private App Token</p>
                    </div>
                  </div>
                  {hubspotStatus === "connected" && <Badge variant="secondary" className="text-xs">✓ {lang === "fr" ? "Connecté" : "Connected"}</Badge>}
                  {hubspotStatus === "error" && <Badge variant="destructive" className="text-xs">{lang === "fr" ? "Erreur" : "Error"}</Badge>}
                </div>
                <div className="flex gap-2">
                  <Input type="password" placeholder="pat-na1-xxxxxxxx..." value={hubspotToken} onChange={(e) => setHubspotToken(e.target.value)} className="flex-1" />
                  <Button variant="outline" size="sm" disabled={!hubspotToken || hubspotStatus === "testing"} onClick={async () => {
                    setHubspotStatus("testing");
                    try {
                      const { data, error } = await supabase.functions.invoke("test-hubspot", { body: { token: hubspotToken } });
                      if (error) throw error;
                      if (data?.success) { setHubspotStatus("connected"); setHubspotInfo(`${data.contacts_count} contacts`); toast.success("HubSpot connected!"); }
                      else { setHubspotStatus("error"); toast.error(data?.error || "Error"); }
                    } catch (err: any) { setHubspotStatus("error"); toast.error(err.message || "Error"); }
                  }}>
                    {hubspotStatus === "testing" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plug className="h-3.5 w-3.5 mr-1" />}
                    {hubspotStatus === "testing" ? "Test..." : "Tester"}
                  </Button>
                </div>
                {hubspotInfo && <p className="text-xs text-muted-foreground">{hubspotInfo}</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="rgpd">
          <div className="space-y-4 max-w-lg">
            <Card>
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2"><Download className="h-5 w-5 text-accent" /> {lang === "fr" ? "Exporter mes données" : "Export my data"}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{lang === "fr" ? "Téléchargez l'ensemble de vos données au format JSON." : "Download all your data in JSON format."}</p>
                <Button onClick={exportData} disabled={exporting}>
                  {exporting ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Export...</> : <><Download className="h-4 w-4 mr-2" /> {lang === "fr" ? "Exporter toutes mes données" : "Export all my data"}</>}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive/30">
              <CardHeader><CardTitle className="text-base font-sans font-semibold flex items-center gap-2 text-destructive"><Trash2 className="h-5 w-5" /> {lang === "fr" ? "Supprimer mon compte" : "Delete my account"}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">{lang === "fr" ? "Cette action est irréversible." : "This action is irreversible."}</p>
                <Dialog open={deleteConfirm} onOpenChange={setDeleteConfirm}>
                  <DialogTrigger asChild>
                    <Button variant="destructive"><Trash2 className="h-4 w-4 mr-2" /> {lang === "fr" ? "Supprimer mon compte" : "Delete my account"}</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>{lang === "fr" ? "Confirmer la suppression" : "Confirm deletion"}</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">{lang === "fr" ? "Êtes-vous sûr ? Cette action est irréversible." : "Are you sure? This action is irreversible."}</p>
                    <div className="flex gap-3 mt-4">
                      <Button variant="outline" className="flex-1" onClick={() => setDeleteConfirm(false)}>{t("common.cancel")}</Button>
                      <Button variant="destructive" className="flex-1" onClick={deleteAccount}>{t("common.delete")}</Button>
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
