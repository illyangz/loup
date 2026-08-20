import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Redirect, Router as WouterRouter, useParams, useLocation } from 'wouter';
import { useGetService, setBaseUrl } from '@workspace/api-client-react';
import { PlatformShell } from '@/components/platform-shell';
import { ThemeProvider } from '@/hooks/use-theme';
import NotFound from '@/pages/not-found';

import Home from '@/pages/home';
import Browse from '@/pages/browse';
import ProviderProfile from '@/pages/provider-profile';
import Book from '@/pages/book';
import Bookings from '@/pages/bookings';
import BookingDetail from '@/pages/booking-detail';
import Household from '@/pages/household';
import Billing from '@/pages/billing';
import Landing from '@/pages/landing';
import Login from '@/pages/login';
import Employee from '@/pages/employee';
import Institution from '@/pages/employer';
import Provider from '@/pages/vendor';
import Admin from '@/pages/operations';
import ApiDocs from '@/pages/api-docs';
import EmbedDemo from '@/pages/embed-demo';
import Support from '@/pages/support';
import Whitepaper from '@/pages/whitepaper';
import { storeToken, ensureAuthGetter } from '@/lib/demo-auth';

// Restore the signed demo token on load so guarded API calls carry a Bearer header.
ensureAuthGetter();

// In dev, requests stay relative and go through Vite's proxy to API_TARGET.
// In a static production build (e.g. Cloudflare Pages) there's no proxy, so
// point relative /api/... calls at the deployed API origin instead.
if (import.meta.env.VITE_API_BASE_URL) {
  setBaseUrl(import.meta.env.VITE_API_BASE_URL);
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function HomeRoute() { return <PlatformShell role="employee"><Home /></PlatformShell>; }
function BrowseRoute() { return <PlatformShell role="employee"><Browse /></PlatformShell>; }
function ProviderProfileRoute() { return <PlatformShell role="employee"><ProviderProfile /></PlatformShell>; }
function BookRoute() { return <PlatformShell role="employee"><Book /></PlatformShell>; }
function BookingsRoute() { return <PlatformShell role="employee"><Bookings /></PlatformShell>; }
function BookingDetailRoute() { return <PlatformShell role="employee"><BookingDetail /></PlatformShell>; }
function HouseholdRoute() { return <PlatformShell role="employee"><Household /></PlatformShell>; }
function BillingRoute() { return <PlatformShell role="employee"><Billing /></PlatformShell>; }

/**
 * Widget deep link (P1-7): `/book/service/:serviceId?token=...` resolves the
 * service to its provider and hands off to the real booking flow, pre-seeding
 * the caller's token (if any — e.g. the embeddable widget's "book this"
 * chips) so the employee lands already authenticated instead of at a login
 * screen.
 */
function BookServiceDeepLink() {
  const { serviceId } = useParams<{ serviceId: string }>();
  const [, navigate] = useLocation();
  const search = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const token = search?.get("token");

  useEffect(() => {
    if (token) {
      storeToken(token);
      ensureAuthGetter();
    }
  }, [token]);

  const query = useGetService(Number(serviceId), { query: { enabled: !!serviceId, queryKey: ["getService", serviceId] as const } });

  useEffect(() => {
    if (query.data) {
      navigate(`/book/${query.data.providerId}?serviceId=${query.data.id}`, { replace: true });
    }
  }, [query.data, navigate]);

  if (query.isError) {
    return <PlatformShell role="employee"><div className="p-8 text-center text-sm text-muted-foreground">That service couldn't be found.</div></PlatformShell>;
  }
  return <PlatformShell role="employee"><div className="p-8 text-center text-sm text-muted-foreground">Taking you to booking…</div></PlatformShell>;
}

function Router() {
  return (
    <Switch>
      {/* Demo landing — default entry point */}
      <Route path="/" component={Landing} />

      {/* Platform workspaces — new canonical paths */}
      <Route path="/employee" component={Employee} />
      <Route path="/institution" component={Institution} />
      <Route path="/provider" component={Provider} />
      <Route path="/admin" component={Admin} />

      {/* Legacy redirects — old paths kept for backward compatibility */}
      <Route path="/employer"><Redirect to="/institution" /></Route>
      <Route path="/vendor"><Redirect to="/provider" /></Route>
      <Route path="/operations"><Redirect to="/admin" /></Route>
      <Route path="/login" component={Login} />

      {/* Consumer app routes */}
      <Route path="/browse" component={BrowseRoute} />
      <Route path="/providers/:id" component={ProviderProfileRoute} />
      <Route path="/book/:providerId" component={BookRoute} />
      <Route path="/book/service/:serviceId" component={BookServiceDeepLink} />
      <Route path="/bookings" component={BookingsRoute} />
      <Route path="/bookings/:id" component={BookingDetailRoute} />
      <Route path="/household" component={HouseholdRoute} />
      <Route path="/billing" component={BillingRoute} />

      {/* Utility */}
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/embed/demo" component={EmbedDemo} />
      <Route path="/support" component={Support} />
      <Route path="/whitepaper" component={Whitepaper} />

      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
