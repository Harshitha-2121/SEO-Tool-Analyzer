import { mutation, query, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Role hierarchy definition for RBAC authorization
const ROLES_HIERARCHY: Record<string, number> = {
  viewer: 1,
  editor: 2,
  manager: 3,
  admin: 4,
  owner: 5,
};

// =============================================================================
// INTERNAL HELPER (Avoids circular imports and ctx.runQuery within the same file)
// =============================================================================
async function checkAuth(ctx: any, token: string, requiredRole?: string) {
  // 1. Resolve session
  const session = await ctx.db
    .query("sessions")
    .withIndex("by_token", (q: any) => q.eq("token", token))
    .unique();

  if (!session || session.expiresAt < Date.now()) {
    return { ok: false, error: "Authentication session expired or invalid" };
  }

  // 2. Fetch User Profile
  const user = await ctx.db.get(session.userId);
  if (!user) {
    return { ok: false, error: "User profile not found" };
  }

  // 3. Assert Role if specified
  if (requiredRole) {
    const userRole = user.role || "viewer";
    const userWeight = ROLES_HIERARCHY[userRole] || 1;
    const requiredWeight = ROLES_HIERARCHY[requiredRole] || 1;

    if (userWeight < requiredWeight) {
      return {
        ok: false,
        error: `Insufficient permissions. Role '${requiredRole}' is required.`,
      };
    }
  }

  return {
    ok: true,
    user: {
      _id: user._id,
      email: user.email,
      name: user.name,
      orgId: user.orgId,
      role: user.role || "viewer",
    },
  };
}

// Exported internal query for other files to call
export const authorizeUser = internalQuery({
  args: {
    token: v.string(),
    requiredRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await checkAuth(ctx, args.token, args.requiredRole);
  },
});

// =============================================================================
// PUBLIC ENDPOINTS (Gateway Routing to Orchestrator)
// =============================================================================

// Mutation: Trigger a new site crawl via Gateway
export const triggerCrawl = mutation({
  args: {
    token: v.string(),
    projectId: v.id("projects"),
    url: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate and enforce "editor" minimum role
    const auth = await checkAuth(ctx, args.token, "editor");

    if (!auth.ok) {
      await ctx.db.insert("auditLogs", {
        action: "unauthorized_access",
        details: { message: auth.error, url: args.url },
        ip: "127.0.0.1",
        createdAt: Date.now(),
      });
      throw new Error(auth.error);
    }

    // 2. Validate project ownership bounds
    const project = await ctx.db.get(args.projectId);
    if (!project || project.orgId !== auth.user!.orgId) {
      throw new Error("Project not found or outside organization boundaries.");
    }

    // 3. Register site entry under project
    const websiteId = await ctx.db.insert("websites", {
      projectId: args.projectId,
      url: args.url,
      status: "active",
      createdAt: Date.now(),
    });

    // 4. Enqueue Crawl job in background task bus
    const jobId: Id<"backgroundJobs"> = await ctx.runMutation(internal.backgroundJobs.enqueueJob, {
      type: "website_crawl",
      args: { url: args.url, websiteId },
      priority: "high",
    });

    // 5. Write audit log
    await ctx.db.insert("auditLogs", {
      userId: auth.user!._id,
      action: "trigger_crawl",
      details: { url: args.url, projectId: args.projectId, jobId },
      ip: "127.0.0.1",
      createdAt: Date.now(),
    });

    return { success: true, jobId, websiteId };
  },
});

// Query: Fetch cached website report or read from Knowledge Graph context
export const getWebsiteReport = query({
  args: {
    token: v.string(),
    websiteUrl: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Authenticate with "viewer" minimum role
    const auth = await checkAuth(ctx, args.token, "viewer");

    if (!auth.ok) {
      throw new Error(auth.error);
    }

    // 2. Check cache lookup
    const cacheKey = `report:${args.websiteUrl}`;
    const cachedResult = await ctx.db
      .query("cacheEntries")
      .withIndex("by_key", (q) => q.eq("key", cacheKey))
      .unique();

    if (cachedResult && cachedResult.expiresAt > Date.now()) {
      return cachedResult.value;
    }

    // 3. Cache Miss - Build context from Knowledge Graph
    const context = await ctx.db
      .query("knowledgeGraphNodes")
      .withIndex("by_key_and_type", (q) => q.eq("key", args.websiteUrl).eq("type", "website"))
      .unique();

    if (!context) {
      return { status: "empty", message: "Website analysis has not run yet." };
    }

    // Load full sub-graph details with explicit return type annotation
    const fullGraph: any = await ctx.runQuery(api.knowledgeGraph.buildAIContext, {
      websiteUrl: args.websiteUrl,
    });

    return fullGraph;
  },
});
