import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { pool } from "./db";
import type { PublicUser, User } from "@shared/schema";

const PgSession = connectPg(session);

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const iterations = 100_000;
  const keylen = 64;
  const digest = "sha512";

  const hash = crypto
    .pbkdf2Sync(password, salt, iterations, keylen, digest)
    .toString("hex");

  return `${iterations}:${salt}:${hash}`;
}

function verifyPassword(password: string, storedHash: string): boolean {
  try {
    const [iterationsStr, salt, originalHash] = storedHash.split(":");
    const iterations = Number(iterationsStr) || 100_000;
    const keylen = 64;
    const digest = "sha512";

    const derived = crypto
      .pbkdf2Sync(password, salt, iterations, keylen, digest)
      .toString("hex");

    return crypto.timingSafeEqual(
      Buffer.from(originalHash, "hex"),
      Buffer.from(derived, "hex"),
    );
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
