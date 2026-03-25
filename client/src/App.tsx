import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/ThemeProvider";
import { useAuth } from "@/hooks/useAuth";
import { useGlobalKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { KeyboardShortcutsDialog } from "@/components/KeyboardShortcutsDialog";

import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Onboarding from "@/pages/Onboarding";
import DoshaQuiz from "@/pages/DoshaQuiz";
import DoshaResults from "@/pages/DoshaResults";
import HealthGoals from "@/pages/HealthGoals";
import FoodList from "@/pages/FoodList";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import SuperAdmin from "@/pages/SuperAdmin";
import FeedbackPage from "@/pages/Feedback";
import ForgotPassword from "@/pages/ForgotPassword";
import ResetPassword from "@/pages/ResetPassword";
import NotFound from "@/pages/not-found";

const SUPERADMIN_SECRET_PATH = import.meta.env.VITE_SUPERADMIN_SECRET_PATH || "/superadmin-portal-nivarna-7f9d2";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  const Home = () => {
    if (isLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <span>Loading...</span>
        </div>
      );
    }

    return isAuthenticated ? <Dashboard /> : <Landing />;
  };

  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/login" component={Login} />
      <Route path="/signup" component={Signup} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path={SUPERADMIN_SECRET_PATH} component={SuperAdmin} />
      {isAuthenticated && !isLoading && (
        <>
          <Route path="/dashboard" component={Dashboard} />
          <Route path="/onboarding" component={Onboarding} />
          <Route path="/quiz" component={DoshaQuiz} />
          <Route path="/results" component={DoshaResults} />
          <Route path="/health-goals" component={HealthGoals} />
          <Route path="/foods" component={FoodList} />
          <Route path="/feedback" component={FeedbackPage} />
        </>
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useGlobalKeyboardShortcuts();
  
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <Toaster />
          <KeyboardShortcutsDialog />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
