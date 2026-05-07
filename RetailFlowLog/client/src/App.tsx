import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import DoshaQuiz from "@/pages/DoshaQuiz";
import DoshaResults from "@/pages/DoshaResults";
import HealthGoals from "@/pages/HealthGoals";
import FoodList from "@/pages/FoodList";
import WellnessCheckin from "@/pages/WellnessCheckin";
import WellnessProgress from "@/pages/WellnessProgress";
import Admin from "@/pages/Admin";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <Switch>
      {isLoading || !isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={() => { window.location.replace("/?tab=login"); return null; }} />
          <Route path="/signup" component={() => { window.location.replace("/"); return null; }} />
          <Route path="/forgot-password" component={ForgotPassword} />
          <Route path="/reset-password" component={ResetPassword} />
        </>
      ) : (
        <>
          <Route path="/" component={Dashboard} />
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/quiz" component={DoshaQuiz} />
          <Route path="/results" component={DoshaResults} />
          <Route path="/health-goals" component={HealthGoals} />
          <Route path="/foods" component={FoodList} />
          <Route path="/wellness-checkin" component={WellnessCheckin} />
          <Route path="/wellness-progress" component={WellnessProgress} />
          <Route path="/admin" component={Admin} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
