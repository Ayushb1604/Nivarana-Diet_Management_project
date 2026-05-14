import session from "express-session";
import type { Express, RequestHandler, Request, Response, NextFunction } from "express";
import connectPg from "connect-pg-simple";
import memorystore from "memorystore";
import crypto from "node:crypto";
import { Resend } from "resend";
import { storage } from "./storage";

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// ─── Simple In-Memory Rate Limiter ───────────────────────────────────────────
// Prevents brute-force login attacks and forgot-password email spam.
interface RateLimitEntry { count: number; resetAt: number; }
const rateLimitStore = new Map<string, RateLimitEntry>();

export function rateLimit(maxRequests: number, windowMs: number) {
  return (req: Request, res: Response, next: NextFunction) => {
    const ip = (req.headers["x-forwarded-for"] as string)?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
    const key = `${req.path}::${ip}`;
    const now = Date.now();
    const entry = rateLimitStore.get(key);

    if (!entry || now > entry.resetAt) {
      rateLimitStore.set(key, { count: 1, resetAt: now + windowMs });
      return next();
    }
    if (entry.count >= maxRequests) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set("Retry-After", String(retryAfter));
      return res.status(429).json({
        message: `Too many attempts. Please try again in ${retryAfter} seconds.`,
      });
    }
    entry.count++;
    next();
  };
}
// Prune stale entries every 30 minutes to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) rateLimitStore.delete(key);
  }
}, 30 * 60 * 1000);
// ─────────────────────────────────────────────────────────────────────────────

function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") return "";
  return input.trim().toLowerCase();
}

/** Strip sensitive credential fields before sending a user object to the client. */
function sanitizeUser(user: Record<string, any>): Record<string, any> {
  const { passwordHash: _h, passwordSalt: _s, ...safe } = user;
  return safe;
}

function hashPassword(password: string, saltBase64: string): string {
  const salt = Buffer.from(saltBase64, "base64");
  const hash = crypto.scryptSync(password, salt, 64);
  return hash.toString("base64");
}

