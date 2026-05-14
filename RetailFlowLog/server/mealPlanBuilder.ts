/**
 * mealPlanBuilder.ts
 *
 * Isolated module responsible for:
 *  1. Building the expert system prompt (7-day plan)
 *  2. Building the structured user prompt from profile context
 *  3. Calling the OpenAI API with strict JSON output
 *  4. Parsing and validating the 7-day structured response
 */

import OpenAI from "openai";

// Lazily create the client so env vars are read after dotenv has loaded them.
function getOpenAIClient() {
  const key = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!key) {
    throw new Error("[mealPlanBuilder] OPENAI_API_KEY is not set. Cannot generate meal plan.");
  }
  return new OpenAI({
    apiKey: key,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || undefined,
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface MealPlanContext {
  age: number | null;
  gender: string | null;
  heightCm: number | null;
  weightKg: number | null;
  bmi: number | null;
  maintenanceCalories: number | null;
  activityLevel: string | null;
  primaryDosha: string;
  secondaryDosha: string | null;
  constitutionType: string;
  vataPercent: number;
  pittaPercent: number;
  kaphaPercent: number;
  healthGoalLabel: string | null;
  recommendedFoods: string[];
  preferences: {
    dietaryRestrictions: string;
    allergies: string;
    healthConditions: string;
    cuisinePreference: string;
    budget: string;
    cookingTime: string;
  };
}

export interface MealEntry {
  dish_name: string;
  ingredients: string[];
  portion: string;
  macros: {
    protein: string;
    carbs: string;
    fat: string;
    calories: string;
  };
  why: string;
  substitutions: string[];
}

export interface DayPlan {
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

export interface MealPlanResponse {
  week_summary: string;
  hydration: string;
  weekly_strategy: string;
  clinician_note?: string;
  days: DayPlan[];
}

// ---------------------------------------------------------------------------
// 1. System prompt
// ---------------------------------------------------------------------------
export function buildSystemPrompt(): string {
  return `You are an expert clinical nutritionist and Ayurvedic diet planner.

Your task is to generate a practical, coherent, and fully personalised 7-day meal plan.
Never return random food lists. Every meal must be intentional, nutritionally balanced, and aligned with the user's profile.

You must use:
- Health profile: age, sex, height, weight, activity level, goals
- Medical context: conditions, allergies, intolerances, medications
- Food preferences: dietary restrictions, cuisine preference, budget, cooking time
- Dosha profile: Vata, Pitta, Kapha, or dual dosha with percentages

Rules:
1) Generate all 7 days. Each day must have breakfast, morning_snack, lunch, evening_snack, and dinner.
2) Vary meals across the 7 days — do not repeat the same dish within the same week.
3) For each meal include:
   - dish_name: a real, nameable dish
   - ingredients: a realistic ingredient list
   - portion: practical serving size in grams/cups/pieces
   - macros: approximate protein, carbs, fat, and total calories
   - why: 1-2 sentences tying this meal to the user's dosha + health goal
   - substitutions: 1-2 practical ingredient swaps
4) Avoid contradiction with allergies, restrictions, or medical conditions throughout the whole week.
5) Keep suggestions locally practical and within the stated cooking time.
6) If a severe medical condition is mentioned, add a clinician_note.
7) week_summary: one sentence acknowledging the key profile points.
8) weekly_strategy: 2-3 sentences on the week's overall nutritional approach.
9) hydration: a daily water intake recommendation with a practical tip.
10) day_name must be the day of the week (Monday, Tuesday, ... Sunday).
11) Output MUST be valid JSON matching the schema exactly. No markdown fences, no extra text.`;
}

// ---------------------------------------------------------------------------
// 2. User prompt
// ---------------------------------------------------------------------------
export function buildUserPrompt(ctx: MealPlanContext): string {
  const constitution =
    ctx.constitutionType === "dual"
      ? `${ctx.primaryDosha}-${ctx.secondaryDosha} (dual dosha)`
      : `${ctx.primaryDosha} (single dosha)`;

  const doshaBreakdown = `Vata ${ctx.vataPercent}% / Pitta ${ctx.pittaPercent}% / Kapha ${ctx.kaphaPercent}%`;

  const profileLines = [
    `Age: ${ctx.age ?? "unknown"}`,
    `Sex: ${ctx.gender ?? "unknown"}`,
    `Height: ${ctx.heightCm ? ctx.heightCm + " cm" : "unknown"}`,
    `Weight: ${ctx.weightKg ? ctx.weightKg + " kg" : "unknown"}`,
    `BMI: ${ctx.bmi ? ctx.bmi.toFixed(1) : "unknown"}`,
    `Activity level: ${ctx.activityLevel ?? "unknown"}`,
    `Estimated daily calorie need: ${ctx.maintenanceCalories ? ctx.maintenanceCalories + " kcal" : "unknown"}`,
    `Primary health goal: ${ctx.healthGoalLabel ?? "General wellness"}`,
  ].join("\n");

  const prefLines = [
    `Dietary restrictions: ${ctx.preferences.dietaryRestrictions || "None"}`,
    `Allergies / intolerances: ${ctx.preferences.allergies || "None"}`,
    `Health conditions: ${ctx.preferences.healthConditions || "None"}`,
    `Cuisine preference: ${ctx.preferences.cuisinePreference || "Indian — any region"}`,
    `Budget: ${ctx.preferences.budget || "Moderate"}`,
    `Cooking time available: ${ctx.preferences.cookingTime || "Up to 1 hour"}`,
  ].join("\n");

  const foodList =
    ctx.recommendedFoods.length > 0
      ? `Priority Ayurvedic foods for this constitution:\n${ctx.recommendedFoods.slice(0, 40).join(", ")}`
      : "No specific food restrictions from assessment.";

  const schema = `
Respond with ONLY this exact JSON (no extra keys, no markdown):
{
  "week_summary": "<one sentence confirming profile understood>",
  "hydration": "<daily water intake recommendation + tip>",
  "weekly_strategy": "<2-3 sentences on the week's nutritional approach>",
  "clinician_note": "<optional — only if severe condition warrants it>",
  "days": [
    {
      "day": 1,
      "day_name": "Monday",
      "meals": {
        "breakfast": {
          "dish_name": "<name>",
          "ingredients": ["<ingredient>"],
          "portion": "<e.g. 1 bowl ~300g>",
          "macros": { "protein": "<Xg>", "carbs": "<Xg>", "fat": "<Xg>", "calories": "<X kcal>" },
          "why": "<why this fits dosha + health goal>",
          "substitutions": ["<swap 1>", "<swap 2>"]
        },
        "morning_snack": { "<same structure>" },
        "lunch": { "<same structure>" },
        "evening_snack": { "<same structure>" },
        "dinner": { "<same structure>" }
      }
    },
    { "day": 2, "day_name": "Tuesday", "meals": { ... } },
    { "day": 3, "day_name": "Wednesday", "meals": { ... } },
    { "day": 4, "day_name": "Thursday", "meals": { ... } },
    { "day": 5, "day_name": "Friday", "meals": { ... } },
    { "day": 6, "day_name": "Saturday", "meals": { ... } },
    { "day": 7, "day_name": "Sunday", "meals": { ... } }
  ]
}`;

  return `Generate a 7-day personalised Ayurvedic meal plan for this user:

--- HEALTH PROFILE ---
${profileLines}

--- DOSHA PROFILE ---
Constitution: ${constitution}
Breakdown: ${doshaBreakdown}

--- PREFERENCES & RESTRICTIONS ---
${prefLines}

--- AYURVEDIC FOOD GUIDANCE ---
${foodList}

--- OUTPUT SCHEMA ---
${schema}`;
}

// ---------------------------------------------------------------------------
// 3. Validation
// ---------------------------------------------------------------------------
export interface ProfileValidationResult {
  valid: boolean;
  missingFields: string[];
}

export function validateProfileCompleteness(ctx: MealPlanContext): ProfileValidationResult {
  const missing: string[] = [];
  if (!ctx.age) missing.push("Age");
  if (!ctx.gender) missing.push("Gender");
  if (!ctx.heightCm) missing.push("Height");
  if (!ctx.weightKg) missing.push("Weight");
  if (!ctx.activityLevel) missing.push("Activity Level");
  if (!ctx.primaryDosha) missing.push("Dosha Assessment");
  return { valid: missing.length === 0, missingFields: missing };
}

// ---------------------------------------------------------------------------
// 4. OpenAI call
// ---------------------------------------------------------------------------
export async function callOpenAIForMealPlan(
  systemPrompt: string,
  userPrompt: string
): Promise<string> {
  const openai = getOpenAIClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    max_completion_tokens: 14000,
    response_format: { type: "json_object" },
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    const finishReason = response.choices[0]?.finish_reason;
    const usage = response.usage;
    throw new Error(
      `OpenAI returned empty content (finish_reason=${finishReason}, ` +
      `tokens used=${JSON.stringify(usage)}). Try regenerating.`
    );
  }
  return raw;
}

// ---------------------------------------------------------------------------
// 5. Response parser
// ---------------------------------------------------------------------------
export function parseMealPlanResponse(raw: string): MealPlanResponse {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("OpenAI response was not valid JSON. Raw: " + cleaned.slice(0, 300));
  }

  if (!Array.isArray(parsed.days) || parsed.days.length !== 7) {
    throw new Error(`Expected 7 days, got ${parsed.days?.length ?? 0}.`);
  }

  const requiredMeals = ["breakfast", "morning_snack", "lunch", "evening_snack", "dinner"];
  for (const dayPlan of parsed.days) {
    if (!dayPlan.meals) throw new Error(`Day ${dayPlan.day} missing meals.`);
    for (const meal of requiredMeals) {
      if (!dayPlan.meals[meal]) throw new Error(`Day ${dayPlan.day} missing meal: ${meal}`);
    }
  }

  return parsed as MealPlanResponse;
}
