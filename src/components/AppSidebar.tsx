import {
  LayoutDashboard, Mail, Bot, Radar, Users, LogOut, Settings, FileText, Shield, ScrollText, CalendarDays, FileEdit, TrendingUp
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

export function AppSidebar() {
  const { logout, user } = useAuth();
  const { t, lang } = useLanguage();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const navItems = [
    { title: t("nav.dashboard"), url: "/dashboard", icon: LayoutDashboard, hint: lang === "fr" ? "Vue d'ensemble : KPIs, ventes, prospects chauds, actions du jour." : "Overview: KPIs, sales, hot prospects, today's actions." },
    { title: t("nav.inbox"), url: "/inbox", icon: Mail, hint: lang === "fr" ? "Boîte unifiée email/SMS analysée par l'IA (intention, urgence, réponses)." : "Unified inbox analyzed by AI (intent, urgency, replies)." },
    { title: t("nav.agenda"), url: "/agenda", icon: CalendarDays, hint: lang === "fr" ? "Agenda intelligent avec briefs IA avant chaque RDV." : "Smart calendar with AI briefs before each meeting." },
    { title: t("nav.clients"), url: "/clients", icon: Users, hint: lang === "fr" ? "CRM enrichi : scores IA, motivation, freins, prochaine action." : "Enriched CRM: AI scores, motivation, blockers, next action." },
    { title: t("nav.documents"), url: "/documents", icon: FileEdit, hint: lang === "fr" ? "Mandats, annonces et marketing générés par l'IA, modifiables." : "AI-generated mandates, listings and marketing, editable." },
    { title: t("nav.estimation"), url: "/estimation", icon: TrendingUp, hint: lang === "fr" ? "Estimation IA basée sur DVF, INSEE et données locales." : "AI estimation based on DVF, INSEE and local data." },
    { title: t("nav.radar"), url: "/radar", icon: Radar, hint: lang === "fr" ? "Détection d'opportunités vendeurs et plans d'attaque commerciaux." : "Detect seller opportunities and sales attack plans." },
    { title: t("nav.copilote"), url: "/copilote", icon: Bot, hint: lang === "fr" ? "Copilote stratégique connecté à toutes vos données business." : "Strategic copilot connected to all your business data." },
  ];

  const legalItems = [
    { title: t("nav.mentions"), url: "/mentions-legales", icon: FileText },
    { title: t("nav.privacy"), url: "/politique-confidentialite", icon: Shield },
    { title: t("nav.terms"), url: "/cgu", icon: ScrollText },
  ];

  return (
    <TooltipProvider delayDuration={300}>
    <Sidebar className="border-r border-border">
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-bold font-display tracking-tight gradient-text">Estate AI</h1>
        <p className="text-xs mt-0.5 text-muted-foreground">{displayName}</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest font-medium">Modules</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <SidebarMenuButton asChild>
                        <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm">
                          <item.icon className="h-4 w-4" />
                          <span>{item.title}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="max-w-[240px]">
                      <p className="text-xs">{item.hint}</p>
                    </TooltipContent>
                  </Tooltip>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest font-medium">{t("nav.legal")}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-xs" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border p-3 space-y-1">
        <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-sm" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          <Settings className="h-4 w-4" />
          <span>{t("nav.settings")}</span>
        </NavLink>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={async () => { await logout(); window.location.assign("/"); }}>
          <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
