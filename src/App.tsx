import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CookieConsent } from "@/components/CookieConsent";
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError, lazyWithRetry, routeLoaders } from "@/lib/routeLoader";

// Eager pages (landing & auth - first impression must be instant)
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Lazy-loaded app modules (split per route for instant inter-module switch)
const ForgotPassword = lazyWithRetry(routeLoaders.forgotPassword);
const Onboarding = lazyWithRetry(routeLoaders.onboarding);
const Dashboard = lazyWithRetry(routeLoaders.dashboard);
const Chasseur = lazyWithRetry(routeLoaders.chasseur);
const Copilote = lazyWithRetry(routeLoaders.copilote);
const Documents = lazyWithRetry(routeLoaders.studio);
const EstimationIA = lazyWithRetry(routeLoaders.estimation);
const Expertise = lazyWithRetry(routeLoaders.expertise);
const Settings = lazyWithRetry(routeLoaders.settings);
const Sauvegardes = lazyWithRetry(routeLoaders.sauvegardes);
const MentionsLegales = lazyWithRetry(routeLoaders.mentionsLegales);
const PolitiqueConfidentialite = lazyWithRetry(routeLoaders.politiqueConfidentialite);
const CGU = lazyWithRetry(routeLoaders.cgu);
const FAQ = lazyWithRetry(routeLoaders.faq);
const NotFound = lazyWithRetry(routeLoaders.notFound);

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

class ChunkErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError(error: unknown) {
    return { hasError: isChunkLoadError(error) };
  }

  componentDidCatch(error: unknown, _info: ErrorInfo) {
    if (!isChunkLoadError(error)) throw error;
  }

  render() {
    if (this.state.hasError) {
      return <RouteFallback />;
    }

    return this.props.children;
  }
}

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
            <ChunkErrorBoundary>
              <Suspense fallback={<RouteFallback />}>
                <Routes>
                  <Route path="/" element={<Index />} />
                  <Route path="/landing" element={<Index />} />
                  <Route path="/index" element={<Index />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<Signup />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/onboarding" element={<Onboarding />} />
                  <Route path="/pricing" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/chasseur" element={<Chasseur />} />
                  <Route path="/radar" element={<Navigate to="/chasseur?tab=radar" replace />} />
                  <Route path="/copilote" element={<Copilote />} />
                  <Route path="/studio" element={<Documents />} />
                  <Route path="/documents" element={<Navigate to="/studio" replace />} />
                  <Route path="/estimation" element={<EstimationIA />} />
                  <Route path="/valorisation" element={<EstimationIA />} />
                  <Route path="/expertise" element={<Expertise />} />
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
            </ChunkErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </BusinessProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
