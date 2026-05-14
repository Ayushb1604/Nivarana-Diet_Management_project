import type { Express, Request, Response, NextFunction, RequestHandler } from "express";
import { createServer, type Server } from "http";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import { storage } from "./storage";
import { setupAuth, isAuthenticated, rateLimit } from "./replitAuth";
import { getFilteredFoods } from "./foodFilter";
import { registerChatRoutes } from "./replit_integrations/chat";
import {
  buildSystemPrompt,
  buildUserPrompt,
  validateProfileCompleteness,
  callOpenAIForMealPlan,
  parseMealPlanResponse,
  type MealPlanContext,
} from "./mealPlanBuilder";
import { generateDoshaExplanation, generateWellnessInsights } from "./aiInsights";
import {
  insertUserProfileSchema,
  insertDoshaAssessmentSchema,
  insertUserHealthGoalSchema,
  insertWellnessCheckinSchema,
  healthGoals,
  type HealthGoalKey
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  // Setup authentication
  await setupAuth(app);

  // Register Chat Routes
  registerChatRoutes(app);

  // Gemini configuration removed — external LLM integration disabled

  // Get user profile
  app.get("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const profile = await storage.getProfile(userId);

      if (!profile) {
        return res.json({ onboardingComplete: 0 });
      }

      res.json(profile);
    } catch (error) {
      console.error("Error getting profile:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  // Create user profile
  app.post("/api/profile", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      const profileData = insertUserProfileSchema.parse({
        userId,
        age: req.body.age,
        gender: req.body.gender,
        heightCm: req.body.heightCm,
        weightKg: req.body.weightKg,
        bmi: req.body.bmi,
        maintenanceCalories: req.body.maintenanceCalories,
        activityLevel: req.body.activityLevel,
      });

      const existing = await storage.getProfile(userId);

      if (existing) {
        const updated = await storage.updateProfile(userId, profileData);
        return res.json(updated);
      }

      const profile = await storage.createProfile(profileData);
      res.json(profile);
    } catch (error) {
      console.error("Error creating profile:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create profile" });
    }
  });

  // Get dosha assessment
  app.get("/api/dosha-assessment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const assessment = await storage.getDoshaAssessment(userId);

      if (!assessment) {
        return res.status(404).json({ message: "No assessment found" });
      }

      res.json(assessment);
    } catch (error) {
      console.error("Error getting assessment:", error);
      res.status(500).json({ message: "Failed to get assessment" });
    }
  });

  // Create dosha assessment
  app.post("/api/dosha-assessment", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const { responses, vataScore, pittaScore, kaphaScore, percentages, constitution } = req.body;

      const assessmentData = insertDoshaAssessmentSchema.parse({
        userId,
        vataScore,
        pittaScore,
        kaphaScore,
        vataPercent: percentages.vata,
        pittaPercent: percentages.pitta,
        kaphaPercent: percentages.kapha,
        constitutionType: constitution.type,
        primaryDosha: constitution.primary,
        secondaryDosha: constitution.secondary,
        responses,
      });

      const assessment = await storage.createDoshaAssessment(assessmentData);
      res.json(assessment);
    } catch (error) {
      console.error("Error creating assessment:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create assessment" });
    }
  });

  // Get health goal
  app.get("/api/health-goal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const goal = await storage.getHealthGoal(userId);

      if (!goal) {
        return res.status(404).json({ message: "No health goal found" });
      }

      res.json(goal);
    } catch (error) {
      console.error("Error getting health goal:", error);
      res.status(500).json({ message: "Failed to get health goal" });
    }
  });

  // Set health goal
  app.post("/api/health-goal", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      const goalData = insertUserHealthGoalSchema.parse({
        userId,
        goalType: req.body.goalType,
        isBalancedDiet: req.body.isBalancedDiet ? 1 : 0,
      });

      const goal = await storage.upsertHealthGoal(goalData);
      res.json(goal);
    } catch (error) {
      console.error("Error setting health goal:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to set health goal" });
    }
  });

  // Get filtered foods
  app.get("/api/foods/filtered", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const mode = req.query.mode as string;
      const goalParam = req.query.goal as HealthGoalKey | undefined;

      const assessment = await storage.getDoshaAssessment(userId);

      if (!assessment) {
        return res.status(400).json({ message: "Please complete dosha assessment first" });
      }

      const constitutionType = assessment.constitutionType as 'single' | 'dual';
      const primaryDosha = assessment.primaryDosha as 'vata' | 'pitta' | 'kapha';
      const secondaryDosha = assessment.secondaryDosha as 'vata' | 'pitta' | 'kapha' | null;

      const healthGoal = mode === 'goal' ? goalParam : null;

      const filteredFoods = getFilteredFoods(
        constitutionType,
        primaryDosha,
        secondaryDosha,
        healthGoal || null
      );

      res.json(filteredFoods);
    } catch (error) {
      console.error("Error filtering foods:", error);
      res.status(500).json({ message: "Failed to filter foods" });
    }
  });

  /**
   * POST /api/mealplan
   *
   * Generates a personalised single-day Ayurvedic meal plan via OpenAI.
   * Requires a complete user profile and a completed dosha assessment.
   * Additional preferences (allergies, cuisine, etc.) can be passed in the body.
   */
  app.post("/api/mealplan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      // ---- Fetch stored profile data ----
      const [profile, assessment, healthGoal] = await Promise.all([
        storage.getProfile(userId),
        storage.getDoshaAssessment(userId),
        storage.getHealthGoal(userId).catch(() => null),
      ]);

      if (!assessment) {
        return res.status(400).json({
          message: "Please complete your dosha assessment before generating a meal plan.",
          missingFields: ["Dosha Assessment"],
        });
      }

      // ---- Build context object ----
      const mode = req.body.mode as string;
      const goalParam = req.body.goal as HealthGoalKey | undefined;
      const preferences = req.body.preferences || {};

      // Determine health goal label
      const activeGoal: HealthGoalKey | null =
        mode === 'goal' && goalParam ? goalParam :
          (healthGoal?.goalType as HealthGoalKey) ?? null;

      const healthGoalLabel = activeGoal ? healthGoals[activeGoal] : null;

      // Tier-1 recommended food names for the user's dosha
      const constitutionType = assessment.constitutionType as 'single' | 'dual';
      const primaryDosha = assessment.primaryDosha as 'vata' | 'pitta' | 'kapha';
      const secondaryDosha = assessment.secondaryDosha as 'vata' | 'pitta' | 'kapha' | null;
      const filteredFoods = getFilteredFoods(constitutionType, primaryDosha, secondaryDosha, activeGoal);
      const recommendedFoods = [
        ...(filteredFoods.tier_1 || []),
        ...(filteredFoods.tier_2 || []),
      ].map(f => f.name);

      const ctx: MealPlanContext = {
        age: profile?.age ?? null,
        gender: profile?.gender ?? null,
        heightCm: profile?.heightCm ?? null,
        weightKg: profile?.weightKg ?? null,
        bmi: profile?.bmi ?? null,
        maintenanceCalories: profile?.maintenanceCalories ?? null,
        activityLevel: profile?.activityLevel ?? null,
        primaryDosha,
        secondaryDosha,
        constitutionType,
        vataPercent: assessment.vataPercent,
        pittaPercent: assessment.pittaPercent,
        kaphaPercent: assessment.kaphaPercent,
        healthGoalLabel,
        recommendedFoods,
        preferences: {
          dietaryRestrictions: preferences.dietaryRestrictions || "No specific restrictions",
          allergies: preferences.allergies || "None",
          healthConditions: preferences.healthConditions || "None",
          cuisinePreference: preferences.cuisinePreference || "Indian — any region",
          budget: preferences.budget || "Moderate",
          cookingTime: preferences.cookingTime || "Up to 1 hour",
        },
      };

      // ---- Validate profile completeness ----
      const validation = validateProfileCompleteness(ctx);
      if (!validation.valid) {
        return res.status(400).json({
          message: `Please complete your profile before generating a meal plan. Missing: ${validation.missingFields.join(", ")}.`,
          missingFields: validation.missingFields,
        });
      }

      // ---- Build prompts ----
      const systemPrompt = buildSystemPrompt();
      const userPrompt = buildUserPrompt(ctx);

      // ---- Call OpenAI ----
      const rawResponse = await callOpenAIForMealPlan(systemPrompt, userPrompt);

      // ---- Parse & validate response ----
      const mealPlan = parseMealPlanResponse(rawResponse);

      // ---- Persist for the user (non-fatal) ----
      const goalKey = activeGoal ?? "balanced";
      storage.saveMealPlan(userId, goalKey, mealPlan).catch((err) =>
        console.error("Failed to save meal plan:", err?.message)
      );

      res.json(mealPlan);
    } catch (error: any) {
      console.error("Error generating meal plan:", error?.status, error?.code, error?.message);

      // Surface a meaningful error for API key / quota issues
      if (error?.status === 401 || error?.code === "invalid_api_key") {
        return res.status(503).json({ message: "AI service unavailable — invalid API key." });
      }
      if (error?.status === 429) {
        return res.status(429).json({ message: "AI service is busy. Please try again in a moment." });
      }

      res.status(500).json({ message: "Failed to generate meal plan. Please try again." });
    }
  });

  // Retrieve the user's saved meal plan for a specific goal
  app.get("/api/mealplan/saved", isAuthenticated, async (req: any, res) => {
    try {
      const goal = (req.query.goal as string) || "balanced";
      const plan = await storage.getMealPlan(req.userId, goal);
      if (!plan) return res.status(404).json({ message: "No saved meal plan." });
      res.json(plan);
    } catch (error) {
      console.error("Error fetching saved meal plan:", error);
      res.status(500).json({ message: "Failed to fetch saved meal plan." });
    }
  });

  // ====== Wellness Re-evaluation Check-ins ======

  // List all check-ins for the current user (oldest first; index 0 = baseline)
  app.get("/api/wellness-checkins", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const checkins = await storage.getWellnessCheckins(userId);
      res.json(checkins);
    } catch (error) {
      console.error("Error fetching wellness check-ins:", error);
      res.status(500).json({ message: "Failed to fetch wellness check-ins" });
    }
  });

  // Submit a new wellness check-in
  app.post("/api/wellness-checkin", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;

      const ratingField = z.coerce.number().int().min(1).max(5);
      const bodySchema = z.object({
        energy: ratingField,
        digestion: ratingField,
        sleep: ratingField,
        mood: ratingField,
        mentalClarity: ratingField,
        skinHealth: ratingField,
        immunity: ratingField,
        calmness: ratingField,
        notes: z.string().max(2000).optional().nullable(),
      });

      const parsed = bodySchema.parse(req.body);

      const checkin = await storage.createWellnessCheckin({
        userId,
        energy: parsed.energy,
        digestion: parsed.digestion,
        sleep: parsed.sleep,
        mood: parsed.mood,
        mentalClarity: parsed.mentalClarity,
        skinHealth: parsed.skinHealth,
        immunity: parsed.immunity,
        calmness: parsed.calmness,
        notes: parsed.notes ?? null,
        // checkinNumber and overallScore are computed inside storage.createWellnessCheckin
        checkinNumber: 0,   // placeholder — overwritten by storage layer
        overallScore: 0,    // placeholder — overwritten by storage layer
      });

      res.json(checkin);
    } catch (error) {
      console.error("Error saving wellness check-in:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save wellness check-in" });
    }
  });

  // ====== AI Insights ======

  // Generate personalised dosha explanation
  app.post("/api/ai/dosha-explanation", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const [assessment, profile] = await Promise.all([
        storage.getDoshaAssessment(userId),
        storage.getProfile(userId).catch(() => null),
      ]);

      if (!assessment) {
        return res.status(400).json({ message: "No dosha assessment found." });
      }

      const explanation = await generateDoshaExplanation({
        primaryDosha: assessment.primaryDosha,
        secondaryDosha: assessment.secondaryDosha,
        constitutionType: assessment.constitutionType,
        vataPercent: assessment.vataPercent,
        pittaPercent: assessment.pittaPercent,
        kaphaPercent: assessment.kaphaPercent,
        age: profile?.age,
        gender: profile?.gender,
      });

      res.json({ explanation });
    } catch (error: any) {
      console.error("Error generating dosha explanation:", error?.message);
      if (error?.status === 401 || error?.code === "invalid_api_key") {
        return res.status(503).json({ message: "AI service unavailable." });
      }
      res.status(500).json({ message: "Failed to generate explanation." });
    }
  });

  // Generate wellness insights from check-in comparison
  app.post("/api/ai/wellness-insights", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const [checkins, assessment] = await Promise.all([
        storage.getWellnessCheckins(userId),
        storage.getDoshaAssessment(userId),
      ]);

      if (!assessment) {
        return res.status(400).json({ message: "No dosha assessment found." });
      }
      if (!checkins || checkins.length < 2) {
        return res.status(400).json({ message: "Need at least 2 check-ins for insights." });
      }

      const baseline = checkins[0];
      const latest = checkins[checkins.length - 1];
      const markers = ["energy", "digestion", "sleep", "mood", "mentalClarity", "skinHealth", "immunity", "calmness"] as const;

      const baselineData: Record<string, number> = {};
      const latestData: Record<string, number> = {};
      for (const m of markers) {
        baselineData[m] = baseline[m];
        latestData[m] = latest[m];
      }

      const insights = await generateWellnessInsights({
        primaryDosha: assessment.primaryDosha,
        secondaryDosha: assessment.secondaryDosha,
        constitutionType: assessment.constitutionType,
        baseline: baselineData,
        latest: latestData,
        checkinCount: checkins.length,
        overallDelta: latest.overallScore - baseline.overallScore,
      });

      res.json({ insights });
    } catch (error: any) {
      console.error("Error generating wellness insights:", error?.message);
      if (error?.status === 401 || error?.code === "invalid_api_key") {
        return res.status(503).json({ message: "AI service unavailable." });
      }
      res.status(500).json({ message: "Failed to generate insights." });
    }
  });

  // ====== Admin Routes ======
  const FOOD_FILE = join(dirname(fileURLToPath(import.meta.url)), "data", "food_dataset.json");

  const requireAdmin: RequestHandler = async (req: any, res, next) => {
    // Use the same userId field that isAuthenticated attaches to req
    const userId = req.userId ?? (req.session as any)?.userId;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    const user = await storage.getUser(userId);
    if (!user?.email) return res.status(403).json({ message: "Forbidden" });
    const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
    let isAdmin = false;
    if (adminEmail) {
      isAdmin = user.email.toLowerCase() === adminEmail;
    } else {
      const first = await storage.getFirstUser();
      isAdmin = !!first && first.email?.toLowerCase() === user.email.toLowerCase();
    }
    if (!isAdmin) return res.status(403).json({ message: "Forbidden" });
    (req as any).userId = userId;
    next();
  };

  app.get("/api/admin/stats", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getAdminStats()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/users", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getAdminUsers()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/conversations", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getAdminConversations()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  app.get("/api/admin/foods", requireAdmin, (_req, res) => {
    try {
      const data = JSON.parse(readFileSync(FOOD_FILE, "utf-8"));
      res.json(data.foods);
    } catch { res.status(500).json({ message: "Failed to read foods" }); }
  });

  // Zod schema matching food_dataset.json structure
  const effectEnum = z.enum(["favourable", "neutral", "unfavourable"]);
  const foodSchema = z.object({
    name: z.string().min(1).max(120),
    category: z.string().min(1).max(80),
    dosha_effects: z.object({
      vata: effectEnum,
      pitta: effectEnum,
      kapha: effectEnum,
    }),
    health_goal_effects: z.object({
      heart_health: effectEnum,
      gut_health: effectEnum,
      inflammation: effectEnum,
      liver_function: effectEnum,
      immunity: effectEnum,
      diabetes: effectEnum,
      skin_hair: effectEnum,
      weight_management: effectEnum,
      sleep: effectEnum,
      energy: effectEnum,
    }),
  });


  app.post("/api/admin/foods", requireAdmin, (req, res) => {
    try {
      const parsed = foodSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid food data", errors: parsed.error.errors });
      }
      const food = parsed.data;
      const data = JSON.parse(readFileSync(FOOD_FILE, "utf-8"));
      if (data.foods.find((f: any) => f.name.toLowerCase() === food.name.toLowerCase()))
        return res.status(409).json({ message: "Food already exists" });
      data.foods.push(food);
      writeFileSync(FOOD_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch (err) {
      if (err instanceof z.ZodError) return res.status(400).json({ message: "Invalid data", errors: err.errors });
      res.status(500).json({ message: "Failed to add food" });
    }
  });

  app.delete("/api/admin/foods/:name", requireAdmin, (req, res) => {
    try {
      const name = decodeURIComponent(req.params.name).trim();
      if (!name || name.length > 120) return res.status(400).json({ message: "Invalid food name" });
      const data = JSON.parse(readFileSync(FOOD_FILE, "utf-8"));
      data.foods = data.foods.filter((f: any) => f.name.toLowerCase() !== name.toLowerCase());
      writeFileSync(FOOD_FILE, JSON.stringify(data, null, 2));
      res.json({ success: true });
    } catch { res.status(500).json({ message: "Failed to delete food" }); }
  });

  // ── Admin: export users as CSV
  app.get("/api/admin/users/export", requireAdmin, async (_req, res) => {
    try {
      const users = await storage.getAdminUsers();
      const headers = ["id", "firstName", "lastName", "email", "primaryDosha", "secondaryDosha", "healthGoal", "createdAt", "lastActive"];
      const escape = (v: any) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = users.map((u: any) =>
        headers.map(h => escape(u[h])).join(",")
      );
      const csv = [headers.join(","), ...rows].join("\n");
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="nivarana-users-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.send(csv);
    } catch { res.status(500).json({ message: "Export failed" }); }
  });

  // ── Admin: wellness check-ins across all users (used as "feedback")
  app.get("/api/admin/feedback", requireAdmin, async (_req, res) => {
    try { res.json(await storage.getAdminWellnessCheckins()); }
    catch { res.status(500).json({ message: "Failed" }); }
  });

  return httpServer;
}
