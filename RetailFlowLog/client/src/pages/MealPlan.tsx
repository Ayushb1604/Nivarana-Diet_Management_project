/**
 * MealPlan.tsx
 *
 * Standalone Meal Plan page — weekly calendar strip at top,
 * meal rows per day, AI generation with loading state,
 * dosha tags on every meal card, and PDF export.
 *
 * All data fetching & generation logic delegated to the existing
 * /api/mealplan and /api/mealplan/saved endpoints.
 */

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import {
  Leaf,
  ArrowLeft,
  RefreshCw,
  Sun,
  Apple,
  Utensils,
  Coffee,
  Moon,
  Sparkles,
  Download,
  Wind,
  Flame,
  Mountain,
  ChevronRight,
  Info,
  ShoppingCart,
  X,
  ArrowLeftRight,
  BarChart3,
  Check,
} from "lucide-react";
import { jsPDF } from "jspdf";


// ── Types ─────────────────────────────────────────────────────────────────────

interface MealMacros {
  protein: string;
  carbs: string;
  fat: string;
  calories: string;
}

interface MealEntry {
  dish_name: string;
  ingredients: string[];
  portion: string;
  macros: MealMacros;
  why: string;
  substitutions: string[];
}

interface DayPlan {
  day: number;
  day_name: string;
  meals: {
    breakfast: MealEntry;
    morning_snack: MealEntry;
    lunch: MealEntry;
    evening_snack: MealEntry;
    dinner: MealEntry;
  };
}

interface AIMealPlan {
  week_summary: string;
  hydration: string;
  weekly_strategy: string;
  clinician_note?: string;
  days: DayPlan[];
}

