import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearch } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
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
  Star,
  Info,
  ChevronRight,
  Droplets,
  Utensils,
  Apple,
  Coffee,
  Moon,
  Sun,
  RefreshCw,
  AlertCircle,
  Flame,
  Download,
  Calendar,
} from "lucide-react";
import Chatbot from "@/components/Chatbot";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { jsPDF } from "jspdf";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface Preferences {
  dietaryRestrictions: string;
  allergies: string;
  healthConditions: string;
  cuisinePreference: string;
  budget: string;
  cookingTime: string;
}

// ---------------------------------------------------------------------------
// PDF Generator
// ---------------------------------------------------------------------------
function downloadMealPlanPDF(plan: AIMealPlan) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const M = 18;           // page margin
  const cW = pageW - M * 2; // content width = 174mm
  const FOOTER_H = 14;    // reserved at bottom for footer
  const BODY_MAX = pageH - M - FOOTER_H;

  // ── Palette ──────────────────────────────────────────────────────────────
  const C = {
    green: [39, 110, 53] as [number, number, number],
    greenLight: [220, 237, 222] as [number, number, number],
    dark: [28, 28, 28] as [number, number, number],
    mid: [80, 80, 80] as [number, number, number],
    muted: [140, 140, 140] as [number, number, number],
    pageBg: [252, 252, 250] as [number, number, number],
    cardBg: [255, 255, 255] as [number, number, number],
    rule: [220, 220, 215] as [number, number, number],
  };

  const MEAL_ACCENT: Record<string, [number, number, number]> = {
    breakfast: [234, 170, 30],
    morning_snack: [52, 168, 104],
    lunch: [30, 140, 220],
    evening_snack: [220, 120, 30],
    dinner: [120, 70, 200],
  };
  const MEAL_LABEL: Record<string, string> = {
    breakfast: "Breakfast",
    morning_snack: "Morning Snack",
    lunch: "Lunch",
    evening_snack: "Evening Snack",
    dinner: "Dinner",
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  let y = 0;

  const LH = (size: number) => size * 0.38; // line-height in mm for a given pt size

  function wrap(text: string, width: number, size: number): string[] {
    doc.setFontSize(size);
    return doc.splitTextToSize(text || "", width);
  }

  function fillRect(x: number, ry: number, w: number, h: number, color: [number, number, number], r = 0) {
    doc.setFillColor(...color);
    if (r > 0) doc.roundedRect(x, ry, w, h, r, r, "F");
    else doc.rect(x, ry, w, h, "F");
  }

  function hRule(ry: number) {
    doc.setDrawColor(...C.rule);
    doc.setLineWidth(0.2);
    doc.line(M, ry, M + cW, ry);
  }

  function footer(pageNum: number) {
    const fy = pageH - 9;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.muted);
    doc.text("NIVARANA  ·  Personalised Ayurvedic Nutrition  ·  Not a substitute for clinical advice.", M, fy);
    doc.text(`${pageNum}`, pageW - M, fy, { align: "right" });
  }

  function needPage(needed: number) {
    if (y + needed > BODY_MAX) {
      footer(doc.getNumberOfPages());
      doc.addPage();
      fillRect(0, 0, pageW, pageH, C.pageBg);
      y = M;
    }
  }

  // ── COVER PAGE ────────────────────────────────────────────────────────────
  fillRect(0, 0, pageW, pageH, C.pageBg);

  // Hero band
  fillRect(0, 0, pageW, 68, C.green);

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(32);
  doc.text("NIVARANA", M, 30);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text("7-Day Personalised Ayurvedic Meal Plan", M, 43);

  doc.setFontSize(9);
  doc.setTextColor(200, 230, 200);
  doc.text(
    `Generated on ${new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })}`,
    M, 56
  );

  y = 82;

  // Section label helper
  function sectionLabel(label: string) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(...C.green);
    const chars = label.split("").join(" ");
    doc.text(chars.toUpperCase(), M, y);
    y += 5;
    hRule(y);
    y += 5;
  }

  // Week summary
  sectionLabel("Plan Overview");
  const summLines = wrap(plan.week_summary, cW, 10);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(...C.dark);
  doc.text(summLines, M, y);
  y += summLines.length * LH(10) + 10;

  // Hydration + Strategy side by side
  const colW2 = (cW - 6) / 2;

  fillRect(M, y, colW2, 1, C.greenLight); // will size dynamically
  const hydLines = wrap(plan.hydration, colW2 - 8, 9);
  const stratLines = wrap(plan.weekly_strategy, colW2 - 8, 9);
  const boxH = Math.max(hydLines.length, stratLines.length) * LH(9) + 22;

  fillRect(M, y, colW2, boxH, C.greenLight, 3);
  fillRect(M + colW2 + 6, y, colW2, boxH, [232, 245, 233] as [number, number, number], 3);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.green);
  doc.text("HYDRATION", M + 5, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.text(hydLines, M + 5, y + 15);

  doc.setFont("helvetica", "bold");
  doc.setFontSize(7.5);
  doc.setTextColor(...C.green);
  doc.text("WEEKLY STRATEGY", M + colW2 + 11, y + 8);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.dark);
  doc.text(stratLines, M + colW2 + 11, y + 15);

  y += boxH + 10;

  if (plan.clinician_note) {
    const noteLines = wrap(plan.clinician_note, cW - 10, 9);
    const noteH = noteLines.length * LH(9) + 18;
    fillRect(M, y, cW, noteH, [255, 248, 225] as [number, number, number], 3);
    fillRect(M, y, 3, noteH, [230, 81, 0] as [number, number, number], 1);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7.5);
    doc.setTextColor(180, 60, 0);
    doc.text("CLINICAL NOTE", M + 7, y + 8);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.dark);
    doc.text(noteLines, M + 7, y + 15);
    y += noteH + 8;
  }

  footer(1);

  // ── DAY PAGES ─────────────────────────────────────────────────────────────
  const mealOrder = ["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"] as const;

  for (const dayPlan of plan.days) {
    doc.addPage();
    fillRect(0, 0, pageW, pageH, C.pageBg);
    y = 0;

    // Day header
    fillRect(0, 0, pageW, 24, C.green);
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text(`Day ${dayPlan.day}`, M, 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    doc.setTextColor(190, 230, 195);
    doc.text(dayPlan.day_name, M + 28, 15);
    y = 34;

    for (const mealKey of mealOrder) {
      const meal = dayPlan.meals[mealKey];
      if (!meal) continue;

      const accent = MEAL_ACCENT[mealKey] ?? C.green;
      const label = MEAL_LABEL[mealKey] ?? mealKey;

      // Pre-calculate all wrapped lines
      const nameLines = wrap(meal.dish_name, cW - 10, 12);
      const ingLines = wrap(meal.ingredients.join(", "), cW - 10, 9);
      const whyLines = wrap(meal.why, cW - 10, 9);
      const portLine = `${meal.portion}  ·  ${meal.macros.calories}`;

      const cardH =
        3 +                              // accent bar
        6 +                              // label pill row
        4 +                              // gap
        nameLines.length * LH(12) + 2 + // dish name
        LH(9) + 3 +                      // portion + cal
        9 +                              // macros row
        6 +                              // "Ingredients" label
        ingLines.length * LH(9) + 5 +  // ingredients
        6 +                              // "Why" label
        whyLines.length * LH(9) + 10;  // why + bottom padding

      needPage(cardH);

      const cx = M;
      const cy = y;

      // Card background
      fillRect(cx, cy, cW, cardH, C.cardBg, 4);

      // Accent bar at top of card
      fillRect(cx, cy, cW, 3, accent, 4);

      // Meal label pill
      const pillY = cy + 7;
      fillRect(cx + 8, pillY - 4, 32, 6, accent, 3);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(label.toUpperCase(), cx + 10, pillY);

      let iy = pillY + 8;

      // Dish name
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(...C.dark);
      doc.text(nameLines, cx + 8, iy);
      iy += nameLines.length * LH(12) + 3;

      // Portion + calories
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.mid);
      doc.text(portLine, cx + 8, iy);
      iy += LH(9) + 5;

      // Macro pills
      const macros = [
        { label: "Protein", value: meal.macros.protein, bg: [232, 244, 254] as [number, number, number] },
        { label: "Carbs", value: meal.macros.carbs, bg: [255, 248, 225] as [number, number, number] },
        { label: "Fat", value: meal.macros.fat, bg: [254, 235, 235] as [number, number, number] },
      ];
      const pillW = (cW - 28) / 3;
      macros.forEach(({ label: ml, value, bg }, i) => {
        const px = cx + 8 + i * (pillW + 4);
        fillRect(px, iy, pillW, 7.5, bg, 2);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(7.5);
        doc.setTextColor(...C.dark);
        doc.text(`${ml}  ${value}`, px + 3, iy + 5.3);
      });
      iy += 12;

      // Ingredients
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.green);
      doc.text("Ingredients", cx + 8, iy);
      iy += 5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...C.mid);
      doc.text(ingLines, cx + 8, iy);
      iy += ingLines.length * LH(9) + 6;

      // Why it works
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(...C.green);
      doc.text("Why it works", cx + 8, iy);
      iy += 5;
      doc.setFont("helvetica", "italic");
      doc.setFontSize(9);
      doc.setTextColor(...C.muted);
      doc.text(whyLines, cx + 8, iy);

      y += cardH + 6; // 6mm gap between cards
    }

    footer(doc.getNumberOfPages());
  }

  doc.save("nivarana-7-day-meal-plan.pdf");
}

