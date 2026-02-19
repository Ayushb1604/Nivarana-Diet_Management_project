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
import { healthGoals, type HealthGoalKey, type TieredFoods, type Food } from "@shared/schema";
import { 
  Leaf,
  Search,
  Filter,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Sparkles,
  ArrowLeft,
  Star
} from "lucide-react";
import Chatbot from "@/components/Chatbot";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Switch } from "@/components/ui/switch";


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
  
  return (
    <div 
      className={`p-4 rounded-lg border-2 ${info.color} hover-elevate transition-all duration-200`}
      data-testid={`food-card-${food.name.toLowerCase().replace(/\s+/g, '-')}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="font-medium">{food.name}</h4>
          <p className="text-xs text-muted-foreground capitalize">{food.category}</p>
        </div>
        <Badge variant="secondary" className="text-xs">
          {food.category}
        </Badge>
      </div>
    </div>
  );
}

function TierSection({ tier, foods, searchQuery, selectedCategory }: {
  tier: keyof typeof tierInfo;
  foods: Food[];
  searchQuery: string;
  selectedCategory: string;
}) {
  const info = tierInfo[tier];
  const Icon = info.icon;
  
  const filteredFoods = useMemo(() => {
    return foods.filter(food => {
      const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === "all" || food.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [foods, searchQuery, selectedCategory]);
  
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
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  const [showMealDialog, setShowMealDialog] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<any | null>(null);
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
      setShowMealDialog(true);
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
                <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                {tieredFoods.tier_4 && <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
                {tieredFoods.tier_5 && <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
              </>
            )}
          </TabsContent>
          
          <TabsContent value="tier_1" className="mt-6">
            {tieredFoods && <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          
          <TabsContent value="tier_2" className="mt-6">
            {tieredFoods && <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          
          <TabsContent value="tier_3" className="mt-6">
            {tieredFoods && <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          
          <TabsContent value="tier_4" className="mt-6">
            {tieredFoods?.tier_4 && <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          
          <TabsContent value="tier_5" className="mt-6">
            {tieredFoods?.tier_5 && <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
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
          <DialogContent className="sm:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Generated Meal Plan</DialogTitle>
              <DialogDescription>A plan using only foods filtered for your profile.</DialogDescription>
            </DialogHeader>

            <div className="mt-4 space-y-4 max-h-[60vh] overflow-auto">
              {mealPlan?.days?.map((d: any) => (
                <Card key={d.day} className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">Day {d.day}</h4>
                  </div>
                  <div className="grid grid-cols-1 gap-2">
                    {Object.entries(d.meals).map(([mealKey, recipe]: any) => (
                      <div key={mealKey} className="p-3 rounded border">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium capitalize">{mealKey}</h5>
                        </div>
                        <p className="text-sm font-semibold mt-2">{recipe.title}</p>
                        <p className="text-sm mt-1"><strong>Ingredients:</strong> {recipe.ingredients.join(", ")}</p>
                        <ol className="list-decimal ml-5 mt-2 text-sm">
                          {recipe.instructions.map((ins: string, i: number) => <li key={i}>{ins}</li>)}
                        </ol>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          </DialogContent>
        </Dialog>

      </main>
    </div>
  );
}
