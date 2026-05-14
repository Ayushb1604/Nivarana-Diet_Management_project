import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { Leaf } from "lucide-react";

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
import MealPlan from "@/pages/MealPlan";
import NotFound from "@/pages/not-found";


// Full-screen loading splash shown while auth state is being fetched
function AuthLoadingScreen() {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-background gap-4 z-50">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-xl shadow-primary/30 animate-pulse">
          <Leaf className="h-8 w-8 text-primary-foreground" />
        </div>
        <div className="absolute -inset-1 rounded-2xl border-2 border-primary/30 animate-ping" />
      </div>
      <div className="text-center">
        <p className="font-serif text-xl font-bold tracking-tight text-foreground">NIVARANA</p>
        <p className="text-sm text-muted-foreground mt-1">Loading your wellness profile…</p>
      </div>
    </div>
  );
}

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  // While auth state is being fetched, show a branded loading screen
  // This prevents logged-in users from briefly seeing the Landing page
  if (isLoading) {
    return <AuthLoadingScreen />;
  }

  return (
    <Switch>
      {/* Password auth routes — accessible regardless of login state */}
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />

      {!isAuthenticated ? (
        <>
          <Route path="/" component={Landing} />
          <Route path="/login" component={() => { window.location.replace("/?tab=login"); return null; }} />
          <Route path="/signup" component={() => { window.location.replace("/"); return null; }} />
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
          <Route path="/meal-plan" component={MealPlan} />
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
