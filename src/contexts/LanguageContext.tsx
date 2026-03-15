import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type Lang = "fr" | "en";

const translations: Record<Lang, Record<string, string>> = {
  fr: {
    // Sidebar
    "nav.dashboard": "Dashboard Business",
    "nav.inbox": "Inbox Intelligence",
    "nav.agenda": "Agenda IA",
    "nav.clients": "Mémoire Client",
    "nav.documents": "Documents IA",
    "nav.estimation": "Estimation IA",
    "nav.radar": "Radar Prospection",
    "nav.copilote": "Copilote Stratégique",
    "nav.settings": "Paramètres",
    "nav.logout": "Déconnexion",
    "nav.legal": "Légal",
    "nav.mentions": "Mentions légales",
    "nav.privacy": "Confidentialité",
    "nav.terms": "CGU",
    // Dashboard
    "dash.hello": "Bonjour,",
    "dash.subtitle": "Qu'est-ce que vous devez faire aujourd'hui pour avancer votre business ?",
    "dash.objectif_ca": "Objectif CA",
    "dash.clients_actifs": "Clients actifs",
    "dash.inbox_unread": "Inbox non lus",
    "dash.opportunities": "Opportunités",
    "dash.rdv_today": "RDV aujourd'hui",
    "dash.see_clients": "Voir les fiches →",
    "dash.open_inbox": "Ouvrir l'inbox →",
    "dash.analyze": "Analyser →",
    "dash.see_agenda": "Voir l'agenda →",
    "dash.define_objective": "Définir objectif →",
    "dash.actions_title": "Actions recommandées",
    "dash.no_actions": "Aucune action en attente. Utilisez le Copilote pour en générer.",
    "dash.rdv_title": "Rendez-vous du jour",
    "dash.no_rdv": "Rien de prévu aujourd'hui",
    "dash.hot_prospects": "Prospects chauds",
    "dash.no_hot": "Aucun prospect chaud. Enrichissez vos fiches clients avec l'IA.",
    "dash.see_all": "Voir tout",
    // Copilote
    "copilote.title": "Copilote",
    "copilote.strategic": "Stratégique",
    "copilote.subtitle": "Votre assistant stratégique connecté à toutes vos données",
    "copilote.conversations": "Conversations",
    "copilote.no_conv": "Aucune conversation",
    "copilote.context": "Contexte actif",
    "copilote.quick_actions": "Actions rapides",
    "copilote.placeholder": "Posez une question à votre copilote...",
    "copilote.welcome": "Bonjour, je suis votre Copilote Stratégique",
    "copilote.welcome_sub": "Posez-moi n'importe quelle question sur votre activité, vos clients, ou votre stratégie.",
    "copilote.model": "GPT-5.2",
    // Inbox
    "inbox.title": "Inbox",
    "inbox.intelligence": "Intelligence",
    "inbox.subtitle": "Analyse IA automatique • Réponse optimisée • Suivi intelligent",
    "inbox.search": "Rechercher...",
    "inbox.all": "Tous",
    "inbox.unread": "Non lus",
    "inbox.urgent": "Urgents",
    "inbox.incoming": "Entrants",
    "inbox.reply_placeholder": "Répondre à ce message...",
    "inbox.analyze": "Analyser ce contact",
    "inbox.analyzing": "Analyse...",
    "inbox.select_message": "Sélectionnez un message",
    // Documents
    "docs.title": "Documents",
    "docs.ia": "IA",
    "docs.subtitle": "Mandats, annonces, contenus marketing et documents professionnels",
    "docs.mandats": "Mandats",
    "docs.annonces": "Annonces",
    "docs.marketing": "Marketing",
    "docs.generate": "Générer",
    "docs.generating": "Génération en cours...",
    "docs.copy": "Copier",
    "docs.modify": "Modifier",
    "docs.download_pdf": "Télécharger PDF",
    // Settings
    "settings.title": "Paramètres",
    "settings.subtitle": "Gérez votre profil, abonnement et données",
    "settings.profile": "Profil",
    "settings.billing": "Abonnement",
    "settings.integrations": "Intégrations",
    "settings.rgpd": "RGPD",
    "settings.personal_info": "Informations personnelles",
    "settings.language": "Langue de l'interface",
    "settings.save": "Enregistrer",
    "settings.saving": "Enregistrement...",
    // Clients
    "clients.download_pdf": "📄 Télécharger PDF",
    "clients.ai_summary": "Résumé IA",
    "clients.strategy": "Stratégie adaptée",
    "clients.interactions": "Historique interactions",
    "clients.no_interactions": "Aucune interaction rattachée.",
    // Common
    "common.copilote": "Copilote",
    "common.agenda": "Agenda",
    "common.loading": "Chargement...",
    "common.error": "Erreur",
    "common.success": "Succès",
    "common.cancel": "Annuler",
    "common.save": "Enregistrer",
    "common.delete": "Supprimer",
    "common.edit": "Modifier",
    "common.copy": "Copier",
    "common.copied": "Copié !",
    "common.generated_by": "Généré par Estate AI",
  },
  en: {
    // Sidebar
    "nav.dashboard": "Business Dashboard",
    "nav.inbox": "Inbox Intelligence",
    "nav.agenda": "AI Agenda",
    "nav.clients": "Client Memory",
    "nav.documents": "AI Documents",
    "nav.estimation": "AI Estimation",
    "nav.radar": "Prospecting Radar",
    "nav.copilote": "Strategic Copilot",
    "nav.settings": "Settings",
    "nav.logout": "Log out",
    "nav.legal": "Legal",
    "nav.mentions": "Legal Notice",
    "nav.privacy": "Privacy",
    "nav.terms": "Terms",
    // Dashboard
    "dash.hello": "Hello,",
    "dash.subtitle": "What should you focus on today to grow your business?",
    "dash.objectif_ca": "Revenue Goal",
    "dash.clients_actifs": "Active Clients",
    "dash.inbox_unread": "Unread Inbox",
    "dash.opportunities": "Opportunities",
    "dash.rdv_today": "Today's Meetings",
    "dash.see_clients": "View clients →",
    "dash.open_inbox": "Open inbox →",
    "dash.analyze": "Analyze →",
    "dash.see_agenda": "View agenda →",
    "dash.define_objective": "Set goal →",
    "dash.actions_title": "Recommended Actions",
    "dash.no_actions": "No pending actions. Use the Copilot to generate some.",
    "dash.rdv_title": "Today's Appointments",
    "dash.no_rdv": "Nothing scheduled today",
    "dash.hot_prospects": "Hot Prospects",
    "dash.no_hot": "No hot prospects. Enrich your client profiles with AI.",
    "dash.see_all": "See all",
    // Copilote
    "copilote.title": "Strategic",
    "copilote.strategic": "Copilot",
    "copilote.subtitle": "Your strategic assistant connected to all your data",
    "copilote.conversations": "Conversations",
    "copilote.no_conv": "No conversations",
    "copilote.context": "Active Context",
    "copilote.quick_actions": "Quick Actions",
    "copilote.placeholder": "Ask your copilot a question...",
    "copilote.welcome": "Hello, I'm your Strategic Copilot",
    "copilote.welcome_sub": "Ask me anything about your business, clients, or strategy.",
    "copilote.model": "GPT-5.2",
    // Inbox
    "inbox.title": "Inbox",
    "inbox.intelligence": "Intelligence",
    "inbox.subtitle": "Auto AI analysis • Optimized response • Smart tracking",
    "inbox.search": "Search...",
    "inbox.all": "All",
    "inbox.unread": "Unread",
    "inbox.urgent": "Urgent",
    "inbox.incoming": "Incoming",
    "inbox.reply_placeholder": "Reply to this message...",
    "inbox.analyze": "Analyze this contact",
    "inbox.analyzing": "Analyzing...",
    "inbox.select_message": "Select a message",
    // Documents
    "docs.title": "Documents",
    "docs.ia": "AI",
    "docs.subtitle": "Mandates, listings, marketing content and professional documents",
    "docs.mandats": "Mandates",
    "docs.annonces": "Listings",
    "docs.marketing": "Marketing",
    "docs.generate": "Generate",
    "docs.generating": "Generating...",
    "docs.copy": "Copy",
    "docs.modify": "Edit",
    "docs.download_pdf": "Download PDF",
    // Settings
    "settings.title": "Settings",
    "settings.subtitle": "Manage your profile, subscription and data",
    "settings.profile": "Profile",
    "settings.billing": "Subscription",
    "settings.integrations": "Integrations",
    "settings.rgpd": "GDPR",
    "settings.personal_info": "Personal Information",
    "settings.language": "Interface Language",
    "settings.save": "Save",
    "settings.saving": "Saving...",
    // Clients
    "clients.download_pdf": "📄 Download PDF",
    "clients.ai_summary": "AI Summary",
    "clients.strategy": "Recommended Strategy",
    "clients.interactions": "Interactions History",
    "clients.no_interactions": "No linked interactions.",
    // Common
    "common.copilote": "Copilot",
    "common.agenda": "Agenda",
    "common.loading": "Loading...",
    "common.error": "Error",
    "common.success": "Success",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.delete": "Delete",
    "common.edit": "Edit",
    "common.copy": "Copy",
    "common.copied": "Copied!",
    "common.generated_by": "Generated by Estate AI",
  },
};

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "fr",
  setLang: () => {},
  t: (key) => key,
});

export const useLanguage = () => useContext(LanguageContext);

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>("fr");
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      supabase
        .from("profiles")
        .select("preferred_language")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (data?.preferred_language === "en" || data?.preferred_language === "fr") {
            setLangState(data.preferred_language as Lang);
          }
        });
    }
  }, [user]);

  const setLang = async (newLang: Lang) => {
    setLangState(newLang);
    if (user) {
      await supabase.from("profiles").update({ preferred_language: newLang } as any).eq("id", user.id);
    }
  };

  const t = (key: string) => translations[lang]?.[key] || translations.fr[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
