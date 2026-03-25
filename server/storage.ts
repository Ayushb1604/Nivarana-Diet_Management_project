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
import { and, desc, eq, gte, ilike, isNotNull, lte, or, sql } from "drizzle-orm";

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

  getUserStats(): Promise<{ totalUsers: number; activeUsers: number; onboardedUsers: number; usersWithAssessment: number }>;
  listUsersWithDetails(filters?: {
    query?: string;
    onboardingComplete?: boolean;
    hasAssessment?: boolean;
    goalType?: string;
    createdFrom?: Date;
    createdTo?: Date;
  }): Promise<any[]>;
  createUserWithPassword(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<User>;
  updateUserById(
    userId: string,
    data: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string;
    }>,
  ): Promise<User | undefined>;
  deleteUserById(userId: string): Promise<void>;
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

  async getUserStats(): Promise<{ totalUsers: number; activeUsers: number; onboardedUsers: number; usersWithAssessment: number }> {
    const [totals] = await db.select({
      totalUsers: sql<number>`count(*)`,
    }).from(users);

    const [active] = await db.select({
      activeUsers: sql<number>`count(distinct ${userHealthGoals.userId})`,
    }).from(userHealthGoals);

    const [onboarded] = await db.select({
      onboardedUsers: sql<number>`count(*)`,
    }).from(userProfiles).where(eq(userProfiles.onboardingComplete, 1));

    const [assessed] = await db.select({
      usersWithAssessment: sql<number>`count(distinct ${doshaAssessments.userId})`,
    }).from(doshaAssessments);

    return {
      totalUsers: Number(totals?.totalUsers || 0),
      activeUsers: Number(active?.activeUsers || 0),
      onboardedUsers: Number(onboarded?.onboardedUsers || 0),
      usersWithAssessment: Number(assessed?.usersWithAssessment || 0),
    };
  }

  async listUsersWithDetails(filters?: {
    query?: string;
    onboardingComplete?: boolean;
    hasAssessment?: boolean;
    goalType?: string;
    createdFrom?: Date;
    createdTo?: Date;
  }): Promise<any[]> {
    const whereClauses: any[] = [];

    if (filters?.query) {
      const q = `%${filters.query}%`;
      whereClauses.push(
        or(
          ilike(users.email, q),
          ilike(users.firstName, q),
          ilike(users.lastName, q),
        ),
      );
    }

    if (typeof filters?.onboardingComplete === "boolean") {
      whereClauses.push(
        eq(userProfiles.onboardingComplete, filters.onboardingComplete ? 1 : 0),
      );
    }

    if (typeof filters?.hasAssessment === "boolean") {
      whereClauses.push(
        filters.hasAssessment
          ? isNotNull(doshaAssessments.id)
          : sql`${doshaAssessments.id} is null`,
      );
    }

    if (filters?.goalType) {
      whereClauses.push(eq(userHealthGoals.goalType, filters.goalType));
    }

    if (filters?.createdFrom) {
      whereClauses.push(gte(users.createdAt, filters.createdFrom));
    }

    if (filters?.createdTo) {
      whereClauses.push(lte(users.createdAt, filters.createdTo));
    }

    const result = await db
      .select({
        id: users.id,
        email: users.email,
        firstName: users.firstName,
        lastName: users.lastName,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
        profileImageUrl: users.profileImageUrl,
        onboardingComplete: userProfiles.onboardingComplete,
        age: userProfiles.age,
        gender: userProfiles.gender,
        healthGoal: userHealthGoals.goalType,
        doshaType: doshaAssessments.primaryDosha,
      })
      .from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userHealthGoals, eq(users.id, userHealthGoals.userId))
      .leftJoin(doshaAssessments, eq(users.id, doshaAssessments.userId))
      .where(whereClauses.length > 0 ? and(...whereClauses) : undefined)
      .orderBy(desc(users.createdAt));

    const deduped = new Map<string, any>();
    for (const row of result) {
      if (!deduped.has(row.id)) {
        deduped.set(row.id, row);
      }
    }
    return Array.from(deduped.values());
  }

  async createUserWithPassword(data: {
    email: string;
    firstName: string;
    lastName: string;
    passwordHash: string;
  }): Promise<User> {
    const [user] = await db.insert(users).values({
      email: data.email,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.passwordHash,
      profileImageUrl: null,
    }).returning();
    return user;
  }

  async updateUserById(
    userId: string,
    data: Partial<{
      email: string;
      firstName: string;
      lastName: string;
      passwordHash: string;
    }>,
  ): Promise<User | undefined> {
    if (Object.keys(data).length === 0) {
      return this.getUser(userId);
    }

    const [updated] = await db.update(users).set({
      ...data,
      updatedAt: new Date(),
    }).where(eq(users.id, userId)).returning();

    return updated;
  }

  async deleteUserById(userId: string): Promise<void> {
    await db.delete(doshaAssessments).where(eq(doshaAssessments.userId, userId));
    await db.delete(userHealthGoals).where(eq(userHealthGoals.userId, userId));
    await db.delete(userProfiles).where(eq(userProfiles.userId, userId));
    await db.delete(users).where(eq(users.id, userId));
  }
}

export const storage = new DatabaseStorage();
