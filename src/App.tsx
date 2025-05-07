import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { OutletProvider } from "@/contexts/OutletContext";
import { createClient } from "@supabase/supabase-js";
import { SessionContextProvider } from "@supabase/auth-helpers-react";
import Index from "./pages/Index";
import Dashboard from "./components/Dashboard";
import StoreCustomizer from "./components/StoreCustomizer";
import StoreFront from "./components/store/StoreFront";
import SubdomainStoreFront from "./components/store/SubdomainStoreFront";
import LoginPage from "./components/LoginPage";
import SignupPage from "./components/SignupPage";
import OrderManagement from "./components/store/OrderManagement";
import PayoutsManagement from "./components/store/PayoutsManagement";
import NotFound from "./pages/NotFound";
import ProductsLayout from "./components/products/ProductsLayout";
import ProductForm from "./components/products/ProductForm";
import { useAuth } from "@/contexts/AuthContext";
import DashboardLayout from "./layouts/DashboardLayout";
import { dashboardRoutes } from "./routes";
import getEnvironmentConfig, { isLocalhost } from "./config/environment";

const queryClient = new QueryClient();
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

// Protected Route Component with DashboardLayout
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

// Detect if we're on a custom subdomain
const isCustomSubdomain = () => {
  const { enableSubdomainRouting, isDevelopment, isVercelPreview, hostname } = getEnvironmentConfig();
  
  // If subdomain routing is disabled via config, return false immediately
  if (!enableSubdomainRouting) {
    return false;
  }
  
  // For localhost/development, check if there's a store query parameter
  if (isLocalhost() || isDevelopment) {
    return new URLSearchParams(window.location.search).has('store');
  }
  
  // Skip subdomain routing for Vercel preview domains
  if (isVercelPreview) {
    return false;
  }
  
  // For production domains with custom domain, check if we're on a subdomain
  const parts = hostname.split('.');
  
  // Proper subdomain check (e.g., store.yourdomain.com)
  if (parts.length >= 3) {
    // Exclude common non-store subdomains
    const subdomain = parts[0].toLowerCase();
    const excludedSubdomains = ['www', 'app', 'api', 'admin', 'dev', 'staging', 'test'];
    return !excludedSubdomains.includes(subdomain);
  }
  
  return false;
};

const Root = () => {
  // Determine if we should use subdomain routing
  const useSubdomainRouting = isCustomSubdomain();
  
  // If we're on a custom subdomain (or have store query param in development),
  // render the store directly without the dashboard routes
  if (useSubdomainRouting) {
    return (
      <QueryClientProvider client={queryClient}>
        <SessionContextProvider supabaseClient={supabase}>
        <AuthProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/*" element={<SubdomainStoreFront />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
        </SessionContextProvider>
      </QueryClientProvider>
    );
  }
  
  // Otherwise, render the full application with dashboard
  return (
    <QueryClientProvider client={queryClient}>
      <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <CartProvider>
            <OutletProvider>
          <TooltipProvider>
            <BrowserRouter>
              <Toaster />
              <Sonner />
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/customize"
                  element={
                    <ProtectedRoute>
                      <StoreCustomizer />
                    </ProtectedRoute>
                  }
                />
                {dashboardRoutes.map((route) => (
                  <Route
                    key={route.path}
                    path={route.path}
                    element={<ProtectedRoute>{route.element}</ProtectedRoute>}
                  />
                ))}
                <Route
                  path="/dashboard/inventory"
                  element={<Navigate to="/dashboard/products?tab=items" replace />}
                />
                <Route
                  path="/dashboard/products"
                  element={
                    <ProtectedRoute>
                      <ProductsLayout />
                    </ProtectedRoute>
                  }
                />
                <Route
                  path="/dashboard/products/new"
                  element={
                    <ProtectedRoute>
                      <ProductForm />
                    </ProtectedRoute>
                  }
                />
                
                {/* Redirect old URLs to new dashboard routes */}
                <Route path="/customize" element={<Navigate to="/dashboard/customize" replace />} />
                <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
                <Route path="/products" element={<Navigate to="/dashboard/products" replace />} />
                <Route path="/products/new" element={<Navigate to="/dashboard/products/new" replace />} />
                <Route path="/account" element={<Navigate to="/dashboard/account" replace />} />
                
                {/* Store routes - ensure consistent routing for /store/:storeSlug pattern */}
                <Route path="/store/:storeSlug/*" element={<StoreFront />} />
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
            </OutletProvider>
        </CartProvider>
      </AuthProvider>
      </SessionContextProvider>
    </QueryClientProvider>
  );
};

export default Root;
