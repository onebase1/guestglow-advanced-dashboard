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
import TenantAuth from "./pages/TenantAuth";
import Unauthorized from "./pages/Unauthorized";
import QuickFeedback from "./pages/QuickFeedback";
import Dashboard from "./pages/Dashboard";
import QRStudio from "./pages/QRStudio";
import Marketing from "./pages/Marketing";
import GoLiveConfiguration from "./pages/GoLiveConfiguration";
import Privacy from "./pages/Privacy";
import Terms from "./pages/Terms";
import Security from "./pages/Security";
import NotFound from "./pages/NotFound";
import ResetPassword from "./pages/ResetPassword";
import AccessRequests from "./pages/AccessRequests";
import UsersAndRoles from "./pages/UsersAndRoles";



import { TenantAuthMiddleware } from "./middleware/TenantAuthMiddleware";

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
        <Route path="/unauthorized" element={<Unauthorized />} />

        {/* Legacy routes for backward compatibility */}
        <Route path="/quick-feedback" element={<QuickFeedback />} />

        {/* 🔐 TENANT-SCOPED AUTHENTICATION */}
        <Route path="/:tenantSlug/auth" element={<TenantAuth />} />
        <Route path="/:tenantSlug/reset-password" element={<TenantAuthMiddleware requireAuth={false}>
          <ResetPassword />
        </TenantAuthMiddleware>} />
        <Route path="/:tenantSlug/access-requests" element={<TenantAuthMiddleware requireAuth={true} allowedRoles={["admin"]}>
          <AccessRequests />
        </TenantAuthMiddleware>} />
        <Route path="/:tenantSlug/users" element={<TenantAuthMiddleware requireAuth={true} allowedRoles={["admin"]}>
          <UsersAndRoles />
        </TenantAuthMiddleware>} />

        {/* 🛡️ TENANT-SPECIFIC PROTECTED ROUTES */}
        <Route path="/:tenantSlug/quick-feedback" element={
          <TenantAuthMiddleware requireAuth={false}>
            <QuickFeedback />
          </TenantAuthMiddleware>
        } />
        <Route path="/:tenantSlug/dashboard" element={
          <TenantAuthMiddleware requireAuth={true}>
            <Dashboard />
          </TenantAuthMiddleware>
        } />
        <Route path="/:tenantSlug/qr-studio" element={
          <TenantAuthMiddleware requireAuth={true}>
            <QRStudio />
          </TenantAuthMiddleware>
        } />
        <Route path="/:tenantSlug/marketing" element={
          <TenantAuthMiddleware requireAuth={true}>
            <Marketing />
          </TenantAuthMiddleware>
        } />
        <Route path="/:tenantSlug/go-live-config" element={
          <TenantAuthMiddleware requireAuth={true}>
            <GoLiveConfiguration />
          </TenantAuthMiddleware>
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
        <Route path="/go-live-config" element={
          <ProtectedRoute>
            <GoLiveConfiguration />
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
