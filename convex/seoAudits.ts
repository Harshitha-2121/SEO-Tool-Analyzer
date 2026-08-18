import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Helper: validate session token and return user
async function getUserFromToken(ctx: any, token: string) {
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    return null;
  }

  return await ctx.db.get(session.userId);
}

// Start a new SEO audit
export const start = mutation({
  args: {
    token: v.string(),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const auditId = await ctx.db.insert("seoAudits", {
      userId: user._id,
      url: args.url,
      status: "pending",
      createdAt: Date.now(),
    });

    return auditId;
  },
});

// Get a specific audit
export const get = query({
  args: {
    token: v.string(),
    auditId: v.id("seoAudits"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      return null;
    }

    if (audit.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    return audit;
  },
});

// List all audits for the current user
export const list = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      return [];
    }

    return await ctx.db
      .query("seoAudits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .order("desc")
      .collect();
  },
});

// Update audit results
export const updateResults = mutation({
  args: {
    token: v.string(),
    auditId: v.id("seoAudits"),
    status: v.string(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (audit.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.auditId, {
      status: args.status,
      results: args.results,
      ...(args.status === "completed" || args.status === "failed"
        ? { completedAt: Date.now() }
        : {}),
    });

    return args.auditId;
  },
});

// Delete an audit
export const remove = mutation({
  args: {
    token: v.string(),
    auditId: v.id("seoAudits"),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const audit = await ctx.db.get(args.auditId);
    if (!audit) {
      throw new Error("Audit not found");
    }

    if (audit.userId !== user._id) {
      throw new Error("Unauthorized");
    }

    await ctx.db.delete(args.auditId);
  },
});
