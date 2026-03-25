import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import OpenAI from "openai";
import { storage } from "./storage";
import { hashPassword, isAuthenticated, isSuperAdmin, setupAuth } from "./replitAuth";
import { getFilteredFoods } from "./foodFilter";
import { registerChatRoutes } from "./replit_integrations/chat";
import { registerAdminModules } from "./adminModules";
import { db } from "./db";
import { dietPlans, feedbacks, notifications, nlpMonitor } from "@shared/schema";
import { eq, desc } from "drizzle-orm";
import { 
  insertUserProfileSchema, 
  insertDoshaAssessmentSchema,
  insertUserHealthGoalSchema,
  type HealthGoalKey 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  const openai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });
  
  // Setup authentication
  await setupAuth(app);

  // Register Chat Routes
  registerChatRoutes(app);
  registerAdminModules(app);

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

  // Generate meal plan from filtered foods and additional filters
  app.post("/api/mealplan", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.userId;
      const mode = req.body.mode as string;
      const goalParam = req.body.goal as HealthGoalKey | undefined;
      const searchQuery = (req.body.searchQuery || "").toLowerCase();
      const category = req.body.category || "all";
      const days = Number(req.body.days) || 7;

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

      // Only include foods that are "good" for the user (tier 1-3)
      const allowedFoods = [
        ...(filteredFoods.tier_1 || []),
        ...(filteredFoods.tier_2 || []),
        ...(filteredFoods.tier_3 || []),
      ].filter(f => {
        const matchesSearch = !searchQuery || f.name.toLowerCase().includes(searchQuery);
        const matchesCategory = category === 'all' || f.category === category;
        return matchesSearch && matchesCategory;
      });

      if (allowedFoods.length < 3) {
        return res.status(400).json({ message: "Not enough foods to generate a meal plan with the given filters" });
      }

      // Fallback non-AI generator
      const makeRecipe = (ingredients: typeof allowedFoods) => {
        const picked = ingredients.slice(0, Math.min(4, ingredients.length));
        const title = picked.map(p => p.name.split(" ")[0]).slice(0,3).join(" & ");
        const ingredientList = picked.map(p => p.name);
        const categories = Array.from(new Set(picked.map(p => p.category)));
        const method = categories.includes("grains") ? "cook/boil" : categories.includes("vegetables") ? "sauté" : "mix";
        const instructions = [
          `Prep the ingredients: ${ingredientList.join(", ")}.`,
          `${method} the main ingredients until tender.`,
          `Combine and season to taste. Serve warm.`
        ];
        return { title, ingredients: ingredientList, instructions, source: "generated" };
      };

      const fallbackPlan = () => {
        return Array.from({ length: days }).map((_, idx) => {
        // rotate allowedFoods to get variety
          const offset = idx * 3;
          const shift = allowedFoods.slice(offset % allowedFoods.length).concat(allowedFoods.slice(0, offset % allowedFoods.length));
        return {
          day: idx + 1,
          meals: {
            breakfast: makeRecipe(shift.slice(0, 4)),
            lunch: makeRecipe(shift.slice(2, 6)),
            dinner: makeRecipe(shift.slice(4, 8)),
            snack: makeRecipe(shift.slice(1, 3)),
          }
        };
      });
      };

      const dayNames = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const allowedFoodNames = allowedFoods.map((f) => f.name);

      let aiPlan: any = null;
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-5.1",
          temperature: 0.3,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: [
                "You are an Ayurvedic meal planning assistant.",
                "Generate only valid JSON. No markdown. No extra text.",
                "Create a weekly meal plan using ONLY foods from the ALLOWED_FOODS list.",
                "Output shape must be:",
                '{ "days": [ { "day": 1, "meals": { "breakfast": { "title": "...", "ingredients": ["..."], "instructions": ["..."] }, "lunch": { ... }, "dinner": { ... }, "snack": { ... } } } ] }',
                `Include exactly ${days} days.`,
                "Each meal ingredients array should contain 2-6 items and all ingredients must come from ALLOWED_FOODS exactly.",
                "Keep Indian dietary context and simple practical instructions."
              ].join("\n"),
            },
            {
              role: "user",
              content: JSON.stringify({
                mode,
                goal: goalParam || "balanced",
                category,
                searchQuery,
                constitutionType,
                primaryDosha,
                secondaryDosha,
                dayNames: dayNames.slice(0, days),
                ALLOWED_FOODS: allowedFoodNames,
              }),
            },
          ],
          max_completion_tokens: 4096,
        });

        const raw = completion.choices?.[0]?.message?.content || "{}";
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed?.days) && parsed.days.length > 0) {
          aiPlan = parsed;
        }
      } catch (err) {
        console.error("AI meal plan failed, using fallback:", err);
      }

      if (!aiPlan) {
        const payload = { days: fallbackPlan(), source: "fallback" };
        const [saved] = await db.insert(dietPlans).values({
          userId,
          source: "fallback",
          payload,
        }).returning();
        return res.json({ ...payload, dietPlanId: saved.id });
      }
      const payload = { days: aiPlan.days, source: "ai" };
      const [saved] = await db.insert(dietPlans).values({
        userId,
        source: "ai",
        payload,
      }).returning();
      res.json({ ...payload, dietPlanId: saved.id });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  app.get("/api/mealplans/latest", isAuthenticated, async (req: any, res) => {
    const userId = req.userId;
    const [plan] = await db.select().from(dietPlans).where(eq(dietPlans.userId, userId)).orderBy(desc(dietPlans.createdAt)).limit(1);
    res.json(plan || null);
  });

  app.get("/api/mealplans", isAuthenticated, async (req: any, res) => {
    const userId = req.userId;
    const plans = await db.select().from(dietPlans).where(eq(dietPlans.userId, userId)).orderBy(desc(dietPlans.createdAt));
    res.json(plans);
  });

  app.post("/api/feedback", isAuthenticated, async (req: any, res) => {
    const userId = req.userId;
    const rating = Number(req.body?.rating || 0);
    const comments = String(req.body?.comments || "");
    const suggestions = String(req.body?.suggestions || "");
    const dietPlanId = String(req.body?.dietPlanId || "");
    const isSuspicious = !!req.body?.isSuspicious;
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    const [fb] = await db.insert(feedbacks).values({
      userId,
      dietPlanId: dietPlanId || null,
      rating,
      comments,
      suggestions,
      isSuspicious,
    }).returning();

    if (isSuspicious && dietPlanId) {
      await db.update(dietPlans).set({ isFlagged: true, updatedAt: new Date() }).where(eq(dietPlans.id, dietPlanId));
      await db.insert(notifications).values({
        userId,
        title: "Suspicious meal plan flagged",
        message: "Your report has been sent to superadmin for analysis.",
        type: "alert",
        status: "sent",
      });
    }
    res.status(201).json(fb);
  });

  app.get("/api/notifications", isAuthenticated, async (req: any, res) => {
    const userId = req.userId;
    const rows = await db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt));
    res.json(rows);
  });

  // Superadmin analytics
  app.get("/api/superadmin/stats", isSuperAdmin, async (_req, res) => {
    try {
      const stats = await storage.getUserStats();
      res.json(stats);
    } catch (error) {
      console.error("Error getting superadmin stats:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  // Superadmin user list with filters
  app.get("/api/superadmin/users", isSuperAdmin, async (req, res) => {
    try {
      const users = await storage.listUsersWithDetails({
        query: req.query.q ? String(req.query.q) : undefined,
        onboardingComplete: req.query.onboardingComplete === undefined
          ? undefined
          : String(req.query.onboardingComplete) === "true",
        hasAssessment: req.query.hasAssessment === undefined
          ? undefined
          : String(req.query.hasAssessment) === "true",
        goalType: req.query.goalType ? String(req.query.goalType) : undefined,
        createdFrom: req.query.createdFrom ? new Date(String(req.query.createdFrom)) : undefined,
        createdTo: req.query.createdTo ? new Date(String(req.query.createdTo)) : undefined,
      });
      res.json(users);
    } catch (error) {
      console.error("Error listing users:", error);
      res.status(500).json({ message: "Failed to list users" });
    }
  });

  app.post("/api/superadmin/users", isSuperAdmin, async (req, res) => {
    try {
      const email = String(req.body?.email || "").trim().toLowerCase();
      const firstName = String(req.body?.firstName || "").trim();
      const lastName = String(req.body?.lastName || "").trim();
      const password = String(req.body?.password || "");

      if (!email || !firstName || !lastName || password.length < 8) {
        return res.status(400).json({ message: "Invalid user payload" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ message: "User with email already exists" });
      }

      const created = await storage.createUserWithPassword({
        email,
        firstName,
        lastName,
        passwordHash: hashPassword(password),
      });

      // hide password hash in response
      const { passwordHash, ...safe } = created as any;
      res.status(201).json(safe);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  app.patch("/api/superadmin/users/:id", isSuperAdmin, async (req, res) => {
    try {
      const userId = String(req.params.id);
      const payload: any = {};
      if (req.body?.email) payload.email = String(req.body.email).trim().toLowerCase();
      if (req.body?.firstName) payload.firstName = String(req.body.firstName).trim();
      if (req.body?.lastName) payload.lastName = String(req.body.lastName).trim();
      if (req.body?.password) payload.passwordHash = hashPassword(String(req.body.password));

      const updated = await storage.updateUserById(userId, payload);
      if (!updated) {
        return res.status(404).json({ message: "User not found" });
      }
      const { passwordHash, ...safe } = updated as any;
      res.json(safe);
    } catch (error) {
      console.error("Error updating user:", error);
      res.status(500).json({ message: "Failed to update user" });
    }
  });

  app.delete("/api/superadmin/users/:id", isSuperAdmin, async (req, res) => {
    try {
      await storage.deleteUserById(String(req.params.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Error deleting user:", error);
      res.status(500).json({ message: "Failed to delete user" });
    }
  });

  // Diet chat endpoint removed per request
  // (Previously provided an LLM-powered chat; removed to avoid external LLM usage)

  // LLM status & verify endpoints removed per user request
  // These previously exposed LLM availability and verification probes; removed to fully scrap chatbot and external LLM usage.

  // All Gemini/LLM endpoints removed — no external LLM integrations remain.

  return httpServer;
}
