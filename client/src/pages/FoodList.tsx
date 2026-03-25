import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { healthGoals, type HealthGoalKey, type TieredFoods, type Food, type DoshaAssessment } from "@shared/schema";
import { 
  Leaf,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowLeft,
  Star,
  Coffee,
  Sun,
  Moon,
  Download,
  X,
  Heart,
  Copy
} from "lucide-react";
import Chatbot from "@/components/Chatbot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";
import { useFavorites } from "@/hooks/useFavorites";
import { useDebounce } from "@/hooks/useDebounce";
import { copyToClipboard } from "@/lib/clipboard";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { downloadMealPlanStyledPdf } from "@/lib/mealPlanPdf";


const tierInfo = {
  tier_1: {
    label: "Highly Recommended",
    description: "Excellent choices for your constitution",
    color: "bg-tier-1/10 text-tier-1 border-tier-1/30",
    badgeColor: "bg-tier-1 text-white",
    icon: Sparkles,
  },
  tier_2: {
    label: "Good Choices",
    description: "Beneficial foods you can enjoy regularly",
    color: "bg-tier-2/10 text-tier-2 border-tier-2/30",
    badgeColor: "bg-tier-2 text-white",
    icon: Star,
  },
  tier_3: {
    label: "Neutral",
    description: "Okay in moderation",
    color: "bg-tier-3/10 text-tier-3 border-tier-3/30",
    badgeColor: "bg-tier-3 text-white",
    icon: CheckCircle,
  },
  tier_4: {
    label: "Use Caution",
    description: "May conflict with your needs",
    color: "bg-tier-4/10 text-tier-4 border-tier-4/30",
    badgeColor: "bg-tier-4 text-white",
    icon: AlertTriangle,
  },
  tier_5: {
    label: "Avoid",
    description: "Not recommended for your dosha",
    color: "bg-tier-5/10 text-tier-5 border-tier-5/30",
    badgeColor: "bg-tier-5 text-white",
    icon: XCircle,
  },
};

const categories = [
  { value: "all", label: "All Categories" },
  { value: "vegetables", label: "Vegetables" },
  { value: "grains", label: "Grains" },
  { value: "legumes", label: "Legumes" },
  { value: "fruits", label: "Fruits" },
  { value: "spices", label: "Spices" },
  { value: "dairy", label: "Dairy" },
  { value: "oils", label: "Oils" },
  { value: "sweeteners", label: "Sweeteners" },
  { value: "nuts", label: "Nuts & Seeds" },
  { value: "beverages", label: "Beverages" },
];

