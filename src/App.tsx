import { Toaster } from "@/components/ui/toaster";
import { LanguageProvider } from "@/contexts/LanguageContext";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CookieConsent } from "@/components/CookieConsent";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import Dashboard from "./pages/Dashboard";
import Chasseur from "./pages/Chasseur";
import Copilote from "./pages/Copilote";
import Documents from "./pages/Documents";
import EstimationIA from "./pages/EstimationIA";
import Settings from "./pages/Settings";
import Sauvegardes from "./pages/Sauvegardes";
import MentionsLegales from "./pages/MentionsLegales";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import CGU from "./pages/CGU";
import FAQ from "./pages/FAQ";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

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
          </BrowserRouter>
        </TooltipProvider>
      </BusinessProvider>
      </LanguageProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
