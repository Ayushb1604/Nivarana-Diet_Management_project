import {
  users,
  userProfiles,
  doshaAssessments,
  userHealthGoals,
  wellnessCheckins,
  mealPlans,
  conversations,
  messages,
  passwordResetTokens,
  feedbacks,
  type User,
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type DoshaAssessment,
  type InsertDoshaAssessment,
  type UserHealthGoal,
  type InsertUserHealthGoal,
  type WellnessCheckin,
  type InsertWellnessCheckin,
  type Feedback,
  type InsertFeedback,
} from "@shared/schema";
import { db } from "./db";
import { eq, asc, desc, and, count, lt } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getProfile(userId: string): Promise<UserProfile | undefined>;
  createProfile(profile: InsertUserProfile): Promise<UserProfile>;
  updateProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined>;

  getDoshaAssessment(userId: string): Promise<DoshaAssessment | undefined>;
  createDoshaAssessment(assessment: InsertDoshaAssessment): Promise<DoshaAssessment>;

  getHealthGoal(userId: string): Promise<UserHealthGoal | undefined>;
  upsertHealthGoal(goal: InsertUserHealthGoal): Promise<UserHealthGoal>;

  getWellnessCheckins(userId: string): Promise<WellnessCheckin[]>;
  createWellnessCheckin(checkin: InsertWellnessCheckin): Promise<WellnessCheckin>;

  getMealPlan(userId: string, goal: string): Promise<any | undefined>;
  saveMealPlan(userId: string, goal: string, planData: any): Promise<void>;

  createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void>;
  getPasswordResetToken(token: string): Promise<any | undefined>;
  markTokenUsed(tokenId: number): Promise<void>;
  deleteExpiredTokens(): Promise<void>;

  getFirstUser(): Promise<User | undefined>;
  getAdminUsers(): Promise<any[]>;
  getAdminStats(): Promise<{ totalUsers: number; quizCompleted: number; wellnessCheckins: number; totalConversations: number; mealPlansGenerated: number }>;
  getAdminConversations(): Promise<any[]>;
  getAdminWellnessCheckins(): Promise<any[]>;
  replyToCheckin(checkinId: string, reply: string): Promise<any>;
  getUnreadAdminReplies(userId: string): Promise<any[]>;
  markAdminReplyRead(checkinId: string): Promise<void>;

  getFeedbacks(): Promise<Feedback[]>;
  getFeedback(id: string): Promise<Feedback | undefined>;
  createFeedback(feedback: InsertFeedback): Promise<Feedback>;
  deleteFeedback(id: string): Promise<boolean>;
}


