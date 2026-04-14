import { ReactNode, useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { AppSidebar } from "@/components/AppSidebar";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { NotificationBell } from "@/components/NotificationBell";
import { supabase } from "@/integrations/supabase/client";
import realEstateBg from "@/assets/real-estate-bg.jpg";

export const AppLayout = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  useEffect(() => {
    if (user) {
      supabase.from("profiles").select("onboarding_completed").eq("id", user.id).single()
        .then(({ data }) => {
          setNeedsOnboarding(!data?.onboarding_completed);
          setOnboardingChecked(true);
        });
    }
  }, [user]);

  if (loading || (isAuthenticated && !onboardingChecked)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  if (needsOnboarding) {
    return <Navigate to="/onboarding" replace />;
  }

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
          <div className="flex-1 p-6 lg:p-8 animate-fade-in">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
};
