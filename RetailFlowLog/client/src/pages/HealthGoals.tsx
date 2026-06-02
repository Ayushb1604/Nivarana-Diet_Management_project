import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { healthGoals, type HealthGoalKey } from "@shared/schema";
import {
  Leaf,
  Heart,
  Activity,
  Zap,
  Shield,
  Droplets,
  Sparkles,
  Moon,
  Scale,
  Flame,
  ArrowRight,
  CheckCircle
} from "lucide-react";

const goalIcons: Record<HealthGoalKey, typeof Heart> = {
  heart_health: Heart,
  gut_health: Activity,
  inflammation: Flame,
  liver_function: Droplets,
  immunity: Shield,
  diabetes: Activity,
  skin_hair: Sparkles,
  weight_management: Scale,
  sleep: Moon,
  energy: Zap,
};

const goalColors: Record<HealthGoalKey, string> = {
  heart_health: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500",
  gut_health: "bg-green-500/10 text-green-600 dark:text-green-400 border-green-500",
  inflammation: "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500",
  liver_function: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500",
  immunity: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500",
  diabetes: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500",
  skin_hair: "bg-pink-500/10 text-pink-600 dark:text-pink-400 border-pink-500",
  weight_management: "bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border-cyan-500",
  sleep: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500",
  energy: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500",
};

const goalDescriptions: Record<HealthGoalKey, string> = {
  heart_health: "Support cardiovascular health with heart-friendly foods",
  gut_health: "Improve digestion and gut microbiome balance",
  inflammation: "Reduce inflammation with anti-inflammatory foods",
  liver_function: "Support liver detoxification and function",
  immunity: "Strengthen your immune system naturally",
  diabetes: "Manage blood sugar with appropriate food choices",
  skin_hair: "Nourish your skin and hair from within",
  weight_management: "Achieve healthy weight through balanced nutrition",
  sleep: "Improve sleep quality with calming foods",
  energy: "Boost energy levels throughout the day",
};

export default function HealthGoals() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedGoal, setSelectedGoal] = useState<HealthGoalKey | null>(null);

  const mutation = useMutation({
    mutationFn: async (goalType: HealthGoalKey) => {
      return apiRequest("POST", "/api/health-goal", { goalType, isBalancedDiet: false });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-goal"] });
      if (selectedGoal) {
        setLocation(`/foods?mode=goal&goal=${selectedGoal}`);
      }
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to save your health goal. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleContinue = () => {
    if (selectedGoal) {
      mutation.mutate(selectedGoal);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-semibold">Choose Your Health Goal</span>
            </div>
            <Link href="/results">
              <Button variant="ghost" size="sm" data-testid="link-back">Back to Results</Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center mb-10">
          <h1 className="font-serif text-3xl font-bold text-foreground mb-3">
            What's Your Primary Health Focus?
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Select a health goal to receive food recommendations that support both your dosha balance
            and your specific wellness objectives.
          </p>
        </div>

        {/* Goals Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 mb-8">
          {(Object.entries(healthGoals) as [HealthGoalKey, string][]).map(([key, label], index) => {
            const Icon = goalIcons[key];
            const isSelected = selectedGoal === key;

            return (
              <button
                key={key}
                onClick={() => setSelectedGoal(key)}
                className={`group p-6 rounded-xl border-2 text-left transition-all duration-200 hover-elevate animate-fade-in-up ${isSelected
                    ? `${goalColors[key]}`
                    : "bg-gray-50/80 dark:bg-gray-900/40 border-gray-400 dark:border-gray-600 hover:border-gray-500 dark:hover:border-gray-400"
                  }`}
                style={{ animationDelay: `${index * 0.05}s` }}
                data-testid={`goal-${key}`}
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${isSelected ? "" : "bg-muted"
                  } ${isSelected ? goalColors[key] : ""}`}>
                  <Icon className={`w-6 h-6 ${isSelected ? "" : "text-muted-foreground"}`} />
                </div>
                <h3 className="font-medium mb-1">{label}</h3>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {goalDescriptions[key]}
                </p>
                {isSelected && (
                  <div className="mt-3 flex items-center gap-1 text-xs font-medium">
                    <CheckCircle className="w-3 h-3" />
                    Selected
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="gap-2 px-8"
            disabled={!selectedGoal || mutation.isPending}
            onClick={handleContinue}
            data-testid="button-continue"
          >
            {mutation.isPending ? "Loading..." : "View Food Recommendations"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Alternative Option */}
        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground mb-3">
            Or get recommendations based on dosha balance alone
          </p>
          <Link href="/foods?mode=balanced">
            <Button variant="outline" size="sm" data-testid="button-balanced-diet">
              <Scale className="w-4 h-4 mr-2" />
              Choose Balanced Diet Instead
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
