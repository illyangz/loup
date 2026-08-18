import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Redirect, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/shell';
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
import Employee from '@/pages/employee';
import Institution from '@/pages/employer';
import Provider from '@/pages/vendor';
import Admin from '@/pages/operations';
import ApiDocs from '@/pages/api-docs';
import EmbedDemo from '@/pages/embed-demo';
import Support from '@/pages/support';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function HomeRoute() { return <Shell><Home /></Shell>; }
function BrowseRoute() { return <Shell><Browse /></Shell>; }
function ProviderProfileRoute() { return <Shell><ProviderProfile /></Shell>; }
function BookRoute() { return <Shell><Book /></Shell>; }
function BookingsRoute() { return <Shell><Bookings /></Shell>; }
function BookingDetailRoute() { return <Shell><BookingDetail /></Shell>; }
function HouseholdRoute() { return <Shell><Household /></Shell>; }
function BillingRoute() { return <Shell><Billing /></Shell>; }

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
      <Route path="/login"><Redirect to="/" /></Route>

      {/* Consumer app routes */}
      <Route path="/browse" component={BrowseRoute} />
      <Route path="/providers/:id" component={ProviderProfileRoute} />
      <Route path="/book/:providerId" component={BookRoute} />
      <Route path="/bookings" component={BookingsRoute} />
      <Route path="/bookings/:id" component={BookingDetailRoute} />
      <Route path="/household" component={HouseholdRoute} />
      <Route path="/billing" component={BillingRoute} />

      {/* Utility */}
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/embed/demo" component={EmbedDemo} />
      <Route path="/support" component={Support} />

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
