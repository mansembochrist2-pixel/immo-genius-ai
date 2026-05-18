import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CookieConsent } from "@/components/CookieConsent";
import { Suspense, lazy } from "react";

// Eager pages (landing & auth - first impression must be instant)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Retry wrapper: stale chunks after a redeploy throw "Importing a module script failed".
// We retry once, then force a hard reload so the user always lands on fresh assets.
const lazyWithRetry = <T extends { default: React.ComponentType<any> }>(
  factory: () => Promise<T>
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err) {
      try {
        await new Promise((r) => setTimeout(r, 300));
        return await factory();
      } catch (err2) {
        if (typeof window !== "undefined") {
          const key = "__chunk_reloaded__";
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, "1");
            window.location.reload();
          }
        }
        throw err2;
      }
    }
  });

// Lazy-loaded app modules (split per route for instant inter-module switch)
const ForgotPassword = lazyWithRetry(() => import("./pages/ForgotPassword"));
const Onboarding = lazyWithRetry(() => import("./pages/Onboarding"));
const Dashboard = lazyWithRetry(() => import("./pages/Dashboard"));
const Chasseur = lazyWithRetry(() => import("./pages/Chasseur"));
const Copilote = lazyWithRetry(() => import("./pages/Copilote"));
const Documents = lazyWithRetry(() => import("./pages/Documents"));
const EstimationIA = lazyWithRetry(() => import("./pages/EstimationIA"));
const Settings = lazyWithRetry(() => import("./pages/Settings"));
const Sauvegardes = lazyWithRetry(() => import("./pages/Sauvegardes"));
const MentionsLegales = lazyWithRetry(() => import("./pages/MentionsLegales"));
const PolitiqueConfidentialite = lazyWithRetry(() => import("./pages/PolitiqueConfidentialite"));
const CGU = lazyWithRetry(() => import("./pages/CGU"));
const FAQ = lazyWithRetry(() => import("./pages/FAQ"));
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      refetchOnWindowFocus: false,
    },
  },
});

// Lightweight fallback (matches bg → no black flash between routes)
const RouteFallback = () => <div className="min-h-screen bg-background" aria-hidden />;

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <LanguageProvider>
      <BusinessProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CookieConsent />
          <BrowserRouter>
            <Suspense fallback={<RouteFallback />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/landing" element={<Index />} />
                <Route path="/index" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/onboarding" element={<Onboarding />} />
                <Route path="/pricing" element={<Index />} />
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/chasseur" element={<Chasseur />} />
                <Route path="/radar" element={<Navigate to="/chasseur?tab=radar" replace />} />
                <Route path="/copilote" element={<Copilote />} />
                <Route path="/studio" element={<Documents />} />
                <Route path="/documents" element={<Navigate to="/studio" replace />} />
                <Route path="/estimation" element={<EstimationIA />} />
                <Route path="/sauvegardes" element={<Sauvegardes />} />
                <Route path="/settings" element={<Settings />} />
                <Route path="/faq" element={<FAQ />} />
                <Route path="/aide" element={<FAQ />} />
                <Route path="/inbox" element={<Navigate to="/dashboard" replace />} />
                <Route path="/agenda" element={<Navigate to="/dashboard" replace />} />
                <Route path="/clients" element={<Navigate to="/dashboard" replace />} />
                <Route path="/mentions-legales" element={<MentionsLegales />} />
                <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
                <Route path="/cgu" element={<CGU />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </BusinessProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

// Preload helpers (used by sidebar on hover/focus → switching is instant)
export const preloadRoute = {
  dashboard: () => import("./pages/Dashboard"),
  chasseur: () => import("./pages/Chasseur"),
  copilote: () => import("./pages/Copilote"),
  studio: () => import("./pages/Documents"),
  estimation: () => import("./pages/EstimationIA"),
  settings: () => import("./pages/Settings"),
};

export default App;