export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id));
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email));
    return result[0];
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getProfile(userId: string): Promise<UserProfile | undefined> {
    const result = await db.select().from(userProfiles).where(eq(userProfiles.userId, userId));
    return result[0];
  }

  async createProfile(profile: InsertUserProfile): Promise<UserProfile> {
    const [newProfile] = await db.insert(userProfiles).values({
      ...profile,
      onboardingComplete: 1,
    }).returning();
    return newProfile;
  }

  async updateProfile(userId: string, profile: Partial<InsertUserProfile>): Promise<UserProfile | undefined> {
    const [updated] = await db
      .update(userProfiles)
      .set({ ...profile, updatedAt: new Date() })
      .where(eq(userProfiles.userId, userId))
      .returning();
    return updated;
  }

  async getDoshaAssessment(userId: string): Promise<DoshaAssessment | undefined> {
    const result = await db
      .select()
      .from(doshaAssessments)
      .where(eq(doshaAssessments.userId, userId))
      .orderBy(doshaAssessments.createdAt);
    return result[result.length - 1];
  }

  async createDoshaAssessment(assessment: InsertDoshaAssessment): Promise<DoshaAssessment> {
    const [newAssessment] = await db.insert(doshaAssessments).values(assessment).returning();
    return newAssessment;
  }

  async getHealthGoal(userId: string): Promise<UserHealthGoal | undefined> {
    const result = await db.select().from(userHealthGoals).where(eq(userHealthGoals.userId, userId));
    return result[0];
  }

  async upsertHealthGoal(goal: InsertUserHealthGoal): Promise<UserHealthGoal> {
    const existing = await this.getHealthGoal(goal.userId);

    if (existing) {
      const [updated] = await db
        .update(userHealthGoals)
        .set({ ...goal, updatedAt: new Date() })
        .where(eq(userHealthGoals.userId, goal.userId))
        .returning();
      return updated;
    }

    const [newGoal] = await db.insert(userHealthGoals).values(goal).returning();
    return newGoal;
  }

  async getWellnessCheckins(userId: string): Promise<WellnessCheckin[]> {
    return await db
      .select()
      .from(wellnessCheckins)
      .where(eq(wellnessCheckins.userId, userId))
      .orderBy(asc(wellnessCheckins.createdAt));
  }

  async createWellnessCheckin(checkin: InsertWellnessCheckin): Promise<WellnessCheckin> {
    const existing = await this.getWellnessCheckins(checkin.userId);
    const checkinNumber = existing.length + 1;
    const overallScore =
      checkin.energy +
      checkin.digestion +
      checkin.sleep +
      checkin.mood +
      checkin.mentalClarity +
      checkin.skinHealth +
      checkin.immunity +
      checkin.calmness;

    const [newCheckin] = await db
      .insert(wellnessCheckins)
      .values({ ...checkin, checkinNumber, overallScore })
      .returning();
    return newCheckin;
  }

  async getMealPlan(userId: string, goal: string): Promise<any | undefined> {
    const result = await db.select().from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), eq(mealPlans.goal, goal)));
    return result[0]?.planData;
  }

  async saveMealPlan(userId: string, goal: string, planData: any): Promise<void> {
    const existing = await db.select({ id: mealPlans.id }).from(mealPlans)
      .where(and(eq(mealPlans.userId, userId), eq(mealPlans.goal, goal)));
    if (existing.length > 0) {
      await db.update(mealPlans)
        .set({ planData, generatedAt: new Date() })
        .where(and(eq(mealPlans.userId, userId), eq(mealPlans.goal, goal)));
    } else {
      await db.insert(mealPlans).values({ userId, goal, planData });
    }
  }

  async createPasswordResetToken(userId: string, token: string, expiresAt: Date): Promise<void> {
    await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, userId));
    await db.insert(passwordResetTokens).values({ userId, token, expiresAt });
  }

  async getPasswordResetToken(token: string): Promise<any | undefined> {
    const result = await db.select().from(passwordResetTokens).where(eq(passwordResetTokens.token, token));
    return result[0];
  }

  async markTokenUsed(tokenId: number): Promise<void> {
    await db.update(passwordResetTokens).set({ usedAt: new Date() }).where(eq(passwordResetTokens.id, tokenId));
  }

  async deleteExpiredTokens(): Promise<void> {
    await db.delete(passwordResetTokens).where(lt(passwordResetTokens.expiresAt, new Date()));
  }

  async getFirstUser(): Promise<User | undefined> {
    const result = await db.select().from(users).orderBy(asc(users.createdAt)).limit(1);
    return result[0];
  }

  async getAdminUsers(): Promise<any[]> {
    const allUsers = await db.select().from(users).orderBy(asc(users.createdAt));
    return Promise.all(allUsers.map(async (u) => {
      const doshaRows = await db.select({ primaryDosha: doshaAssessments.primaryDosha })
        .from(doshaAssessments).where(eq(doshaAssessments.userId, u.id)).orderBy(asc(doshaAssessments.createdAt));
      const goalRows = await db.select({ goalType: userHealthGoals.goalType })
        .from(userHealthGoals).where(eq(userHealthGoals.userId, u.id));
      return {
        id: u.id,
        email: u.email,
        firstName: u.firstName,
        lastName: u.lastName,
        createdAt: u.createdAt,
        lastActive: u.updatedAt,
        primaryDosha: doshaRows[doshaRows.length - 1]?.primaryDosha ?? null,
        healthGoal: goalRows[0]?.goalType ?? null,
      };
    }));
  }

  async getAdminStats(): Promise<{ totalUsers: number; quizCompleted: number; wellnessCheckins: number; totalConversations: number; mealPlansGenerated: number }> {
    const [[u], [q], [w], [c], [m]] = await Promise.all([
      db.select({ value: count() }).from(users),
      db.select({ value: count() }).from(doshaAssessments),
      db.select({ value: count() }).from(wellnessCheckins),
      db.select({ value: count() }).from(conversations),
      db.select({ value: count() }).from(mealPlans),
    ]);
    return {
      totalUsers: Number(u?.value ?? 0),
      quizCompleted: Number(q?.value ?? 0),
      wellnessCheckins: Number(w?.value ?? 0),
      totalConversations: Number(c?.value ?? 0),
      mealPlansGenerated: Number(m?.value ?? 0),
    };
  }

  async getAdminConversations(): Promise<any[]> {
    const allConvs = await db.select().from(conversations).orderBy(asc(conversations.createdAt));
    return Promise.all(allConvs.map(async (c) => {
      const [msgs, userRows] = await Promise.all([
        db.select().from(messages).where(eq(messages.conversationId, c.id)).orderBy(asc(messages.createdAt)),
        db.select({ email: users.email, firstName: users.firstName }).from(users).where(eq(users.id, c.userId)),
      ]);
      return { ...c, messages: msgs, userEmail: userRows[0]?.email, userName: userRows[0]?.firstName };
    }));
  }
  async getAdminWellnessCheckins(): Promise<any[]> {
    const allCheckins = await db.select().from(wellnessCheckins).orderBy(asc(wellnessCheckins.createdAt));
    return Promise.all(allCheckins.map(async (c) => {
      const userRows = await db
        .select({ email: users.email, firstName: users.firstName, lastName: users.lastName })
        .from(users).where(eq(users.id, c.userId));
      const u = userRows[0];
      return {
        ...c,
        userEmail: u?.email ?? null,
        userName: u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : null,
      };
    }));
  }

  async replyToCheckin(checkinId: string, reply: string): Promise<any> {
    const [updated] = await db
      .update(wellnessCheckins)
      .set({
        adminReply: reply,
        adminRepliedAt: new Date(),
        adminReplyRead: 0, // mark as unread for user
      })
      .where(eq(wellnessCheckins.id, checkinId))
      .returning();
    return updated;
  }

  async getUnreadAdminReplies(userId: string): Promise<any[]> {
    const rows = await db
      .select()
      .from(wellnessCheckins)
      .where(
        eq(wellnessCheckins.userId, userId)
      )
      .orderBy(asc(wellnessCheckins.adminRepliedAt));
    // Return only those with a reply that hasn't been read
    return rows.filter(r => r.adminReply && r.adminReplyRead === 0);
  }

  async markAdminReplyRead(checkinId: string): Promise<void> {
    await db
      .update(wellnessCheckins)
      .set({ adminReplyRead: 1 })
      .where(eq(wellnessCheckins.id, checkinId));
  }

  async getFeedbacks(): Promise<Feedback[]> {
    return await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt));
  }

  async getFeedback(id: string): Promise<Feedback | undefined> {
    const result = await db.select().from(feedbacks).where(eq(feedbacks.id, id));
    return result[0];
  }

  async createFeedback(feedback: InsertFeedback): Promise<Feedback> {
    const [newFeedback] = await db.insert(feedbacks).values(feedback).returning();
    return newFeedback;
  }

  async deleteFeedback(id: string): Promise<boolean> {
    const result = await db.delete(feedbacks).where(eq(feedbacks.id, id)).returning();
    return result.length > 0;
  }
}

export const storage = new DatabaseStorage();
