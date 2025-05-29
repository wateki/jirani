import { Suspense, lazy } from "react";

import { SessionContextProvider } from "@supabase/auth-helpers-react";
import { createClient } from "@supabase/supabase-js";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics } from "@vercel/analytics/react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { OutletProvider } from "@/contexts/OutletContext";

import getEnvironmentConfig from "./config/environment";
import DashboardLayout from "./layouts/DashboardLayout";
import { dashboardRoutes } from "./routes";

// Lazy load components for code splitting
const Index = lazy(() => import("./pages/Index"));
const Dashboard = lazy(() => import("./components/Dashboard"));
const StoreCustomizer = lazy(() => import("./components/StoreCustomizer"));
const StoreFront = lazy(() => import("@/components/store/StoreFront"));
const SubdomainStoreFront = lazy(() => import("@/components/store/SubdomainStoreFront"));
const LoginPage = lazy(() => import("./components/LoginPage"));
const SignupPage = lazy(() => import("./components/SignupPage"));
const NotFound = lazy(() => import("./pages/NotFound"));
const ProductsLayout = lazy(() => import("@/components/products/ProductsLayout"));
const ProductForm = lazy(() => import("@/components/products/ProductForm"));

const queryClient = new QueryClient();

// Validate environment variables with proper typing
const supabaseUrl = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
const supabaseAnonKey = import.meta.env["VITE_SUPABASE_ANON_KEY"] as string | undefined;

if (typeof supabaseUrl !== "string" || typeof supabaseAnonKey !== "string") {
  throw new Error("Missing required Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Protected Route Component with DashboardLayout
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  if (!session) {
    return <Navigate to="/login" replace />;
  }
  return <DashboardLayout>{children}</DashboardLayout>;
};

// Detect if we're on a custom subdomain
const isCustomSubdomain = (): boolean => {
  const config = getEnvironmentConfig();
  const { enableSubdomainRouting, useQueryParamRouting } = config;

  // If subdomain routing is disabled via config, return false immediately
  if (!enableSubdomainRouting) {
    return false;
  }

  // In environments that use query params (Vercel, localhost), check URL params
  if (useQueryParamRouting) {
    return new URLSearchParams(window.location.search).has("store");
  }

  // For production domains with custom domain, check if we're on a subdomain
  const hostname = window.location.hostname;
  const parts = hostname.split(".");

  // Proper subdomain check (e.g., store.yourdomain.com)
  if (parts.length >= 3) {
    // Exclude common non-store subdomains
    const subdomain = parts[0];
    if (typeof subdomain !== "string" || subdomain.length === 0) {
      return false;
    }

    const lowerSubdomain = subdomain.toLowerCase();
    const excludedSubdomains = ["www", "app", "api", "admin", "dev", "staging", "test"];
    return !excludedSubdomains.includes(lowerSubdomain);
  }

  return false;
};

// Protected Dashboard Routes
const ProtectedDashboardRoutes = () => (
  <>
    <Route
      path="/dashboard"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <Dashboard />
          </Suspense>
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/customize"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <StoreCustomizer />
          </Suspense>
        </ProtectedRoute>
      }
    />
    {dashboardRoutes.map((route) => (
      <Route
        key={route.path}
        path={route.path}
        element={
          <ProtectedRoute>
            <Suspense fallback={<LoadingSpinner />}>{route.element}</Suspense>
          </ProtectedRoute>
        }
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
          <Suspense fallback={<LoadingSpinner />}>
            <ProductsLayout />
          </Suspense>
        </ProtectedRoute>
      }
    />
    <Route
      path="/dashboard/products/new"
      element={
        <ProtectedRoute>
          <Suspense fallback={<LoadingSpinner />}>
            <ProductForm />
          </Suspense>
        </ProtectedRoute>
      }
    />
  </>
);

// Dashboard Routes Component
const DashboardRoutes = () => (
  <Routes>
    <Route
      path="/"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <Index />
        </Suspense>
      }
    />
    <Route
      path="/login"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <LoginPage />
        </Suspense>
      }
    />
    <Route
      path="/signup"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <SignupPage />
        </Suspense>
      }
    />
    <ProtectedDashboardRoutes />

    {/* Redirect old URLs to new dashboard routes */}
    <Route path="/customize" element={<Navigate to="/dashboard/customize" replace />} />
    <Route path="/orders" element={<Navigate to="/dashboard/orders" replace />} />
    <Route path="/products" element={<Navigate to="/dashboard/products" replace />} />
    <Route path="/products/new" element={<Navigate to="/dashboard/products/new" replace />} />
    <Route path="/account" element={<Navigate to="/dashboard/account" replace />} />

    {/* Store routes - ensure consistent routing for /store/:storeSlug pattern */}
    <Route
      path="/store/:storeSlug/*"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <StoreFront />
        </Suspense>
      }
    />
    <Route
      path="*"
      element={
        <Suspense fallback={<LoadingSpinner />}>
          <NotFound />
        </Suspense>
      }
    />
  </Routes>
);

// Subdomain Store App Component
const SubdomainStoreApp = () => (
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <TooltipProvider>
          <BrowserRouter>
            <Analytics />
            <Toaster />
            <Sonner />
            <Routes>
              <Route
                path="/*"
                element={
                  <Suspense fallback={<LoadingSpinner />}>
                    <SubdomainStoreFront />
                  </Suspense>
                }
              />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

// Main Dashboard App Component
const DashboardApp = () => (
  <QueryClientProvider client={queryClient}>
    <SessionContextProvider supabaseClient={supabase}>
      <AuthProvider>
        <CartProvider>
          <OutletProvider>
            <TooltipProvider>
              <BrowserRouter>
                <Toaster />
                <Sonner />
                <DashboardRoutes />
              </BrowserRouter>
            </TooltipProvider>
          </OutletProvider>
        </CartProvider>
      </AuthProvider>
    </SessionContextProvider>
  </QueryClientProvider>
);

// Loading component
const LoadingSpinner = () => (
  <div className="flex min-h-screen items-center justify-center">
    <div className="h-32 w-32 animate-spin rounded-full border-b-2 border-gray-900"></div>
  </div>
);

const Root = () => {
  // Determine if we should use subdomain routing
  const useSubdomainRouting = isCustomSubdomain();

  // If we're on a custom subdomain (or have store query param in development),
  // render the store directly without the dashboard routes
  if (useSubdomainRouting) {
    return <SubdomainStoreApp />;
  }

  // Otherwise, render the full application with dashboard
  return <DashboardApp />;
};

export default Root;
