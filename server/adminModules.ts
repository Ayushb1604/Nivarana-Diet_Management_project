import type { Express } from "express";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import multer from "multer";
import rateLimit from "express-rate-limit";
import { db } from "./db";
import {
  auditLogs,
  ayurvedicFoods,
  datasets,
  dietPlans,
  dynamicRules,
  feedbacks,
  nlpMonitor,
  notifications,
  systemConfigs,
  systemControls,
  userProfiles,
  users,
  userHealthGoals,
  doshaAssessments,
} from "@shared/schema";
import { isSuperAdmin } from "./replitAuth";

const upload = multer({ storage: multer.memoryStorage() });

const apiLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  limit: Number(process.env.RATE_LIMIT_MAX || 300),
});

function structuredLog(event: string, payload: Record<string, unknown>) {
  console.log(JSON.stringify({ timestamp: new Date().toISOString(), event, ...payload }));
}

function requireRole(role: "superadmin") {
  return (req: any, res: any, next: any) => {
    if (role === "superadmin") return isSuperAdmin(req, res, next);
    return res.status(403).json({ message: "Forbidden" });
  };
}

async function logAudit(actorId: string | null, actorRole: string, action: string, targetType?: string, targetId?: string, metadata?: any) {
  await db.insert(auditLogs).values({ actorId, actorRole, action, targetType, targetId, metadata });
}

function evaluateRules(context: Record<string, any>, rules: any[]) {
  return rules
    .filter((r) => r.enabled)
    .sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0))
    .filter((r) => {
      const conditions = r.conditions || {};
      return Object.entries(conditions).every(([key, val]) => context[key] === val);
    })
    .map((r) => ({ id: r.id, name: r.name, weight: r.weight, recommendations: r.recommendations }));
}

