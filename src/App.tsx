import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { BusinessProvider } from "@/contexts/BusinessContext";
import { CookieConsent } from "@/components/CookieConsent";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import CentreActions from "./pages/CentreActions";
import Inbox from "./pages/Inbox";
import Copilote from "./pages/Copilote";
import Radar from "./pages/Radar";
import Clients from "./pages/Clients";
import Studio from "./pages/Studio";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import MentionsLegales from "./pages/MentionsLegales";
import PolitiqueConfidentialite from "./pages/PolitiqueConfidentialite";
import CGU from "./pages/CGU";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <BusinessProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <CookieConsent />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/pricing" element={<Pricing />} />
              <Route path="/" element={<Dashboard />} />
              <Route path="/actions" element={<CentreActions />} />
              <Route path="/inbox" element={<Inbox />} />
              <Route path="/copilote" element={<Copilote />} />
              <Route path="/radar" element={<Radar />} />
              <Route path="/clients" element={<Clients />} />
              <Route path="/studio" element={<Studio />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="/mentions-legales" element={<MentionsLegales />} />
              <Route path="/politique-confidentialite" element={<PolitiqueConfidentialite />} />
              <Route path="/cgu" element={<CGU />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </BusinessProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