// ---------------------------------------------------------------------------
// Tier metadata
// ---------------------------------------------------------------------------
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

const foodCategories = [
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

// Meal keys with display info
const mealMeta: Record<
  keyof DayPlan["meals"],
  { label: string; icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  breakfast: { label: "Breakfast", icon: Sun, color: "text-amber-500 bg-amber-50 dark:bg-amber-950/30" },
  morning_snack: { label: "Morning Snack", icon: Apple, color: "text-green-500 bg-green-50 dark:bg-green-950/30" },
  lunch: { label: "Lunch", icon: Utensils, color: "text-blue-500 bg-blue-50 dark:bg-blue-950/30" },
  evening_snack: { label: "Evening Snack", icon: Coffee, color: "text-orange-500 bg-orange-50 dark:bg-orange-950/30" },
  dinner: { label: "Dinner", icon: Moon, color: "text-indigo-500 bg-indigo-50 dark:bg-indigo-950/30" },
};

// ---------------------------------------------------------------------------
// FoodCard component
// ---------------------------------------------------------------------------
function FoodCard({ food, tier }: { food: Food; tier: keyof typeof tierInfo }) {
  const info = tierInfo[tier];
  const [showDetail, setShowDetail] = useState(false);

  return (
    <>
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ scale: 1.02, y: -2 }}
        className={`p-4 rounded-xl border-2 ${info.color} cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 group relative overflow-hidden`}
        onClick={() => setShowDetail(true)}
      >
        <div className="absolute top-0 right-0 w-16 h-16 bg-white/5 rounded-full -mr-8 -mt-8 group-hover:bg-white/10 transition-colors" />
        <div className="flex items-start justify-between gap-2 relative">
          <div>
            <h4 className="font-bold text-lg leading-tight">{food.name}</h4>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/80">
                {food.category}
              </span>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Badge variant="outline" className="text-[10px] bg-background/40 border-current/20 font-bold">
              {food.category}
            </Badge>
            <Info className="w-3.5 h-3.5 opacity-0 group-hover:opacity-40 transition-opacity" />
          </div>
        </div>
      </motion.div>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="sm:max-w-md bg-background/95 backdrop-blur-xl border-border/40">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${info.color} shadow-inner`}>
                <info.icon className="w-6 h-6" />
              </div>
              <div>
                <DialogTitle className="font-serif text-2xl">{food.name}</DialogTitle>
                <DialogDescription className="capitalize font-medium text-primary">
                  {food.category} • {info.label}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          <div className="space-y-6 pt-4">
            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Dosha Balance</h5>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(food.dosha_effects).map(([dosha, effect]) => (
                  <div
                    key={dosha}
                    className="p-2 rounded-xl border border-border/40 bg-muted/20 flex flex-col items-center gap-1"
                  >
                    <span className="text-[10px] font-bold uppercase tracking-tighter opacity-60">{dosha}</span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] border-none px-1.5 h-5 flex items-center justify-center ${effect === "favourable"
                          ? "bg-emerald-500/10 text-emerald-500"
                          : effect === "neutral"
                            ? "bg-amber-500/10 text-amber-500"
                            : "bg-rose-500/10 text-rose-500"
                        }`}
                    >
                      {effect}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <h5 className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Benefit Analysis</h5>
              <div className="flex flex-wrap gap-2">
                {Object.entries(food.health_goal_effects)
                  .filter(([_, effect]) => effect === "favourable")
                  .map(([goal]) => (
                    <Badge
                      key={goal}
                      variant="secondary"
                      className="bg-primary/5 text-primary border-primary/10 px-2 py-1 rounded-lg"
                    >
                      Excellent for {healthGoals[goal as HealthGoalKey]}
                    </Badge>
                  ))}
                {Object.entries(food.health_goal_effects).filter(([_, e]) => e === "favourable").length === 0 && (
                  <p className="text-sm text-muted-foreground italic">Generally balanced for most systems.</p>
                )}
              </div>
            </div>

            <div className={`p-4 rounded-2xl ${info.color} border-none`}>
              <p className="text-sm font-medium leading-relaxed opacity-90">
                <span className="font-bold">Dietician's Note:</span> {info.description}. In Ayurveda, {food.name} is
                considered {food.dosha_effects.vata === "favourable" ? "warming" : "cooling"} and{" "}
                {food.category === "grains" ? "grounding" : "light"}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---------------------------------------------------------------------------
