import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { z } from "zod";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Use environment SESSION_SECRET or default if not available
  const sessionSecret = process.env.SESSION_SECRET || "secureshare-secret-key-replace-in-production";

  const sessionSettings: session.SessionOptions = {
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        // Check if login is by username or email
        const isEmail = username.includes('@');
        
        let user;
        if (isEmail) {
          user = await storage.getUserByEmail(username);
        } else {
          user = await storage.getUserByUsername(username);
        }
        
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        // Update last active timestamp
        await storage.updateUser(user.id, { lastActive: new Date() });
        
        return done(null, user);
      } catch (error) {
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Registration validation schema
  const registerSchema = z.object({
    username: z.string().min(3).max(50).regex(/^[a-zA-Z0-9_-]+$/),
    email: z.string().email(),
    password: z.string().min(8),
    role: z.enum(["admin", "user"]).default("user")
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      // Validate input
      const validation = registerSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validation.error.errors 
        });
      }
      
      const { username, email, password, role } = validation.data;
      
      // Check if username already exists
      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingEmail = await storage.getUserByEmail(email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }
      
      // If this is the first user, make them an admin
      const allUsers = await storage.getAllUsers();
      const finalRole = allUsers.length === 0 ? "admin" : role;
      
      // Create user with hashed password
      const user = await storage.createUser({
        username,
        email,
        password: await hashPassword(password),
        role: finalRole
      });
      
      // Create default security settings for new user
      await storage.createSecuritySettings({
        userId: user.id,
        keyRotationDays: 30,
        defaultEncryption: "aes",
        enforceQuantumForSensitive: true,
        autoEncrypt: true,
        secureDelete: true
      });
      
      // Log audit event
      await storage.createAuditLog({
        userId: user.id,
        action: "REGISTER",
        resource: "user",
        resourceId: user.id.toString(),
        details: { username, email, role: finalRole },
        ipAddress: req.ip
      });
      
      // Login the user
      req.login(user, (err) => {
        if (err) return next(err);
        
        // Remove password from response
        const { password, ...safeUser } = user;
        res.status(201).json(safeUser);
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post("/api/login", (req, res, next) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ message: info?.message || "Authentication failed" });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) return next(loginErr);
        
        // Log successful login
        storage.createAuditLog({
          userId: user.id,
          action: "LOGIN",
          resource: "user",
          resourceId: user.id.toString(),
          details: { method: "password" },
          ipAddress: req.ip
        });
        
        // Remove password from response
        const { password, ...safeUser } = user;
        res.json(safeUser);
      });
    })(req, res, next);
  });

  app.post("/api/logout", (req, res, next) => {
    // Log logout if user is authenticated
    if (req.isAuthenticated()) {
      storage.createAuditLog({
        userId: req.user!.id,
        action: "LOGOUT",
        resource: "user",
        resourceId: req.user!.id.toString(),
        ipAddress: req.ip
      });
    }
    
    req.logout((err) => {
      if (err) return next(err);
      req.session.destroy((sessionErr) => {
        if (sessionErr) {
          console.error("Session destruction error:", sessionErr);
        }
        res.clearCookie("connect.sid");
        res.status(200).json({ message: "Logged out successfully" });
      });
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    // Remove password from response
    const { password, ...safeUser } = req.user!;
    res.json(safeUser);
  });
}
