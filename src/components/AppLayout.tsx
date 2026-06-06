import { ReactNode, Suspense, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Building2 } from "lucide-react";

/**
 * AppLayout — stable shell that wraps every authenticated route.
 *
 * IMPORTANT — Suspense lives INSIDE the shell, around the content area only.
 * Without this, the outer <Suspense> in App.tsx unmounts the WHOLE app
 * (sidebar + header + content) every time a lazy module chunk loads, which
 * caused the visible double-flash when switching modules.
 */
const LayoutMountedContext = createContext(false);

const Shell = ({ children }: { children: ReactNode }) => (
  <LayoutMountedContext.Provider value={true}>
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground relative">
        <div className="scene-grid" />
        <div className="scene-mesh" />
        <AppSidebar />
        <main className="flex-1 flex flex-col relative">
          <header className="h-14 flex items-center border-b border-border/70 bg-background/95 px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <CreditsBadge />
              <NotificationBell />
              <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border/70 bg-surface-1/60">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-display font-medium tracking-tight">ImmoGenius<span className="text-primary"> AI</span></span>
              </div>
            </div>
          </header>
          <div className="flex-1 p-6 lg:p-8 relative">
            <Suspense fallback={null}>{children}</Suspense>
          </div>
        </main>
      </div>
    </SidebarProvider>
  </LayoutMountedContext.Provider>
);

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const alreadyMounted = useContext(LayoutMountedContext);
  // Layout route: render Outlet inside the shell
  if (!children) return <Shell><Outlet /></Shell>;
  // Shell already mounted higher up: pass through (no nested Suspense)
  if (alreadyMounted) return <>{children}</>;
  return <Shell>{children}</Shell>;
};
