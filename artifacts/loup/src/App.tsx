import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Route, Switch, Router as WouterRouter } from 'wouter';
import { Shell } from '@/components/shell';
import NotFound from '@/pages/not-found';

import Home from '@/pages/home';
import Browse from '@/pages/browse';
import ProviderProfile from '@/pages/provider-profile';
import Book from '@/pages/book';
import Bookings from '@/pages/bookings';
import BookingDetail from '@/pages/booking-detail';
import Household from '@/pages/household';
import Billing from '@/pages/billing';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function Router() {
  return (
    <Shell>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/browse" component={Browse} />
        <Route path="/providers/:id" component={ProviderProfile} />
        <Route path="/book/:providerId" component={Book} />
        <Route path="/bookings" component={Bookings} />
        <Route path="/bookings/:id" component={BookingDetail} />
        <Route path="/household" component={Household} />
        <Route path="/billing" component={Billing} />
        <Route component={NotFound} />
      </Switch>
    </Shell>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;