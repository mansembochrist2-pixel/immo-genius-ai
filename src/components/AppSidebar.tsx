import {
  LayoutDashboard, Bot, LogOut, Settings, FileText, Shield, ScrollText,
  TrendingUp, HelpCircle, Crosshair, Palette,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { preloadRoute } from "@/lib/routeLoader";

export function AppSidebar() {
  const { logout, user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  const navItems = [
    { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, hint: "Vue d'ensemble : performance, pige, opportunités.", preload: preloadRoute.dashboard },
    { title: "Chasseur de Mandats", url: "/chasseur", icon: Crosshair, hint: "Radar de prospection + Pige IA pour conquérir des mandats.", preload: preloadRoute.chasseur },
    { title: "Valorisation", url: "/valorisation/estimation", icon: TrendingUp, hint: "Estimation DVF + Expertise rentabilité & valorisation patrimoniale.", preload: preloadRoute.estimation },
    { title: "Studio IA", url: "/studio", icon: Palette, hint: "Annonces, posts, scripts d'appel et contenus marketing.", preload: preloadRoute.studio },
    { title: "Copilote", url: "/copilote", icon: Bot, hint: "Coach commercial IA : pige, négociation, conquête de mandats.", preload: preloadRoute.copilote },
  ];

  const legalItems = [
    { title: "Légal & RGPD", url: "/legal", icon: Shield },
  ];

  return (
    <TooltipProvider delayDuration={300}>
    <Sidebar className="border-r border-border">
      <div className="p-5 border-b border-border">
        <h1 className="text-lg font-bold font-display tracking-tight gradient-text">ImmoGenius AI</h1>
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
                        <NavLink
                          to={item.url}
                          end={item.url === "/"}
                          onMouseEnter={() => item.preload?.()}
                          onFocus={() => item.preload?.()}
                          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200"
                          activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm"
                        >
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
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest font-medium">Légal</SidebarGroupLabel>
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
        <NavLink to="/faq" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-sm" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          <HelpCircle className="h-4 w-4" />
          <span>Aide & FAQ</span>
        </NavLink>
        <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-sm" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          <Settings className="h-4 w-4" />
          <span>Paramètres</span>
        </NavLink>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={async () => { await logout(); window.location.assign("/"); }}>
          <LogOut className="h-4 w-4 mr-2" />Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>
    </TooltipProvider>
  );
}
