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

// Get the current user's profile
export const getMe = query({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) return null;

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
    picture: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    const updates: Partial<{ name: string; picture: string }> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.picture !== undefined) updates.picture = args.picture;

    await ctx.db.patch(user._id, updates);
    return user._id;
  },
});

// Delete the current user's account
export const deleteAccount = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getUserFromToken(ctx, args.token);
    if (!user) {
      throw new Error("Not authenticated");
    }

    // Delete all sessions for this user
    const sessions = await ctx.db
      .query("sessions")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }

    // Delete all audits for this user
    const audits = await ctx.db
      .query("seoAudits")
      .withIndex("by_user", (q: any) => q.eq("userId", user._id))
      .collect();

    for (const audit of audits) {
      await ctx.db.delete(audit._id);
    }

    // Invalidate the organization if this is the last user
    if (user.orgId) {
      const remainingUsers = await ctx.db
        .query("users")
        .withIndex("by_org", (q: any) => q.eq("orgId", user.orgId!))
        .collect();

      if (remainingUsers.length <= 1) {
        // Remove projects
        const projs = await ctx.db
          .query("projects")
          .withIndex("by_org", (q: any) => q.eq("orgId", user.orgId!))
          .collect();

        for (const proj of projs) {
          // Remove websites
          const sites = await ctx.db
            .query("websites")
            .withIndex("by_project", (q: any) => q.eq("projectId", proj._id))
            .collect();
          for (const site of sites) {
            await ctx.db.delete(site._id);
          }
          await ctx.db.delete(proj._id);
        }
        await ctx.db.delete(user.orgId);
      }
    }

    await ctx.db.delete(user._id);
  },
});
