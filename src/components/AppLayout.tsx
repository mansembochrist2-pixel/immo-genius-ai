import { ReactNode, createContext, useContext } from "react";
import { Outlet } from "react-router-dom";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { CreditsBadge } from "@/components/CreditsBadge";
import { Building2 } from "lucide-react";

/**
 * AppLayout — stable shell that wraps every authenticated route.
 *
 * Mounted ONCE as a layout route in App.tsx via <Route element={<AppLayout/>}>.
 * Pages may still wrap themselves in <AppLayout>{...}</AppLayout> for backwards
 * compatibility: in that case we detect the existing shell via context and just
 * pass children through, so the sidebar/header are not remounted on every
 * navigation (which used to cause a visible double-flash between modules).
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
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  </LayoutMountedContext.Provider>
);

export const AppLayout = ({ children }: { children?: ReactNode }) => {
  const alreadyMounted = useContext(LayoutMountedContext);
  // Used as a layout route: render Outlet inside the shell
  if (!children) return <Shell><Outlet /></Shell>;
  // Used as a wrapper inside a page: if the shell is already mounted by the
  // layout route, just pass children through. Otherwise mount the shell.
  if (alreadyMounted) return <>{children}</>;
  return <Shell>{children}</Shell>;
};