function FoodCard({ food, tier }: { food: Food; tier: keyof typeof tierInfo }) {
  const info = tierInfo[tier];
  const { isFavorite, toggleFavorite } = useFavorites();
  const { toast } = useToast();
  
  const favorite = isFavorite(food.name, tier);
  
  return (
    <div 
      className={`p-4 rounded-lg border-2 ${info.color} hover-elevate transition-all duration-200 relative group`}
      data-testid={`food-card-${food.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <h4 className="font-medium">{food.name}</h4>
          <p className="text-xs text-muted-foreground capitalize">{food.category}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs">
            {food.category}
          </Badge>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => toggleFavorite({ name: food.name, category: food.category, tier })}
                >
                  <Heart 
                    className={`h-4 w-4 ${favorite ? 'fill-red-500 text-red-500' : ''}`}
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {favorite ? "Remove from favorites" : "Add to favorites"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

function TierSection({ tier, foods, searchQuery, selectedCategory, debouncedSearch }: {
  tier: keyof typeof tierInfo;
  foods: Food[];
  searchQuery: string;
  selectedCategory: string;
  debouncedSearch: string;
}) {
  const info = tierInfo[tier];
  const Icon = info.icon;
  
  const filteredFoods = useMemo(() => {
    return foods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchesCategory = selectedCategory === "all" || food.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [foods, debouncedSearch, selectedCategory]);
  
  if (filteredFoods.length === 0 && foods.length > 0) {
    return null; // Hide tier if all foods are filtered out
  }
  
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-4">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${info.color}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-serif text-lg font-semibold">{info.label}</h3>
          <p className="text-sm text-muted-foreground">{info.description}</p>
        </div>
        <Badge className={`ml-auto ${info.badgeColor}`}>
          {filteredFoods.length} foods
        </Badge>
      </div>
      
      {filteredFoods.length === 0 ? (
        <p className="text-sm text-muted-foreground italic">No foods in this category</p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredFoods.map((food) => (
            <FoodCard key={food.name} food={food} tier={tier} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function FoodList() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const mode = params.get("mode") || "balanced";
  const goalParam = params.get("goal") as HealthGoalKey | null;
  
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearch = useDebounce(searchQuery, 300);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");
  const { favorites } = useFavorites();

  const [showMealDialog, setShowMealDialog] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<any | null>(null);
  const [selectedDay, setSelectedDay] = useState(1);
  const { toast } = useToast();
  
  const { data: tieredFoods, isLoading } = useQuery<TieredFoods>({
    queryKey: ["/api/foods/filtered", mode, goalParam],
    queryFn: async () => {
      const url = mode === "goal" && goalParam
        ? `/api/foods/filtered?mode=goal&goal=${goalParam}`
        : "/api/foods/filtered?mode=balanced";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch foods");
      return response.json();
    },
  });

  const { data: assessment } = useQuery<DoshaAssessment>({
    queryKey: ["/api/dosha-assessment"],
  });
  
  const goalLabel = goalParam ? healthGoals[goalParam] : null;

  async function generateMealPlan() {
    if (!tieredFoods) return;
    setGeneratingPlan(true);
    try {
      const resp = await fetch('/api/mealplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mode,
          goal: goalParam,
          searchQuery,
          category: selectedCategory,
          days: 7,
        }),
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ message: 'Failed' }));
        toast({ title: 'Unable to generate meal plan', description: err.message || 'Try different filters' });
        setGeneratingPlan(false);
        return;
      }
      const data = await resp.json();
      setMealPlan(data);
      setSelectedDay(1); // Reset to first day when opening
      setShowMealDialog(true);
      if (data?.source === "fallback") {
        toast({
          title: "Fallback meal plan used",
          description: "AI meal generation was unavailable, so the standard workflow generated your plan.",
        });
      }
    } catch (e) {
      console.error(e);
      toast({ title: 'Error', description: 'Failed to generate meal plan' });
    } finally {
      setGeneratingPlan(false);
    }
  }
  


  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-24 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="h-6 w-6 text-primary" />
              <span className="font-serif text-lg font-semibold">Food Recommendations</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2" data-testid="link-dashboard">
                <ArrowLeft className="w-4 h-4" />
                Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>
      
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Breadcrumbs */}
        <div className="mb-4">
          <Breadcrumbs />
        </div>
        
        {/* Title Section */}
        <div className="mb-8">
          <h1 className="font-serif text-2xl sm:text-3xl font-bold text-foreground mb-2">
            {mode === "goal" && goalLabel
              ? `Foods for ${goalLabel}`
              : "Balanced Diet Foods"
            }
          </h1>
          <p className="text-muted-foreground">
            {mode === "goal"
              ? "Foods filtered by your dosha and health goal"
              : "Foods filtered by your dosha constitution for balance"
            }
          </p>
        </div>
        
        {/* Filters */}
        <Card className="mb-8">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search foods..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-48" data-testid="select-category">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
        
        {/* Tabs for tier navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="flex flex-wrap h-auto gap-2">
            <TabsTrigger value="all" data-testid="tab-all">All Tiers</TabsTrigger>
            <TabsTrigger value="tier_1" data-testid="tab-tier-1">Recommended</TabsTrigger>
            <TabsTrigger value="tier_2" data-testid="tab-tier-2">Good</TabsTrigger>
            <TabsTrigger value="tier_3" data-testid="tab-tier-3">Neutral</TabsTrigger>
            {tieredFoods?.tier_4 && tieredFoods.tier_4.length > 0 && (
              <TabsTrigger value="tier_4" data-testid="tab-tier-4">Caution</TabsTrigger>
            )}
            {tieredFoods?.tier_5 && tieredFoods.tier_5.length > 0 && (
              <TabsTrigger value="tier_5" data-testid="tab-tier-5">Avoid</TabsTrigger>
            )}
          </TabsList>
          
          <TabsContent value="all" className="mt-6">
            {tieredFoods && (
              <>
                <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />
                <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />
                <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />
                {tieredFoods.tier_4 && <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
                {tieredFoods.tier_5 && <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="tier_1" className="mt-6">
            {tieredFoods && <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
          </TabsContent>
          
          <TabsContent value="tier_2" className="mt-6">
            {tieredFoods && <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
          </TabsContent>
          
          <TabsContent value="tier_3" className="mt-6">
            {tieredFoods && <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
          </TabsContent>
          
          <TabsContent value="tier_4" className="mt-6">
            {tieredFoods?.tier_4 && <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
          </TabsContent>
          
          <TabsContent value="tier_5" className="mt-6">
            {tieredFoods?.tier_5 && <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} debouncedSearch={debouncedSearch} />}
          </TabsContent>
        </Tabs>
        
        {/* Legend */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="font-serif text-lg">Understanding the Tiers</CardTitle>
            <CardDescription>How foods are categorized based on your profile</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(tierInfo).map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <div key={key} className={`p-3 rounded-lg ${info.color} text-sm`}>
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="w-4 h-4" />
                      <span className="font-medium">{info.label}</span>
                    </div>
                    <p className="text-xs opacity-80">{info.description}</p>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* AI Assistant */}
        {tieredFoods && (
          <Chatbot 
            dosha={mode === "goal" ? "Your Custom" : "Balanced"} 
            goal={goalLabel || "General Wellness"} 
            foods={tieredFoods} 
          />
        )}

        {/* CTA: Generate Meal Plan */}
        <div className="mt-8 flex justify-center">
          <Button onClick={async () => { await generateMealPlan(); }} disabled={generatingPlan} size="lg" data-testid="btn-generate-mealplan">
            {generatingPlan ? "Generating..." : "Generate Meal Plan"}
          </Button>
        </div>

        {/* Meal plan dialog */}
        <Dialog open={showMealDialog} onOpenChange={setShowMealDialog}>
          <DialogContent className="sm:max-w-4xl max-h-[90vh] p-0 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20 [&>button]:hidden">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-green-200/50 dark:border-green-800/50">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center">
                    <Leaf className="w-6 h-6 text-green-700 dark:text-green-400" />
                  </div>
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-green-900 dark:text-green-100">
                      Your Personalized Meal Plan
                    </h2>
                    <p className="text-sm text-green-700/80 dark:text-green-300/80 mt-1">
                      {assessment 
                        ? `${assessment.constitutionType === 'single' 
                            ? assessment.primaryDosha.charAt(0).toUpperCase() + assessment.primaryDosha.slice(1)
                            : `${assessment.primaryDosha.charAt(0).toUpperCase() + assessment.primaryDosha.slice(1)}-${assessment.secondaryDosha ? assessment.secondaryDosha.charAt(0).toUpperCase() + assessment.secondaryDosha.slice(1) : ''}`
                          } • ${goalLabel || 'Balanced Diet'}`
                        : goalLabel || 'Balanced Diet'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className="bg-green-100/50 hover:bg-green-200/50 border-green-300 dark:bg-green-900/30 dark:hover:bg-green-800/30 dark:border-green-700"
                          onClick={async () => {
                            const dayData = mealPlan?.days?.find((d: any) => d.day === selectedDay);
                            if (dayData) {
                              const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                              const currentDayName = dayNames[selectedDay - 1];
                              let text = `Meal Plan - ${currentDayName}\n\n`;
                              
                              if (dayData.meals.breakfast) {
                                text += `Breakfast: ${dayData.meals.breakfast.ingredients.join(', ')}\n`;
                              }
                              if (dayData.meals.lunch) {
                                text += `Lunch: ${dayData.meals.lunch.ingredients.join(', ')}\n`;
                              }
                              if (dayData.meals.dinner) {
                                text += `Dinner: ${dayData.meals.dinner.ingredients.join(', ')}\n`;
                              }
                              if (dayData.meals.snack) {
                                text += `Snacks: ${dayData.meals.snack.ingredients.join(', ')}\n`;
                              }
                              
                              await copyToClipboard(
                                text,
                                () => toast({ title: "Copied!", description: "Meal plan copied to clipboard" }),
                                () => toast({ title: "Failed to copy", description: "Please try again", variant: "destructive" })
                              );
                            }
                          }}
                        >
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy meal plan to clipboard</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  
                  <Button
                    variant="outline"
                    size="sm"
                    className="bg-green-100/50 hover:bg-green-200/50 border-green-300 dark:bg-green-900/30 dark:hover:bg-green-800/30 dark:border-green-700"
                    onClick={() => {
                      downloadMealPlanStyledPdf(mealPlan, "Ayurvedic Weekly Meal Plan");
                    }}
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download PDF
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowMealDialog(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day Navigation */}
              <div className="flex gap-2 mt-4">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, idx) => {
                  const dayNum = idx + 1;
                  const isActive = selectedDay === dayNum;
                  return (
                    <button
                      key={day}
                      onClick={() => setSelectedDay(dayNum)}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-all ${
                        isActive
                          ? 'bg-green-500 text-white shadow-md'
                          : 'bg-green-100/50 text-green-700 hover:bg-green-200/50 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-800/30'
                      }`}
                    >
                      {day}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Meal Details */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              {mealPlan?.days?.find((d: any) => d.day === selectedDay) && (() => {
                const dayData = mealPlan.days.find((d: any) => d.day === selectedDay);
                const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                const currentDayName = dayNames[selectedDay - 1];

                return (
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-xl p-6 shadow-lg border border-green-200/50 dark:border-green-800/50">
                    {/* Day Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <span className="text-green-700 dark:text-green-400 font-bold text-lg">
                          {currentDayName.charAt(0)}
                        </span>
                      </div>
                      <h3 className="font-serif text-xl font-semibold text-green-900 dark:text-green-100">
                        {currentDayName}
                      </h3>
                    </div>

                    {/* Meals */}
                    <div className="space-y-6">
                      {/* Breakfast */}
                      {dayData.meals.breakfast && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Coffee className="w-5 h-5 text-green-700 dark:text-green-400" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Breakfast</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dayData.meals.breakfast.ingredients.map((ingredient: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Lunch */}
                      {dayData.meals.lunch && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sun className="w-5 h-5 text-green-700 dark:text-green-400" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Lunch</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dayData.meals.lunch.ingredients.map((ingredient: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dinner */}
                      {dayData.meals.dinner && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Moon className="w-5 h-5 text-green-700 dark:text-green-400" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Dinner</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dayData.meals.dinner.ingredients.map((ingredient: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Snacks */}
                      {dayData.meals.snack && (
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-5 h-5 text-green-700 dark:text-green-400" />
                            <h4 className="font-semibold text-green-900 dark:text-green-100">Snacks</h4>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {dayData.meals.snack.ingredients.map((ingredient: string, idx: number) => (
                              <span
                                key={idx}
                                className="px-3 py-1.5 rounded-full text-sm bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200 border border-green-200 dark:border-green-800"
                              >
                                {ingredient}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
