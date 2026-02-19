import { 
  users, 
  userProfiles, 
  doshaAssessments, 
  userHealthGoals,
  type User, 
  type UpsertUser,
  type UserProfile,
  type InsertUserProfile,
  type DoshaAssessment,
  type InsertDoshaAssessment,
  type UserHealthGoal,
  type InsertUserHealthGoal,
} from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

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
}

export const storage = new DatabaseStorage();
