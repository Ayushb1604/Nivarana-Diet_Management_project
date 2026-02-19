import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { getFilteredFoods } from "./foodFilter";
import { registerChatRoutes } from "./replit_integrations/chat";
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

      // Helper to create a simple recipe using a subset of allowed foods
      function makeRecipe(ingredients: typeof allowedFoods) {
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
      }

      // Build days
      const mealPlan = Array.from({ length: days }).map((_, idx) => {
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

      res.json({ days: mealPlan });
    } catch (error) {
      console.error("Error generating meal plan:", error);
      res.status(500).json({ message: "Failed to generate meal plan" });
    }
  });

  // Diet chat endpoint removed per request
  // (Previously provided an LLM-powered chat; removed to avoid external LLM usage)

  // LLM status & verify endpoints removed per user request
  // These previously exposed LLM availability and verification probes; removed to fully scrap chatbot and external LLM usage.

  // All Gemini/LLM endpoints removed — no external LLM integrations remain.

  return httpServer;
}
