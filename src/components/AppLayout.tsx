import { ReactNode } from "react";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import realEstateBg from "@/assets/real-estate-bg.jpg";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  // Mode audit : authentification désactivée, tous les modules sont publics
  return (
    <SidebarProvider>
      <div
        className="min-h-screen flex w-full bg-background real-estate-bg"
        style={{ "--bg-image": `url(${realEstateBg})` } as React.CSSProperties}
      >
        <AppSidebar />
        <main className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border bg-card/80 backdrop-blur-xl px-4 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="ml-auto flex items-center gap-3">
              <NotificationBell />
              <span className="text-sm font-semibold gradient-text">Estate AI</span>
            </div>
          </header>
          <div className="flex-1 p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
