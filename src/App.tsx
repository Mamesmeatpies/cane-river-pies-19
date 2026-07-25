import { Component, ErrorInfo, lazy, ReactNode, Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import { CartProvider } from "@/context/CartContext";
import CartDrawer from "@/components/CartDrawer";
import Index from "./pages/Index.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();
const Admin = lazy(() => import("./pages/Admin.tsx"));

const AdminRouteFallback = () => (
  <main className="min-h-screen bg-background text-foreground">
    <section className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-md border border-border bg-card p-6 shadow-sm">
        <p className="text-sm font-semibold text-foreground">Loading admin portal...</p>
        <p className="mt-2 text-sm text-muted-foreground">Preparing the secure admin tools.</p>
      </div>
    </section>
  </main>
);

const AdminRouteError = () => (
  <main className="min-h-screen bg-background text-foreground">
    <section className="container mx-auto px-4 py-12">
      <div className="mx-auto max-w-lg space-y-3 border border-destructive/30 bg-destructive/10 p-6">
        <h1 className="font-serif text-3xl font-bold text-foreground">Admin Portal</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          The admin page could not finish loading. Refresh the page, and confirm the WorkOS and Convex environment
          variables are configured for this deployment.
        </p>
      </div>
    </section>
  </main>
);

type AdminErrorBoundaryProps = {
  children: ReactNode;
};

type AdminErrorBoundaryState = {
  hasError: boolean;
};

class AdminErrorBoundary extends Component<AdminErrorBoundaryProps, AdminErrorBoundaryState> {
  state: AdminErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Admin route failed to render", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return <AdminRouteError />;
    }

    return this.props.children;
  }
}

const LegacyBackofficeRedirect = () => {
  const location = useLocation();

  return <Navigate to={`/admin${location.search}`} replace />;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <CartProvider>
        <Toaster />
        <Sonner />
        <CartDrawer />
        <BrowserRouter>
          <AnalyticsTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route
              path="/admin"
              element={
                <AdminErrorBoundary>
                  <Suspense fallback={<AdminRouteFallback />}>
                    <Admin />
                  </Suspense>
                </AdminErrorBoundary>
              }
            />
            <Route path="/backoffice" element={<LegacyBackofficeRedirect />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </CartProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
