import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
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
import Login from '@/pages/login';
import Employee from '@/pages/employee';
import Employer from '@/pages/employer';
import Vendor from '@/pages/vendor';
import Operations from '@/pages/operations';
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
      <Route path="/login" component={Login} />
      <Route path="/employee" component={Employee} />
      <Route path="/employer" component={Employer} />
      <Route path="/vendor" component={Vendor} />
      <Route path="/operations" component={Operations} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/embed/demo" component={EmbedDemo} />
      <Route path="/support" component={Support} />
       <Route path="/" component={Login} />
      <Route path="/browse" component={BrowseRoute} />
      <Route path="/providers/:id" component={ProviderProfileRoute} />
      <Route path="/book/:providerId" component={BookRoute} />
      <Route path="/bookings" component={BookingsRoute} />
      <Route path="/bookings/:id" component={BookingDetailRoute} />
      <Route path="/household" component={HouseholdRoute} />
      <Route path="/billing" component={BillingRoute} />
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