function verifyPassword(password: string, saltBase64: string, expectedHashBase64: string): boolean {
  const actual = Buffer.from(hashPassword(password, saltBase64), "base64");
  const expected = Buffer.from(expectedHashBase64, "base64");
  if (actual.length !== expected.length) return false;
  return crypto.timingSafeEqual(actual, expected);
}

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week

  // AUTH-02 fix: Hard-fail at startup if SESSION_SECRET is missing in production.
  // A missing secret would cause all sessions to be signed with a well-known
  // fallback string, making session cookies trivially forgeable.
  const isProd = process.env.NODE_ENV === "production";
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (isProd) {
      throw new Error(
        "[FATAL] SESSION_SECRET environment variable is required in production. " +
        "Set it in your deployment platform's environment variable panel."
      );
    }
    console.warn(
      "[WARN] SESSION_SECRET is not set. Using an insecure default — " +
      "this is only acceptable during local development."
    );
  }

  // Use in-memory store (no database dependency)
  const MemoryStore = memorystore(session);
  const sessionStore = new MemoryStore({
    checkPeriod: 86400000, // prune expired entries every 24h
  });

  return session({
    secret: secret || "dev_secret_key_not_for_production",
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProd, // true in production (HTTPS), false in dev (HTTP localhost)
      maxAge: sessionTtl,
      sameSite: isProd ? "none" : "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Password signup endpoint (rate-limited: 10 per IP per 15 min)
  app.post("/api/signup", rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";
      const firstName = typeof req.body?.firstName === "string" ? req.body.firstName : "User";
      const lastName = typeof req.body?.lastName === "string" ? req.body.lastName : "";

      if (!email) return res.status(400).json({ message: "Email is required" });
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const existing = await storage.getUserByEmail(email);
      if (existing?.passwordHash) {
        return res.status(409).json({ message: "Account already exists. Please log in." });
      }

      const salt = crypto.randomBytes(16).toString("base64");
      const passwordHash = hashPassword(password, salt);
      const userId = existing?.id ?? email;
      const user = await storage.upsertUser({
        id: userId,
        email,
        firstName,
        lastName,
        profileImageUrl: existing?.profileImageUrl ?? null,
        authProvider: "password",
        passwordSalt: salt,
        passwordHash,
      });

      (req.session as any).userId = user.id;
      (req.session as any).user = sanitizeUser(user);
      req.session?.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  // Password login endpoint (rate-limited: 10 per IP per 15 min)
  app.post("/api/login/password", rateLimit(10, 15 * 60 * 1000), async (req, res) => {
    try {
      const email = normalizeEmail(req.body?.email);
      const password = typeof req.body?.password === "string" ? req.body.password : "";

      if (!email) return res.status(400).json({ message: "Email is required" });
      if (!password) return res.status(400).json({ message: "Password is required" });

      const user = await storage.getUserByEmail(email);
      if (!user?.passwordHash || !user.passwordSalt) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      if (!verifyPassword(password, user.passwordSalt, user.passwordHash)) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      (req.session as any).userId = user.id;
      (req.session as any).user = sanitizeUser(user);
      req.session?.save((err) => {
        if (err) return res.status(500).json({ message: "Session save failed" });
        res.json({ success: true, user: sanitizeUser(user) });
      });
    } catch (error) {
      console.error("Password login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // AUTH-01 fix: The unauthenticated magic-email login endpoint has been REMOVED.
  // It allowed any caller to authenticate as any user by supplying only an email
  // address — with no password check. Use /api/login/password for credential-based
  // login, or /api/signup for new account creation.

  // Logout endpoint
  app.get("/api/logout", (req, res) => {
    req.session?.destroy((err) => {
      if (err) {
        return res.redirect("/");
      }
      res.redirect("/");
    });
  });

  // Forgot password — generate token and send email (rate-limited: 3 per IP per 15 min)
  app.post("/api/forgot-password", rateLimit(3, 15 * 60 * 1000), async (req, res) => {
    try {
      await storage.deleteExpiredTokens();
      const email = normalizeEmail(req.body?.email);
      if (!email) return res.status(400).json({ message: "Email is required" });

      // Always respond with success to avoid user enumeration
      const user = await storage.getUserByEmail(email);
      if (!user) return res.json({ success: true });

      const token = crypto.randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
      await storage.createPasswordResetToken(user.id, token, expiresAt);

      const appUrl = process.env.APP_URL || "http://localhost:5000";
      const resetLink = `${appUrl}/reset-password?token=${token}`;

      if (resend) {
        await resend.emails.send({
          from: "NIVARANA <onboarding@resend.dev>",
          to: email,
          subject: "Reset your NIVARANA password",
          html: `
            <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px">
              <h2 style="color:#16a34a;margin-bottom:8px">Reset your password</h2>
              <p style="color:#555;margin-bottom:24px">Click the button below to set a new password. This link expires in 1 hour.</p>
              <a href="${resetLink}" style="display:inline-block;background:#16a34a;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
              <p style="color:#aaa;font-size:12px;margin-top:24px">If you didn't request this, ignore this email.</p>
            </div>
          `,
        });
      } else {
        // Dev fallback — print to console
        console.log(`\n[FORGOT PASSWORD] Reset link for ${email}:\n${resetLink}\n`);
      }

      res.json({ success: true });
    } catch (error) {
      console.error("Forgot password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
  });

  // Reset password — validate token and update password (rate-limited: 5 per IP per 15 min)
  app.post("/api/reset-password", rateLimit(5, 15 * 60 * 1000), async (req, res) => {
    try {
      const { token, password } = req.body ?? {};
      if (!token || typeof token !== "string") return res.status(400).json({ message: "Invalid token" });
      if (!password || password.length < 8) return res.status(400).json({ message: "Password must be at least 8 characters" });

      const record = await storage.getPasswordResetToken(token);
      if (!record) return res.status(400).json({ message: "Invalid or expired reset link" });
      if (record.usedAt) return res.status(400).json({ message: "This reset link has already been used" });
      if (new Date(record.expiresAt) < new Date()) return res.status(400).json({ message: "Reset link has expired" });

      const salt = crypto.randomBytes(16).toString("base64");
      const hash = crypto.scryptSync(password, Buffer.from(salt, "base64"), 64).toString("base64");

      const user = await storage.getUser(record.userId);
      if (!user) return res.status(400).json({ message: "User not found" });

      await storage.upsertUser({ ...user, passwordSalt: salt, passwordHash: hash });
      await storage.markTokenUsed(record.id);

      res.json({ success: true });
    } catch (error) {
      console.error("Reset password error:", error);
      res.status(500).json({ message: "Something went wrong" });
    }
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

      const isAdmin = await checkIsAdmin(user.email ?? "");
      res.json({ ...sanitizeUser(user), isAdmin });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}

async function checkIsAdmin(email: string): Promise<boolean> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  // If ADMIN_EMAIL is set, only that email is admin
  if (adminEmail) return email.toLowerCase() === adminEmail;
  // Otherwise the first registered user is admin (works locally with no config)
  const firstUser = await storage.getFirstUser();
  return !!firstUser && firstUser.email?.toLowerCase() === email.toLowerCase();
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