// ── Constants ─────────────────────────────────────────────────────────────────

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const mealMeta = {
  breakfast: { label: "Breakfast", icon: Sun, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/30 border-amber-200/50" },
  morning_snack: { label: "Morning Snack", icon: Apple, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200/50" },
  lunch: { label: "Lunch", icon: Utensils, color: "text-sky-600 bg-sky-50 dark:bg-sky-950/30 border-sky-200/50" },
  evening_snack: { label: "Evening Snack", icon: Coffee, color: "text-orange-600 bg-orange-50 dark:bg-orange-950/30 border-orange-200/50" },
  dinner: { label: "Dinner", icon: Moon, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200/50" },
} as const;

type MealKey = keyof typeof mealMeta;
const MEAL_KEYS: MealKey[] = ["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"];

const doshaConfig = {
  vata: { icon: Wind, color: "bg-[#7B9DBF]/10 text-[#7B9DBF] border-[#7B9DBF]/30", label: "Vata ↓" },
  pitta: { icon: Flame, color: "bg-[#D4763B]/10 text-[#D4763B] border-[#D4763B]/30", label: "Pitta ↓" },
  kapha: { icon: Mountain, color: "bg-[#5E9E74]/10 text-[#5E9E74] border-[#5E9E74]/30", label: "Kapha ↓" },
};

// ── PDF Export ────────────────────────────────────────────────────────────────

function exportPDF(plan: AIMealPlan) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const M = 18;

  // Cover
  doc.setFillColor(39, 110, 53);
  doc.rect(0, 0, W, 55, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("NIVARANA", M, 28);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.text("7-Day Personalised Ayurvedic Meal Plan", M, 40);
  doc.setFontSize(8);
  doc.setTextColor(180, 230, 180);
  doc.text(`Generated ${new Date().toLocaleDateString("en-IN", { dateStyle: "long" })}`, M, 50);

  let y = 68;
  doc.setTextColor(30, 30, 30);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const summLines = doc.splitTextToSize(plan.week_summary, W - M * 2);
  doc.text(summLines, M, y);
  y += summLines.length * 5 + 8;

  for (const dayPlan of plan.days) {
    doc.addPage();
    doc.setFillColor(39, 110, 53);
    doc.rect(0, 0, W, 20, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text(`Day ${dayPlan.day} — ${dayPlan.day_name}`, M, 14);
    y = 30;

    for (const key of MEAL_KEYS) {
      const meal = dayPlan.meals[key];
      if (!meal) continue;
      const label = mealMeta[key].label;
      doc.setFillColor(245, 250, 245);
      const mealLines = doc.splitTextToSize(meal.dish_name, W - M * 2 - 10);
      const ingLines = doc.splitTextToSize(meal.ingredients.join(", "), W - M * 2 - 10);
      const cardH = 10 + mealLines.length * 5 + ingLines.length * 4 + 16;
      if (y + cardH > H - 18) { doc.addPage(); y = 20; }
      doc.roundedRect(M, y, W - M * 2, cardH, 3, 3, "F");
      doc.setTextColor(39, 110, 53);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.text(label.toUpperCase(), M + 5, y + 7);
      doc.setTextColor(30, 30, 30);
      doc.setFontSize(11);
      doc.text(mealLines, M + 5, y + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text(ingLines, M + 5, y + 14 + mealLines.length * 5 + 3);
      doc.setTextColor(80, 80, 80);
      doc.text(`${meal.macros.calories} · ${meal.macros.protein} protein · ${meal.portion}`, M + 5, y + cardH - 5);
      y += cardH + 5;
    }
  }

  doc.save("nivarana-7-day-meal-plan.pdf");
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Parse a macro string like "28g" or "320 kcal" → number */
function parseMacroNum(val: string): number {
  const n = parseFloat(val.replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

/** Sum the calories across all 5 meals of a day plan */
function dayTotalCalories(day: DayPlan): number {
  return MEAL_KEYS.reduce((sum, key) => {
    const meal = day.meals[key];
    return sum + (meal ? parseMacroNum(meal.macros.calories) : 0);
  }, 0);
}

/** Build a deduplicated shopping list from all days, grouped by rough category */
function buildShoppingList(plan: AIMealPlan): Record<string, string[]> {
  const seen = new Set<string>();
  const grouped: Record<string, string[]> = {};

  // Very lightweight category heuristic — works well for Ayurvedic ingredient lists
  const categoryFor = (ing: string): string => {
    const l = ing.toLowerCase();
    if (/\b(oil|ghee|butter|coconut)\b/.test(l)) return "Oils & Fats";
    if (/\b(milk|yogurt|curd|paneer|cheese|cream)\b/.test(l)) return "Dairy";
    if (/\b(rice|wheat|oat|flour|bread|roti|chapati|poha|quinoa|millet|barley)\b/.test(l)) return "Grains & Cereals";
    if (/\b(dal|lentil|bean|chickpea|moong|chana|rajma|peas|tofu)\b/.test(l)) return "Legumes & Protein";
    if (/\b(cumin|turmeric|coriander|ginger|garlic|pepper|cardamom|cinnamon|fenugreek|mustard|asafoetida|hing|clove|saffron|ajwain)\b/.test(l)) return "Spices & Herbs";
    if (/\b(apple|banana|mango|pomegranate|papaya|pear|fig|date|raisin|berry|amla|lemon|lime|orange)\b/.test(l)) return "Fruits";
    if (/\b(almond|walnut|cashew|peanut|pistachio|seed|sesame|flax|chia)\b/.test(l)) return "Nuts & Seeds";
    if (/\b(sugar|jaggery|honey|maple)\b/.test(l)) return "Sweeteners";
    if (/\b(salt|water|vegetable stock|broth)\b/.test(l)) return "Pantry Staples";
    return "Vegetables & Others";
  };

  for (const day of plan.days) {
    for (const key of MEAL_KEYS) {
      const meal = day.meals[key];
      if (!meal) continue;
      for (const raw of meal.ingredients) {
        // Normalise: lowercase, trim
        const ing = raw.trim().toLowerCase();
        if (!ing || seen.has(ing)) continue;
        seen.add(ing);
        const cat = categoryFor(ing);
        if (!grouped[cat]) grouped[cat] = [];
        grouped[cat].push(raw.trim());
      }
    }
  }
  return grouped;
}


function MealCard({
  mealKey,
  meal,
  dosha,
}: {
  mealKey: MealKey;
  meal: MealEntry;
  dosha?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const meta = mealMeta[mealKey];
  const Icon = meta.icon;
  const doshaKey = (dosha?.toLowerCase() ?? "vata") as keyof typeof doshaConfig;
  const doshaInfo = doshaConfig[doshaKey] ?? doshaConfig.vata;

  return (
    <motion.div
      layout
      className={`border rounded-xl overflow-hidden transition-shadow ${expanded ? "shadow-md" : "shadow-sm"}`}
    >
      {/* Row header — always visible */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className={`w-full flex items-center gap-3 px-4 py-3.5 text-left hover:bg-muted/30 transition-colors ${meta.color} border-b border-current/10`}
      >
        <div className="w-9 h-9 rounded-xl bg-background/40 flex items-center justify-center shrink-0 shadow-sm">
          <Icon className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70">{meta.label}</p>
          <h5 className="font-semibold text-sm leading-tight truncate text-foreground">{meal.dish_name}</h5>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Dosha tag */}
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${doshaInfo.color}`}>
            {doshaInfo.label}
          </span>
          {/* Calories */}
          <Badge variant="secondary" className="text-[10px] font-bold bg-background/50 border-none">
            {meal.macros.calories}
          </Badge>
          <ChevronRight
            className={`w-4 h-4 text-muted-foreground transition-transform duration-200 ${expanded ? "rotate-90" : ""}`}
          />
        </div>
      </button>

      {/* Expandable detail */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="detail"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22, ease: "easeInOut" }}
            className="overflow-hidden bg-background/60"
          >
            <div className="px-4 py-4 space-y-3">
              {/* Macros */}
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Protein", value: meal.macros.protein, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20" },
                  { label: "Carbs", value: meal.macros.carbs, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20" },
                  { label: "Fat", value: meal.macros.fat, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20" },
                ].map(({ label, value, color, bg }) => (
                  <div key={label} className={`text-center p-2 rounded-lg ${bg}`}>
                    <p className={`text-sm font-bold ${color}`}>{value}</p>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
                  </div>
                ))}
              </div>

              {/* Portion */}
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Utensils className="w-3.5 h-3.5" />
                {meal.portion}
              </p>

              {/* Ingredients */}
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">Ingredients</p>
                <div className="flex flex-wrap gap-1.5">
                  {meal.ingredients.map((ing) => (
                    <Badge key={ing} variant="secondary" className="text-[10px] bg-primary/5 text-primary border border-primary/15 font-medium">
                      {ing}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Why it works */}
              <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/30">
                <p className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Leaf className="w-3 h-3" /> Why This Works
                </p>
                <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed">{meal.why}</p>
              </div>

              {/* Substitutions */}
              {meal.substitutions && meal.substitutions.length > 0 && (
                <div className="p-3 rounded-xl bg-muted/30 border border-border/40">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2 flex items-center gap-1">
                    <ArrowLeftRight className="w-3 h-3" /> Substitutions
                  </p>
                  <ul className="space-y-1">
                    {meal.substitutions.map((sub, i) => (
                      <li key={i} className="text-xs text-foreground/80 flex items-start gap-1.5">
                        <span className="text-primary mt-0.5 shrink-0">•</span>
                        {sub}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MealPlan() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [selectedDay, setSelectedDay] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showShoppingList, setShowShoppingList] = useState(false);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const autoGeneratedRef = useRef(false);

  // ── 1. Fetch dosha assessment (needed for goal key resolution + display)
  const { data: assessment } = useQuery<{ primaryDosha?: string }>({
    queryKey: ["/api/dosha-assessment"],
    retry: false,
  } as any);
  const primaryDosha = (assessment as any)?.primaryDosha ?? "vata";

  // ── 2. Fetch the user's chosen health goal
  const { data: healthGoalData, isSuccess: goalLoaded } = useQuery<{
    goalType?: string;
    isBalancedDiet?: number;
  }>({
    queryKey: ["/api/health-goal"],
    retry: false,
  } as any);

  // Resolve goal key and label
  const goalKey: string = healthGoalData?.isBalancedDiet
    ? "balanced"
    : (healthGoalData?.goalType ?? "balanced");

  const goalLabelMap: Record<string, string> = {
    balanced: "Balanced Diet",
    immunity: "Boost Immunity",
    digestion: "Improve Digestion",
    weight_loss: "Weight Management",
    energy: "Increase Energy",
    sleep: "Better Sleep",
    stress: "Reduce Stress",
    skin: "Skin & Hair Health",
    anti_inflammatory: "Anti-Inflammatory",
    detox: "Detox & Cleanse",
    fertility: "Fertility & Hormones",
  };
  const goalLabel = goalLabelMap[goalKey] ?? "Personalised Plan";

  // ── 3. Fetch the DB-saved plan for THIS goal (primary source of truth)
  //       Only runs after goalLoaded so we use the right key
  const {
    data: savedPlan,
    isLoading: loadingSaved,
    isError: savedPlanError,
  } = useQuery<AIMealPlan>({
    queryKey: ["/api/mealplan/saved", goalKey],
    queryFn: async () => {
      const res = await fetch(`/api/mealplan/saved?goal=${goalKey}`);
      if (!res.ok) throw new Error("No saved plan");
      return res.json();
    },
    enabled: goalLoaded,   // wait until we know the real goal
    retry: false,
    staleTime: 1000 * 60 * 5, // treat as fresh for 5 minutes
  } as any);

  // ── 4. localStorage as secondary cache (for when DB isn't available / faster hydration)
  const [localPlan, setLocalPlan] = useState<AIMealPlan | null>(() => {
    try {
      // We don't know user.id yet, so read with a temporary key; the effect below corrects it
      const raw = localStorage.getItem("nivarana-mealplan-pending");
      if (raw) return JSON.parse(raw) as AIMealPlan;
    } catch { }
    return null;
  });

  // Sync localStorage with user id once available
  useEffect(() => {
    if (!user?.id) return;
    try {
      const raw = localStorage.getItem(`nivarana-mealplan-${user.id}`);
      if (raw && !localPlan) setLocalPlan(JSON.parse(raw) as AIMealPlan);
    } catch { }
  }, [user?.id]);

  // ── 5. Merge: DB plan > localStorage > null
  //        Also allow manually generated plans to override
  const [manualPlan, setManualPlan] = useState<AIMealPlan | null>(null);
  const activePlan: AIMealPlan | null = manualPlan ?? savedPlan ?? localPlan ?? null;
  const dayPlan = activePlan?.days?.[selectedDay];

  // ── 6. Generate function
  const generatePlan = async (silent = false) => {
    setIsGenerating(true);
    try {
      const body: Record<string, string> =
        goalKey === "balanced"
          ? { mode: "balanced" }
          : { mode: "goal", goal: goalKey };

      const res = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message ?? "Failed to generate meal plan");
      }
      const data: AIMealPlan = await res.json();

      // Save to localStorage as secondary cache
      try {
        localStorage.setItem(`nivarana-mealplan-${user?.id ?? "guest"}`, JSON.stringify(data));
      } catch { }

      setManualPlan(data);
      setSelectedDay(0);
      if (!silent) {
        toast({
          title: "Meal plan ready! 🌿",
          description: `Your 7-day plan for "${goalLabel}" has been generated.`,
        });
      }
    } catch (err: any) {
      if (!silent) {
        toast({ title: "Generation failed", description: err.message, variant: "destructive" });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  // ── 7. Auto-generate ONLY if: goal loaded, no DB plan, no local cache, not already generating
  useEffect(() => {
    if (
      !autoGeneratedRef.current &&
      !activePlan &&
      !isGenerating &&
      !loadingSaved &&
      savedPlanError &&      // DB returned 404 — confirmed no saved plan
      assessment &&          // has dosha assessment
      goalLoaded &&
      user?.id
    ) {
      autoGeneratedRef.current = true;
      generatePlan(true);
    }
  }, [activePlan, isGenerating, loadingSaved, savedPlanError, assessment, goalLoaded, user?.id]);


  return (
    <div className="min-h-screen bg-background">
      {/* Ambient blobs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/[0.04] rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-accent/[0.03] rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/70 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-4xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 text-muted-foreground hover:text-foreground">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
            <div className="h-5 w-px bg-border" />
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                <Leaf className="w-4 h-4 text-primary" />
              </div>
              <span className="font-serif font-semibold text-sm">7-Day Meal Plan</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Export PDF */}
            {activePlan && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs hidden sm:flex"
                onClick={() => exportPDF(activePlan)}
              >
                <Download className="w-3.5 h-3.5" />
                Export PDF
              </Button>
            )}
            {/* Shopping list */}
            {activePlan && (
              <Button
                variant="outline"
                size="sm"
                className="gap-2 text-xs hidden sm:flex border-emerald-400/40 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/20"
                onClick={() => setShowShoppingList(true)}
                data-testid="button-shopping-list"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                Shopping List
              </Button>
            )}
            {/* Regenerate */}
            <Button
              size="sm"
              className="gap-2 text-xs shadow-md shadow-primary/20"
              onClick={generatePlan}
              disabled={isGenerating}
              data-testid="button-generate-plan"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5" />
                  {activePlan ? "Regenerate" : "Generate Plan"}
                </>
              )}
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 relative">
        {/* Page title */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3 h-3" />
            Personalised for {user?.firstName ?? "You"}
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            Your Ayurvedic Meal Plan
          </h1>
          {/* Show the user's chosen health goal */}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-400 text-xs font-bold">
              🎯 Goal: {goalLabel}
            </span>
            {!healthGoalData && (
              <span className="text-xs text-muted-foreground">
                — <a href="/health-goals" className="underline underline-offset-2 hover:text-primary">Set a health goal</a> to personalise further
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xl">
            {activePlan?.week_summary ?? "Generate your personalised 7-day Ayurvedic meal plan powered by AI, tailored to your dosha and health goals."}
          </p>
        </motion.div>

        {/* ── Weekly calendar strip ── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {DAYS.map((day, i) => {
              const hasPlan = !!(activePlan?.days?.[i]);
              const dayData = activePlan?.days?.[i];
              const totalCal = dayData ? dayTotalCalories(dayData) : 0;
              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(i)}
                  disabled={!hasPlan && !isGenerating}
                  className={`flex flex-col items-center min-w-[64px] py-3 px-2 rounded-2xl border-2 transition-all duration-200 font-medium text-sm shrink-0 ${selectedDay === i
                      ? "border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                      : hasPlan
                        ? "border-border/60 bg-card hover:border-primary/40 hover:bg-primary/5 text-foreground"
                        : "border-border/30 bg-muted/20 text-muted-foreground/50 cursor-not-allowed"
                    }`}
                  data-testid={`day-tab-${day.toLowerCase()}`}
                >
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-70">{day}</span>
                  <span className="text-lg font-bold mt-0.5">{i + 1}</span>
                  {totalCal > 0 ? (
                    <span className={`text-[9px] font-semibold mt-1 ${selectedDay === i ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {totalCal.toFixed(0)} kcal
                    </span>
                  ) : hasPlan ? (
                    <div className={`w-1.5 h-1.5 rounded-full mt-1 ${selectedDay === i ? "bg-primary-foreground" : "bg-primary"}`} />
                  ) : null}
                </button>
              );
            })}
          </div>
        </motion.div>

        {/* ── Plan info banner (hydration + strategy) ── */}
        {activePlan && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.15 }}
            className="grid sm:grid-cols-2 gap-3 mb-6"
          >
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200/40">
              <div className="w-8 h-8 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
                <Info className="w-4 h-4 text-sky-600 dark:text-sky-400" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-sky-700 dark:text-sky-400 mb-0.5">Hydration</p>
                <p className="text-xs text-sky-900 dark:text-sky-300 leading-relaxed">{activePlan.hydration}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-primary/5 border border-primary/15">
              <div className="w-8 h-8 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                <Leaf className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-0.5">Weekly Strategy</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{activePlan.weekly_strategy}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* ── Day meals ── */}
        <AnimatePresence mode="wait">
          {(loadingSaved || isGenerating) ? (
            <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
              {/* Loading header with goal context */}
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-primary/5 border border-primary/15">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                  <span className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-foreground">
                    Building your personalised plan…
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Goal: <span className="font-bold text-primary">{goalLabel}</span>
                    {assessment && (
                      <> &middot; Dosha: <span className="font-bold capitalize">{primaryDosha}</span></>
                    )}
                  </p>
                </div>
              </div>
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-14 w-full rounded-xl" />
              ))}
            </motion.div>
          ) : !activePlan ? (
            /* Empty state — shown only if auto-generate couldn't run */
            <motion.div
              key="empty"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-center py-16 px-4"
            >
              <div className="w-20 h-20 rounded-3xl bg-primary/10 flex items-center justify-center mx-auto mb-5">
                <Sparkles className="w-10 h-10 text-primary/60" />
              </div>
              <h2 className="font-serif text-2xl font-bold mb-2">Ready to Generate</h2>
              {/* Show the user's goal clearly */}
              {healthGoalData && (
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-400/30 text-amber-700 dark:text-amber-400 text-sm font-bold mb-4">
                  🎯 Your goal: {goalLabel}
                </div>
              )}
              <p className="text-muted-foreground text-sm mb-8 max-w-sm mx-auto leading-relaxed">
                We'll create a 7-day Ayurvedic meal plan tailored to your{" "}
                <span className="font-semibold capitalize">{primaryDosha}</span> dosha
                {healthGoalData && <> and your <span className="font-semibold">{goalLabel}</span> goal</>}.
              </p>
              <Button
                size="lg"
                className="gap-2 shadow-lg shadow-primary/25 px-8"
                onClick={() => generatePlan(false)}
                disabled={isGenerating}
                data-testid="button-generate-empty"
              >
                <Sparkles className="w-5 h-5" />
                Generate My Meal Plan
              </Button>
            </motion.div>
          ) : dayPlan ? (
            /* Day meals list */
            <motion.div
              key={`day-${selectedDay}`}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="space-y-3"
            >
              {/* Day heading */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center shadow-sm">
                  <span className="font-serif text-lg font-bold text-primary">{dayPlan.day}</span>
                </div>
                <div>
                  <h2 className="font-serif text-xl font-bold">{dayPlan.day_name}</h2>
                  <p className="text-xs text-muted-foreground">5 meals · tap to expand details</p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                  <span className={`text-xs font-bold px-2.5 py-1 rounded-full border ${(doshaConfig[primaryDosha as keyof typeof doshaConfig] ?? doshaConfig.vata).color}`}>
                    {(doshaConfig[primaryDosha as keyof typeof doshaConfig] ?? doshaConfig.vata).label}
                  </span>
                </div>
              </div>

              {/* ── Daily macro summary bar ── */}
              {(() => {
                const meals = MEAL_KEYS.map(k => dayPlan.meals[k]).filter(Boolean) as any[];
                const totalCal = meals.reduce((s, m) => s + parseMacroNum(m.macros.calories), 0);
                const totalPro = meals.reduce((s, m) => s + parseMacroNum(m.macros.protein), 0);
                const totalCarb = meals.reduce((s, m) => s + parseMacroNum(m.macros.carbs), 0);
                const totalFat = meals.reduce((s, m) => s + parseMacroNum(m.macros.fat), 0);
                const macroTotal = totalPro + totalCarb + totalFat || 1;
                return (
                  <div className="mb-4 p-4 rounded-2xl bg-card border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 mb-3">
                      <BarChart3 className="w-4 h-4 text-primary" />
                      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Daily Nutrition</p>
                      <span className="ml-auto font-bold text-sm">{totalCal.toFixed(0)} <span className="text-xs font-normal text-muted-foreground">kcal</span></span>
                    </div>
                    {/* Visual bar */}
                    <div className="flex h-2.5 rounded-full overflow-hidden mb-3 gap-0.5">
                      <div style={{ width: `${(totalPro / macroTotal) * 100}%` }} className="bg-blue-500 rounded-l-full" />
                      <div style={{ width: `${(totalCarb / macroTotal) * 100}%` }} className="bg-amber-400" />
                      <div style={{ width: `${(totalFat / macroTotal) * 100}%` }} className="bg-rose-400 rounded-r-full" />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[
                        { label: "Protein", val: totalPro, color: "text-blue-600 dark:text-blue-400", dot: "bg-blue-500" },
                        { label: "Carbs", val: totalCarb, color: "text-amber-600 dark:text-amber-400", dot: "bg-amber-400" },
                        { label: "Fat", val: totalFat, color: "text-rose-600 dark:text-rose-400", dot: "bg-rose-400" },
                      ].map(({ label, val, color, dot }) => (
                        <div key={label}>
                          <div className="flex items-center justify-center gap-1 mb-0.5">
                            <div className={`w-2 h-2 rounded-full ${dot}`} />
                            <p className="text-[10px] text-muted-foreground font-bold uppercase">{label}</p>
                          </div>
                          <p className={`text-sm font-bold ${color}`}>{val.toFixed(0)}g</p>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()}

              {/* Meal cards */}
              {MEAL_KEYS.map((key) => {
                const meal = dayPlan.meals[key];
                return meal ? (
                  <MealCard key={key} mealKey={key} meal={meal} dosha={primaryDosha} />
                ) : null;
              })}

              {/* Clinician note (if present) */}
              {activePlan.clinician_note && (
                <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 flex gap-3">
                  <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1">Clinical Note</p>
                    <p className="text-xs text-amber-900 dark:text-amber-300 leading-relaxed">{activePlan.clinician_note}</p>
                  </div>
                </div>
              )}

              {/* Mobile PDF export */}
              <Button
                variant="outline"
                className="w-full gap-2 mt-4 sm:hidden"
                onClick={() => exportPDF(activePlan)}
              >
                <Download className="w-4 h-4" />
                Export Full Plan as PDF
              </Button>
              {/* Mobile shopping list */}
              <Button
                variant="outline"
                className="w-full gap-2 sm:hidden border-emerald-400/40 text-emerald-700 dark:text-emerald-400"
                onClick={() => setShowShoppingList(true)}
              >
                <ShoppingCart className="w-4 h-4" />
                View Shopping List
              </Button>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* ── Shopping List Modal ── */}
        <AnimatePresence>
          {showShoppingList && activePlan && (
            <motion.div
              key="shopping"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
              onClick={() => setShowShoppingList(false)}
            >
              <motion.div
                initial={{ y: 60, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 60, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                onClick={(e) => e.stopPropagation()}
                className="bg-card rounded-3xl border border-border/50 shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden"
              >
                {/* Header */}
                <div className="flex items-center gap-3 p-5 border-b border-border/40">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 flex items-center justify-center">
                    <ShoppingCart className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-serif text-lg font-bold">Shopping List</h3>
                    <p className="text-xs text-muted-foreground">All ingredients for 7 days · tap to check off</p>
                  </div>
                  <button
                    onClick={() => setShowShoppingList(false)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-muted/50 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* List */}
                <div className="overflow-y-auto flex-1 p-4 space-y-5">
                  {Object.entries(buildShoppingList(activePlan)).map(([category, items]) => (
                    <div key={category}>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-2">{category}</p>
                      <div className="space-y-1.5">
                        {items.map((item) => {
                          const checked = checkedItems.has(item);
                          return (
                            <button
                              key={item}
                              onClick={() =>
                                setCheckedItems((prev) => {
                                  const next = new Set(prev);
                                  if (checked) next.delete(item);
                                  else next.add(item);
                                  return next;
                                })
                              }
                              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-left transition-all ${checked
                                  ? "bg-emerald-50 dark:bg-emerald-950/20 text-muted-foreground line-through"
                                  : "hover:bg-muted/40"
                                }`}
                            >
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${checked
                                  ? "border-emerald-500 bg-emerald-500"
                                  : "border-border"
                                }`}>
                                {checked && <Check className="w-3 h-3 text-white" />}
                              </div>
                              <span className="text-sm capitalize">{item}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-border/40 flex justify-between items-center">
                  <p className="text-xs text-muted-foreground">
                    {checkedItems.size} of {Object.values(buildShoppingList(activePlan)).flat().length} items checked
                  </p>
                  <Button size="sm" variant="ghost" onClick={() => setCheckedItems(new Set())}
                    className="text-xs text-muted-foreground">
                    Clear all
                  </Button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
