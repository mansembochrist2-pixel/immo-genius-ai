import {
  LayoutDashboard, Users, CheckSquare, Megaphone, MapPin, Bot, LogOut, Settings, FileSpreadsheet, FileText, Shield, ScrollText } from
"lucide-react";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarFooter } from
"@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
{ title: "Dashboard", url: "/", icon: LayoutDashboard },
{ title: "Prospects", url: "/prospects", icon: Users },
{ title: "Tâches", url: "/taches", icon: CheckSquare },
{ title: "Marketing", url: "/marketing", icon: Megaphone },
{ title: "Prospection", url: "/prospection", icon: MapPin },
{ title: "Assistant IA", url: "/assistant", icon: Bot },
{ title: "Import CSV", url: "/import", icon: FileSpreadsheet }];


const legalItems = [
{ title: "Mentions légales", url: "/mentions-legales", icon: FileText },
{ title: "Confidentialité", url: "/politique-confidentialite", icon: Shield },
{ title: "CGU", url: "/cgu", icon: ScrollText }];


export function AppSidebar() {
  const { logout, user } = useAuth();
  const displayName = user?.user_metadata?.full_name || user?.email?.split("@")[0] || "";

  return (
    <Sidebar className="border-r border-border/30">
      <div className="p-5 border-b border-border/30">
        <h1 className="text-lg font-bold font-display tracking-tight gradient-text">Estate AI</h1>
        <p className="text-xs mt-0.5 text-sidebar-foreground/50">{displayName}</p>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest font-medium">Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} end={item.url === "/"} className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground transition-all duration-200" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-sm">
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/40 uppercase text-[10px] tracking-widest font-medium">Légal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {legalItems.map((item) =>
              <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink to={item.url} className="flex items-center gap-3 px-3 py-2 rounded-lg text-sidebar-foreground/40 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-xs" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground">
                      <item.icon className="h-3.5 w-3.5" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="border-t border-border/30 p-3 space-y-1">
        <NavLink to="/settings" className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sidebar-foreground/50 hover:bg-sidebar-accent/30 hover:text-sidebar-accent-foreground transition-all duration-200 text-sm" activeClassName="bg-sidebar-accent text-sidebar-accent-foreground font-medium">
          <Settings className="h-4 w-4" />
          <span>Paramètres</span>
        </NavLink>
        <Button variant="ghost" className="w-full justify-start text-sidebar-foreground/50 hover:text-destructive hover:bg-destructive/10" onClick={logout}>
          <LogOut className="h-4 w-4 mr-2" />Déconnexion
        </Button>
      </SidebarFooter>
    </Sidebar>);

}
