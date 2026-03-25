import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { pool } from "./db";
import { passwordResetTokens } from "@shared/schema";
import type { PublicUser, User } from "@shared/schema";
import { db } from "./db";
import { and, eq, gt, isNull } from "drizzle-orm";

const PgSession = connectPg(session);

export const SUPERADMIN_SECRET_PATH =
  process.env.SUPERADMIN_SECRET_PATH || "superadmin-portal-nivarna-7f9d2";
export const SUPERADMIN_USERNAME =
  process.env.SUPERADMIN_USERNAME || "superadmin";
export const SUPERADMIN_PASSWORD =
  process.env.SUPERADMIN_PASSWORD || "Nivarna@2026";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 12);
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    return bcrypt.compareSync(password, storedHash);
  } catch {
    return false;
  }
}

function toPublicUser(user: User): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash, ...safeUser } = user;
  return safeUser;
}

const signupSchema = z
  .object({
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    email: z.string().email("A valid email address is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    passwordConfirmation: z.string(),
  })
  .refine((data) => data.password === data.passwordConfirmation, {
    path: ["passwordConfirmation"],
    message: "Passwords do not match",
  });

const loginSchema = z.object({
  email: z.string().email("A valid email address is required"),
  password: z.string().min(1, "Password is required"),
});

const forgotPasswordSchema = z.object({
  email: z.string().email("A valid email address is required"),
});

const resetPasswordSchema = z.object({
  token: z.string().min(32, "Invalid token"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  passwordConfirmation: z.string(),
}).refine((d) => d.password === d.passwordConfirmation, {
  path: ["passwordConfirmation"],
  message: "Passwords do not match",
});

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  const sessionStore = new PgSession({
    pool,
    tableName: "sessions",
    createTableIfMissing: true,
  });

  return session({
    secret: process.env.SESSION_SECRET || "dev_secret_key",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: false, // localhost doesn't support secure cookies
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Sign up with email + password
  app.post("/api/auth/signup", async (req, res) => {
    try {
      const { firstName, lastName, email, password } = signupSchema.parse(
        req.body,
      );

      const existing = await storage.getUserByEmail(email);
      if (existing?.passwordHash) {
        return res
          .status(409)
          .json({ message: "An account with this email already exists" });
      }

      const passwordHash = hashPassword(password);

      const user = await storage.upsertUser({
        email,
        firstName,
        lastName,
        passwordHash,
        profileImageUrl: null,
      });

      (req.session as any).userId = user.id;
      (req.session as any).user = toPublicUser(user);

      req.session?.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }
        res.status(201).json(toPublicUser(user));
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }

      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Login with email + password
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = loginSchema.parse(req.body);

      const user = await storage.getUserByEmail(email);
      if (!user || !user.passwordHash || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).user = toPublicUser(user);

      req.session?.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Session save failed" });
        }
        res.json(toPublicUser(user));
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }

      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Logout endpoint
  app.post("/api/auth/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out" });
      }
      res.json({ success: true });
    });
  });

  // Get current user
  app.get("/api/auth/user", async (req, res) => {
    try {
      const userId = (req.session as any)?.userId;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json(toPublicUser(user));
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Forgot password: always return generic success response
  app.post("/api/auth/forgot-password", async (req, res) => {
    try {
      const { email } = forgotPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(email.trim().toLowerCase());

      if (user?.id) {
        const rawToken = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

        await db.insert(passwordResetTokens).values({
          userId: user.id,
          tokenHash,
          expiresAt,
        });

        const resetPath = `/reset-password?token=${encodeURIComponent(rawToken)}`;
        const resetUrl = `${req.protocol}://${req.get("host")}${resetPath}`;

        // Dev mode helper: return reset link when email provider is not configured
        if (process.env.NODE_ENV !== "production") {
          return res.json({
            message: "If this email exists, reset instructions have been created.",
            resetUrl,
          });
        }
      }

      res.json({ message: "If this email exists, reset instructions have been created." });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Failed to process request" });
    }
  });

  app.get("/api/auth/reset-password/validate", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) {
        return res.status(400).json({ valid: false, message: "Token required" });
      }
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const now = new Date();
      const rows = await db.select().from(passwordResetTokens).where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );

      res.json({ valid: rows.length > 0 });
    } catch (error) {
      console.error("Reset token validate error:", error);
      res.status(500).json({ valid: false });
    }
  });

  app.post("/api/auth/reset-password", async (req, res) => {
    try {
      const { token, password } = resetPasswordSchema.parse(req.body);
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const now = new Date();

      const rows = await db.select().from(passwordResetTokens).where(
        and(
          eq(passwordResetTokens.tokenHash, tokenHash),
          isNull(passwordResetTokens.usedAt),
          gt(passwordResetTokens.expiresAt, now),
        ),
      );
      const record = rows[0];
      if (!record) {
        return res.status(400).json({ message: "Invalid or expired reset token" });
      }

      await storage.updateUserById(record.userId, { passwordHash: hashPassword(password) });
      await db.update(passwordResetTokens)
        .set({ usedAt: new Date() })
        .where(eq(passwordResetTokens.id, record.id));

      res.json({ success: true });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid data", errors: error.errors });
      }
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Failed to reset password" });
    }
  });

  // Superadmin auth endpoints
  app.post("/api/superadmin/login", (req, res) => {
    const username = String(req.body?.username || "");
    const password = String(req.body?.password || "");

    if (username !== SUPERADMIN_USERNAME || password !== SUPERADMIN_PASSWORD) {
      return res.status(401).json({ message: "Invalid superadmin credentials" });
    }

    (req.session as any).isSuperAdmin = true;
    (req.session as any).superAdminUsername = username;

    req.session?.save((err) => {
      if (err) {
        return res.status(500).json({ message: "Session save failed" });
      }
      res.json({ success: true, username });
    });
  });

  app.post("/api/superadmin/logout", (req, res) => {
    if (req.session) {
      (req.session as any).isSuperAdmin = false;
      (req.session as any).superAdminUsername = null;
    }
    req.session?.save((err) => {
      if (err) {
        return res.status(500).json({ message: "Failed to log out superadmin" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/superadmin/me", (req, res) => {
    const isSuperAdmin = !!(req.session as any)?.isSuperAdmin;
    if (!isSuperAdmin) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    res.json({ username: (req.session as any).superAdminUsername });
  });
}

// Middleware to check if user is authenticated
export const isAuthenticated: RequestHandler = (req, res, next) => {
  const userId = (req.session as any)?.userId;

  if (!userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  // Attach userId to request for use in route handlers
  (req as any).userId = userId;
  next();
};

export const isSuperAdmin: RequestHandler = (req, res, next) => {
  const isSuperAdmin = !!(req.session as any)?.isSuperAdmin;
  if (!isSuperAdmin) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  next();
};
