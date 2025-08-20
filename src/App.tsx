import { ErrorBoundary } from '@/components/ErrorBoundary'
import { Toaster } from "@/components/ui/toaster"
import { Toaster as Sonner } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import { Navigation } from "@/components/Navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";

import Index from "./pages/Index";
import Auth from "./pages/Auth";
import QuickFeedback from "./pages/QuickFeedback";
import Dashboard from "./pages/Dashboard";
import QRStudio from "./pages/QRStudio";
import Marketing from "./pages/Marketing";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const AppContent = () => {
  const location = useLocation();
  const hideNavigation = location.pathname === '/quick-feedback' ||
                         location.pathname.includes('/quick-feedback');

  return (
    <>
      {!hideNavigation && <Navigation />}
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth" element={<Auth />} />

        {/* Legacy routes for backward compatibility */}
        <Route path="/quick-feedback" element={<QuickFeedback />} />

        {/* Tenant-specific routes */}
        <Route path="/:tenantSlug/quick-feedback" element={<QuickFeedback />} />
        <Route path="/:tenantSlug/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path=":tenantSlug/qr-studio" element={
          <ProtectedRoute>
            <QRStudio />
          </ProtectedRoute>
        } />
        <Route path="/:tenantSlug/marketing" element={
          <ProtectedRoute>
            <Marketing />
          </ProtectedRoute>
        } />

        {/* Legacy protected routes for backward compatibility */}
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } />
        <Route path="/marketing" element={
          <ProtectedRoute>
            <Marketing />
          </ProtectedRoute>
        } />

        {/* Static pages */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/security" element={<Security />} />

        {/* Catch-all route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
};

const App = () => {
  
  return (
    <ErrorBoundary>
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppContent />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
  </ErrorBoundary>
  )
}

export default App;
