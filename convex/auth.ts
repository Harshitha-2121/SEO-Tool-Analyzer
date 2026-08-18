import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Simple password hashing using Web Crypto (available in Convex runtime)
async function hashPassword(password: string, salt: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function generateSalt(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Register a new user with email, password and a default Organization
export const register = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email format");
    }

    // Validate password strength
    if (args.password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    // Check if user already exists
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (existing) {
      throw new Error("A user with this email already exists");
    }

    // 1. Create a default Organization
    const orgId = await ctx.db.insert("organizations", {
      name: args.name ? `${args.name}'s Org` : "Default Org",
      billingPlan: "free",
      createdAt: Date.now(),
    });

    // 2. Create default Project under the Org
    const projectId = await ctx.db.insert("projects", {
      orgId,
      name: "My First Project",
      createdAt: Date.now(),
    });

    const salt = generateSalt();
    const passwordHash = await hashPassword(args.password, salt);

    // 3. Register user as Owner
    const userId = await ctx.db.insert("users", {
      email: args.email.toLowerCase(),
      name: args.name,
      passwordHash,
      salt,
      tokenIdentifier: `password:${args.email.toLowerCase()}`,
      createdAt: Date.now(),
      orgId,
      role: "owner", // Default to owner for the initial creator
    });

    // 4. Generate a session token
    const sessionToken = generateSalt() + generateSalt();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId,
      token: sessionToken,
      expiresAt,
      createdAt: Date.now(),
    });

    return {
      userId,
      email: args.email.toLowerCase(),
      orgId,
      projectId,
      token: sessionToken,
      expiresAt,
    };
  },
});

// Login with email and password
export const login = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .unique();

    if (!user || !user.passwordHash || !user.salt) {
      throw new Error("Invalid email or password");
    }

    const passwordHash = await hashPassword(args.password, user.salt);

    if (passwordHash !== user.passwordHash) {
      throw new Error("Invalid email or password");
    }

    // Generate a session token
    const sessionToken = generateSalt() + generateSalt(); // 64-char random token
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("sessions", {
      userId: user._id,
      token: sessionToken,
      expiresAt,
      createdAt: Date.now(),
    });

    // Fetch primary project
    let projectId: Id<"projects"> | null = null;
    if (user.orgId) {
      const proj = await ctx.db
        .query("projects")
        .withIndex("by_org", (q) => q.eq("orgId", user.orgId!))
        .first();
      if (proj) projectId = proj._id;
    }

    return {
      userId: user._id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      projectId,
      role: user.role || "viewer",
      token: sessionToken,
      expiresAt,
    };
  },
});

// Logout - invalidate session
export const logout = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (session) {
      await ctx.db.delete(session._id);
    }

    return { success: true };
  },
});

// Get current user from session token
export const getMe = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      return null;
    }

    const user = await ctx.db.get(session.userId);
    if (!user) {
      return null;
    }

    return {
      _id: user._id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      role: user.role || "viewer",
      createdAt: user.createdAt,
    };
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    token: v.string(),
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await ctx.db
      .query("sessions")
      .withIndex("by_token", (q) => q.eq("token", args.token))
      .unique();

    if (!session || session.expiresAt < Date.now()) {
      throw new Error("Not authenticated");
    }

    const updates: Partial<{ name: string }> = {};
    if (args.name !== undefined) updates.name = args.name;

    await ctx.db.patch(session.userId, updates);
    return session.userId;
  },
});
