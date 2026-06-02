import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  serial,
  text,
  real,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  authProvider: varchar("auth_provider", { length: 20 }).default("email"),
  passwordSalt: varchar("password_salt"),
  passwordHash: varchar("password_hash"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User profile with health metrics
export const userProfiles = pgTable("user_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  age: integer("age"),
  gender: varchar("gender", { length: 20 }),
  heightCm: real("height_cm"),
  weightKg: real("weight_kg"),
  bmi: real("bmi"),
  maintenanceCalories: integer("maintenance_calories"),
  activityLevel: varchar("activity_level", { length: 20 }),
  onboardingComplete: integer("onboarding_complete").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Dosha assessment results
export const doshaAssessments = pgTable("dosha_assessments", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  vataScore: integer("vata_score").notNull(),
  pittaScore: integer("pitta_score").notNull(),
  kaphaScore: integer("kapha_score").notNull(),
  vataPercent: integer("vata_percent").notNull(),
  pittaPercent: integer("pitta_percent").notNull(),
  kaphaPercent: integer("kapha_percent").notNull(),
  constitutionType: varchar("constitution_type", { length: 10 }).notNull(),
  primaryDosha: varchar("primary_dosha", { length: 10 }).notNull(),
  secondaryDosha: varchar("secondary_dosha", { length: 10 }),
  responses: jsonb("responses").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// User's selected health goal
export const userHealthGoals = pgTable("user_health_goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  goalType: varchar("goal_type", { length: 30 }).notNull(),
  isBalancedDiet: integer("is_balanced_diet").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Wellness Check-ins (re-evaluation tests)
export const wellnessCheckins = pgTable("wellness_checkins", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  checkinNumber: integer("checkin_number").notNull(),
  energy: integer("energy").notNull(),
  digestion: integer("digestion").notNull(),
  sleep: integer("sleep").notNull(),
  mood: integer("mood").notNull(),
  mentalClarity: integer("mental_clarity").notNull(),
  skinHealth: integer("skin_health").notNull(),
  immunity: integer("immunity").notNull(),
  calmness: integer("calmness").notNull(),
  overallScore: integer("overall_score").notNull(),
  notes: text("notes"),
  // Admin reply fields
  adminReply: text("admin_reply"),
  adminRepliedAt: timestamp("admin_replied_at"),
  adminReplyRead: integer("admin_reply_read").default(0), // 0=unread, 1=read
  createdAt: timestamp("created_at").defaultNow(),
});

// Persisted meal plans (one per user — upserted on each generation)
export const mealPlans = pgTable("meal_plans", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  goal: varchar("goal", { length: 40 }).notNull().default("balanced"),
  planData: jsonb("plan_data").notNull(),
  generatedAt: timestamp("generated_at").defaultNow(),
}, (t) => [index("meal_plans_user_goal_idx").on(t.userId, t.goal)]);

export type MealPlan = typeof mealPlans.$inferSelect;

// Password reset tokens
export const passwordResetTokens = pgTable("password_reset_tokens", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: varchar("token", { length: 64 }).notNull().unique(),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Chat Conversations
export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Chat Messages
export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id")
    .notNull()
    .references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // 'user' | 'assistant'
  content: text("content").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Platform Feedback
export const feedbacks = pgTable("feedbacks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  userName: varchar("user_name").notNull(),
  userRole: varchar("user_role").notNull(),
  rating: integer("rating").notNull(),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Types
export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

export type UserProfile = typeof userProfiles.$inferSelect;
export type InsertUserProfile = typeof userProfiles.$inferInsert;
export const insertUserProfileSchema = createInsertSchema(userProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type DoshaAssessment = typeof doshaAssessments.$inferSelect;
export type InsertDoshaAssessment = typeof doshaAssessments.$inferInsert;
export const insertDoshaAssessmentSchema = createInsertSchema(doshaAssessments).omit({
  id: true,
  createdAt: true,
});

export type UserHealthGoal = typeof userHealthGoals.$inferSelect;
export type InsertUserHealthGoal = typeof userHealthGoals.$inferInsert;
export const insertUserHealthGoalSchema = createInsertSchema(userHealthGoals).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export type WellnessCheckin = typeof wellnessCheckins.$inferSelect;
export type InsertWellnessCheckin = typeof wellnessCheckins.$inferInsert;
export const insertWellnessCheckinSchema = createInsertSchema(wellnessCheckins).omit({
  id: true,
  createdAt: true,
  checkinNumber: true,
  overallScore: true,
});

// Wellness marker keys (used by frontend questions + progress comparison)
export const wellnessMarkers = {
  energy: "Energy & Vitality",
  digestion: "Digestion & Appetite",
  sleep: "Sleep Quality",
  mood: "Mood & Emotional Balance",
  mentalClarity: "Mental Clarity & Focus",
  skinHealth: "Skin & Hair Health",
  immunity: "Immunity & Resistance",
  calmness: "Calmness & Stress Resilience",
} as const;

export type WellnessMarkerKey = keyof typeof wellnessMarkers;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
});

export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export type Feedback = typeof feedbacks.$inferSelect;
export type InsertFeedback = typeof feedbacks.$inferInsert;
export const insertFeedbackSchema = createInsertSchema(feedbacks).omit({
  id: true,
  createdAt: true,
});


// Dosha question type
export interface DoshaQuestion {
  id: number;
  text: string;
  dosha: 'vata' | 'pitta' | 'kapha';
}

// Quiz response type
export interface QuizResponse {
  questionId: number;
  dosha: 'vata' | 'pitta' | 'kapha';
  score: number;
}

// Food type from dataset
export interface Food {
  name: string;
  category: string;
  dosha_effects: {
    vata: 'favourable' | 'neutral' | 'unfavourable';
    pitta: 'favourable' | 'neutral' | 'unfavourable';
    kapha: 'favourable' | 'neutral' | 'unfavourable';
  };
  health_goal_effects: {
    heart_health: 'favourable' | 'neutral' | 'unfavourable';
    gut_health: 'favourable' | 'neutral' | 'unfavourable';
    inflammation: 'favourable' | 'neutral' | 'unfavourable';
    liver_function: 'favourable' | 'neutral' | 'unfavourable';
    immunity: 'favourable' | 'neutral' | 'unfavourable';
    diabetes: 'favourable' | 'neutral' | 'unfavourable';
    skin_hair: 'favourable' | 'neutral' | 'unfavourable';
    weight_management: 'favourable' | 'neutral' | 'unfavourable';
    sleep: 'favourable' | 'neutral' | 'unfavourable';
    energy: 'favourable' | 'neutral' | 'unfavourable';
  };
}

// Tiered food result type
export interface TieredFoods {
  tier_1: Food[];
  tier_2: Food[];
  tier_3: Food[];
  tier_4?: Food[];
  tier_5?: Food[];
}

// Health goals list
export const healthGoals = {
  heart_health: "Heart Health",
  gut_health: "Gut Health & Digestion",
  inflammation: "Reduce Inflammation",
  liver_function: "Liver Function",
  immunity: "Boost Immunity",
  diabetes: "Diabetes Management",
  skin_hair: "Skin & Hair Health",
  weight_management: "Weight Management",
  sleep: "Better Sleep Quality",
  energy: "Increase Energy Levels",
} as const;

export type HealthGoalKey = keyof typeof healthGoals;
