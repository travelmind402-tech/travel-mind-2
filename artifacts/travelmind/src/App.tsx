import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { TripProvider, useTrip } from "@/context/TripContext";
import NotFound from "@/pages/not-found";
import Onboarding from "@/pages/Onboarding";
import DashboardLayout from "@/pages/Dashboard";
import DashboardHome from "@/pages/DashboardHome";
import AgentWeather from "@/pages/AgentWeather";
import AgentDisruption from "@/pages/AgentDisruption";
import AgentDriving from "@/pages/AgentDriving";
import AgentCuisine from "@/pages/AgentCuisine";
import AgentCulture from "@/pages/AgentCulture";
import AgentBudget from "@/pages/AgentBudget";
import AgentLanguage from "@/pages/AgentLanguage";

const queryClient = new QueryClient();

function DashboardRoutes() {
  return (
    <DashboardLayout>
      <Switch>
        <Route path="/dashboard" component={DashboardHome} />
        <Route path="/dashboard/weather" component={AgentWeather} />
        <Route path="/dashboard/disruption" component={AgentDisruption} />
        <Route path="/dashboard/driving" component={AgentDriving} />
        <Route path="/dashboard/cuisine" component={AgentCuisine} />
        <Route path="/dashboard/culture" component={AgentCulture} />
        <Route path="/dashboard/budget" component={AgentBudget} />
        <Route path="/dashboard/language" component={AgentLanguage} />
      </Switch>
    </DashboardLayout>
  );
}

function AppRouter() {
  const { tripId } = useTrip();

  return (
    <Switch>
      <Route path="/" component={Onboarding} />
      <Route path="/dashboard" component={DashboardRoutes} />
      <Route path="/dashboard/:rest*" component={DashboardRoutes} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <TripProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <AppRouter />
          </WouterRouter>
        </TripProvider>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