// TierSection component
// ---------------------------------------------------------------------------
function TierSection({
  tier,
  foods,
  searchQuery,
  selectedCategory,
}: {
  tier: keyof typeof tierInfo;
  foods: Food[];
  searchQuery: string;
  selectedCategory: string;
}) {
  const info = tierInfo[tier];
  const Icon = info.icon;

  const filteredFoods = useMemo(
    () =>
      foods.filter((food) => {
        const matchesSearch = food.name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesCategory = selectedCategory === "all" || food.category === selectedCategory;
        return matchesSearch && matchesCategory;
      }),
    [foods, searchQuery, selectedCategory]
  );

  if (filteredFoods.length === 0 && foods.length > 0) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12">
      <div className="flex items-center gap-4 mb-6">
        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${info.color} shadow-sm ring-1 ring-current/20`}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="font-serif text-xl font-bold">{info.label}</h3>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-muted text-muted-foreground uppercase tracking-wider">
              {filteredFoods.length}
            </span>
          </div>
          <p className="text-sm text-muted-foreground font-medium">{info.description}</p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-border/60 to-transparent ml-4 hidden md:block" />
      </div>

      {filteredFoods.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-border/60 bg-muted/10 text-center">
          <p className="text-sm text-muted-foreground italic">No foods match your current filters in this tier.</p>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {filteredFoods.map((food) => (
              <FoodCard key={food.name} food={food} tier={tier} />
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// MealRow — clickable summary row shown in the overview list
// ---------------------------------------------------------------------------
function MealRow({
  mealKey,
  meal,
  onClick,
}: {
  mealKey: keyof DayPlan["meals"];
  meal: MealEntry;
  onClick: () => void;
}) {
  const meta = mealMeta[mealKey];
  const Icon = meta.icon;

  return (
    <motion.button
      onClick={onClick}
      whileHover={{ scale: 1.01 }}
      whileTap={{ scale: 0.99 }}
      className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-2xl"
    >
      <div className="flex items-center gap-4 px-5 py-4 rounded-2xl border border-border/40 bg-card/60 hover:bg-card hover:border-primary/30 hover:shadow-md transition-all duration-200 group">
        {/* Icon */}
        <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${meta.color} shadow-sm`}>
          <Icon className="w-5 h-5" />
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-0.5">{meta.label}</p>
          <h5 className="font-bold text-base leading-tight truncate">{meal.dish_name}</h5>
          <p className="text-xs text-muted-foreground mt-0.5 truncate">
            {meal.macros.protein} protein · {meal.macros.carbs} carbs · {meal.macros.fat} fat
          </p>
        </div>

        {/* Calorie badge + arrow */}
        <div className="flex items-center gap-3 shrink-0">
          <Badge variant="secondary" className="text-[11px] font-bold bg-muted/60 border-none">
            {meal.macros.calories}
          </Badge>
          <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </motion.button>
  );
}

