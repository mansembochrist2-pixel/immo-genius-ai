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

export function AppSidebar() {
  const { logout, user } = useAuth();
  const { t } = useLanguage();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const navItems = [
    { title: t("nav.dashboard"), url: "/", icon: LayoutDashboard },
    { title: t("nav.inbox"), url: "/inbox", icon: Mail },
    { title: t("nav.agenda"), url: "/agenda", icon: CalendarDays },
    { title: t("nav.clients"), url: "/clients", icon: Users },
    { title: t("nav.documents"), url: "/documents", icon: FileEdit },
    { title: t("nav.estimation"), url: "/estimation", icon: TrendingUp },
    { title: t("nav.radar"), url: "/radar", icon: Radar },
    { title: t("nav.copilote"), url: "/copilote", icon: Bot },
  ];

  const legalItems = [
    { title: t("nav.mentions"), url: "/mentions-legales", icon: FileText },
    { title: t("nav.privacy"), url: "/politique-confidentialite", icon: Shield },
    { title: t("nav.terms"), url: "/cgu", icon: ScrollText },
  ];

  return (
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
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
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
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />{t("nav.logout")}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
