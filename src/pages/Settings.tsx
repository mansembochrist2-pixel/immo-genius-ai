import { useState, useEffect } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Settings as SettingsIcon, User, Download, Shield, Trash2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { profileSchema, validateOrError } from "@/lib/validators";
import { handleApiError } from "@/lib/error-handler";

const Settings = () => {
  const { user, logout } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const queryClient = useQueryClient();
  const [profileForm, setProfileForm] = useState({ full_name: "", email: "", phone: "", agency_name: "", objectif_ca: "" });
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [exporting, setExporting] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle();
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
        objectif_ca: profile.objectif_ca?.toString() || "",
      });
    }
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const validationError = validateOrError(profileSchema, profileForm);
      if (validationError) throw new Error(validationError);
      const { error } = await supabase.from("profiles").update({
        full_name: profileForm.full_name,
        email: profileForm.email,
        phone: profileForm.phone,
        agency_name: profileForm.agency_name,
        objectif_ca: profileForm.objectif_ca ? Number(profileForm.objectif_ca) : 0,
      }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["profile"] }); toast.success(lang === "fr" ? "Profil mis à jour" : "Profile updated"); },
    onError: (e: any) => handleApiError(e, lang === "fr" ? "Mise à jour du profil" : "Profile update"),
  });

  const exportData = async () => {
    setExporting(true);
    try {
      const [annonces, analyses, pige, opportunites, audits, expertises] = await Promise.all([
        supabase.from("annonces").select("*"),
        supabase.from("analyses_zone").select("*"),
        supabase.from("annonces_pige").select("*"),
        supabase.from("opportunites").select("*"),
        supabase.from("audits_reseaux").select("*"),
        supabase.from("expertise_reports").select("*"),
      ]);
      const exportObj = {
        export_date: new Date().toISOString(),
        profile,
        annonces: annonces.data || [],
        analyses_zone: analyses.data || [],
        annonces_pige: pige.data || [],
        opportunites: opportunites.data || [],
        audits_reseaux: audits.data || [],
        expertise_reports: expertises.data || [],
      };
      const blob = new Blob([JSON.stringify(exportObj, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = `estate-ai-export-${new Date().toISOString().split("T")[0]}.json`; a.click(); URL.revokeObjectURL(url);
      toast.success(lang === "fr" ? "Données exportées" : "Data exported");
    } catch { toast.error("Erreur"); } finally { setExporting(false); }
  };

  const deleteAccount = async () => {
    try {
      await Promise.all([
        supabase.from("annonces").delete().eq("user_id", user!.id),
        supabase.from("analyses_zone").delete().eq("user_id", user!.id),
        supabase.from("annonces_pige").delete().eq("user_id", user!.id),
        supabase.from("opportunites").delete().eq("user_id", user!.id),
        supabase.from("audits_reseaux").delete().eq("user_id", user!.id),
        supabase.from("expertise_reports").delete().eq("user_id", user!.id),
        supabase.from("conversations").delete().eq("user_id", user!.id),
        supabase.from("actions_recommandees").delete().eq("user_id", user!.id),
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



                <Button type="submit" disabled={updateProfile.isPending}>{updateProfile.isPending ? t("settings.saving") : t("settings.save")}</Button>
              </form>
            </CardContent>
          </Card>
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