// ---------------------------------------------------------------------------
// MealDetailView — full detail for a single selected meal
// ---------------------------------------------------------------------------
function MealDetailView({
  mealKey,
  meal,
  onBack,
}: {
  mealKey: keyof DayPlan["meals"];
  meal: MealEntry;
  onBack: () => void;
}) {
  const meta = mealMeta[mealKey];
  const Icon = meta.icon;

  return (
    <motion.div
      key="detail"
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className="space-y-5"
    >
      {/* Back button + meal identity */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={onBack}
          className="rounded-xl gap-1.5 text-sm font-semibold shrink-0 -ml-1"
        >
          <ArrowLeft className="w-4 h-4" />
          All Meals
        </Button>
      </div>

      {/* Meal hero header */}
      <div className={`flex items-center gap-4 p-5 rounded-2xl ${meta.color} border border-current/10`}>
        <div className="w-14 h-14 rounded-2xl bg-background/30 flex items-center justify-center shadow-sm flex-shrink-0">
          <Icon className="w-7 h-7" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-70 mb-0.5">{meta.label}</p>
          <h4 className="font-serif font-bold text-xl leading-tight">{meal.dish_name}</h4>
        </div>
        <Badge variant="secondary" className="text-sm font-bold bg-background/40 border-none shrink-0 px-3 py-1.5">
          {meal.macros.calories}
        </Badge>
      </div>

      {/* Macros grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Protein", value: meal.macros.protein, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-950/20 border-blue-200/40 dark:border-blue-800/30" },
          { label: "Carbs", value: meal.macros.carbs, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-950/20 border-amber-200/40 dark:border-amber-800/30" },
          { label: "Fat", value: meal.macros.fat, color: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-950/20 border-rose-200/40 dark:border-rose-800/30" },
        ].map(({ label, value, color, bg }) => (
          <div key={label} className={`text-center p-3 rounded-xl border ${bg}`}>
            <p className={`text-base font-bold ${color}`}>{value}</p>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Portion */}
      <div className="flex items-center gap-2.5 bg-muted/30 rounded-xl px-4 py-3 border border-border/30">
        <Utensils className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Portion</p>
          <p className="text-sm font-semibold">{meal.portion}</p>
        </div>
      </div>

      {/* Ingredients */}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">Ingredients</p>
        <div className="flex flex-wrap gap-2">
          {meal.ingredients.map((ing) => (
            <Badge
              key={ing}
              variant="secondary"
              className="text-xs bg-primary/5 text-primary border border-primary/15 font-medium px-3 py-1 rounded-xl"
            >
              {ing}
            </Badge>
          ))}
        </div>
      </div>

      {/* Why this works */}
      <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 mb-2 flex items-center gap-1.5">
          <Leaf className="w-3.5 h-3.5" /> Why This Works
        </p>
        <p className="text-sm text-emerald-800 dark:text-emerald-300 leading-relaxed">{meal.why}</p>
      </div>

      {/* Substitutions */}
      {meal.substitutions && meal.substitutions.length > 0 && (
        <div className="p-4 rounded-2xl bg-muted/20 border border-border/30">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3 flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5" /> Substitutions
          </p>
          <ul className="space-y-2">
            {meal.substitutions.map((sub, i) => (
              <li key={i} className="text-sm text-foreground/80 flex items-start gap-2.5 leading-relaxed">
                <div className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-[10px] font-bold">{i + 1}</span>
                </div>
                {sub}
              </li>
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// PreferencesForm — collected before calling the AI
// ---------------------------------------------------------------------------
function PreferencesForm({
  prefs,
  setPrefs,
  onGenerate,
  onCancel,
  loading,
}: {
  prefs: Preferences;
  setPrefs: (p: Preferences) => void;
  onGenerate: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  const update = (key: keyof Preferences) => (value: string) =>
    setPrefs({ ...prefs, [key]: value });

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Dietary Restrictions */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Dietary Preference
          </Label>
          <Select value={prefs.dietaryRestrictions} onValueChange={update("dietaryRestrictions")}>
            <SelectTrigger className="rounded-xl border-border/60 bg-background/60">
              <SelectValue placeholder="Select preference" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="No specific restrictions">No specific restrictions</SelectItem>
              <SelectItem value="Vegetarian">Vegetarian</SelectItem>
              <SelectItem value="Vegan">Vegan</SelectItem>
              <SelectItem value="Jain vegetarian (no root vegetables)">Jain Vegetarian</SelectItem>
              <SelectItem value="Sattvic diet (no onion/garlic)">Sattvic (no onion/garlic)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cuisine preference */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cuisine Preference
          </Label>
          <Select value={prefs.cuisinePreference} onValueChange={update("cuisinePreference")}>
            <SelectTrigger className="rounded-xl border-border/60 bg-background/60">
              <SelectValue placeholder="Select cuisine" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Indian — any region">Indian — Any Region</SelectItem>
              <SelectItem value="North Indian">North Indian</SelectItem>
              <SelectItem value="South Indian">South Indian</SelectItem>
              <SelectItem value="Gujarati">Gujarati</SelectItem>
              <SelectItem value="Bengali">Bengali</SelectItem>
              <SelectItem value="Pan-Asian">Pan-Asian</SelectItem>
              <SelectItem value="Mediterranean">Mediterranean</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Budget */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Budget</Label>
          <Select value={prefs.budget} onValueChange={update("budget")}>
            <SelectTrigger className="rounded-xl border-border/60 bg-background/60">
              <SelectValue placeholder="Select budget" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Budget (affordable, simple)">Budget — affordable & simple</SelectItem>
              <SelectItem value="Moderate">Moderate</SelectItem>
              <SelectItem value="Premium (superfoods, organic)">Premium — superfoods & organic</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Cooking time */}
        <div className="space-y-2">
          <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Cooking Time Available
          </Label>
          <Select value={prefs.cookingTime} onValueChange={update("cookingTime")}>
            <SelectTrigger className="rounded-xl border-border/60 bg-background/60">
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="Under 15 minutes">Under 15 minutes</SelectItem>
              <SelectItem value="Under 30 minutes">Under 30 minutes</SelectItem>
              <SelectItem value="Up to 1 hour">Up to 1 hour</SelectItem>
              <SelectItem value="No time limit">No time limit</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Allergies — free text */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Allergies / Intolerances
        </Label>
        <Input
          placeholder="e.g. peanuts, gluten, lactose — or leave blank"
          value={prefs.allergies}
          onChange={(e) => update("allergies")(e.target.value)}
          className="rounded-xl border-border/60 bg-background/60"
        />
      </div>

      {/* Health conditions — free text */}
      <div className="space-y-2">
        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
          Health Conditions / Medications
        </Label>
        <Input
          placeholder="e.g. type 2 diabetes, hypertension, thyroid — or leave blank"
          value={prefs.healthConditions}
          onChange={(e) => update("healthConditions")(e.target.value)}
          className="rounded-xl border-border/60 bg-background/60"
        />
        <p className="text-[10px] text-muted-foreground leading-relaxed">
          This helps the AI avoid contraindicated foods and add appropriate cautions.
        </p>
      </div>

      <div className="flex gap-3 pt-2">
        <Button variant="ghost" onClick={onCancel} className="flex-1 rounded-xl" disabled={loading}>
          Cancel
        </Button>
        <Button onClick={onGenerate} disabled={loading} className="flex-1 rounded-xl shadow-md shadow-primary/20 gap-2">
          {loading ? (
            <>
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                <Sparkles className="w-4 h-4" />
              </motion.div>
              Generating…
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              Generate My Plan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main FoodList page
// ---------------------------------------------------------------------------
export default function FoodList() {
  const searchParams = useSearch();
  const params = new URLSearchParams(searchParams);
  const mode = params.get("mode") || "balanced";
  const goalParam = params.get("goal") as HealthGoalKey | null;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("all");

  // Dialog states
  const [showPrefsDialog, setShowPrefsDialog] = useState(false);
  const [showMealDialog, setShowMealDialog] = useState(false);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [mealPlan, setMealPlan] = useState<AIMealPlan | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  // Day selector (0 = Day 1 / Monday)
  const [selectedDay, setSelectedDay] = useState(0);
  // Drill-down: which meal is currently open (null = overview)
  const [selectedMeal, setSelectedMeal] = useState<keyof DayPlan["meals"] | null>(null);

  // Preferences form state
  const [prefs, setPrefs] = useState<Preferences>({
    dietaryRestrictions: "No specific restrictions",
    allergies: "",
    healthConditions: "",
    cuisinePreference: "Indian — any region",
    budget: "Moderate",
    cookingTime: "Up to 1 hour",
  });

  const { toast } = useToast();

  // Load the saved meal plan for the current goal whenever the goal changes
  useEffect(() => {
    setMealPlan(null);
    const goal = goalParam ?? "balanced";
    fetch(`/api/mealplan/saved?goal=${goal}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data) setMealPlan(data as AIMealPlan); })
      .catch(() => { });
  }, [goalParam]);

  const { data: tieredFoods, isLoading } = useQuery<TieredFoods>({
    queryKey: ["/api/foods/filtered", mode, goalParam],
    queryFn: async () => {
      const url =
        mode === "goal" && goalParam
          ? `/api/foods/filtered?mode=goal&goal=${goalParam}`
          : "/api/foods/filtered?mode=balanced";
      const response = await fetch(url);
      if (!response.ok) throw new Error("Failed to fetch foods");
      return response.json();
    },
  });

  const goalLabel = goalParam ? healthGoals[goalParam] : null;

  // Step 1: open preferences dialog
  function handleOpenPrefs() {
    setMissingFields([]);
    setShowPrefsDialog(true);
  }

  // Step 2: send the API call with preferences
  async function generateMealPlan() {
    setGeneratingPlan(true);
    try {
      const resp = await fetch("/api/mealplan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          goal: goalParam,
          preferences: prefs,
        }),
      });

      const data = await resp.json();

      if (!resp.ok) {
        // Show missing fields if profile is incomplete
        if (data.missingFields && data.missingFields.length > 0) {
          setMissingFields(data.missingFields);
        }
        toast({
          title: "Unable to generate meal plan",
          description: data.message || "Please try again.",
          variant: "destructive",
        });
        setGeneratingPlan(false);
        return;
      }

      setMealPlan(data as AIMealPlan);
      setShowPrefsDialog(false);
      setShowMealDialog(true);
    } catch (e) {
      console.error(e);
      toast({ title: "Error", description: "Failed to generate meal plan. Please try again.", variant: "destructive" });
    } finally {
      setGeneratingPlan(false);
    }
  }

  // ---------------------------------------------------------------------------
  // Loading state
  // ---------------------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-4">
        <div className="max-w-7xl mx-auto">
          <Skeleton className="h-10 w-64 mb-8" />
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/60 backdrop-blur-xl border-b border-border/40">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-primary/10">
                <Leaf className="h-5 w-5 text-primary" />
              </div>
              <span className="font-serif text-lg font-bold tracking-tight">Food Wisdom</span>
            </div>
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="gap-2 hover:bg-muted/60">
                <ArrowLeft className="w-4 h-4" />
                <span className="hidden sm:inline">Dashboard</span>
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Title */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-widest mb-3">
            <Sparkles className="w-3 h-3" />
            Personalized Nutrition
          </div>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-foreground mb-2">
            {mode === "goal" && goalLabel ? `Nutrition for ${goalLabel}` : "Ayurvedic Balanced Diet"}
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl leading-relaxed">
            {mode === "goal"
              ? "A specialized selection of foods optimized for your primary dosha and specific health objectives."
              : "Foundational nutritional choices curated to maintain equilibrium across your unique Ayurvedic constitution."}
          </p>
        </motion.div>

        {/* Filters */}
        <Card className="mb-8 bg-card/40 backdrop-blur-md border-border/40 shadow-sm overflow-visible">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                  placeholder="Search dietary elements..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-background/50 border-border/60 focus:border-primary/50 transition-all rounded-xl"
                />
              </div>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger className="w-full sm:w-56 bg-background/50 border-border/60 rounded-xl">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-muted-foreground" />
                    <SelectValue placeholder="Category" />
                  </div>
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40">
                  {foodCategories.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value} className="rounded-lg m-1">
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabs + Generate Button */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-10">
          <div className="flex items-center justify-between gap-4 mb-6 flex-wrap">
            <TabsList className="bg-muted/40 p-1 rounded-2xl border border-border/40 h-auto flex flex-wrap flex-1">
              <TabsTrigger value="all" className="rounded-xl px-4 py-2 data-[state=active]:bg-background data-[state=active]:shadow-sm">
                All Tiers
              </TabsTrigger>
              <TabsTrigger value="tier_1" className="rounded-xl px-4 py-2 data-[state=active]:bg-tier-1/10 data-[state=active]:text-tier-1">
                Highly Recommended
              </TabsTrigger>
              <TabsTrigger value="tier_2" className="rounded-xl px-4 py-2 data-[state=active]:bg-tier-2/10 data-[state=active]:text-tier-2">
                Good
              </TabsTrigger>
              <TabsTrigger value="tier_3" className="rounded-xl px-4 py-2 data-[state=active]:bg-tier-3/10 data-[state=active]:text-tier-3">
                Neutral
              </TabsTrigger>
            </TabsList>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={() => mealPlan ? setShowMealDialog(true) : handleOpenPrefs()}
                    className="rounded-2xl shadow-lg shadow-primary/20 gap-2 h-11 px-6 whitespace-nowrap hidden md:flex"
                    data-testid="btn-generate-mealplan"
                  >
                    <Sparkles className="w-4 h-4" />
                    {mealPlan ? "View Meal Plan" : "Generate Meal Plan"}
                  </Button>
                </TooltipTrigger>
                <TooltipContent className="bg-background/95 backdrop-blur-md border-border/40 max-w-xs p-3 rounded-xl">
                  <p className="text-xs font-medium leading-relaxed">
                    Let your personal AI dietician craft a full-day Ayurvedic meal plan tailored to your dosha and health goals.
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>

          <TabsContent value="all" className="mt-0 outline-none">
            {tieredFoods && (
              <>
                <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                {tieredFoods.tier_4 && tieredFoods.tier_4.length > 0 && (
                  <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                )}
                {tieredFoods.tier_5 && tieredFoods.tier_5.length > 0 && (
                  <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} />
                )}
              </>
            )}
          </TabsContent>
          <TabsContent value="tier_1" className="mt-0 outline-none">
            {tieredFoods && <TierSection tier="tier_1" foods={tieredFoods.tier_1} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          <TabsContent value="tier_2" className="mt-0 outline-none">
            {tieredFoods && <TierSection tier="tier_2" foods={tieredFoods.tier_2} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          <TabsContent value="tier_3" className="mt-0 outline-none">
            {tieredFoods && <TierSection tier="tier_3" foods={tieredFoods.tier_3} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          <TabsContent value="tier_4" className="mt-0 outline-none">
            {tieredFoods?.tier_4 && <TierSection tier="tier_4" foods={tieredFoods.tier_4} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
          <TabsContent value="tier_5" className="mt-0 outline-none">
            {tieredFoods?.tier_5 && <TierSection tier="tier_5" foods={tieredFoods.tier_5} searchQuery={searchQuery} selectedCategory={selectedCategory} />}
          </TabsContent>
        </Tabs>

        {/* Legend */}
        <Card className="mt-12 bg-card/30 backdrop-blur-md border-border/40 rounded-3xl overflow-hidden shadow-sm">
          <CardHeader className="bg-muted/10 p-6">
            <CardTitle className="font-serif text-xl flex items-center gap-2">
              <Info className="w-5 h-5 text-primary" />
              Nutritional Classification Legend
            </CardTitle>
            <CardDescription className="text-base">
              Understanding how Ayurvedic principles apply to your food choices.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
              {Object.entries(tierInfo).map(([key, info]) => {
                const Icon = info.icon;
                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl ${info.color} border-none shadow-sm flex flex-col gap-3 transition-transform hover:scale-[1.02]`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-background/40 flex items-center justify-center shadow-inner">
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="font-bold block mb-1">{info.label}</span>
                      <p className="text-xs opacity-90 leading-relaxed font-medium">{info.description}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Mobile FAB */}
        <div className="fixed bottom-6 right-6 md:hidden z-40">
          <Button onClick={() => mealPlan ? setShowMealDialog(true) : handleOpenPrefs()} className="rounded-full w-14 h-14 shadow-2xl shadow-primary/40 p-0">
            <Sparkles className="w-6 h-6" />
          </Button>
        </div>

        {/* AI Chatbot */}
        {tieredFoods && (
          <Chatbot
            dosha={mode === "goal" ? "Your Custom" : "Balanced"}
            goal={goalLabel || "General Wellness"}
            foods={tieredFoods}
          />
        )}

        {/* ------------------------------------------------------------------ */}
        {/* Step 1 Dialog — Preferences form                                   */}
        {/* ------------------------------------------------------------------ */}
        <Dialog open={showPrefsDialog} onOpenChange={(open) => { if (!generatingPlan) setShowPrefsDialog(open); }}>
          <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-2xl border-border/40 p-0 overflow-hidden">
            <div className="p-6 border-b border-border/40 bg-muted/20">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner">
                  <Flame className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <DialogTitle className="font-serif text-xl">Personalise Your Meal Plan</DialogTitle>
                  <DialogDescription className="text-sm">
                    Tell your AI dietician about your preferences so every meal fits your life.
                  </DialogDescription>
                </div>
              </div>

              {/* Missing fields warning */}
              {missingFields.length > 0 && (
                <div className="mt-4 flex items-start gap-2 p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-bold mb-0.5">Complete your profile first</p>
                    <p>Missing: {missingFields.join(", ")}</p>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <PreferencesForm
                prefs={prefs}
                setPrefs={setPrefs}
                onGenerate={generateMealPlan}
                onCancel={() => setShowPrefsDialog(false)}
                loading={generatingPlan}
              />
            </div>
          </DialogContent>
        </Dialog>

        {/* ------------------------------------------------------------------ */}
        {/* Step 2 Dialog — 7-day meal plan                                    */}
        {/* ------------------------------------------------------------------ */}
        <Dialog
          open={showMealDialog}
          onOpenChange={(open) => {
            setShowMealDialog(open);
            if (!open) { setSelectedMeal(null); setSelectedDay(0); }
          }}
        >
          <DialogContent className="sm:max-w-lg bg-background/95 backdrop-blur-2xl border-border/40 p-0 flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="p-5 border-b border-border/40 bg-muted/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center shadow-inner flex-shrink-0">
                {selectedMeal ? <Utensils className="w-5 h-5 text-primary" /> : <Calendar className="w-5 h-5 text-primary" />}
              </div>
              <div className="flex-1 min-w-0">
                <DialogTitle className="font-serif text-xl leading-tight">
                  {selectedMeal
                    ? mealMeta[selectedMeal].label
                    : `7-Day Ayurvedic Plan`}
                </DialogTitle>
                <DialogDescription className="text-xs truncate">
                  {selectedMeal
                    ? mealPlan?.days[selectedDay]?.meals[selectedMeal]?.dish_name
                    : mealPlan
                      ? `${mealPlan.days[selectedDay]?.day_name} — tap any meal for full details`
                      : "Loading…"}
                </DialogDescription>
              </div>
            </div>

            {/* Day selector tabs — hidden while viewing a meal detail */}
            {mealPlan && selectedMeal === null && (
              <div className="border-b border-border/30 bg-muted/10">
                <div className="px-3 pt-3 pb-1 flex gap-1">
                  {mealPlan.days.map((d, idx) => (
                    <button
                      key={d.day}
                      onClick={() => setSelectedDay(idx)}
                      className={`flex-1 min-w-0 py-1.5 rounded-xl text-xs font-bold transition-all duration-150 text-center ${idx === selectedDay
                          ? "bg-primary text-primary-foreground shadow"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      {d.day_name.slice(0, 3)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 min-h-0 bg-background/20">
              {mealPlan && (
                <AnimatePresence mode="wait">
                  {selectedMeal === null ? (
                    /* ---- DAY OVERVIEW ---- */
                    <motion.div
                      key={`day-${selectedDay}`}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.18, ease: "easeOut" }}
                      className="p-5 space-y-4"
                    >
                      {/* Week summary (shown on Day 1 only to avoid clutter) */}
                      {selectedDay === 0 && (
                        <>
                          <div className="p-4 rounded-2xl bg-primary/5 border border-primary/15 space-y-1">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-primary/70 flex items-center gap-1">
                              <Info className="w-3 h-3" /> Week Overview
                            </p>
                            <p className="text-sm text-foreground/80 leading-relaxed">{mealPlan.week_summary}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-2xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200/40 dark:border-blue-800/30">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400 flex items-center gap-1 mb-1">
                                <Droplets className="w-3 h-3" /> Hydration
                              </p>
                              <p className="text-xs text-blue-800 dark:text-blue-300 leading-relaxed">{mealPlan.hydration}</p>
                            </div>
                            <div className="p-3 rounded-2xl bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/40 dark:border-emerald-800/30">
                              <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 dark:text-emerald-400 flex items-center gap-1 mb-1">
                                <Leaf className="w-3 h-3" /> Strategy
                              </p>
                              <p className="text-xs text-emerald-800 dark:text-emerald-300 leading-relaxed line-clamp-3">{mealPlan.weekly_strategy}</p>
                            </div>
                          </div>
                          {mealPlan.clinician_note && (
                            <div className="flex items-start gap-2.5 p-3 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200/40 dark:border-amber-800/30">
                              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                                <span className="font-bold">Clinical Note: </span>
                                {mealPlan.clinician_note}
                              </p>
                            </div>
                          )}
                          <Separator className="bg-border/40" />
                        </>
                      )}

                      {/* Meal rows for the selected day */}
                      <div className="space-y-2.5">
                        {(Object.keys(mealMeta) as Array<keyof DayPlan["meals"]>).map((mealKey, i) => {
                          const meal = mealPlan.days[selectedDay]?.meals[mealKey];
                          if (!meal) return null;
                          return (
                            <motion.div
                              key={mealKey}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: i * 0.05 }}
                            >
                              <MealRow
                                mealKey={mealKey}
                                meal={meal}
                                onClick={() => setSelectedMeal(mealKey)}
                              />
                            </motion.div>
                          );
                        })}
                      </div>
                    </motion.div>
                  ) : (
                    /* ---- DRILL-DOWN DETAIL ---- */
                    <div className="p-5">
                      <MealDetailView
                        key={`${selectedDay}-${selectedMeal}`}
                        mealKey={selectedMeal}
                        meal={mealPlan.days[selectedDay].meals[selectedMeal]}
                        onBack={() => setSelectedMeal(null)}
                      />
                    </div>
                  )}
                </AnimatePresence>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-border/40 bg-muted/20 space-y-2.5">
              {/* Primary action: Download PDF — full-width, always visible when on overview */}
              {selectedMeal === null && mealPlan && (
                <Button
                  onClick={() => downloadMealPlanPDF(mealPlan)}
                  className="w-full rounded-xl gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-md"
                  data-testid="btn-download-pdf"
                >
                  <Download className="w-4 h-4" />
                  Download 7-Day Plan as PDF
                </Button>
              )}

              {/* Secondary row: disclaimer + secondary actions */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-[10px] font-medium text-muted-foreground italic flex items-center gap-1.5">
                  <Leaf className="w-3 h-3 flex-shrink-0" />
                  Not a substitute for clinical advice.
                </p>
                <div className="flex gap-2 shrink-0">
                  {selectedMeal === null && mealPlan && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setShowMealDialog(false); setSelectedMeal(null); setSelectedDay(0); setShowPrefsDialog(true); }}
                      className="rounded-xl gap-1.5 text-xs"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      Regenerate
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => {
                      if (selectedMeal) setSelectedMeal(null);
                      else setShowMealDialog(false);
                    }}
                    className="rounded-xl px-5"
                  >
                    {selectedMeal ? "Back" : "Close"}
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