export function registerAdminModules(app: Express) {
  app.use("/api", apiLimiter);

  // User management module
  app.patch("/api/superadmin/users/:id/status", requireRole("superadmin"), async (req: any, res) => {
    const id = String(req.params.id);
    const active = !!req.body?.active;
    await db.update(userProfiles).set({ onboardingComplete: active ? 1 : 0, updatedAt: new Date() }).where(eq(userProfiles.userId, id));
    await logAudit(null, "superadmin", "USER_ACTIVATE_DEACTIVATE", "user", id, { active });
    res.json({ success: true });
  });

  app.get("/api/superadmin/users/:id/profile", requireRole("superadmin"), async (req, res) => {
    const id = String(req.params.id);
    const [row] = await db.select({
      user: users,
      profile: userProfiles,
      healthGoal: userHealthGoals,
      assessment: doshaAssessments,
    }).from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userHealthGoals, eq(users.id, userHealthGoals.userId))
      .leftJoin(doshaAssessments, eq(users.id, doshaAssessments.userId))
      .where(eq(users.id, id));
    res.json(row || null);
  });

  app.get("/api/superadmin/users-filtered", requireRole("superadmin"), async (req, res) => {
    const role = String(req.query.role || "user");
    const status = String(req.query.status || "");
    const conditions = [sql`'${role}' = 'user'`];
    if (status) {
      conditions.push(eq(userProfiles.onboardingComplete, status === "active" ? 1 : 0));
    }
    const rows = await db.select({
      id: users.id,
      email: users.email,
      firstName: users.firstName,
      lastName: users.lastName,
      status: userProfiles.onboardingComplete,
      doshaType: doshaAssessments.primaryDosha,
      healthCondition: userHealthGoals.goalType,
      dietHistoryReference: sql<string>`coalesce(${dietPlans.id}, '')`,
    }).from(users)
      .leftJoin(userProfiles, eq(users.id, userProfiles.userId))
      .leftJoin(userHealthGoals, eq(users.id, userHealthGoals.userId))
      .leftJoin(doshaAssessments, eq(users.id, doshaAssessments.userId))
      .leftJoin(dietPlans, eq(users.id, dietPlans.userId))
      .where(and(...conditions));
    res.json(rows);
  });

  // Ayurvedic knowledge base management
  app.post("/api/superadmin/foods", requireRole("superadmin"), async (req, res) => {
    const [food] = await db.insert(ayurvedicFoods).values(req.body).returning();
    await logAudit(null, "superadmin", "FOOD_CREATE", "food", food.id, req.body);
    res.status(201).json(food);
  });
  app.patch("/api/superadmin/foods/:id", requireRole("superadmin"), async (req, res) => {
    const [food] = await db.update(ayurvedicFoods).set({ ...req.body, updatedAt: new Date() }).where(eq(ayurvedicFoods.id, String(req.params.id))).returning();
    await logAudit(null, "superadmin", "FOOD_UPDATE", "food", String(req.params.id), req.body);
    res.json(food);
  });
  app.delete("/api/superadmin/foods/:id", requireRole("superadmin"), async (req, res) => {
    await db.delete(ayurvedicFoods).where(eq(ayurvedicFoods.id, String(req.params.id)));
    await logAudit(null, "superadmin", "FOOD_DELETE", "food", String(req.params.id));
    res.json({ success: true });
  });
  app.get("/api/superadmin/foods", requireRole("superadmin"), async (req, res) => {
    const q = String(req.query.q || "");
    const rows = await db.select().from(ayurvedicFoods).where(q ? ilike(ayurvedicFoods.name, `%${q}%`) : undefined).orderBy(desc(ayurvedicFoods.createdAt));
    res.json(rows);
  });

  // Rule engine control panel
  app.post("/api/superadmin/rules", requireRole("superadmin"), async (req, res) => {
    const [rule] = await db.insert(dynamicRules).values(req.body).returning();
    await logAudit(null, "superadmin", "RULE_CREATE", "rule", rule.id, req.body);
    res.status(201).json(rule);
  });
  app.get("/api/superadmin/rules", requireRole("superadmin"), async (_req, res) => {
    const rows = await db.select().from(dynamicRules).orderBy(desc(dynamicRules.createdAt));
    res.json(rows);
  });
  app.patch("/api/superadmin/rules/:id", requireRole("superadmin"), async (req, res) => {
    const [rule] = await db.update(dynamicRules).set({ ...req.body, updatedAt: new Date() }).where(eq(dynamicRules.id, String(req.params.id))).returning();
    await logAudit(null, "superadmin", "RULE_UPDATE", "rule", String(req.params.id), req.body);
    res.json(rule);
  });
  app.post("/api/superadmin/rules/:id/toggle", requireRole("superadmin"), async (req, res) => {
    const enabled = !!req.body?.enabled;
    const [rule] = await db.update(dynamicRules).set({ enabled, updatedAt: new Date() }).where(eq(dynamicRules.id, String(req.params.id))).returning();
    res.json(rule);
  });
  app.post("/api/rules/evaluate", async (req, res) => {
    const rules = await db.select().from(dynamicRules);
    res.json({ matches: evaluateRules(req.body || {}, rules) });
  });

  // Dataset management
  app.post("/api/superadmin/datasets/upload", requireRole("superadmin"), upload.single("file"), async (req: any, res) => {
    const type = String(req.body?.type || "food");
    const name = String(req.body?.name || "dataset");
    const file = req.file;
    if (!file) return res.status(400).json({ message: "No file uploaded" });
    let parsed: any;
    try {
      const raw = file.buffer.toString("utf-8");
      if (file.originalname.endsWith(".json")) parsed = JSON.parse(raw);
      else if (file.originalname.endsWith(".csv")) {
        const [header, ...rows] = raw.split(/\r?\n/).filter(Boolean);
        const keys = header.split(",").map((k: string) => k.trim());
        parsed = rows.map((line: string) => {
          const cols = line.split(",");
          return Object.fromEntries(keys.map((k: string, i: number) => [k, cols[i]?.trim() || ""]));
        });
      } else return res.status(400).json({ message: "Only CSV/JSON supported" });
    } catch {
      return res.status(400).json({ message: "Invalid file data" });
    }
    const valid = Array.isArray(parsed) && parsed.length > 0;
    const [latest] = await db.select({ maxVersion: sql<number>`coalesce(max(version),0)` }).from(datasets).where(eq(datasets.name, name));
    const [saved] = await db.insert(datasets).values({
      name,
      type,
      version: Number(latest?.maxVersion || 0) + 1,
      schemaValid: valid,
      metadata: { originalName: file.originalname, size: file.size },
      rawData: parsed,
    }).returning();
    res.status(201).json(saved);
  });
  app.get("/api/superadmin/datasets", requireRole("superadmin"), async (_req, res) => {
    res.json(await db.select().from(datasets).orderBy(desc(datasets.createdAt)));
  });

  // Diet plan monitoring + override
  app.get("/api/superadmin/diet-plans", requireRole("superadmin"), async (_req, res) => {
    res.json(await db.select().from(dietPlans).orderBy(desc(dietPlans.createdAt)));
  });
  app.get("/api/superadmin/diet-plans/user/:userId", requireRole("superadmin"), async (req, res) => {
    res.json(await db.select().from(dietPlans).where(eq(dietPlans.userId, String(req.params.userId))).orderBy(desc(dietPlans.createdAt)));
  });
  app.post("/api/superadmin/diet-plans/:id/flag", requireRole("superadmin"), async (req, res) => {
    const [row] = await db.update(dietPlans).set({ isFlagged: true, updatedAt: new Date() }).where(eq(dietPlans.id, String(req.params.id))).returning();
    await logAudit(null, "superadmin", "DIET_PLAN_FLAG", "diet_plan", String(req.params.id), req.body);
    res.json(row);
  });
  app.post("/api/superadmin/diet-plans/:id/override", requireRole("superadmin"), async (req, res) => {
    const [row] = await db.update(dietPlans).set({ overridePayload: req.body?.payload, updatedAt: new Date() }).where(eq(dietPlans.id, String(req.params.id))).returning();
    await logAudit(null, "superadmin", "DIET_PLAN_OVERRIDE", "diet_plan", String(req.params.id), req.body);
    res.json(row);
  });

  // NLP/chat monitoring
  app.get("/api/superadmin/nlp-queries", requireRole("superadmin"), async (req, res) => {
    const misunderstood = String(req.query.misunderstood || "");
    const rows = await db.select().from(nlpMonitor).where(
      misunderstood ? eq(nlpMonitor.misunderstood, misunderstood === "true") : undefined,
    ).orderBy(desc(nlpMonitor.createdAt));
    res.json(rows);
  });
  app.post("/api/superadmin/nlp-queries/:id/retrain", requireRole("superadmin"), async (req, res) => {
    const [row] = await db.update(nlpMonitor).set({ retrainMarked: true, intent: req.body?.intent, detectedDosha: req.body?.detectedDosha }).where(eq(nlpMonitor.id, String(req.params.id))).returning();
    res.json(row);
  });

  // Feedback + learning
  app.get("/api/superadmin/feedback-analytics", requireRole("superadmin"), async (_req, res) => {
    const [agg] = await db.select({
      total: sql<number>`count(*)`,
      avgRating: sql<number>`coalesce(avg(${feedbacks.rating}),0)`,
      suspicious: sql<number>`sum(case when ${feedbacks.isSuspicious} = true then 1 else 0 end)`,
    }).from(feedbacks);
    res.json({ total: Number(agg.total || 0), avgRating: Number(agg.avgRating || 0), suspicious: Number(agg.suspicious || 0) });
  });
  app.get("/api/superadmin/feedback", requireRole("superadmin"), async (_req, res) => {
    res.json(await db.select().from(feedbacks).orderBy(desc(feedbacks.createdAt)));
  });

  // API/system control
  app.get("/api/superadmin/api-usage", requireRole("superadmin"), async (_req, res) => {
    const [usage] = await db.select({
      queriesCount: sql<number>`count(*)`,
    }).from(nlpMonitor);
    res.json({ queriesCount: Number(usage.queriesCount || 0) });
  });
  app.get("/api/superadmin/system-controls", requireRole("superadmin"), async (_req, res) => {
    const [ctrl] = await db.select().from(systemControls).limit(1);
    res.json(ctrl || null);
  });
  app.patch("/api/superadmin/system-controls", requireRole("superadmin"), async (req, res) => {
    const [existing] = await db.select().from(systemControls).limit(1);
    if (!existing) {
      const [created] = await db.insert(systemControls).values(req.body).returning();
      return res.json(created);
    }
    const [updated] = await db.update(systemControls).set({ ...req.body, updatedAt: new Date() }).where(eq(systemControls.id, existing.id)).returning();
    res.json(updated);
  });

  // Notifications
  app.post("/api/superadmin/notifications/send", requireRole("superadmin"), async (req, res) => {
    const payload = req.body;
    const [notification] = await db.insert(notifications).values({
      userId: payload.userId,
      title: payload.title,
      message: payload.message,
      type: payload.type || "info",
      status: "queued",
    }).returning();
    setTimeout(async () => {
      await db.update(notifications).set({ status: "sent" }).where(eq(notifications.id, notification.id));
    }, 1000);
    res.status(201).json(notification);
  });

  // Reports and exports
  app.get("/api/superadmin/reports/generate", requireRole("superadmin"), async (req, res) => {
    const format = String(req.query.format || "json");
    const [usersCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const doshaDist = await db.select({
      dosha: doshaAssessments.primaryDosha,
      count: sql<number>`count(*)`,
    }).from(doshaAssessments).groupBy(doshaAssessments.primaryDosha);
    const dietTrends = await db.select({
      source: dietPlans.source,
      count: sql<number>`count(*)`,
    }).from(dietPlans).groupBy(dietPlans.source);
    const report = { users: usersCount.count, doshaDistribution: doshaDist, dietTrends };
    if (format === "csv") {
      const csv = [
        "metric,value",
        `users,${usersCount.count}`,
        ...doshaDist.map((d) => `dosha_${d.dosha},${d.count}`),
        ...dietTrends.map((d) => `diet_source_${d.source},${d.count}`),
      ].join("\n");
      res.setHeader("Content-Type", "text/csv");
      return res.send(csv);
    }
    res.json(report);
  });

  // Configuration panel
  app.get("/api/superadmin/config", requireRole("superadmin"), async (_req, res) => {
    res.json(await db.select().from(systemConfigs).orderBy(desc(systemConfigs.updatedAt)));
  });
  app.put("/api/superadmin/config/:key", requireRole("superadmin"), async (req, res) => {
    const key = String(req.params.key);
    const [existing] = await db.select().from(systemConfigs).where(eq(systemConfigs.key, key));
    if (!existing) {
      const [created] = await db.insert(systemConfigs).values({ key, value: req.body?.value, updatedAt: new Date() }).returning();
      return res.json(created);
    }
    const [updated] = await db.update(systemConfigs).set({ value: req.body?.value, updatedAt: new Date() }).where(eq(systemConfigs.key, key)).returning();
    res.json(updated);
  });

  structuredLog("ADMIN_MODULES_REGISTERED", { ok: true });
}
